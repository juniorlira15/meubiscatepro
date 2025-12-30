<!DOCTYPE html>
<html lang="en">

<head>
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
    <meta http-equiv="Pragma" content="no-cache" />
    <meta http-equiv="Expires" content="0" />
    <meta name="theme-col-lgor" content="#FFE3C8">

    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <meta name="viewport" content="width=device-width,minimum-scale=1,initial-scale=1">

    <meta name="robots" content="noindex">

    <title>Google Solar API by Interactive Utopia</title>

    <!-- CSS Framework -->
    <link rel="stylesheet" href="components/bootstrap/bootstrap.min.css">
    <!-- CSS -->
    <link rel="stylesheet" href="style.css">

    <!-- JavaScript -->
    <!-- Definir stub da função callback antes de carregar o Google Maps -->
    <script>
      // Stub inicial para garantir que a função esteja disponível quando o Google Maps carregar
      window.onGoogleMapsLoaded = window.onGoogleMapsLoaded || function() {
        console.log("Aguardando definição completa de onGoogleMapsLoaded...");
      };
    </script>
    <!-- Library -->
    <script src="components/gc_solar_api_library/global.js" defer></script>
    <script src="components/gc_solar_api_library/geotiff.js" defer></script>
    <script src="components/gc_solar_api_library/solar_api.js" defer></script>
    <script src="components/gc_solar_api_library/maps.js" defer></script>
    <!-- Frameworks -->
    <script src="components/geotiff/geotiff.js" defer></script>
    <script src="components/proj4/proj4.js" defer></script>
    
    <!-- Serviços de Segmentação de Telhado -->
    <script src="services/roofSegmentationService.js" defer></script>
    <script src="services/googleSolarSegmentation.js" defer></script>
    <script src="services/samSegmentation.js" defer></script>
    <script src="services/opencvSegmentation.js" defer></script>
    <script src="services/roboflowSegmentation.js" defer></script>
    <script src="services/manualSegmentation.js" defer></script>
    <!-- Google Maps API - sem defer para garantir que a função callback esteja disponível -->
    <script async src="https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_API_KEY_HERE&loading=async&callback=onGoogleMapsLoaded&libraries=maps,marker&v=beta"></script>


</head>

<body>
    <!-- Page Header -->
    <header class="container">
        <div class="row">
            <div class="col-lg-4">
                <div class="navbar-header">
                    <a class="navbar-brand" href="https://InteractiveUtopia.com" title="Go Home">
                        <img src="/images/logo.jpg" class="mainLogo" alt="Interactive Utopia Logo" />
                    </a>
                </div>
            </div>
            <div class="col-lg d-flex align-items-end justify-content-end">
                <h1 class="header-title text-right">Solar Power Estimate</h1>
            </div>
        </div>
    </header>

    <!-- Google Solar API Address -->
    <div class="row address_container">
        <div class="col-2">
            <label for="property_address_input">Address: </label>
        </div>
        <div class="col">
            <input type="text" name="property_address_input" id="property_address_input">
        </div>
        <div class="col-2">
            <button onclick="getLatLong();">Get Solar Data</button>
        </div>
    </div>

    <!-- Seletor de Método de Segmentação -->
    <div class="row segmentation-selector">
        <div class="col-12">
            <div class="selector-container">
                <label>🔧 Método de Detecção:</label>
                <div class="method-buttons">
                    <button class="method-btn active" data-method="google_solar" onclick="selectSegmentationMethod('google_solar')">
                        <span class="method-icon">🌐</span>
                        <span class="method-name">Google Solar</span>
                        <span class="method-status">Ativo</span>
                    </button>
                    <button class="method-btn" data-method="sam" onclick="selectSegmentationMethod('sam')">
                        <span class="method-icon">🤖</span>
                        <span class="method-name">SAM (IA)</span>
                        <span class="method-status">Beta</span>
                    </button>
                    <button class="method-btn" data-method="opencv" onclick="selectSegmentationMethod('opencv')">
                        <span class="method-icon">👁️</span>
                        <span class="method-name">OpenCV</span>
                        <span class="method-status">Local</span>
                    </button>
                    <button class="method-btn" data-method="roboflow" onclick="selectSegmentationMethod('roboflow')">
                        <span class="method-icon">🎯</span>
                        <span class="method-name">Roboflow</span>
                        <span class="method-status">ML</span>
                    </button>
                    <button class="method-btn" data-method="manual" onclick="selectSegmentationMethod('manual')">
                        <span class="method-icon">✏️</span>
                        <span class="method-name">Manual</span>
                        <span class="method-status">Desenhar</span>
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Instruções para o usuário -->
    <div class="row instruction-bar" id="instruction_bar">
        <div class="col-12 text-center">
            <span id="instruction_text">📍 Digite um endereço acima ou <strong>clique diretamente no mapa</strong> para selecionar o telhado</span>
        </div>
    </div>

    <!-- Google Maps API Container -->
    <div class="google_map_container">
        <div id="map" class="google_map"></div>
        <div id="canvas_div" style="display: none;"></div>
        
        <!-- Indicador de carregamento -->
        <div id="loading_indicator" style="display: none;">
            <div class="loading-spinner"></div>
            <span>Calculando área do telhado...</span>
        </div>
    </div>

    <!-- Controles ocultos necessários para o funcionamento (mantidos para compatibilidade) -->
    <div style="display: none;">
        <select id="overlaySelect"><option value="2" selected>Annual Flux</option></select>
        <input type="range" id="monthSlider" min="0" max="11" value="6" step="1">
        <input type="range" id="hourSlider" min="0" max="23" value="12" step="1">
        <span id="monthName">July</span>
        <span id="hourDisplay">12 PM</span>
        <input type="checkbox" id="toggleAllOverlays" checked>
        <input type="number" id="system_modules_watts" value="395">
        <input type="range" id="system_modules_range" min="1" max="100">
        <span id="modules_range_display_qty"></span>
        <span id="modules_calculator_display"></span>
        <div id="gsa_data"></div>
    </div>

    <!-- Painel de Área do Telhado para Orçamentos -->
    <div class="row" id="roof_area_panel" style="display: none; margin-top: 20px;">
        <div class="col-md-8 text-center">
            <h2>🏠 Área do Telhado</h2>
            <div class="roof-area-result">
                <div class="roof-area-value">
                    <span id="total_roof_area">-</span>
                </div>
                <div class="roof-area-unit">metros quadrados (m²)</div>
            </div>
            <p class="roof-area-note">
                <em>Área calculada via satélite pela Google Solar API</em>
            </p>
        </div>
        <div class="col-md-4">
            <div class="location-info">
                <h3>📍 Localização</h3>
                <p><strong>Latitude:</strong> <span id="selected_lat">-</span></p>
                <p><strong>Longitude:</strong> <span id="selected_lng">-</span></p>
                <p class="location-tip">
                    <em>💡 Arraste o marcador no mapa ou clique em outro local para recalcular</em>
                </p>
            </div>
        </div>
    </div>
    
    <!-- Segmentos do telhado (se houver múltiplas águas) -->
    <div class="row" id="roof_segments_list" style="display: none; margin-top: 10px;">
        <div class="col-12">
            <h3>📐 Detalhes por Segmento</h3>
            <p><em>O telhado possui múltiplas águas/seções</em></p>
            <p class="segment-instruction">
                <strong>💡 Dica:</strong> Clique em um marcador <span class="marker-example">●</span> no mapa ou no botão ❌ para remover da área total
            </p>
            <div id="segments_container"></div>
        </div>
    </div>
    
    <!-- Mensagem de erro -->
    <div class="row" id="error_panel" style="display: none; margin-top: 20px;">
        <div class="col-12 text-center">
            <div class="error-message">
                <h3>⚠️ Não foi possível calcular</h3>
                <p id="error_text">Não encontramos dados de telhado para esta localização. Tente clicar em outro ponto.</p>
            </div>
        </div>
    </div>

    <!-- Script de controle dos métodos de segmentação -->
    <script>
        // Variável global para o método atual
        var currentMethod = 'google_solar';
        
        // Função para selecionar método de segmentação
        function selectSegmentationMethod(method) {
            currentMethod = method;
            
            // Atualizar botões
            document.querySelectorAll('.method-btn').forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.method === method) {
                    btn.classList.add('active');
                }
            });
            
            // Atualizar serviço
            if (typeof RoofSegmentationService !== 'undefined') {
                RoofSegmentationService.setSegmentationType(method);
            }
            
            // Atualizar instruções baseado no método
            updateInstructionsForMethod(method);
            
            console.log('Método de segmentação alterado para:', method);
        }
        
        // Atualiza as instruções baseado no método selecionado
        function updateInstructionsForMethod(method) {
            const instructionText = document.getElementById('instruction_text');
            if (!instructionText) return;
            
            const instructions = {
                'google_solar': '📍 Clique no mapa para calcular a área do telhado via <strong>Google Solar API</strong>',
                'sam': '🤖 Clique no telhado - o modelo <strong>SAM (IA)</strong> irá segmentar automaticamente',
                'opencv': '👁️ Clique no telhado - <strong>OpenCV</strong> detectará as bordas automaticamente',
                'roboflow': '🎯 Clique no telhado - <strong>Roboflow ML</strong> identificará o edifício',
                'manual': '✏️ Clique nos cantos do telhado para <strong>desenhar o contorno manualmente</strong>'
            };
            
            instructionText.innerHTML = instructions[method] || instructions['google_solar'];
        }
        
        // Função para executar segmentação com o método atual
        async function executeSegmentation(lat, lng) {
            console.log('Executando segmentação com método:', currentMethod);
            
            // Usar o serviço de segmentação se disponível
            if (typeof RoofSegmentationService !== 'undefined') {
                const result = await RoofSegmentationService.segmentRoof(lat, lng);
                console.log('Resultado da segmentação:', result);
                
                // Se tiver polígono, desenhar no mapa
                if (result.success && result.polygon && result.polygon.length > 0) {
                    drawPolygonOnMap(result.polygon);
                }
                
                // Atualizar área se diferente do Google Solar
                if (result.method !== 'google_solar' && result.areaM2 > 0) {
                    const areaElement = document.getElementById('total_roof_area');
                    if (areaElement) {
                        areaElement.textContent = result.areaM2.toFixed(2);
                    }
                    
                    // Mostrar nota se for simulação
                    if (result.note) {
                        console.warn(result.note);
                    }
                }
                
                return result;
            }
            
            return null;
        }
        
        // Desenha polígono no mapa
        function drawPolygonOnMap(polygon) {
            if (!map || !polygon || polygon.length < 3) return;
            
            // Remover polígono anterior se existir
            if (window.currentRoofPolygon) {
                window.currentRoofPolygon.setMap(null);
            }
            
            // Criar novo polígono
            window.currentRoofPolygon = new google.maps.Polygon({
                paths: polygon,
                strokeColor: '#FF5722',
                strokeOpacity: 0.9,
                strokeWeight: 3,
                fillColor: '#FF5722',
                fillOpacity: 0.2,
                map: map,
                zIndex: 50
            });
        }
    </script>

</body>

</html>