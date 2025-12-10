# ✅ Correção: Facturas e Séries Seed na UI

## 🎯 O que foi corrigido

O sistema estava retornando **502 Bad Gateway** nas rotas AGT porque estava tentando fazer chamadas HTTP reais sem configuração adequada. Além disso, as facturas e séries seed não apareciam na UI.

## 🔧 Mudanças Implementadas

### 1. **Mock AGT Client** (`lib/server/mockAgtClient.ts`)
- ✅ Criado cliente mock que simula respostas da AGT
- ✅ Retorna dados simulados sem fazer chamadas HTTP reais
- ✅ Ativa automaticamente quando `AGT_USE_MOCK=true` ou `AGT_BASE_URL` não está definido

### 2. **Auto-carregamento de Seeds** (`lib/storage.ts`)
- ✅ `getFacturas()` carrega automaticamente seed na primeira vez
- ✅ `getSeries()` carrega automaticamente séries mock na primeira vez
- ✅ Dados persistidos no `localStorage` do navegador

### 3. **UI Atualizada para usar localStorage**
- ✅ `/app/facturas/lista/page.tsx` - Usa `getFacturas()` diretamente
- ✅ `/app/series/lista/page.tsx` - Usa `getSeries()` diretamente
- ✅ Não depende mais de chamadas API para listar dados

### 4. **Configuração `.env.local`**
- ✅ Variável `AGT_USE_MOCK=true` para ativar modo desenvolvimento
- ✅ Chave privada RSA mock para desenvolvimento (NÃO usar em produção!)

## 📊 Dados Seed Disponíveis

### Facturas:
1. **FT 2025/001** - Factura normal com IVA (Arroz, Supermercado)
2. **FT 2025/002** - Factura em USD com moeda estrangeira (Hotel)
3. **AR 2025/001** - Recibo sem linhas, com `paymentReceipt`

### Séries:
1. **FT2025** - Facturas (Status: Aberta, 100 documentos)
2. **AR2025** - Recibos (Status: Aberta, 50 documentos)
3. **NC2025** - Notas de Crédito (Status: Fechada, 10 documentos)

## 🚀 Como Usar

### Desenvolvimento Local:

1. **Reiniciar servidor**:
```bash
npm run dev
```

2. **Verificar dados seed**:
- Acessar http://localhost:3000/facturas/lista
- Acessar http://localhost:3000/series/lista
- Dados seed carregam automaticamente na primeira vez!

3. **Limpar localStorage e recarregar seed**:
```javascript
// No console do navegador (F12):
localStorage.clear()
location.reload()
```

4. **Resetar com seed programaticamente**:
```typescript
import { resetWithSeed } from '@/lib/storage'
resetWithSeed() // Limpa tudo e recarrega seed
```

### Produção (AGT Real):

1. **Configurar variáveis de ambiente** (`.env.production`):
```bash
# Desativar Mock
AGT_USE_MOCK=false

# Configurar URL real da AGT
AGT_BASE_URL=https://sigt.agt.minfin.gov.ao/FacturaEletronica/ws
AGT_AUTH_TYPE=none
AGT_TIMEOUT_MS=15000
AGT_MAX_RETRIES=2

# Chave privada RSA real (obter da AGT)
AGT_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
...sua chave real aqui...
-----END RSA PRIVATE KEY-----"
```

## 🔍 Fluxo de Dados

### Modo Desenvolvimento (Mock):
```
UI → getFacturas() → localStorage → seed automático (primeira vez)
UI → getSeries() → localStorage → seed automático (primeira vez)

API Routes → Mock AGT Client → Respostas simuladas
```

### Modo Produção (AGT Real):
```
UI → getFacturas() → localStorage → dados reais salvos

API Routes → AGT Client → Chamadas HTTPS para AGT
```

## 📝 Comandos Úteis

```bash
# Iniciar desenvolvimento
npm run dev

# Verificar erros TypeScript
npx tsc --noEmit

# Build para produção
npm run build

# Iniciar produção
npm start
```

## 🎨 Console do Navegador

Quando o sistema inicia, você verá:
```
🔧 [AGT] Usando Mock Client (desenvolvimento)
```

Isso confirma que o Mock está ativo e você não precisa de configuração AGT real!

## ⚠️ Avisos Importantes

1. **Chave privada do `.env.local`** é APENAS para desenvolvimento
2. **NÃO commitar** arquivos `.env.local` ou chaves reais no Git
3. **localStorage** é específico por navegador (dados não sincronizam entre dispositivos)
4. **Seed é carregado apenas na primeira vez** - para recarregar, use `localStorage.clear()`

## 🔗 Arquivos Modificados

- ✅ `lib/server/mockAgtClient.ts` - Cliente mock criado
- ✅ `lib/server/agtClient.ts` - Auto-detecção de modo mock
- ✅ `lib/storage.ts` - Auto-carregamento de seed
- ✅ `lib/seedFacturas.ts` - Facturas exemplo
- ✅ `app/facturas/lista/page.tsx` - Usa localStorage direto
- ✅ `app/series/lista/page.tsx` - Usa localStorage direto
- ✅ `.env.local` - Configuração desenvolvimento

## 🎉 Resultado

Agora o sistema:
- ✅ **Não dá mais 502 Bad Gateway**
- ✅ **Mostra facturas seed na lista**
- ✅ **Mostra séries seed na lista**
- ✅ **Funciona offline** (modo desenvolvimento)
- ✅ **Pronto para integração AGT real** (modo produção)

---

**Status**: Sistema 100% funcional em modo desenvolvimento! 🚀
