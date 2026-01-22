// --------------------------------------------------------------------------------------------------------------------------------------------
//
//  Developed by:
//    Gilberto Cortez
//
//  Website:
//    InteractiveUtopia.com
//
//  Description:
//    - Functions to work with Google Maps JavaScript API
//
// --------------------------------------------------------------------------------------------------------------------------------------------
// Google Maps API Call
// Get latitude and longitude from address
// --------------------------------------------------------------------------------------------------------------------------------------------
function getLatLong() {
  address = addressInputElement.value;

  // Replace spaces with plus (+) for URL compatibility
  const formattedAddress = address.split(" ").join("+");

  // Form the request URL
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${formattedAddress}&key=${apiKey}`;

  // Make the fetch request
  fetch(url)
    .then((response) => response.json()) // Convert response to JSON
    .then((data) => {
      if (data.status === "OK") {
        // Extract latitude and longitude
        latitude = data.results[0].geometry.location.lat;
        longitude = data.results[0].geometry.location.lng;
        // Clear existing overlays
        overlays.forEach((overlay) => overlay.setMap(null));
        overlays = []; // Reset the overlays array
        // Re initiate map and requests
        initMas();
      } else {
        console.error("Geocoding failed: " + data.status);
      }
    })
    .catch((error) => console.error("Error:", error));
}

// --------------------------------------------------------------------------------------------------------------------------------------------
// Google Map Initiation Function
// --------------------------------------------------------------------------------------------------------------------------------------------

var initMas = async () => {
  // Function to update the month name based on the slider's value
  function updateMonth() {
    monthNameDisplay.textContent = monthNames[selectedMonthElement.value];
  }

  // Function to update the hour display based on the slider's value
  function updateHour() {
    hourDisplay.textContent = hourNames[selectedHourElement.value];
  }

  // Add event listeners
  selectedMonthElement.addEventListener("input", updateMonth);
  selectedHourElement.addEventListener("input", updateHour);

  // Initialize the display
  updateMonth();
  updateHour();

  const selectedMonth = parseInt(selectedMonthElement.value, 10);
  const myLatLng = new google.maps.LatLng(latitude, longitude);
  var mapOptions = {
    zoom: 19,
    center: myLatLng,
    mapTypeId: "satellite",
  };
  map = new google.maps.Map(document.getElementById("map"), mapOptions);

  // Validar API key após criar o mapa (para ter acesso aos elementos do DOM)
  if (!apiKey || apiKey === "YOUR_GOOGLE_API_KEY_HERE" || apiKey.includes("YOUR_GOOGLE_API_KEY")) {
    showError("⚠️ API Key do Google não configurada! Configure sua chave em 'components/gc_solar_api_library/global.js' (linha 16) e 'index.php' (linha 47).");
    const instructionText = document.getElementById("instruction_text");
    if (instructionText) {
      instructionText.innerHTML = "❌ <strong>Configure a API Key do Google</strong> para usar o sistema";
    }
    initClickToSelect(); // Ainda permitir interação com o mapa
    return;
  }

  const url = new URL("https://solar.googleapis.com/v1/dataLayers:get");

  // Calcular a zona UTM correta baseada na longitude
  function getUTMZone(lon) {
    return Math.floor((lon + 180) / 6) + 1;
  }
  
  // Determinar se é hemisfério norte ou sul baseado na latitude
  function getUTMHemisphere(lat) {
    return lat >= 0 ? "+north" : "+south";
  }
  
  // Calcular zona UTM dinamicamente
  var utmZone = getUTMZone(longitude);
  var utmHemisphere = getUTMHemisphere(latitude);
  var utmZone11N = `+proj=utm +zone=${utmZone} ${utmHemisphere} +ellps=WGS84 +datum=WGS84 +units=m +no_defs`;
  
  // OVERLAY DE TEMPERATURA DESABILITADO
  // Os overlays de GeoTIFF (temperatura/radiação solar) foram desabilitados
  // para focar apenas no cálculo de área do telhado

  // Property Data Solar API
  (async () => {
    try {
      var solar_data = await findClosestBuildingInsights(
        latitude,
        longitude,
        apiKey
      );
      
      // Verificar se os dados são válidos
      if (!solar_data || !solar_data.solarPotential) {
        showError("Não encontramos dados de telhado para esta localização. Tente clicar em outro ponto no mapa.");
        initClickToSelect();
        return;
      }
      
      // Get Data
      let maxModules = solar_data.solarPotential.maxArrayPanelsCount;
      let maxSunshineHoursPerYear = Math.round(
        solar_data.solarPotential.maxSunshineHoursPerYear
      );
      let wholeRoofSize = Number(
        solar_data.solarPotential.wholeRoofStats.areaMeters2.toFixed(2)
      );

      const element_modules_range = document.getElementById(
        "system_modules_range"
      );
      const element_modules_range_watts = document.getElementById(
        "system_modules_watts"
      );
      const element_modules_calculator_display = document.getElementById(
        "modules_calculator_display"
      );

      // Now we can safely call these functions
      if (element_modules_range && maxModules) {
        changeMaxValue(element_modules_range, maxModules);
        calculate_output(
          element_modules_range,
          element_modules_range_watts,
          element_modules_calculator_display
        );
      }

      let gsa_data = document.getElementById("gsa_data");
      if (gsa_data) {
        gsa_data.innerHTML = "Max Module Count: " + maxModules + " modules";
        gsa_data.innerHTML +=
          "<br/> Max Annual Sunshine: " + maxSunshineHoursPerYear + " hr";
        gsa_data.innerHTML +=
          "<br/> Roof Area: " + wholeRoofSize + " m<sup>2</sup>";
      }

      // Criar polígonos clicáveis para cada segmento de telhado
      createRoofSegmentPolygons(solar_data);
      
    } catch (error) {
      // Tratar erros específicos da API
      let errorMessage = "Ocorreu um erro ao carregar os dados do telhado.";
      
      if (error.message === "API_KEY_NOT_CONFIGURED") {
        errorMessage = "⚠️ API Key do Google não configurada! Configure sua chave em 'components/gc_solar_api_library/global.js' e 'index.php'";
      } else if (error.message === "API_KEY_INVALID") {
        errorMessage = "⚠️ API Key do Google inválida! Verifique se a chave está correta e se as APIs necessárias estão ativadas (Maps JavaScript API, Solar API, Geocoding API).";
      } else if (error.message === "API_KEY_FORBIDDEN") {
        errorMessage = "⚠️ API Key do Google sem permissão! Verifique as restrições da chave e se as APIs estão ativadas.";
      } else if (error.message === "NO_BUILDING_DATA") {
        errorMessage = "Não encontramos dados de telhado para esta localização. Tente clicar em outro ponto no mapa.";
      } else if (error.message === "NETWORK_ERROR") {
        errorMessage = "Erro de conexão. Verifique sua internet e tente novamente.";
      }
      
      showError(errorMessage);
    }
    
    // Inicializar funcionalidade de clique para selecionar telhado
    initClickToSelect();
  })();
  map.setTilt(0);

  // ---------------------------------------------------------------------------------------------------------------------------------------
  // Event listener for Month Change Control
  // ---------------------------------------------------------------------------------------------------------------------------------------

  function changeMonthLayer() {
    const selectedMonth = parseInt(this.value, 10); // Get the selected month as an integer
    const monthlyFluxUrl = solar_data_layers.monthlyFluxUrl;
    if (monthlyFluxUrl) {
      // Clear existing overlays
      overlays.forEach((overlay) => overlay.setMap(null));
      overlays = []; // Reset the overlays array
      // Reload the GeoTIFF layer for the selected month
      let geotiff_url = new URL(monthlyFluxUrl);
      geotiff_url.searchParams.append("key", apiKey);

      loadAndRenderGeoTIFF(
        geotiff_url.toString(),
        false,
        "monthlyFlux",
        selectedMonth
      )
        .then((canvas_result) => {
          if (canvas_result) {
            selectedOverlayElement.value = 3;
            if (!checkboxDisplayOverlays.checked) {
              checkboxDisplayOverlays.checked = true;
            }
            const { canvas, bbox } = canvas_result;

            if (maskCanvas) {
              applyMaskToOverlay(canvas, maskCanvas);
            }

            // Convert each corner of the bounding box
            var sw = proj4(utmZone11N, "EPSG:4326", [bbox[0], bbox[1]]);
            var ne = proj4(utmZone11N, "EPSG:4326", [bbox[2], bbox[3]]);

            const overlayBounds = new google.maps.LatLngBounds(
              new google.maps.LatLng(sw[1], sw[0]), // South West corner
              new google.maps.LatLng(ne[1], ne[0]) // North East corner
            );

            const overlay = new GeoTIFFOverlay(overlayBounds, canvas, map);
            overlays.push(overlay);
            
            // Garantir que o overlay seja exibido se o checkbox estiver marcado
            if (checkboxDisplayOverlays && checkboxDisplayOverlays.checked) {
              overlay.setMap(map);
            }
          }
        })
        .catch((error) => {
          console.error("Error reloading GeoTIFF for selected month:", error);
        });
    }
  }

  // --------------------------------------------------------------------------------------------------------------------------------------------
  // Event listener for hour selection
  // --------------------------------------------------------------------------------------------------------------------------------------------

  function changeHourLayer() {
    // Change the event listener to 'change' to update the hour display when the user finishes sliding
    const selectedMonth = parseInt(selectedMonthElement.value, 10);
    const selectedHour = parseInt(this.value, 10);
    const hourlyShadeUrls = solar_data_layers.hourlyShadeUrls[selectedMonth];

    if (hourlyShadeUrls) {
      // Clear existing overlays
      overlays.forEach((overlay) => overlay.setMap(null));
      overlays = [];

      // Reload the GeoTIFF layer for the selected hour
      let geotiff_url = new URL(hourlyShadeUrls);
      geotiff_url.searchParams.append("key", apiKey);

      loadAndRenderGeoTIFF(
        geotiff_url,
        false,
        "hourlyShade",
        selectedMonth,
        null,
        selectedHour
      )
        .then((canvas_result) => {
          if (canvas_result) {
            selectedOverlayElement.value = 4;
            if (!checkboxDisplayOverlays.checked) {
              checkboxDisplayOverlays.checked = true;
            }
            const { canvas, bbox } = canvas_result;

            if (maskCanvas) {
              applyMaskToOverlay(canvas, maskCanvas);
            }

            // Convert each corner of the bounding box
            var sw = proj4(utmZone11N, "EPSG:4326", [bbox[0], bbox[1]]);
            var ne = proj4(utmZone11N, "EPSG:4326", [bbox[2], bbox[3]]);

            const overlayBounds = new google.maps.LatLngBounds(
              new google.maps.LatLng(sw[1], sw[0]), // South West corner
              new google.maps.LatLng(ne[1], ne[0]) // North East corner
            );

            const overlay = new GeoTIFFOverlay(overlayBounds, canvas, map);
            overlays.push(overlay);
            
            // Garantir que o overlay seja exibido se o checkbox estiver marcado
            if (checkboxDisplayOverlays && checkboxDisplayOverlays.checked) {
              overlay.setMap(map);
            }
          }
        })
        .catch((error) => {
          console.error("Error reloading GeoTIFF for selected month:", error);
        });
    }
  }

  // --------------------------------------------------------------------------------------------------------------------------------------------
  // Event listener for layer selection
  // --------------------------------------------------------------------------------------------------------------------------------------------
  function changeTypeLayer() {
    const selectedMonth = parseInt(selectedMonthElement.value, 10);
    const selectedHour = parseInt(selectedHourElement.value, 10);
    const selectedLayer = parseInt(this.value, 10);

    const data_layer_url = solar_layers[parseInt(selectedLayer)];

    if (data_layer_url) {
      // Clear existing overlays
      overlays.forEach((overlay) => overlay.setMap(null));
      overlays = [];

      // Reload the GeoTIFF layer for the selected hour
      let geotiff_url;

      if (layer_type[selectedLayer] === "hourlyShade") {
        geotiff_url = new URL(data_layer_url[selectedMonth]);
      } else {
        geotiff_url = new URL(data_layer_url);
      }
      geotiff_url.searchParams.append("key", apiKey);

      loadAndRenderGeoTIFF(
        geotiff_url.toString(),
        false,
        layer_type[selectedLayer],
        selectedMonth,
        null,
        selectedHour
      )
        .then((canvas_result) => {
          if (canvas_result) {
            if (!checkboxDisplayOverlays.checked) {
              checkboxDisplayOverlays.checked = true;
            }

            const { canvas, bbox } = canvas_result;

            if (maskCanvas) {
              applyMaskToOverlay(canvas, maskCanvas);
            }

            // Convert each corner of the bounding box
            var sw = proj4(utmZone11N, "EPSG:4326", [bbox[0], bbox[1]]);
            var ne = proj4(utmZone11N, "EPSG:4326", [bbox[2], bbox[3]]);

            const overlayBounds = new google.maps.LatLngBounds(
              new google.maps.LatLng(sw[1], sw[0]), // South West corner
              new google.maps.LatLng(ne[1], ne[0]) // North East corner
            );

            const overlay = new GeoTIFFOverlay(overlayBounds, canvas, map);
            overlays.push(overlay);
            
            // Garantir que o overlay seja exibido se o checkbox estiver marcado
            if (checkboxDisplayOverlays && checkboxDisplayOverlays.checked) {
              overlay.setMap(map);
            }
          }
        })
        .catch((error) => {
          console.error("Error reloading GeoTIFF for selected month:", error);
        });
    }
  }

  if (!listenersAdded) {
    selectedMonthElement.addEventListener("change", changeMonthLayer);
    selectedHourElement.addEventListener("change", changeHourLayer);
    selectedOverlayElement.addEventListener("change", changeTypeLayer);
    listenersAdded = true; // Set the flag so listeners aren't added again
  }
};

// --------------------------------------------------------------------------------------------------------------------------------------------
// Funções para área do telhado (Orçamentos)
// --------------------------------------------------------------------------------------------------------------------------------------------

/**
 * Cria o contorno do telhado inteiro usando o bounding box
 */
function createRoofBoundingBox(solarData) {
  // Verificar se há bounding box
  if (!solarData || !solarData.boundingBox) {
    return null;
  }
  
  const bbox = solarData.boundingBox;
  const sw = bbox.sw || bbox.southWest;
  const ne = bbox.ne || bbox.northEast;
  
  if (!sw || !ne) {
    return null;
  }
  
  // Criar retângulo do bounding box
  const bounds = new google.maps.LatLngBounds(
    new google.maps.LatLng(sw.latitude, sw.longitude),
    new google.maps.LatLng(ne.latitude, ne.longitude)
  );
  
  // Criar polígono do contorno do telhado
  const rectangle = new google.maps.Rectangle({
    bounds: bounds,
    strokeColor: "#2E7D32",
    strokeOpacity: 0.9,
    strokeWeight: 3,
    fillColor: "#2E7D32",
    fillOpacity: 0.15,
    map: map,
    zIndex: 5
  });
  
  return rectangle;
}

/**
 * Exibe a área do telhado para orçamentos
 */
function createRoofSegmentPolygons(solarData) {
  // Limpar marcadores e polígonos anteriores
  roofSegments.forEach(item => item.setMap(null));
  segmentPolygons.forEach(polygon => polygon.setMap(null));
  segmentMarkers.forEach(marker => marker.setMap(null));
  roofSegments = [];
  segmentPolygons = [];
  segmentMarkers = [];
  roofSegmentData = [];
  excludedSegments = []; // Limpar segmentos excluídos
  
  // Verificar se há dados
  if (!solarData || !solarData.solarPotential) {
    return;
  }
  
  // Mostrar o painel de área
  const areaPanel = document.getElementById("roof_area_panel");
  if (areaPanel) {
    areaPanel.style.display = "block";
  }
  
  // Criar bounding box do telhado inteiro
  const roofBoundingBox = createRoofBoundingBox(solarData);
  if (roofBoundingBox) {
    roofSegments.push(roofBoundingBox);
  }
  
  // Guardar área total original
  originalTotalArea = solarData.solarPotential.wholeRoofStats?.areaMeters2 || 0;
  
  // Mostrar área total do telhado
  updateTotalAreaDisplay(originalTotalArea);
  
  // Verificar se há segmentos
  if (!solarData.solarPotential.roofSegmentStats) {
    return;
  }
  
  const segments = solarData.solarPotential.roofSegmentStats;
  
  // Guardar dados dos segmentos
  segments.forEach((segment) => {
    roofSegmentData.push(segment);
  });
  
  // Renderizar lista de segmentos e marcadores
  renderSegmentsList(segments);
  renderSegmentMarkers(segments);
  
  // Mostrar botão de toggle de polígonos se houver segmentos
  const toggleBtnMain = document.getElementById('toggle_polygons_btn_main');
  if (toggleBtnMain && segments.length > 0) {
    toggleBtnMain.style.display = 'block';
  }
}

/**
 * Atualiza a exibição da área total
 */
function updateTotalAreaDisplay(area) {
  const totalAreaElement = document.getElementById("total_roof_area");
  if (totalAreaElement) {
    totalAreaElement.textContent = area.toFixed(2);
  }
}

/**
 * Recalcula a área total excluindo os segmentos removidos
 */
function recalculateTotalArea() {
  let totalArea = 0;
  
  roofSegmentData.forEach((segment, index) => {
    if (!excludedSegments.includes(index)) {
      totalArea += segment.stats.areaMeters2;
    }
  });
  
  updateTotalAreaDisplay(totalArea);
  return totalArea;
}

/**
 * Renderiza a lista de segmentos no painel lateral
 */
function renderSegmentsList(segments) {
  if (segments.length <= 1) return;
  
  const segmentsList = document.getElementById("roof_segments_list");
  const segmentsContainer = document.getElementById("segments_container");
  
  if (!segmentsList || !segmentsContainer) return;
  
  segmentsList.style.display = "block";
  segmentsContainer.innerHTML = "";
  
  segments.forEach((segment, index) => {
    const area = segment.stats.areaMeters2;
    const isExcluded = excludedSegments.includes(index);
    
    const card = document.createElement("div");
    card.className = `segment-card ${isExcluded ? 'excluded' : ''}`;
    card.id = `segment-card-${index}`;
    card.innerHTML = `
      <div class="segment-header">
        <div class="segment-number">Segmento ${index + 1}</div>
        <button class="segment-toggle-btn" title="${isExcluded ? 'Restaurar segmento' : 'Remover da área total'}">
          ${isExcluded ? '➕' : '❌'}
        </button>
      </div>
      <div class="segment-area">${area.toFixed(2)}</div>
      <div class="segment-area-unit">m²</div>
      ${isExcluded ? '<div class="segment-excluded-label">Removido</div>' : ''}
    `;
    
    // Clique no card para centralizar
    card.addEventListener("click", (e) => {
      if (e.target.classList.contains('segment-toggle-btn')) return;
      
      document.querySelectorAll(".segment-card").forEach(c => c.classList.remove("selected"));
      card.classList.add("selected");
      
      if (segment.center) {
        map.panTo({ lat: segment.center.latitude, lng: segment.center.longitude });
      }
    });
    
    // Botão para alternar exclusão
    const toggleBtn = card.querySelector('.segment-toggle-btn');
    toggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleSegmentExclusion(index);
    });
    
    segmentsContainer.appendChild(card);
  });
}

/**
 * Alterna a exclusão de um segmento
 */
function toggleSegmentExclusion(index) {
  const segmentIndex = excludedSegments.indexOf(index);
  
  if (segmentIndex > -1) {
    // Restaurar segmento
    excludedSegments.splice(segmentIndex, 1);
  } else {
    // Excluir segmento
    excludedSegments.push(index);
  }
  
  // Atualizar visual do marcador
  updateMarkerAppearance(index);
  
  // Atualizar visual do polígono
  updatePolygonAppearance(index);
  
  // Atualizar card na lista
  updateSegmentCard(index);
  
  // Recalcular área total
  recalculateTotalArea();
}

/**
 * Atualiza a aparência do marcador baseado no estado de exclusão
 */
function updateMarkerAppearance(index) {
  // O índice do marcador considera o bounding box na posição 0
  const markerIndex = index + 1; // +1 porque o bounding box está na posição 0
  const marker = roofSegments[markerIndex];
  
  if (!marker || !marker.setIcon) return;
  
  const isExcluded = excludedSegments.includes(index);
  
  marker.setIcon({
    path: google.maps.SymbolPath.CIRCLE,
    scale: 15,
    fillColor: isExcluded ? "#9E9E9E" : "#2E7D32", // Cinza se excluído, verde se ativo
    fillOpacity: isExcluded ? 0.5 : 0.9,
    strokeColor: isExcluded ? "#757575" : "#FFFFFF",
    strokeWeight: 2,
  });
  
  marker.setLabel({
    text: String(index + 1),
    color: isExcluded ? "#424242" : "#FFFFFF",
    fontSize: "14px",
    fontWeight: "bold"
  });
}

/**
 * Atualiza o card do segmento na lista
 */
function updateSegmentCard(index) {
  const card = document.getElementById(`segment-card-${index}`);
  if (!card) return;
  
  const isExcluded = excludedSegments.includes(index);
  const segment = roofSegmentData[index];
  const area = segment.stats.areaMeters2;
  
  card.className = `segment-card ${isExcluded ? 'excluded' : ''}`;
  card.innerHTML = `
    <div class="segment-header">
      <div class="segment-number">Segmento ${index + 1}</div>
      <button class="segment-toggle-btn" title="${isExcluded ? 'Restaurar segmento' : 'Remover da área total'}">
        ${isExcluded ? '➕' : '❌'}
      </button>
    </div>
    <div class="segment-area">${area.toFixed(2)}</div>
    <div class="segment-area-unit">m²</div>
    ${isExcluded ? '<div class="segment-excluded-label">Removido</div>' : ''}
  `;
  
  // Re-adicionar listeners
  card.addEventListener("click", (e) => {
    if (e.target.classList.contains('segment-toggle-btn')) return;
    
    document.querySelectorAll(".segment-card").forEach(c => c.classList.remove("selected"));
    card.classList.add("selected");
    
    if (segment.center) {
      map.panTo({ lat: segment.center.latitude, lng: segment.center.longitude });
    }
  });
  
  const toggleBtn = card.querySelector('.segment-toggle-btn');
  toggleBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleSegmentExclusion(index);
  });
}

/**
 * Renderiza os marcadores e polígonos aproximados dos segmentos no mapa
 */
function renderSegmentMarkers(segments) {
  segments.forEach((segment, index) => {
    const center = segment.center;
    if (!center || !center.latitude || !center.longitude) return;
    
    const isExcluded = excludedSegments.includes(index);
    const area = segment.stats.areaMeters2;
    const azimuth = segment.azimuthDegrees || 0;
    
    // Criar polígono aproximado baseado na área e orientação
    const polygon = createApproximateSegmentPolygon(
      center.latitude, 
      center.longitude, 
      area, 
      azimuth,
      isExcluded,
      index
    );
    
    if (polygon) {
      segmentPolygons.push(polygon);
      roofSegments.push(polygon);
      // Aplicar visibilidade inicial
      polygon.setMap(showSegmentPolygons ? map : null);
    }
    
    // Criar marcador clicável no centro
    const marker = new google.maps.Marker({
      position: { lat: center.latitude, lng: center.longitude },
      map: map,
      label: {
        text: String(index + 1),
        color: isExcluded ? "#424242" : "#FFFFFF",
        fontSize: "14px",
        fontWeight: "bold"
      },
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 15,
        fillColor: isExcluded ? "#9E9E9E" : "#2E7D32",
        fillOpacity: isExcluded ? 0.5 : 0.9,
        strokeColor: isExcluded ? "#757575" : "#FFFFFF",
        strokeWeight: 2,
      },
      title: `Clique para ${isExcluded ? 'restaurar' : 'remover'} - Segmento ${index + 1}: ${area.toFixed(2)} m²`,
      zIndex: 20,
      cursor: 'pointer'
    });
    
    // Clique no marcador para alternar exclusão
    marker.addListener("click", function() {
      toggleSegmentExclusion(index);
      
      // Atualizar título do marcador
      const newExcluded = excludedSegments.includes(index);
      marker.setTitle(`Clique para ${newExcluded ? 'restaurar' : 'remover'} - Segmento ${index + 1}: ${area.toFixed(2)} m²`);
    });
    
    segmentMarkers.push(marker);
    roofSegments.push(marker);
  });
}

/**
 * Cria um polígono aproximado para um segmento de telhado
 * Baseado na área, centro e orientação (azimuth)
 */
function createApproximateSegmentPolygon(lat, lng, areaM2, azimuthDegrees, isExcluded, segmentIndex) {
  // Calcular dimensões aproximadas (assumindo proporção 1.5:1 típica de telhados)
  const ratio = 1.5;
  const width = Math.sqrt(areaM2 / ratio);
  const height = width * ratio;
  
  // Converter metros para graus (aproximado)
  const metersPerDegreeLat = 111320;
  const metersPerDegreeLng = 111320 * Math.cos(lat * Math.PI / 180);
  
  const halfWidthDeg = (width / 2) / metersPerDegreeLng;
  const halfHeightDeg = (height / 2) / metersPerDegreeLat;
  
  // Criar retângulo e rotacionar pelo azimuth
  const azimuthRad = (azimuthDegrees - 90) * Math.PI / 180; // Ajuste para orientação do mapa
  
  // Pontos do retângulo antes da rotação
  const corners = [
    { x: -halfWidthDeg, y: -halfHeightDeg },
    { x: halfWidthDeg, y: -halfHeightDeg },
    { x: halfWidthDeg, y: halfHeightDeg },
    { x: -halfWidthDeg, y: halfHeightDeg }
  ];
  
  // Rotacionar cada ponto
  const rotatedCorners = corners.map(corner => {
    const rotX = corner.x * Math.cos(azimuthRad) - corner.y * Math.sin(azimuthRad);
    const rotY = corner.x * Math.sin(azimuthRad) + corner.y * Math.cos(azimuthRad);
    return {
      lat: lat + rotY,
      lng: lng + rotX
    };
  });
  
  // Cores baseadas no azimuth para diferenciar segmentos
  const colors = ['#FF5722', '#2196F3', '#4CAF50', '#9C27B0', '#FF9800', '#00BCD4', '#E91E63', '#8BC34A'];
  const color = colors[segmentIndex % colors.length];
  
  // Criar o polígono
  const polygon = new google.maps.Polygon({
    paths: rotatedCorners,
    strokeColor: isExcluded ? '#9E9E9E' : color,
    strokeOpacity: isExcluded ? 0.4 : 0.9,
    strokeWeight: 2,
    fillColor: isExcluded ? '#9E9E9E' : color,
    fillOpacity: isExcluded ? 0.1 : 0.25,
    map: map,
    zIndex: 10,
    clickable: true
  });
  
  // Adicionar info window ao clicar no polígono
  const infoContent = `
    <div style="padding: 8px; font-family: Arial, sans-serif;">
      <strong>Segmento ${segmentIndex + 1}</strong><br>
      <span style="color: #2E7D32; font-size: 1.2em; font-weight: bold;">${areaM2.toFixed(2)} m²</span><br>
      <small style="color: #666;">Orientação: ${azimuthDegrees.toFixed(0)}°</small><br>
      <small style="color: #999;">⚠️ Área aproximada (Google Solar API não fornece polígono exato)</small>
    </div>
  `;
  
  const infoWindow = new google.maps.InfoWindow({
    content: infoContent
  });
  
  polygon.addListener('click', function(event) {
    infoWindow.setPosition(event.latLng);
    infoWindow.open(map);
  });
  
  // Guardar referência ao índice do segmento
  polygon.segmentIndex = segmentIndex;
  
  return polygon;
}

/**
 * Atualiza a aparência do polígono quando o segmento é excluído/restaurado
 */
function updatePolygonAppearance(segmentIndex) {
  const isExcluded = excludedSegments.includes(segmentIndex);
  const colors = ['#FF5722', '#2196F3', '#4CAF50', '#9C27B0', '#FF9800', '#00BCD4', '#E91E63', '#8BC34A'];
  const color = colors[segmentIndex % colors.length];
  
  // Encontrar o polígono correspondente no array de polígonos
  segmentPolygons.forEach(polygon => {
    if (polygon.segmentIndex === segmentIndex && polygon.setOptions) {
      polygon.setOptions({
        strokeColor: isExcluded ? '#9E9E9E' : color,
        strokeOpacity: isExcluded ? 0.4 : 0.9,
        fillColor: isExcluded ? '#9E9E9E' : color,
        fillOpacity: isExcluded ? 0.1 : 0.25
      });
    }
  });
}

/**
 * Mostrar/ocultar apenas os polígonos dos segmentos (mantém marcadores visíveis)
 */
function toggleSegmentPolygonsVisibility(show) {
  showSegmentPolygons = show;
  segmentPolygons.forEach(polygon => {
    polygon.setMap(show ? map : null);
  });
  
  // Atualizar botões na interface
  const toggleBtn = document.getElementById('toggle_polygons_btn');
  const toggleBtnMain = document.getElementById('toggle_polygons_btn_main');
  
  const buttonText = show ? '🙈 Ocultar Polígonos' : '👁️ Mostrar Polígonos';
  
  if (toggleBtn) {
    toggleBtn.textContent = buttonText;
    toggleBtn.classList.toggle('active', show);
  }
  
  if (toggleBtnMain) {
    toggleBtnMain.textContent = buttonText;
    toggleBtnMain.classList.toggle('active', show);
  }
}

/**
 * Mostrar/ocultar marcadores de segmentos de telhado
 */
function toggleRoofSegments(show) {
  roofSegments.forEach(item => {
    item.setMap(show ? map : null);
  });
}

/**
 * Obtém a área total do telhado
 */
function getRoofArea() {
  const areaElement = document.getElementById("total_roof_area");
  return areaElement ? parseFloat(areaElement.textContent) : 0;
}

// --------------------------------------------------------------------------------------------------------------------------------------------
// Funcionalidade de clique no mapa para selecionar telhado
// --------------------------------------------------------------------------------------------------------------------------------------------

/**
 * Inicializa o listener de clique no mapa
 */
function initMapClickListener() {
  if (!map) return;
  
  map.addListener("click", function(event) {
    const clickedLat = event.latLng.lat();
    const clickedLng = event.latLng.lng();
    
    
    // Recalcular área para a nova posição
    recalculateRoofArea(clickedLat, clickedLng);
  });
  
}

/**
 * Cria ou atualiza o marcador do usuário
 */
function updateUserMarker(lat, lng) {
  // Remover marcador anterior se existir
  if (userMarker) {
    userMarker.setMap(null);
  }
  
  // Criar novo marcador arrastável
  userMarker = new google.maps.Marker({
    position: { lat: lat, lng: lng },
    map: map,
    draggable: true,
    icon: {
      path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
      scale: 8,
      fillColor: "#D32F2F",
      fillOpacity: 1,
      strokeColor: "#FFFFFF",
      strokeWeight: 3,
    },
    title: "Arraste para ajustar a posição",
    zIndex: 100,
    animation: google.maps.Animation.DROP
  });
  
  // Listener para quando o marcador for arrastado
  userMarker.addListener("dragend", function() {
    const newLat = userMarker.getPosition().lat();
    const newLng = userMarker.getPosition().lng();
    
    
    // Recalcular área para a nova posição
    recalculateRoofArea(newLat, newLng);
  });
  
  // Atualizar informações de localização na interface
  const latElement = document.getElementById("selected_lat");
  const lngElement = document.getElementById("selected_lng");
  
  if (latElement) latElement.textContent = lat.toFixed(6);
  if (lngElement) lngElement.textContent = lng.toFixed(6);
}

/**
 * Mostra o indicador de carregamento
 */
function showLoading(show) {
  const loadingIndicator = document.getElementById("loading_indicator");
  if (loadingIndicator) {
    loadingIndicator.style.display = show ? "flex" : "none";
  }
  isCalculating = show;
}

/**
 * Mostra mensagem de erro
 */
function showError(message) {
  const errorPanel = document.getElementById("error_panel");
  const errorText = document.getElementById("error_text");
  const areaPanel = document.getElementById("roof_area_panel");
  const segmentsList = document.getElementById("roof_segments_list");
  
  if (errorPanel) {
    errorPanel.style.display = "block";
    if (errorText) errorText.textContent = message;
  }
  
  if (areaPanel) areaPanel.style.display = "none";
  if (segmentsList) segmentsList.style.display = "none";
}

/**
 * Esconde mensagem de erro
 */
function hideError() {
  const errorPanel = document.getElementById("error_panel");
  if (errorPanel) {
    errorPanel.style.display = "none";
  }
}

/**
 * Recalcula a área do telhado para uma nova posição
 * Usa o serviço de segmentação selecionado pelo usuário
 */
async function recalculateRoofArea(newLat, newLng) {
  // Evitar múltiplos cálculos simultâneos
  if (isCalculating) {
    return;
  }
  
  showLoading(true);
  hideError();
  
  // Atualizar coordenadas globais
  latitude = newLat;
  longitude = newLng;
  
  // Atualizar marcador
  updateUserMarker(newLat, newLng);
  
  // Centralizar mapa na nova posição
  map.panTo({ lat: newLat, lng: newLng });
  
  // Atualizar instrução
  const instructionText = document.getElementById("instruction_text");
  
  // Verificar qual método de segmentação está selecionado
  const currentMethod = typeof RoofSegmentationService !== 'undefined' 
    ? RoofSegmentationService.getSegmentationType() 
    : 'google_solar';
  
  const methodNames = {
    'google_solar': 'Google Solar API',
    'sam': 'SAM (IA)',
    'opencv': 'OpenCV',
    'roboflow': 'Roboflow',
    'manual': 'Manual'
  };
  
  if (instructionText) {
    instructionText.innerHTML = `⏳ Calculando área com <strong>${methodNames[currentMethod]}</strong>...`;
  }
  
  try {
    let result = null;
    
    // Usar o serviço de segmentação se disponível e não for Google Solar
    if (typeof RoofSegmentationService !== 'undefined' && currentMethod !== 'google_solar') {
      result = await RoofSegmentationService.segmentRoof(newLat, newLng, document.getElementById('map'));
      
      if (result && result.success) {
        // Limpar elementos anteriores
        roofSegments.forEach(item => item.setMap(null));
        segmentPolygons.forEach(polygon => polygon.setMap(null));
        segmentMarkers.forEach(marker => marker.setMap(null));
        roofSegments = [];
        segmentPolygons = [];
        segmentMarkers = [];
        roofSegmentData = [];
        
        // Remover polígono anterior se existir
        if (window.currentRoofPolygon) {
          window.currentRoofPolygon.setMap(null);
        }
        
        // Mostrar área calculada
        const totalAreaElement = document.getElementById("total_roof_area");
        if (totalAreaElement) {
          totalAreaElement.textContent = result.areaM2.toFixed(2);
        }
        
        // Mostrar painel de área
        const areaPanel = document.getElementById("roof_area_panel");
        if (areaPanel) {
          areaPanel.style.display = "block";
        }
        
        // Atualizar nota sobre o método
        const noteElement = document.querySelector(".roof-area-note em");
        if (noteElement) {
          noteElement.textContent = `Área calculada via ${methodNames[currentMethod]}${result.note ? ' (SIMULAÇÃO)' : ''}`;
        }
        
        // Desenhar polígono se disponível
        if (result.polygon && result.polygon.length >= 3) {
          window.currentRoofPolygon = new google.maps.Polygon({
            paths: result.polygon,
            strokeColor: '#FF5722',
            strokeOpacity: 0.9,
            strokeWeight: 3,
            fillColor: '#FF5722',
            fillOpacity: 0.25,
            map: map,
            zIndex: 50
          });
        }
        
        // Esconder lista de segmentos (não aplicável para métodos não-Google)
        const segmentsList = document.getElementById("roof_segments_list");
        if (segmentsList) {
          segmentsList.style.display = "none";
        }
        
        if (instructionText) {
          instructionText.innerHTML = `✅ Área calculada via <strong>${methodNames[currentMethod]}</strong>! Clique em outro local para recalcular`;
        }
        
        
      } else {
        // Erro no método alternativo
        showError(result?.error || "Não foi possível calcular a área com este método.");
        
        if (instructionText) {
          instructionText.innerHTML = `⚠️ ${methodNames[currentMethod]} não encontrou telhado. Tente outro método ou local.`;
        }
      }
      
    } else {
      // Usar Google Solar API (método padrão)
      try {
        const solarData = await findClosestBuildingInsights(newLat, newLng, apiKey);
        
        if (solarData && solarData.solarPotential && solarData.solarPotential.wholeRoofStats) {
        // Limpar elementos anteriores
        roofSegments.forEach(item => item.setMap(null));
        segmentPolygons.forEach(polygon => polygon.setMap(null));
        segmentMarkers.forEach(marker => marker.setMap(null));
        roofSegments = [];
        segmentPolygons = [];
        segmentMarkers = [];
        roofSegmentData = [];
        
        // Remover polígono anterior se existir
        if (window.currentRoofPolygon) {
          window.currentRoofPolygon.setMap(null);
          window.currentRoofPolygon = null;
        }
        
        // Atualizar nota
        const noteElement = document.querySelector(".roof-area-note em");
        if (noteElement) {
          noteElement.textContent = "Área calculada via satélite pela Google Solar API";
        }
        
        // Criar visualização do telhado
        createRoofSegmentPolygons(solarData);
        
        if (instructionText) {
          instructionText.innerHTML = "✅ Área calculada via <strong>Google Solar API</strong>! Arraste o marcador ou clique em outro local";
        }
        
        
      } else {
        showError("Não encontramos dados de telhado para esta localização. Tente clicar em cima de um edifício visível no mapa.");
        
        if (instructionText) {
          instructionText.innerHTML = "⚠️ Telhado não encontrado. <strong>Clique em outro local</strong> no mapa";
        }
      }
      } catch (apiError) {
        // Tratar erros específicos da API
        let errorMessage = "Ocorreu um erro ao calcular a área. Tente novamente.";
        
        if (apiError.message === "API_KEY_NOT_CONFIGURED") {
          errorMessage = "⚠️ API Key do Google não configurada! Configure sua chave em 'components/gc_solar_api_library/global.js' e 'index.php'";
        } else if (apiError.message === "API_KEY_INVALID") {
          errorMessage = "⚠️ API Key do Google inválida! Verifique se a chave está correta e se as APIs necessárias estão ativadas.";
        } else if (apiError.message === "API_KEY_FORBIDDEN") {
          errorMessage = "⚠️ API Key do Google sem permissão! Verifique as restrições da chave.";
        } else if (apiError.message === "NO_BUILDING_DATA") {
          errorMessage = "Não encontramos dados de telhado para esta localização. Tente clicar em outro ponto no mapa.";
        } else if (apiError.message === "NETWORK_ERROR") {
          errorMessage = "Erro de conexão. Verifique sua internet e tente novamente.";
        }
        
        showError(errorMessage);
        
        if (instructionText) {
          instructionText.innerHTML = "❌ Erro ao calcular. <strong>Clique em outro local</strong> para tentar novamente";
        }
      }
    }
    
  } catch (error) {
    showError("Ocorreu um erro inesperado. Tente novamente.");
    
    if (instructionText) {
      instructionText.innerHTML = "❌ Erro ao calcular. <strong>Clique em outro local</strong> para tentar novamente";
    }
  }
  
  showLoading(false);
}

/**
 * Inicializa a funcionalidade de clique quando o mapa carregar
 */
function initClickToSelect() {
  // Aguardar o mapa estar pronto
  if (map) {
    initMapClickListener();
    
    // Se já temos coordenadas, criar marcador inicial
    if (latitude && longitude) {
      updateUserMarker(latitude, longitude);
    }
  }
}

