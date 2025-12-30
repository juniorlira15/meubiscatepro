# ✅ Checklist Rápido - Resolver ApiTargetBlockedMapError

Siga estes passos na ordem para resolver o erro:

## 🔴 Passo 1: Verificar APIs Habilitadas

1. Acesse: https://console.cloud.google.com/apis/library
2. Procure e **HABILITE** estas APIs:
   - [ ] **Maps JavaScript API**
   - [ ] **Solar API** 
   - [ ] **Geocoding API**

## 🔴 Passo 2: Verificar Restrições da API Key

1. Acesse: https://console.cloud.google.com/apis/credentials
2. Clique na sua API Key
3. Em **Application restrictions**:
   - [ ] Se estiver usando "HTTP referrers", adicione:
     - `http://localhost:*`
     - `http://127.0.0.1:*`
   - [ ] **OU** mude temporariamente para **"None"** (para testes)
4. Em **API restrictions**:
   - [ ] Certifique-se de que inclui: Maps JavaScript API, Solar API, Geocoding API
   - [ ] **OU** mude para **"Don't restrict key"** (para testes)

## 🔴 Passo 3: Verificar Billing

1. Acesse: https://console.cloud.google.com/billing
2. [ ] Verifique se há uma conta de pagamento vinculada
3. [ ] Se não houver, adicione uma (pode ter créditos gratuitos)

## 🔴 Passo 4: Aguardar e Testar

1. [ ] Aguarde **5-10 minutos** após fazer as alterações
2. [ ] Limpe o cache do navegador (Ctrl+Shift+Del ou Cmd+Shift+Del)
3. [ ] Recarregue a página com **Ctrl+F5** (ou Cmd+Shift+R)
4. [ ] Teste novamente

## 🔍 Verificação Final

Após seguir todos os passos, verifique no console do navegador (F12):
- [ ] Não deve aparecer mais o erro "ApiTargetBlockedMapError"
- [ ] O mapa deve carregar corretamente
- [ ] Deve ser possível buscar endereços

## ⚠️ Se ainda não funcionar:

1. Crie uma **nova API Key** no Google Cloud Console
2. Configure a nova chave sem restrições (para testes)
3. Substitua a API Key nos arquivos:
   - `components/gc_solar_api_library/global.js` (linha 16)
   - `index.php` (linha 31)
4. Aguarde alguns minutos e teste novamente


