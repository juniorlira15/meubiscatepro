// ============================================================================
// ROOF SEGMENTATION SERVICE - Interface Principal
// ============================================================================
// Este serviço gerencia diferentes métodos de segmentação de telhado.
// Permite alternar entre SAM, OpenCV, Google Solar API, etc.
// ============================================================================

/**
 * Tipos de segmentação disponíveis
 */
const SegmentationType = {
  GOOGLE_SOLAR: 'google_solar',  // API Solar do Google (atual)
  SAM: 'sam',                     // Segment Anything Model (Meta AI)
  OPENCV: 'opencv',               // OpenCV.js (detecção de bordas)
  ROBOFLOW: 'roboflow',           // Roboflow (modelos pré-treinados)
  MANUAL: 'manual'                // Seleção manual pelo usuário
};

/**
 * Configuração atual do serviço
 */
let currentSegmentationType = SegmentationType.GOOGLE_SOLAR;
let segmentationConfig = {
  apiKeys: {
    googleMaps: '',      // Será preenchido do global.js
    replicate: '',       // Para SAM via Replicate
    roboflow: '',        // Para Roboflow
    huggingface: ''      // Para HuggingFace
  },
  options: {
    imageSize: 640,      // Tamanho da imagem para análise
    zoomLevel: 20,       // Zoom do mapa para captura
    confidence: 0.7      // Confiança mínima para detecção
  }
};

/**
 * Resultado padrão da segmentação
 */
class SegmentationResult {
  constructor() {
    this.success = false;
    this.areaM2 = 0;
    this.polygon = [];        // Array de {lat, lng}
    this.mask = null;         // Imagem da máscara (se disponível)
    this.confidence = 0;
    this.method = '';
    this.error = null;
    this.segments = [];       // Segmentos individuais (se houver)
    this.boundingBox = null;  // {sw: {lat, lng}, ne: {lat, lng}}
  }
}

// ============================================================================
// SERVIÇO PRINCIPAL
// ============================================================================

const RoofSegmentationService = {
  
  /**
   * Configura o serviço
   */
  configure(config) {
    if (config.apiKeys) {
      Object.assign(segmentationConfig.apiKeys, config.apiKeys);
    }
    if (config.options) {
      Object.assign(segmentationConfig.options, config.options);
    }
  },
  
  /**
   * Define o tipo de segmentação a ser usado
   */
  setSegmentationType(type) {
    if (Object.values(SegmentationType).includes(type)) {
      currentSegmentationType = type;
      return true;
    }
    console.error('Tipo de segmentação inválido:', type);
    return false;
  },
  
  /**
   * Retorna o tipo de segmentação atual
   */
  getSegmentationType() {
    return currentSegmentationType;
  },
  
  /**
   * Retorna todos os tipos disponíveis
   */
  getAvailableTypes() {
    return SegmentationType;
  },
  
  /**
   * Executa a segmentação do telhado
   * @param {number} lat - Latitude do ponto clicado
   * @param {number} lng - Longitude do ponto clicado
   * @param {HTMLElement} mapElement - Elemento do mapa (opcional, para captura)
   * @returns {Promise<SegmentationResult>}
   */
  async segmentRoof(lat, lng, mapElement = null) {
    
    const result = new SegmentationResult();
    result.method = currentSegmentationType;
    
    try {
      switch (currentSegmentationType) {
        case SegmentationType.GOOGLE_SOLAR:
          return await GoogleSolarSegmentation.segment(lat, lng);
          
        case SegmentationType.SAM:
          return await SAMSegmentation.segment(lat, lng, mapElement);
          
        case SegmentationType.OPENCV:
          return await OpenCVSegmentation.segment(lat, lng, mapElement);
          
        case SegmentationType.ROBOFLOW:
          return await RoboflowSegmentation.segment(lat, lng, mapElement);
          
        case SegmentationType.MANUAL:
          return await ManualSegmentation.segment(lat, lng, mapElement);
          
        default:
          result.error = 'Tipo de segmentação não implementado';
          return result;
      }
    } catch (error) {
      console.error('Erro na segmentação:', error);
      result.error = error.message;
      return result;
    }
  },
  
  /**
   * Captura imagem de satélite da área
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {Promise<string>} URL da imagem ou base64
   */
  async captureMapImage(lat, lng) {
    const { imageSize, zoomLevel } = segmentationConfig.options;
    const apiKey = segmentationConfig.apiKeys.googleMaps || apiKey; // Fallback para global
    
    // URL da Google Static Maps API
    const url = `https://maps.googleapis.com/maps/api/staticmap?` +
      `center=${lat},${lng}` +
      `&zoom=${zoomLevel}` +
      `&size=${imageSize}x${imageSize}` +
      `&maptype=satellite` +
      `&key=${apiKey}`;
    
    return url;
  },
  
  /**
   * Calcula área em m² a partir de um polígono de coordenadas
   * @param {Array} polygon - Array de {lat, lng}
   * @returns {number} Área em metros quadrados
   */
  calculatePolygonArea(polygon) {
    if (!polygon || polygon.length < 3) return 0;
    
    // Fórmula de Shoelace adaptada para coordenadas geográficas
    const toRadians = (deg) => deg * Math.PI / 180;
    const R = 6371000; // Raio da Terra em metros
    
    let area = 0;
    const n = polygon.length;
    
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const lat1 = toRadians(polygon[i].lat);
      const lat2 = toRadians(polygon[j].lat);
      const lng1 = toRadians(polygon[i].lng);
      const lng2 = toRadians(polygon[j].lng);
      
      area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
    }
    
    area = Math.abs(area * R * R / 2);
    return area;
  },
  
  /**
   * Converte coordenadas de pixel para lat/lng
   * @param {number} pixelX - Coordenada X do pixel
   * @param {number} pixelY - Coordenada Y do pixel
   * @param {number} centerLat - Latitude do centro da imagem
   * @param {number} centerLng - Longitude do centro da imagem
   * @param {number} zoom - Nível de zoom
   * @param {number} imageSize - Tamanho da imagem em pixels
   * @returns {{lat: number, lng: number}}
   */
  pixelToLatLng(pixelX, pixelY, centerLat, centerLng, zoom, imageSize) {
    // Escala em metros por pixel no equador para o zoom especificado
    const metersPerPixel = 156543.03392 * Math.cos(centerLat * Math.PI / 180) / Math.pow(2, zoom);
    
    // Offset do centro em pixels
    const offsetX = pixelX - imageSize / 2;
    const offsetY = pixelY - imageSize / 2;
    
    // Offset em metros
    const offsetMetersX = offsetX * metersPerPixel;
    const offsetMetersY = -offsetY * metersPerPixel; // Y invertido
    
    // Converter metros para graus
    const latOffset = offsetMetersY / 111320;
    const lngOffset = offsetMetersX / (111320 * Math.cos(centerLat * Math.PI / 180));
    
    return {
      lat: centerLat + latOffset,
      lng: centerLng + lngOffset
    };
  }
};

// Exportar para uso global
window.RoofSegmentationService = RoofSegmentationService;
window.SegmentationType = SegmentationType;
window.SegmentationResult = SegmentationResult;


