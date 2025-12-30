// ============================================================================
// GOOGLE SOLAR SEGMENTATION SERVICE
// ============================================================================
// Serviço de segmentação usando a Google Solar API (método atual)
// ============================================================================

const GoogleSolarSegmentation = {
  
  name: 'Google Solar API',
  description: 'Usa a API Solar do Google para obter dados de telhado via satélite',
  
  /**
   * Executa a segmentação usando Google Solar API
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {Promise<SegmentationResult>}
   */
  async segment(lat, lng) {
    const result = new SegmentationResult();
    result.method = 'google_solar';
    
    try {
      
      // Usar a função existente do solar_api.js
      const solarData = await findClosestBuildingInsights(lat, lng, apiKey);
      
      if (!solarData || !solarData.solarPotential) {
        result.error = 'Nenhum dado de telhado encontrado para esta localização';
        return result;
      }
      
      // Extrair área total
      result.areaM2 = solarData.solarPotential.wholeRoofStats?.areaMeters2 || 0;
      result.success = result.areaM2 > 0;
      
      // Extrair segmentos
      if (solarData.solarPotential.roofSegmentStats) {
        result.segments = solarData.solarPotential.roofSegmentStats.map((seg, index) => ({
          id: index + 1,
          areaM2: seg.stats.areaMeters2,
          center: seg.center,
          pitch: seg.pitchDegrees,
          azimuth: seg.azimuthDegrees,
          height: seg.planeHeightAtCenterMeters
        }));
      }
      
      // Extrair bounding box
      if (solarData.boundingBox) {
        const bbox = solarData.boundingBox;
        result.boundingBox = {
          sw: { lat: bbox.sw?.latitude || bbox.southWest?.latitude, 
                lng: bbox.sw?.longitude || bbox.southWest?.longitude },
          ne: { lat: bbox.ne?.latitude || bbox.northEast?.latitude, 
                lng: bbox.ne?.longitude || bbox.northEast?.longitude }
        };
      }
      
      // Criar polígono aproximado a partir dos centros dos segmentos
      if (result.segments.length > 0) {
        result.polygon = this.createPolygonFromSegments(result.segments);
      }
      
      result.confidence = 0.85; // Confiança estimada para Google Solar
      
      return result;
      
    } catch (error) {
      console.error('GoogleSolarSegmentation: Erro', error);
      result.error = error.message;
      return result;
    }
  },
  
  /**
   * Cria um polígono convexo a partir dos centros dos segmentos
   * @param {Array} segments - Segmentos com centros
   * @returns {Array} Polígono de coordenadas
   */
  createPolygonFromSegments(segments) {
    // Extrair pontos dos centros
    const points = segments
      .filter(seg => seg.center)
      .map(seg => ({
        lat: seg.center.latitude,
        lng: seg.center.longitude
      }));
    
    if (points.length < 3) return points;
    
    // Calcular convex hull (envelope convexo)
    return this.convexHull(points);
  },
  
  /**
   * Algoritmo de Convex Hull (Graham Scan)
   * @param {Array} points - Array de {lat, lng}
   * @returns {Array} Pontos do envelope convexo
   */
  convexHull(points) {
    if (points.length < 3) return points;
    
    // Encontrar ponto mais à esquerda e mais abaixo
    let start = 0;
    for (let i = 1; i < points.length; i++) {
      if (points[i].lng < points[start].lng ||
          (points[i].lng === points[start].lng && points[i].lat < points[start].lat)) {
        start = i;
      }
    }
    
    // Trocar para posição 0
    [points[0], points[start]] = [points[start], points[0]];
    const pivot = points[0];
    
    // Ordenar por ângulo polar
    const sorted = points.slice(1).sort((a, b) => {
      const angleA = Math.atan2(a.lat - pivot.lat, a.lng - pivot.lng);
      const angleB = Math.atan2(b.lat - pivot.lat, b.lng - pivot.lng);
      return angleA - angleB;
    });
    
    // Graham Scan
    const hull = [pivot];
    for (const point of sorted) {
      while (hull.length > 1 && this.cross(hull[hull.length - 2], hull[hull.length - 1], point) <= 0) {
        hull.pop();
      }
      hull.push(point);
    }
    
    return hull;
  },
  
  /**
   * Produto vetorial 2D
   */
  cross(o, a, b) {
    return (a.lng - o.lng) * (b.lat - o.lat) - (a.lat - o.lat) * (b.lng - o.lng);
  },
  
  /**
   * Verifica se o serviço está disponível
   */
  isAvailable() {
    return typeof findClosestBuildingInsights === 'function' && typeof apiKey !== 'undefined';
  }
};

// Exportar para uso global
window.GoogleSolarSegmentation = GoogleSolarSegmentation;


