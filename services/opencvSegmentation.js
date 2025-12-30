// ============================================================================
// OPENCV SEGMENTATION SERVICE
// ============================================================================
// Serviço de segmentação usando OpenCV.js (100% client-side)
// Detecta bordas e contornos para identificar telhados
// ============================================================================

const OpenCVSegmentation = {
  
  name: 'OpenCV.js',
  description: 'Processamento de imagem local usando detecção de bordas',
  
  // Flag para verificar se OpenCV está carregado
  isLoaded: false,
  
  // Configurações
  config: {
    imageSize: 640,
    zoomLevel: 20,
    cannyThreshold1: 50,
    cannyThreshold2: 150,
    minContourArea: 500  // Área mínima em pixels para considerar um contorno
  },
  
  /**
   * Carrega a biblioteca OpenCV.js
   */
  async loadOpenCV() {
    if (this.isLoaded) return true;
    
    return new Promise((resolve, reject) => {
      // Verificar se já está carregado
      if (typeof cv !== 'undefined') {
        this.isLoaded = true;
        resolve(true);
        return;
      }
      
      // Carregar script
      const script = document.createElement('script');
      script.src = 'https://docs.opencv.org/4.x/opencv.js';
      script.async = true;
      
      script.onload = () => {
        // OpenCV.js usa uma callback global
        if (typeof cv !== 'undefined') {
          cv['onRuntimeInitialized'] = () => {
            this.isLoaded = true;
            resolve(true);
          };
        }
      };
      
      script.onerror = () => {
        reject(new Error('Falha ao carregar OpenCV.js'));
      };
      
      document.head.appendChild(script);
      
      // Timeout
      setTimeout(() => {
        if (!this.isLoaded) {
          reject(new Error('Timeout ao carregar OpenCV.js'));
        }
      }, 30000);
    });
  },
  
  /**
   * Executa a segmentação usando OpenCV
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {HTMLElement} mapElement - Elemento do mapa
   * @returns {Promise<SegmentationResult>}
   */
  async segment(lat, lng, mapElement = null) {
    const result = new SegmentationResult();
    result.method = 'opencv';
    
    try {
      
      // Carregar OpenCV se necessário
      if (!this.isLoaded) {
        await this.loadOpenCV();
      }
      
      // 1. Capturar imagem de satélite
      const imageUrl = await this.captureImage(lat, lng);
      
      // 2. Carregar imagem em canvas
      const img = await this.loadImage(imageUrl);
      
      // 3. Processar com OpenCV
      const contours = await this.processImage(img, lat, lng);
      
      // 4. Encontrar o contorno mais próximo do centro (ponto clicado)
      const centerX = this.config.imageSize / 2;
      const centerY = this.config.imageSize / 2;
      const bestContour = this.findNearestContour(contours, centerX, centerY);
      
      if (!bestContour) {
        result.error = 'Nenhum telhado detectado na região';
        return result;
      }
      
      // 5. Converter contorno para coordenadas
      result.polygon = bestContour.map(point => 
        RoofSegmentationService.pixelToLatLng(
          point.x, point.y,
          lat, lng,
          this.config.zoomLevel,
          this.config.imageSize
        )
      );
      
      result.areaM2 = RoofSegmentationService.calculatePolygonArea(result.polygon);
      result.confidence = 0.7; // OpenCV é menos preciso que ML
      result.success = result.areaM2 > 0;
      
      return result;
      
    } catch (error) {
      console.error('OpenCVSegmentation: Erro', error);
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
    
    const url = `https://maps.googleapis.com/maps/api/staticmap?` +
      `center=${lat},${lng}` +
      `&zoom=${zoomLevel}` +
      `&size=${imageSize}x${imageSize}` +
      `&maptype=satellite` +
      `&key=${mapApiKey}`;
    
    return url;
  },
  
  /**
   * Carrega imagem como elemento HTML
   */
  loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  },
  
  /**
   * Processa imagem com OpenCV para detectar contornos
   */
  async processImage(img, lat, lng) {
    // Criar canvas temporário
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    
    // Converter para matriz OpenCV
    const src = cv.imread(canvas);
    const gray = new cv.Mat();
    const edges = new cv.Mat();
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    
    try {
      // Converter para escala de cinza
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
      
      // Aplicar blur para reduzir ruído
      cv.GaussianBlur(gray, gray, new cv.Size(5, 5), 0);
      
      // Detecção de bordas Canny
      cv.Canny(gray, edges, this.config.cannyThreshold1, this.config.cannyThreshold2);
      
      // Dilatar para conectar bordas próximas
      const kernel = cv.Mat.ones(3, 3, cv.CV_8U);
      cv.dilate(edges, edges, kernel);
      
      // Encontrar contornos
      cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
      
      // Extrair contornos como arrays de pontos
      const result = [];
      for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);
        const area = cv.contourArea(contour);
        
        // Filtrar contornos muito pequenos
        if (area < this.config.minContourArea) continue;
        
        // Aproximar polígono
        const approx = new cv.Mat();
        const perimeter = cv.arcLength(contour, true);
        cv.approxPolyDP(contour, approx, 0.02 * perimeter, true);
        
        // Extrair pontos
        const points = [];
        for (let j = 0; j < approx.rows; j++) {
          points.push({
            x: approx.data32S[j * 2],
            y: approx.data32S[j * 2 + 1]
          });
        }
        
        result.push({
          points: points,
          area: area,
          center: this.calculateCenter(points)
        });
        
        approx.delete();
      }
      
      kernel.delete();
      return result;
      
    } finally {
      // Liberar memória
      src.delete();
      gray.delete();
      edges.delete();
      contours.delete();
      hierarchy.delete();
    }
  },
  
  /**
   * Calcula o centro de um polígono
   */
  calculateCenter(points) {
    const sumX = points.reduce((sum, p) => sum + p.x, 0);
    const sumY = points.reduce((sum, p) => sum + p.y, 0);
    return {
      x: sumX / points.length,
      y: sumY / points.length
    };
  },
  
  /**
   * Encontra o contorno mais próximo de um ponto
   */
  findNearestContour(contours, targetX, targetY) {
    let nearest = null;
    let minDist = Infinity;
    
    for (const contour of contours) {
      const dist = Math.sqrt(
        Math.pow(contour.center.x - targetX, 2) +
        Math.pow(contour.center.y - targetY, 2)
      );
      
      if (dist < minDist) {
        minDist = dist;
        nearest = contour.points;
      }
    }
    
    return nearest;
  },
  
  /**
   * Verifica se o serviço está disponível
   */
  isAvailable() {
    return true; // Sempre disponível (carrega sob demanda)
  }
};

// Exportar para uso global
window.OpenCVSegmentation = OpenCVSegmentation;


