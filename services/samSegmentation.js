// ============================================================================
// SAM SEGMENTATION SERVICE (Segment Anything Model - Meta AI)
// ============================================================================
// Serviço de segmentação usando o modelo SAM via API
// O SAM permite clicar em um ponto e segmentar automaticamente o objeto
// ============================================================================

const SAMSegmentation = {
  
  name: 'Segment Anything Model (SAM)',
  description: 'Modelo de IA da Meta que segmenta objetos com um clique',
  
  // Configurações
  config: {
    // Replicate API (recomendado - mais fácil)
    replicateApiUrl: 'https://api.replicate.com/v1/predictions',
    replicateModel: 'meta/sam-2-hiera-large',
    
    // HuggingFace API (alternativa)
    huggingfaceApiUrl: 'https://api-inference.huggingface.co/models/facebook/sam-vit-huge',
    
    // Configurações de imagem
    imageSize: 640,
    zoomLevel: 20
  },
  
  /**
   * Executa a segmentação usando SAM
   * @param {number} lat - Latitude do clique
   * @param {number} lng - Longitude do clique
   * @param {HTMLElement} mapElement - Elemento do mapa (opcional)
   * @returns {Promise<SegmentationResult>}
   */
  async segment(lat, lng, mapElement = null) {
    const result = new SegmentationResult();
    result.method = 'sam';
    
    try {
      
      // 1. Capturar imagem de satélite
      const imageUrl = await this.captureImage(lat, lng);
      
      // 2. Definir ponto de clique (centro da imagem)
      const clickPoint = {
        x: this.config.imageSize / 2,
        y: this.config.imageSize / 2
      };
      
      // 3. Chamar API do SAM
      const apiKey = segmentationConfig?.apiKeys?.replicate || '';
      
      if (!apiKey) {
        // Se não tem API key, usar modo simulado para demonstração
        console.warn('SAMSegmentation: API key não configurada, usando modo simulado');
        return await this.simulateSegmentation(lat, lng, imageUrl);
      }
      
      // Chamar Replicate API
      const prediction = await this.callReplicateAPI(imageUrl, clickPoint, apiKey);
      
      if (prediction.error) {
        result.error = prediction.error;
        return result;
      }
      
      // 4. Processar resultado
      result.mask = prediction.mask;
      result.polygon = await this.maskToPolygon(prediction.mask, lat, lng);
      result.areaM2 = RoofSegmentationService.calculatePolygonArea(result.polygon);
      result.confidence = prediction.confidence || 0.9;
      result.success = result.areaM2 > 0;
      
      return result;
      
    } catch (error) {
      console.error('SAMSegmentation: Erro', error);
      result.error = error.message;
      return result;
    }
  },
  
  /**
   * Captura imagem de satélite usando Google Static Maps
   */
  async captureImage(lat, lng) {
    const { imageSize, zoomLevel } = this.config;
    const mapApiKey = segmentationConfig?.apiKeys?.googleMaps || apiKey;
    
    const url = `https://maps.googleapis.com/maps/api/staticmap?` +
      `center=${lat},${lng}` +
      `&zoom=${zoomLevel}` +
      `&size=${imageSize}x${imageSize}` +
      `&maptype=satellite` +
      `&key=${mapApiKey}`;
    
    return url;
  },
  
  /**
   * Chama a API do Replicate para executar o SAM
   */
  async callReplicateAPI(imageUrl, clickPoint, apiKey) {
    try {
      // Criar predição
      const response = await fetch(this.config.replicateApiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          version: 'fe97b453a6455861e3bac769b441ca1f1086110da7466dbb65cf1eecfd60dc83', // SAM 2
          input: {
            image: imageUrl,
            point_coords: [[clickPoint.x, clickPoint.y]],
            point_labels: [1], // 1 = foreground
            multimask_output: false
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`Replicate API error: ${response.status}`);
      }
      
      const prediction = await response.json();
      
      // Aguardar resultado (polling)
      return await this.waitForPrediction(prediction.urls.get, apiKey);
      
    } catch (error) {
      console.error('SAMSegmentation: Erro na API Replicate', error);
      return { error: error.message };
    }
  },
  
  /**
   * Aguarda o resultado da predição (polling)
   */
  async waitForPrediction(url, apiKey, maxAttempts = 30) {
    for (let i = 0; i < maxAttempts; i++) {
      const response = await fetch(url, {
        headers: { 'Authorization': `Token ${apiKey}` }
      });
      
      const result = await response.json();
      
      if (result.status === 'succeeded') {
        return {
          mask: result.output?.masks?.[0] || result.output,
          confidence: 0.9
        };
      }
      
      if (result.status === 'failed') {
        return { error: result.error || 'Prediction failed' };
      }
      
      // Aguardar 1 segundo antes de tentar novamente
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return { error: 'Timeout aguardando resultado' };
  },
  
  /**
   * Converte máscara binária em polígono de coordenadas
   */
  async maskToPolygon(maskUrl, centerLat, centerLng) {
    // Se a máscara é uma URL, carregar a imagem
    if (typeof maskUrl === 'string') {
      return await this.processRemoteMask(maskUrl, centerLat, centerLng);
    }
    
    // Se já é um array de pontos, converter para coordenadas
    if (Array.isArray(maskUrl)) {
      return maskUrl.map(point => 
        RoofSegmentationService.pixelToLatLng(
          point.x || point[0],
          point.y || point[1],
          centerLat,
          centerLng,
          this.config.zoomLevel,
          this.config.imageSize
        )
      );
    }
    
    return [];
  },
  
  /**
   * Processa máscara remota (imagem)
   */
  async processRemoteMask(maskUrl, centerLat, centerLng) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        // Criar canvas para processar a imagem
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        // Extrair contorno da máscara
        const contour = this.extractContour(ctx, img.width, img.height);
        
        // Converter pixels para coordenadas
        const polygon = contour.map(point => 
          RoofSegmentationService.pixelToLatLng(
            point.x,
            point.y,
            centerLat,
            centerLng,
            this.config.zoomLevel,
            this.config.imageSize
          )
        );
        
        resolve(polygon);
      };
      
      img.onerror = () => {
        console.error('Erro ao carregar máscara');
        resolve([]);
      };
      
      img.src = maskUrl;
    });
  },
  
  /**
   * Extrai contorno de uma máscara binária
   */
  extractContour(ctx, width, height) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const contour = [];
    
    // Algoritmo simples de detecção de borda
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        const pixel = data[idx]; // Assumindo máscara em escala de cinza
        
        if (pixel > 127) { // Pixel da máscara
          // Verificar se é borda (tem vizinho fora da máscara)
          const neighbors = [
            data[((y-1) * width + x) * 4],
            data[((y+1) * width + x) * 4],
            data[(y * width + (x-1)) * 4],
            data[(y * width + (x+1)) * 4]
          ];
          
          if (neighbors.some(n => n <= 127)) {
            contour.push({ x, y });
          }
        }
      }
    }
    
    // Simplificar contorno (reduzir pontos)
    return this.simplifyContour(contour, 5);
  },
  
  /**
   * Simplifica o contorno reduzindo o número de pontos
   */
  simplifyContour(contour, tolerance) {
    if (contour.length < 10) return contour;
    
    // Algoritmo Douglas-Peucker simplificado
    const simplified = [contour[0]];
    let lastAdded = contour[0];
    
    for (let i = 1; i < contour.length; i++) {
      const dist = Math.sqrt(
        Math.pow(contour[i].x - lastAdded.x, 2) +
        Math.pow(contour[i].y - lastAdded.y, 2)
      );
      
      if (dist >= tolerance) {
        simplified.push(contour[i]);
        lastAdded = contour[i];
      }
    }
    
    return simplified;
  },
  
  /**
   * Modo simulado para demonstração (sem API key)
   */
  async simulateSegmentation(lat, lng, imageUrl) {
    const result = new SegmentationResult();
    result.method = 'sam_simulated';
    
    
    // Simular delay de processamento
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Criar polígono simulado baseado no ponto
    // (Um retângulo aproximado de um telhado típico)
    const size = 0.0001; // ~11 metros
    result.polygon = [
      { lat: lat - size, lng: lng - size * 1.2 },
      { lat: lat - size, lng: lng + size * 1.2 },
      { lat: lat + size, lng: lng + size * 1.2 },
      { lat: lat + size, lng: lng - size * 1.2 }
    ];
    
    result.areaM2 = RoofSegmentationService.calculatePolygonArea(result.polygon);
    result.confidence = 0.75; // Confiança menor por ser simulado
    result.success = true;
    
    // Nota sobre simulação
    result.note = 'SIMULAÇÃO: Configure uma API key do Replicate para usar o SAM real';
    
    return result;
  },
  
  /**
   * Verifica se o serviço está disponível
   */
  isAvailable() {
    return true; // Sempre disponível (com ou sem API key, via simulação)
  },
  
  /**
   * Verifica se tem API key configurada
   */
  hasApiKey() {
    return !!(segmentationConfig?.apiKeys?.replicate);
  }
};

// Exportar para uso global
window.SAMSegmentation = SAMSegmentation;


