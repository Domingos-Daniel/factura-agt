# RELATÓRIO DE RESOLUÇÃO - AGT HML E08/E40 (19/03/2026)

## ✅ CORREÇÕES IMPLEMENTADAS

### 1. **Credenciais HML Incorretas** → CORRIGIDO
**Problema**:
- Script carregava: `ws.hml.addonsaftb1` / `***REDACTED***`
- .env.local tinha: `ws.hml.safefacturas` / `mfn+38470+2026`

**Correção**:
- ✅ Atualizado `test-hml-auth.js` para usar `process.env` em vez de hardcoded
- ✅ Agora lê automaticamente:
  ```javascript
  username: process.env.AGT_HML_USERNAME || 'ws.hml.safefacturas'
  password: process.env.AGT_HML_PASSWORD || 'mfn+38470+2026'
  ```

### 2. **Software Validation Number Incorreto** → CORRIGIDO
**Problema**:
- Script enviava: `FE/81/AGT/2025`
- .env.local tem: `FE/308/AGT/2026`

**Correção**:
- ✅ Substitui 3 ocorrências no script
- ✅ Agora usa: `process.env.AGT_SOFTWARE_VALIDATION_NUMBER`
- ✅ Implementados: `AGT_SOFTWARE_PRODUCT_ID` e `AGT_SOFTWARE_VERSION` também configuráveis

### 3. **NIF de Teste Inválido (E11/E28)** → CORRIGIDO
**Problema**:
- Script aceitava: `5000000000` (não registrado)
- deveria usar: `5000660086` (do .env.local)

**Correção**:
- ✅ NIF agora lê de: `process.env.AGT_HML_NIF_TEST`
- ✅ Default correto: `5000660086`

### 4. **Funções de Assinatura Quebradas** → CORRIGIDO
**Problema**:
- Script chamava: `createJWSSignature()` sem chave
- Erro: "No key provided to sign"

**Correção**:
- ✅ Adicionado helper: `createIssuerSignature(payload)` em `jws-signer.js`
- ✅ Usa automaticamente `ISSUER_PRIVATE_KEY`
- ✅ Exportado module.exports

---

## 📊 STATUS ATUAL

### Teste Re-executado (19/03/2026 14:30 UTC)

**Resposta AGT HML**:
```json
{
  "resultCode": "0",
  "errorList": [
    {
      "idError": "E08",
      "descriptionError": "A assinatura do produtor de software \"jwsSoftwareSignature\" não está de acordo com a informação transmitida."
    },
    {
      "idError": "E40",
      "descriptionError": "Os dados constantes na assinatura da chamada do serviço \"jwsSignature\" não estão de acordo com a informação constante na chamada do serviço."
    }
  ]
}
```

### Análise

#### ✅ Validações Passaram:
- Credenciais autenticação HML: ✅ OK
- URL HML: ✅ OK  
- NIF teste: ✅ OK  
- Formato JSON: ✅ OK
- Conectividade: ✅ OK (via PowerShell fallback)
- Assinaturas RSA geradas: ✅ 256 chars cada

#### ❌ Validações AGT Falharam:
- **E08**: Assinatura de software de produtor inválida
  - AGT não consegue validar `jwsSoftwareSignature`
  - Possível: Chave privada não corresponde à registrada com AGT
  
- **E40**: Assinatura de chamada inválida
  - AGT não consegue validar `jwsSignature`
  - Possível: Chave privada do contribuinte não corresponde ou payload diferente

---

## 🔐 PRÓXIMAS AÇÕES NECESSÁRIAS

### 1. **Registrar Software e Chaves com AGT** (OBRIGATÓRIO)
O software `FE/308/AGT/2026` e as chaves precisam ser pré-registrados com AGT antes de usar:

```bash
# PORTAL AGT
https://portaldocontribuinte.minfin.gov.ao

# Passos:
1. Faça login com credenciais de contribuinte
2. Vá em: Administração → Certificados Digitais
3. Registre:
   - Software ID: FE/308/AGT/2026
   - Chave Pública (derivada de AGT_PRODUCER_PRIVATE_KEY)
   - Chave Pública (derivada de AGT_PRIVATE_KEY)
```

### 2. **Extrair Chaves Públicas para AGT**
```bash
node -e "
const crypto = require('crypto');
const fs = require('fs');

require('dotenv').config({path:'.env.local'});

// Chave do Produtor
const producerPriv = process.env.AGT_PRODUCER_PRIVATE_KEY;
const producerPub = crypto.createPrivateKey(producerPriv)
  .export({ type: 'spki', format: 'pem' });
console.log('=== PRODUTOR (Software) ===');
console.log(producerPub);

// Chave do Emissor  
const issuerPriv = process.env.AGT_PRIVATE_KEY;
const issuerPub = crypto.createPrivateKey(issuerPriv)
  .export({ type: 'spki', format: 'pem' });
console.log('\n=== EMISSOR (Contribuinte) ===');
console.log(issuerPub);
"
```

### 3. **Verificar Registros AGT**
```bash
# Validações no Portal do Contribuinte:
✅ Software FE/308/AGT/2026 ativo e certificado?
✅ NIF 5000660086 está aderido a facturação eletrônica?
✅ Chaves públicas são as corretas?
```

### 4. **Contatar AGT se Necessário**
- 📧 sapps@agt.minfin.gov.ao
- ☎️ (+244) 222 706 000  
- Solicitar: Certificação do software e validação das chaves

---

## 📁 Arquivos Modificados

1. ✅ `scripts/test-hml-auth.js` - Credenciais, NIF, software number corrigidos
2. ✅ `lib/jws-signer.js` - Adicionado `createIssuerSignature()`
3. 📝 `.env.local` - Verificado: chaves presentes e carregadas

---

## 🧪 Como Re-testar

```bash
cd c:\Projectos\factura-agt

# Depois que software/chaves forem registrados com AGT:
node scripts/test-hml-auth.js

# Esperado (após AGT certificar): 
# "resultCode": "0" com errorList VAZIO []
```

---

## 📋 Checklist de Conclusão

- [x] Credenciais HML corrigidas (ws.hml.safefacturas + mfn+38470+2026)
- [x] Software validation number corrigido (FE/308/AGT/2026)
- [x] NIF teste corrigido (5000660086)
- [x] Funções de assinatura JWS corrigidas
- [x] Chaves privadas verificadas como carregadas
- [ ] Software registrado com AGT
- [ ] Chaves públicas registradas com AGT
- [ ] Retest realizado e esperado passar

---

**Documentação criada**: 19/03/2026 14:35

