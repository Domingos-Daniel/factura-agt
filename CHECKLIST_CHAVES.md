# ✅ CHECKLIST: Implementação Completa de Chaves (Produtor + Emissor)

## 📋 Resumo Executivo

Implementação da **separação de chaves RSA** conforme especificação oficial da AGT:
- ✅ **Chave do Produtor** → assina `jwsSoftwareSignature`
- ✅ **Chave do Emissor** → assina `jwsDocumentSignature`

---

## 🔐 Arquivos Implementados

### Código-Fonte Modificado
- [x] **lib/jws-signer.js**
  - ✅ Duas chaves privadas distintas
  - ✅ `PRODUCER_PRIVATE_KEY` para software
  - ✅ `ISSUER_PRIVATE_KEY` para documentos
  - ✅ Validação obrigatória de ambas
  - ✅ Funções de fingerprint

### Documentação Criada
- [x] **CHAVES_CONFIGURACAO.md** - Guia completo de setup
- [x] **IMPLEMENTACAO_CHAVES.md** - Detalhes técnicos
- [x] **README_CHAVES_IMPLEMENTACAO.md** - Resumo executivo
- [x] **.env.local.example** - Template de configuração
- [x] **scripts/diagnose-keys.js** - Ferramenta de diagnóstico
- [x] **examples/fluxo-assinatura-completo.js** - Exemplo visual

---

## 🚀 Próximas Etapas

### ✅ Fase 1: Configurar Chaves (LOCAL)

```bash
# 1. Gerar chaves RSA (se necessário)
openssl genrsa -out producer-key.pem 2048
openssl genrsa -out issuer-key.pem 2048

# 2. Extrair conteúdo das chaves
cat producer-key.pem    # Copiar para AGT_PRODUCER_PRIVATE_KEY
cat issuer-key.pem      # Copiar para AGT_PRIVATE_KEY

# 3. Adicionar ao .env.local
# AGT_PRODUCER_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
# AGT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."

# 4. Testar configuração
node scripts/diagnose-keys.js
node lib/jws-signer.js
node examples/fluxo-assinatura-completo.js
```

### ✅ Fase 2: Registar com AGT (REMOTE)

```bash
# 1. Extrair chaves públicas
openssl rsa -in producer-key.pem -pubout -out producer-public-key.pem
openssl rsa -in issuer-key.pem -pubout -out issuer-public-key.pem

# 2. Gerar fingerprints SHA256
openssl rsa -in producer-key.pem -pubout | openssl sha256
openssl rsa -in issuer-key.pem -pubout | openssl sha256

# 3. Enviar fingerprints para AGT
# - Contacte AGT e forneça os dois fingerprints
# - Etiquete qual é "Produtor" e qual é "Emissor"
# - Aguarde confirmação de registo
```

### ✅ Fase 3: Testar em HML (AFTER REGISTRATION)

```bash
# Quando AGT confirmar registo das chaves:
node scripts/test-hml-auth.js

# Se receber:
# - Erro E08 → Chave do produtor não registada
# - Erro E40 → Chave do emissor não registada
# - ✅ OK → Ambas as chaves registadas e funcionando!
```

---

## 📊 Status de Implementação

| Item | Status | Arquivo |
|------|--------|---------|
| Separação de Chaves | ✅ Completo | lib/jws-signer.js |
| Validação Dual | ✅ Completo | lib/jws-signer.js |
| Documentação | ✅ Completo | 4 .md files |
| Exemplo Visual | ✅ Completo | examples/ |
| Diagnóstico | ✅ Completo | scripts/ |
| Template .env | ✅ Completo | .env.local.example |
| Conformidade AGT | ✅ Completo | Per decreto.md |

---

## 🎯 Conformidade com Decreto.md

✅ **Página 6**: `jwsSoftwareSignature`
```
"Assinatura do Software de Facturação (encriptação usando a chave privada 
do produtor com todos os campos do objecto softwareInfo)"
```
**Implementação**: ✅ `createSoftwareSignature()` → `PRODUCER_PRIVATE_KEY`

✅ **Página 7**: `jwsDocumentSignature`
```
"Assinatura da factura, encriptação usando a chave privada do emissor 
com os seguintes campos da factura: documentNo, taxRegistrationNumber, 
documentType, documentDate, customerTaxID, customerCountry, companyName,
documentTotals"
```
**Implementação**: ✅ `createDocumentSignature()` → `ISSUER_PRIVATE_KEY`

---

## 🔧 Comandos Úteis

```bash
# Diagnosticar configuração
node scripts/diagnose-keys.js

# Testar assinaturas
node lib/jws-signer.js

# Ver fluxo completo
node examples/fluxo-assinatura-completo.js

# Testar com AGT HML
node scripts/test-hml-auth.js

# Listar todos os scripts
ls -la scripts/ | grep .js
```

---

## ⚠️ Possíveis Erros e Soluções

### ❌ "AGT_PRODUCER_PRIVATE_KEY não encontrada"
**Solução**: Adicionar chave do produtor ao `.env.local`

### ❌ "AGT_PRIVATE_KEY não encontrada"
**Solução**: Adicionar chave do emissor ao `.env.local`

### ❌ "Erro E08 - jwsSoftwareSignature inválida"
**Solução**: Chave pública do produtor não registada na AGT
- Extraia fingerprint SHA256
- Envie para AGT

### ❌ "Erro E40 - jwsDocumentSignature inválida"  
**Solução**: Chave pública do emissor não registada na AGT
- Extraia fingerprint SHA256
- Envie para AGT

---

## 💡 Dicas de Implementação

1. **Usar chaves RSA 2048bits minimo** para compatibilidade com AGT
2. **Guardar ambas as chaves privadas com segurança** (não commit para git)
3. **Usar .env.local** (já está em .gitignore)
4. **Testar localmente primeiro** com `scripts/diagnose-keys.js`
5. **Antes de enviar para AGT**, usar `scripts/test-hml-auth.js`

---

## 📚 Arquivos de Referência

```
factura-agt/
├── lib/jws-signer.js                        ← Lógica de assinaturas
├── scripts/
│   ├── diagnose-keys.js                     ← Ferramenta diagnóstico
│   └── test-hml-auth.js                     ← Teste com AGT
├── examples/
│   └── fluxo-assinatura-completo.js         ← Exemplo visual
├── CHAVES_CONFIGURACAO.md                   ← Guia de setup
├── IMPLEMENTACAO_CHAVES.md                  ← Detalhes técnicos
├── README_CHAVES_IMPLEMENTACAO.md           ← Resumo executivo
├── .env.local.example                       ← Template
└── decreto.md                               ← Spec oficial AGT
```

---

## ✅ Quando Tudo Estiver Pronto

Você saberá que está tudo correto quando:

1. ✅ `node scripts/diagnose-keys.js` → Mostra ambas as chaves ✓
2. ✅ `node lib/jws-signer.js` → Ambas as assinaturas funcionam
3. ✅ `node examples/fluxo-assinatura-completo.js` → Status "PRONTO PARA SUBMISSÃO"
4. ✅ `node scripts/test-hml-auth.js` → Sem erros E08/E40
5. ✅ AGT confirma: "Chaves públicas registadas"

---

## 🎓 Próximo: Submeter Documentos

Após completar todos os passos acima:

```javascript
// scripts/submit-invoice.js
const { createSoftwareSignature, createDocumentSignature } = require('../lib/jws-signer')

// Ambas as assinaturas estão prontas:
const softwareSig = createSoftwareSignature(softwareInfo)  // ← PRODUTOR
const docSig = createDocumentSignature(document, taxId)    // ← EMISSOR

// Enviar para AGT /registarFactura
// Esperar resposta com requestID
// Consultar status com /obterEstado
```

---

## 📞 Suporte

Se encontrar problemas:

1. Verifique **CHAVES_CONFIGURACAO.md** 
2. Execute **scripts/diagnose-keys.js**
3. Consulte **erro.md** para códigos de erro
4. Contacte AGT se as chaves públicas não estiverem registadas

---

**Implementação**: ✅ Completa
**Documentação**: ✅ Completa  
**Status Geral**: 🚀 Pronto para uso

**Data**: Março 2026
**Versão**: 1.0 (Separação Dual de Chaves)
