// ============================================================================
// MANUAL SEGMENTATION SERVICE
// ============================================================================
// Serviço de segmentação manual onde o usuário desenha o polígono do telhado
// ============================================================================

const ManualSegmentation = {
  
  name: 'Seleção Manual',
  description: 'O usuário desenha o contorno do telhado manualmente',
  
  // Estado do desenho
  isDrawing: false,
  currentPolygon: null,
  polygonPoints: [],
  markers: [],
  polyline: null,
  
  /**
   * Executa a segmentação manual
   * @param {number} lat - Latitude inicial
   * @param {number} lng - Longitude inicial
   * @param {HTMLElement} mapElement - Elemento do mapa
   * @returns {Promise<SegmentationResult>}
   */
  async segment(lat, lng, mapElement = null) {
    const result = new SegmentationResult();
    result.method = 'manual';
    
    
    // Iniciar modo de desenho
    this.startDrawing();
    
    // Retornar promessa que será resolvida quando o usuário terminar
    return new Promise((resolve) => {
      this.onComplete = (polygon) => {
        if (polygon && polygon.length >= 3) {
          result.polygon = polygon;
          result.areaM2 = RoofSegmentationService.calculatePolygonArea(polygon);
          result.confidence = 1.0; // Manual é 100% preciso
          result.success = true;
        } else {
          result.error = 'Desenho cancelado ou inválido';
        }
        resolve(result);
      };
    });
  },
  
  /**
   * Inicia o modo de desenho
   */
  startDrawing() {
    this.isDrawing = true;
    this.polygonPoints = [];
    this.clearMarkers();
    
    // Mudar cursor do mapa
    if (map) {
      map.setOptions({ draggableCursor: 'crosshair' });
    }
    
    // Mostrar instruções
    this.showInstructions();
    
    // Adicionar listener de clique
    this.clickListener = map.addListener('click', (event) => {
      this.addPoint(event.latLng);
    });
    
  },
  
  /**
   * Adiciona um ponto ao polígono
   */
  addPoint(latLng) {
    const point = {
      lat: latLng.lat(),
      lng: latLng.lng()
    };
    
    this.polygonPoints.push(point);
    
    // Adicionar marcador visual
    const marker = new google.maps.Marker({
      position: latLng,
      map: map,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#FF5722',
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 2
      },
      label: {
        text: String(this.polygonPoints.length),
        color: '#FFFFFF',
        fontSize: '10px'
      },
      zIndex: 100
    });
    
    this.markers.push(marker);
    
    // Atualizar linha do polígono
    this.updatePolyline();
    
    // Atualizar instruções
    this.updateInstructions();
    
  },
  
  /**
   * Atualiza a linha do polígono
   */
  updatePolyline() {
    if (this.polyline) {
      this.polyline.setMap(null);
    }
    
    if (this.polygonPoints.length < 2) return;
    
    // Criar polyline
    const path = this.polygonPoints.map(p => ({ lat: p.lat, lng: p.lng }));
    
    // Fechar o polígono visualmente se tiver 3+ pontos
    if (this.polygonPoints.length >= 3) {
      path.push(path[0]);
    }
    
    this.polyline = new google.maps.Polyline({
      path: path,
      strokeColor: '#FF5722',
      strokeOpacity: 0.8,
      strokeWeight: 3,
      map: map
    });
  },
  
  /**
   * Finaliza o desenho
   */
  finishDrawing() {
    this.isDrawing = false;
    
    // Remover listener
    if (this.clickListener) {
      google.maps.event.removeListener(this.clickListener);
    }
    
    // Restaurar cursor
    if (map) {
      map.setOptions({ draggableCursor: null });
    }
    
    // Esconder instruções
    this.hideInstructions();
    
    // Criar polígono final
    if (this.polygonPoints.length >= 3) {
      if (this.polyline) {
        this.polyline.setMap(null);
      }
      
      this.currentPolygon = new google.maps.Polygon({
        paths: this.polygonPoints,
        strokeColor: '#2E7D32',
        strokeOpacity: 0.9,
        strokeWeight: 3,
        fillColor: '#2E7D32',
        fillOpacity: 0.3,
        map: map
      });
    }
    
    // Chamar callback
    if (this.onComplete) {
      this.onComplete(this.polygonPoints);
    }
    
  },
  
  /**
   * Cancela o desenho
   */
  cancelDrawing() {
    this.isDrawing = false;
    this.clearMarkers();
    
    if (this.polyline) {
      this.polyline.setMap(null);
    }
    
    if (this.clickListener) {
      google.maps.event.removeListener(this.clickListener);
    }
    
    if (map) {
      map.setOptions({ draggableCursor: null });
    }
    
    this.hideInstructions();
    
    if (this.onComplete) {
      this.onComplete(null);
    }
    
  },
  
  /**
   * Remove o último ponto
   */
  undoLastPoint() {
    if (this.polygonPoints.length > 0) {
      this.polygonPoints.pop();
      
      const lastMarker = this.markers.pop();
      if (lastMarker) {
        lastMarker.setMap(null);
      }
      
      this.updatePolyline();
      this.updateInstructions();
    }
  },
  
  /**
   * Limpa todos os marcadores
   */
  clearMarkers() {
    this.markers.forEach(m => m.setMap(null));
    this.markers = [];
    
    if (this.currentPolygon) {
      this.currentPolygon.setMap(null);
      this.currentPolygon = null;
    }
  },
  
  /**
   * Mostra instruções na tela
   */
  showInstructions() {
    let instructionDiv = document.getElementById('manual_segmentation_instructions');
    
    if (!instructionDiv) {
      instructionDiv = document.createElement('div');
      instructionDiv.id = 'manual_segmentation_instructions';
      instructionDiv.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0,0,0,0.9);
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        z-index: 9999;
        text-align: center;
        font-size: 14px;
      `;
      document.body.appendChild(instructionDiv);
    }
    
    this.updateInstructions();
    instructionDiv.style.display = 'block';
  },
  
  /**
   * Atualiza texto das instruções
   */
  updateInstructions() {
    const instructionDiv = document.getElementById('manual_segmentation_instructions');
    if (!instructionDiv) return;
    
    const pointCount = this.polygonPoints.length;
    let html = `<strong>Desenhe o contorno do telhado</strong><br>`;
    html += `Pontos: ${pointCount} `;
    
    if (pointCount < 3) {
      html += `(mínimo 3)`;
    } else {
      html += `✓`;
    }
    
    html += `<br><br>`;
    html += `<button onclick="ManualSegmentation.undoLastPoint()" style="margin-right:10px;padding:5px 15px;">↩ Desfazer</button>`;
    
    if (pointCount >= 3) {
      html += `<button onclick="ManualSegmentation.finishDrawing()" style="background:#2E7D32;color:white;padding:5px 15px;margin-right:10px;">✓ Finalizar</button>`;
    }
    
    html += `<button onclick="ManualSegmentation.cancelDrawing()" style="background:#D32F2F;color:white;padding:5px 15px;">✗ Cancelar</button>`;
    
    instructionDiv.innerHTML = html;
  },
  
  /**
   * Esconde instruções
   */
  hideInstructions() {
    const instructionDiv = document.getElementById('manual_segmentation_instructions');
    if (instructionDiv) {
      instructionDiv.style.display = 'none';
    }
  },
  
  /**
   * Verifica se está disponível
   */
  isAvailable() {
    return typeof google !== 'undefined' && typeof map !== 'undefined';
  }
};

// Exportar para uso global
window.ManualSegmentation = ManualSegmentation;


