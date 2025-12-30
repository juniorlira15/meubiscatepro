# 🔧 Guia de Configuração - Solar API Library

Este guia explica como configurar e rodar o projeto localmente.

## 📋 Pré-requisitos

1. **Google API Key** com acesso às seguintes APIs:
   - Google Maps JavaScript API
   - Google Solar API
   
   > 💡 **Como obter a API Key:**
   > 1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)
   > 2. Crie um projeto ou selecione um existente
   > 3. Ative as APIs: **Maps JavaScript API** e **Solar API**
   > 4. Crie uma credencial (API Key)
   > 5. Configure restrições de segurança (recomendado)

2. **Servidor Web Local** (escolha uma opção):
   - **PHP Built-in Server** (recomendado - já vem com PHP)
   - **Python HTTP Server**
   - **Node.js http-server**
   - Qualquer servidor web local (Apache, Nginx, etc.)

## ⚙️ Configuração

### Passo 1: Configurar a API Key

Você precisa inserir sua API Key do Google em **2 lugares**:

#### 1.1. Arquivo `components/gc_solar_api_library/global.js`

Localize a linha 16 e substitua `{INSERT_API_KEY}` pela sua API Key:

```javascript
const apiKey = "SUA_API_KEY_AQUI"; // Substitua {INSERT_API_KEY}
```

#### 1.2. Arquivo `index.php`

Localize a linha 31 e substitua `{INSERT_API_KEY}` pela mesma API Key:

```html
<script async src="https://maps.googleapis.com/maps/api/js?key=SUA_API_KEY_AQUI&loading=async&callback=onGoogleMapsLoaded&libraries=maps,marker&v=beta" defer></script>
```

### Passo 2: Configurar Coordenadas Padrão (Opcional)

No arquivo `components/gc_solar_api_library/global.js`, você pode alterar as coordenadas padrão (linhas 20-21):

```javascript
var latitude = 32.7720012;   // Sua latitude padrão
var longitude = -117.0726966; // Sua longitude padrão
```

### Passo 3: Verificar Imagem do Logo (Opcional)

O arquivo `index.php` referencia uma imagem em `/images/logo.jpg` (linha 43). Se você não tiver essa imagem, pode:
- Criar a pasta `images` na raiz do projeto
- Adicionar uma imagem `logo.jpg`
- Ou remover/comentar essa linha se não for necessária

## 🚀 Como Rodar Localmente

### Opção 1: PHP Built-in Server (Recomendado)

Se você tem PHP instalado:

```bash
# Navegue até a pasta do projeto
cd "/Users/junior/Web Projects/Solar_API_Library-main"

# Inicie o servidor na porta 8000
php -S localhost:8000
```

Depois acesse: `http://localhost:8000`

### Opção 2: Python HTTP Server

Se você tem Python instalado:

```bash
# Python 3
cd "/Users/junior/Web Projects/Solar_API_Library-main"
python3 -m http.server 8000
```

Depois acesse: `http://localhost:8000`

### Opção 3: Node.js http-server

Se você tem Node.js instalado:

```bash
# Instale o http-server globalmente (se ainda não tiver)
npm install -g http-server

# Navegue até a pasta do projeto
cd "/Users/junior/Web Projects/Solar_API_Library-main"

# Inicie o servidor
http-server -p 8000
```

Depois acesse: `http://localhost:8000`

## ✅ Verificação

Após configurar e iniciar o servidor:

1. Abra o navegador em `http://localhost:8000`
2. Você deve ver a interface do Solar API
3. Digite um endereço no campo "Address"
4. Clique em "Get Solar Data"
5. O mapa deve carregar com os dados solares

## 🐛 Solução de Problemas

### ⚠️ Erro: "ApiTargetBlockedMapError" (CRÍTICO)

Este erro indica que a API Key está bloqueada ou não tem acesso às APIs necessárias. Siga estes passos:

#### 1. Verificar APIs Habilitadas no Google Cloud Console

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Vá em **APIs & Services** > **Library**
3. **Habilite as seguintes APIs** (essenciais):
   - ✅ **Maps JavaScript API** (obrigatória)
   - ✅ **Solar API** (obrigatória)
   - ✅ **Geocoding API** (necessária para buscar endereços)
   - ✅ **Maps Embed API** (pode ser necessária)

#### 2. Verificar Restrições da API Key

1. Vá em **APIs & Services** > **Credentials**
2. Clique na sua API Key
3. Em **Application restrictions**, verifique:
   - Se estiver usando **HTTP referrers**, adicione:
     - `http://localhost:*`
     - `http://127.0.0.1:*`
     - `http://localhost:8000`
   - **OU** temporariamente defina como **None** para testes locais
4. Em **API restrictions**, verifique:
   - Se estiver restrito, certifique-se de incluir:
     - Maps JavaScript API
     - Solar API
     - Geocoding API
   - **OU** defina como **Don't restrict key** para testes

#### 3. Verificar Billing (Conta de Pagamento)

A Solar API pode exigir billing habilitado:

1. Vá em **Billing** no Google Cloud Console
2. Verifique se há uma conta de pagamento vinculada
3. Se não houver, adicione uma (pode ter créditos gratuitos)

#### 4. Aguardar Propagação

Após fazer alterações:
- Aguarde **5-10 minutos** para as mudanças se propagarem
- Limpe o cache do navegador (Ctrl+Shift+Del ou Cmd+Shift+Del)
- Recarregue a página com **Ctrl+F5** (ou Cmd+Shift+R)

#### 5. Verificar Status da API Key

1. No Google Cloud Console, vá em **APIs & Services** > **Credentials**
2. Verifique se a API Key está **ativa** (não bloqueada)
3. Se estiver bloqueada, clique em **Unrestrict key** ou crie uma nova

### Erro: "Google Maps API key not valid"
- Verifique se a API Key foi inserida corretamente nos 2 arquivos
- Confirme que as APIs (Maps JavaScript API e Solar API) estão ativadas no Google Cloud Console
- Verifique se há restrições de referer na API Key que podem estar bloqueando `localhost`

### Erro: "CORS" ou "Network Error"
- Certifique-se de estar usando um servidor web local (não abra o arquivo diretamente no navegador)
- Verifique se o servidor está rodando na porta correta

### Mapa não carrega
- Abra o Console do navegador (F12) e verifique erros
- Confirme que a API Key tem acesso à Solar API
- Verifique se o callback `onGoogleMapsLoaded` está sendo chamado

## 📝 Notas Importantes

- Este projeto usa a **versão beta** da Google Maps API (`v=beta`)
- A Solar API requer uma API Key válida com acesso habilitado
- O projeto já inclui as bibliotecas necessárias (GeoTIFF.js, Proj4.js, Bootstrap)
- Não é necessário instalar dependências via npm ou composer

## 🔗 Links Úteis

- [Google Cloud Console](https://console.cloud.google.com/)
- [Google Maps JavaScript API Documentation](https://developers.google.com/maps/documentation/javascript)
- [Google Solar API Documentation](https://developers.google.com/maps/documentation/solar)

