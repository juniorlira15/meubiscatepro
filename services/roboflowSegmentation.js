// ============================================================================
// ROBOFLOW SEGMENTATION SERVICE
// ============================================================================
// Serviço de segmentação usando modelos pré-treinados do Roboflow
// Especializado em detecção de telhados/edifícios
// ============================================================================

const RoboflowSegmentation = {
  
  name: 'Roboflow',
  description: 'Modelos de ML pré-treinados para detecção de telhados',
  
  // Configurações
  config: {
    apiUrl: 'https://detect.roboflow.com',
    // Modelo público para detecção de telhados (exemplo)
    model: 'roof-detection/1',
    imageSize: 640,
    zoomLevel: 20,
    confidence: 0.5
  },
  
  /**
   * Executa a segmentação usando Roboflow
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {HTMLElement} mapElement - Elemento do mapa
   * @returns {Promise<SegmentationResult>}
   */
  async segment(lat, lng, mapElement = null) {
    const result = new SegmentationResult();
    result.method = 'roboflow';
    
    try {
      
      const apiKey = segmentationConfig?.apiKeys?.roboflow || '';
      
      if (!apiKey) {
        console.warn('RoboflowSegmentation: API key não configurada, usando modo simulado');
        return await this.simulateSegmentation(lat, lng);
      }
      
      // 1. Capturar imagem de satélite
      const imageUrl = await this.captureImage(lat, lng);
      
      // 2. Chamar API do Roboflow
      const detection = await this.callRoboflowAPI(imageUrl, apiKey);
      
      if (detection.error) {
        result.error = detection.error;
        return result;
      }
      
      // 3. Processar detecções
      if (detection.predictions && detection.predictions.length > 0) {
        // Encontrar a detecção mais próxima do centro
        const centerX = this.config.imageSize / 2;
        const centerY = this.config.imageSize / 2;
        
        const nearest = this.findNearestDetection(detection.predictions, centerX, centerY);
        
        if (nearest) {
          // Converter pontos para coordenadas
          result.polygon = this.detectionToPolygon(nearest, lat, lng);
          result.areaM2 = RoofSegmentationService.calculatePolygonArea(result.polygon);
          result.confidence = nearest.confidence || 0.8;
          result.success = result.areaM2 > 0;
        }
      }
      
      if (!result.success) {
        result.error = 'Nenhum telhado detectado na região';
      }
      
      return result;
      
    } catch (error) {
      console.error('RoboflowSegmentation: Erro', error);
      result.error = error.message;
      return result;
    }
  },
  
  /**
   * Captura imagem de satélite
   */
  async captureImage(lat, lng) {
    const { imageSize, zoomLevel } = this.config;
    const mapApiKey = segmentationConfig?.apiKeys?.googleMaps || apiKey;
    
    return `https://maps.googleapis.com/maps/api/staticmap?` +
      `center=${lat},${lng}` +
      `&zoom=${zoomLevel}` +
      `&size=${imageSize}x${imageSize}` +
      `&maptype=satellite` +
      `&key=${mapApiKey}`;
  },
  
  /**
   * Chama a API do Roboflow
   */
  async callRoboflowAPI(imageUrl, apiKey) {
    try {
      const url = `${this.config.apiUrl}/${this.config.model}?api_key=${apiKey}&confidence=${this.config.confidence}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: imageUrl
      });
      
      if (!response.ok) {
        throw new Error(`Roboflow API error: ${response.status}`);
      }
      
      return await response.json();
      
    } catch (error) {
      console.error('RoboflowSegmentation: Erro na API', error);
      return { error: error.message };
    }
  },
  
  /**
   * Encontra a detecção mais próxima do centro
   */
  findNearestDetection(predictions, targetX, targetY) {
    let nearest = null;
    let minDist = Infinity;
    
    for (const pred of predictions) {
      const centerX = pred.x || (pred.bbox ? pred.bbox.x + pred.bbox.width / 2 : 0);
      const centerY = pred.y || (pred.bbox ? pred.bbox.y + pred.bbox.height / 2 : 0);
      
      const dist = Math.sqrt(
        Math.pow(centerX - targetX, 2) +
        Math.pow(centerY - targetY, 2)
      );
      
      if (dist < minDist) {
        minDist = dist;
        nearest = pred;
      }
    }
    
    return nearest;
  },
  
  /**
   * Converte detecção em polígono de coordenadas
   */
  detectionToPolygon(detection, centerLat, centerLng) {
    // Se tem pontos de segmentação
    if (detection.points) {
      return detection.points.map(point => 
        RoofSegmentationService.pixelToLatLng(
          point.x, point.y,
          centerLat, centerLng,
          this.config.zoomLevel,
          this.config.imageSize
        )
      );
    }
    
    // Se só tem bounding box, criar retângulo
    const x = detection.x || detection.bbox?.x || 0;
    const y = detection.y || detection.bbox?.y || 0;
    const w = detection.width || detection.bbox?.width || 100;
    const h = detection.height || detection.bbox?.height || 100;
    
    const pixels = [
      { x: x - w/2, y: y - h/2 },
      { x: x + w/2, y: y - h/2 },
      { x: x + w/2, y: y + h/2 },
      { x: x - w/2, y: y + h/2 }
    ];
    
    return pixels.map(point => 
      RoofSegmentationService.pixelToLatLng(
        point.x, point.y,
        centerLat, centerLng,
        this.config.zoomLevel,
        this.config.imageSize
      )
    );
  },
  
  /**
   * Modo simulado para demonstração
   */
  async simulateSegmentation(lat, lng) {
    const result = new SegmentationResult();
    result.method = 'roboflow_simulated';
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Criar polígono simulado
    const size = 0.00012;
    result.polygon = [
      { lat: lat - size, lng: lng - size * 1.3 },
      { lat: lat - size * 0.3, lng: lng + size * 1.3 },
      { lat: lat + size, lng: lng + size },
      { lat: lat + size * 0.8, lng: lng - size * 0.8 }
    ];
    
    result.areaM2 = RoofSegmentationService.calculatePolygonArea(result.polygon);
    result.confidence = 0.72;
    result.success = true;
    result.note = 'SIMULAÇÃO: Configure uma API key do Roboflow para usar detecção real';
    
    return result;
  },
  
  /**
   * Verifica se o serviço está disponível
   */
  isAvailable() {
    return true;
  },
  
  /**
   * Verifica se tem API key configurada
   */
  hasApiKey() {
    return !!(segmentationConfig?.apiKeys?.roboflow);
  }
};

// Exportar para uso global
window.RoboflowSegmentation = RoboflowSegmentation;


