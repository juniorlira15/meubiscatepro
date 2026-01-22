# 🔑 Como Configurar a API Key do Google

## ⚠️ ERRO: InvalidKeyMapError

Se você está vendo o erro `InvalidKeyMapError`, significa que a API Key do Google não está configurada corretamente.

## 📝 Passo a Passo

### 1️⃣ Obter uma API Key do Google

1. Acesse: https://console.cloud.google.com/
2. Faça login com sua conta Google
3. Crie um novo projeto ou selecione um existente
4. No menu lateral, vá em **"APIs e Serviços"** > **"Biblioteca"**
5. Ative as seguintes APIs:
   - ✅ **Maps JavaScript API**
   - ✅ **Solar API**
   - ✅ **Geocoding API**
6. Vá em **"APIs e Serviços"** > **"Credenciais"**
7. Clique em **"Criar credenciais"** > **"Chave de API"**
8. Copie a chave gerada

### 2️⃣ Configurar a API Key no Projeto

Você precisa substituir `YOUR_GOOGLE_API_KEY_HERE` em **2 arquivos**:

#### Arquivo 1: `components/gc_solar_api_library/global.js`

**Linha 16:**
```javascript
const apiKey = "YOUR_GOOGLE_API_KEY_HERE"; // ⚠️ SUBSTITUA pela sua chave da API do Google
```

**Substitua por:**
```javascript
const apiKey = "SUA_CHAVE_AQUI"; // Cole sua chave entre as aspas
```

#### Arquivo 2: `index.php`

**Linha 47:**
```html
<script async src="https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_API_KEY_HERE&loading=async&callback=onGoogleMapsLoaded&libraries=maps,marker&v=beta"></script>
```

**Substitua por:**
```html
<script async src="https://maps.googleapis.com/maps/api/js?key=SUA_CHAVE_AQUI&loading=async&callback=onGoogleMapsLoaded&libraries=maps,marker&v=beta"></script>
```

### 3️⃣ Configurar Restrições (Recomendado)

Para segurança, configure restrições na sua API Key:

1. No Google Cloud Console, vá em **"Credenciais"**
2. Clique na sua API Key
3. Em **"Restrições de aplicativo"**, selecione **"Referenciadores de sites HTTP"**
4. Adicione:
   - `http://localhost:8000/*`
   - `http://localhost:8080/*`
   - `http://127.0.0.1:8000/*`
   - `http://127.0.0.1:8080/*`
5. Em **"Restrições de API"**, selecione **"Restringir chave"**
6. Selecione apenas:
   - Maps JavaScript API
   - Solar API
   - Geocoding API
7. Clique em **"Salvar"**

### 4️⃣ Recarregar a Página

Após configurar, recarregue a página no navegador (F5 ou Ctrl+R).

## ✅ Verificação

Se tudo estiver correto:
- ✅ O mapa do Google Maps deve aparecer
- ✅ Não deve haver erros no console
- ✅ Você poderá buscar endereços e calcular áreas de telhado

## ❌ Problemas Comuns

### Erro: "API_KEY_INVALID"
- Verifique se copiou a chave completa (sem espaços)
- Verifique se as APIs estão ativadas no Google Cloud Console

### Erro: "API_KEY_FORBIDDEN"
- Verifique as restrições de referenciador (deve incluir localhost)
- Verifique se as APIs corretas estão selecionadas nas restrições

### Erro: "Quota exceeded"
- Você pode ter excedido o limite gratuito
- Verifique o uso no Google Cloud Console

## 📚 Links Úteis

- [Google Cloud Console](https://console.cloud.google.com/)
- [Documentação do Google Maps](https://developers.google.com/maps/documentation/javascript)
- [Documentação do Google Solar API](https://developers.google.com/maps/documentation/solar)
- [Erros Comuns da API](https://developers.google.com/maps/documentation/javascript/error-messages)

