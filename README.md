# Calculadora de Área de Telhados

Sistema web para cálculo de área de telhados utilizando a Google Solar API e outras técnicas de segmentação. Desenvolvido para orçamentos de construção e reforma.

## 🚀 Funcionalidades

- **Cálculo automático de área de telhados** em metros quadrados
- **Múltiplos métodos de segmentação**:
  - Google Solar API (padrão)
  - SAM (Segment Anything Model) - em desenvolvimento
  - OpenCV - em desenvolvimento
  - Roboflow - em desenvolvimento
  - Manual - em desenvolvimento
- **Visualização interativa** no Google Maps
- **Exclusão de segmentos** individualmente do cálculo total
- **Interface responsiva** e intuitiva

## 📋 Pré-requisitos

- Servidor web local (PHP, Node.js, Python, etc.)
- Chave da API do Google Maps com as seguintes APIs habilitadas:
  - Maps JavaScript API
  - Solar API
  - Geocoding API

## ⚙️ Configuração

### 1. Clone o repositório

```bash
git clone https://github.com/juniorlira15/meubiscatepro.git
cd meubiscatepro
```

### 2. Configure sua API Key

**Arquivo: `components/gc_solar_api_library/global.js`**
```javascript
const apiKey = "SUA_CHAVE_API_AQUI";
```

**Arquivo: `index.php` (linha 47)**
```html
<script async src="https://maps.googleapis.com/maps/api/js?key=SUA_CHAVE_API_AQUI&loading=async&callback=onGoogleMapsLoaded&libraries=maps,marker&v=beta"></script>
```

### 3. Configure as APIs no Google Cloud Console

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Habilite as seguintes APIs:
   - Maps JavaScript API
   - Solar API
   - Geocoding API
3. Configure as restrições de referrer (para desenvolvimento local):
   - `http://localhost:*`
   - `http://127.0.0.1:*`

### 4. Inicie o servidor web

**PHP:**
```bash
php -S localhost:8000
```

**Node.js (http-server):**
```bash
npx http-server -p 8000
```

**Python:**
```bash
python -m http.server 8000
```

### 5. Acesse no navegador

```
http://localhost:8000
```

## 📁 Estrutura do Projeto

```
├── components/
│   ├── gc_solar_api_library/    # Biblioteca principal
│   │   ├── global.js            # Variáveis globais e configuração
│   │   ├── maps.js              # Lógica do mapa e visualização
│   │   ├── solar_api.js         # Integração com Google Solar API
│   │   └── geotiff.js           # Manipulação de GeoTIFF
│   ├── geotiff/                 # Biblioteca GeoTIFF.js
│   └── proj4/                   # Biblioteca Proj4.js
├── services/                     # Serviços de segmentação
│   ├── roofSegmentationService.js
│   ├── googleSolarSegmentation.js
│   ├── samSegmentation.js
│   ├── opencvSegmentation.js
│   ├── roboflowSegmentation.js
│   └── manualSegmentation.js
├── index.php                     # Arquivo principal
├── style.css                     # Estilos
└── README.md                     # Este arquivo
```

## 🎯 Como Usar

1. **Digite um endereço** no campo de busca
2. **Clique em "Buscar"** para localizar o imóvel
3. O sistema calculará automaticamente a área total do telhado
4. **Clique em um marcador** no mapa para excluir aquele segmento do cálculo
5. **Clique em outro ponto** do telhado para recalcular a área

## 🔧 Tecnologias Utilizadas

- **Google Maps JavaScript API** - Visualização de mapas
- **Google Solar API** - Dados de segmentação de telhados
- **GeoTIFF.js** - Manipulação de arquivos GeoTIFF
- **Proj4.js** - Transformações de coordenadas
- **HTML5 / CSS3 / JavaScript** - Interface e lógica

## 📝 Notas

- O projeto foi adaptado de uma biblioteca de painéis solares para cálculo de área de telhados
- A Google Solar API fornece segmentação aproximada; métodos alternativos estão em desenvolvimento
- Funciona para clientes em Portugal e Europa

## 📄 Licença

Consulte o arquivo `LICENSE` para mais informações.

## 👤 Autor

Desenvolvido com base no projeto original de [Gilberto Cortez - InteractiveUtopia.com](https://interactiveutopia.com)

---

**⚠️ Importante:** Não commite sua chave de API no repositório. Use variáveis de ambiente ou arquivos de configuração locais.
