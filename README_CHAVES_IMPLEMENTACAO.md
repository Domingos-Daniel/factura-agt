# 🎯 Resumo da Implementação: Separação de Chaves Produtor vs Emissor

## ✅ O que foi Implementado

Segundo a documentação oficial da AGT (decreto.md e new-tec-specs.md), implementei a separação completa entre:

### 1. **Chave do Produtor** (Software Developer)
```
Função: createSoftwareSignature(softwareInfo)
Campo no Payload: softwareInfo.jwsSoftwareSignature
Variável de Ambiente: AGT_PRODUCER_PRIVATE_KEY
Assina: productId, productVersion, softwareValidationNumber
Erro se falhar: E08 (assinatura de software inválida)
```

### 2. **Chave do Emissor** (Taxpayer/Contribuinte)
```
Função: createDocumentSignature(document, taxRegistrationNumber)
Campo no Payload: documents[].jwsDocumentSignature  
Variável de Ambiente: AGT_PRIVATE_KEY
Assina: documentNo, taxRegistrationNumber, documentType, documentDate,
        customerTaxID, customerCountry, companyName, documentTotals
Erro se falhar: E40 (assinatura da chamada inválida)
```

## 📝 Arquivos Criados

1. **CHAVES_CONFIGURACAO.md**
   - Documentação completa sobre a separação de chaves
   - Como gerar chaves com OpenSSL
   - Como registar com AGT
   - Troubleshooting de erros

2. **.env.local.example**
   - Template de configuração com ambas as chaves
   - Credenciais AGT HML pré-configuradas
   - Dados da empresa em comentários

3. **IMPLEMENTACAO_CHAVES.md**
   - Resumo técnico das mudanças
   - Fluxo de assinatura
   - Conformidade com decreto.md

4. **scripts/diagnose-keys.js**
   - Script de diagnóstico interativo
   - Mostra fingerprints SHA256
   - Guia próximas etapas

## 🔧 Arquivos Modificados

### `lib/jws-signer.js`
```javascript
// ANTES:
- Uma única chave privada (PRIVATE_KEY)
- createJWSSignature(payload)
- createSoftwareSignature() e createDocumentSignature() usavam a mesma chave

// DEPOIS:
- Duas chaves privadas distintas
  - PRODUCER_PRIVATE_KEY (produtor de software)
  - ISSUER_PRIVATE_KEY (emissor/contribuinte)
- createJWSSignature(payload, privateKey) ← agora aceita chave como parâmetro
- createSoftwareSignature() ← usa PRODUCER_PRIVATE_KEY
- createDocumentSignature() ← usa ISSUER_PRIVATE_KEY
- Funções auxiliares: getKeyInfo(), getProducerPublicKeyFingerprint(), etc.
```

## 🚀 Como Usar

### 1. Gerar as Chaves (se não tiver)

```bash
# Chave do Produtor
openssl genrsa -out producer-key.pem 2048

# Chave do Emissor
openssl genrsa -out issuer-key.pem 2048

# Ver as chaves geradas
cat producer-key.pem
cat issuer-key.pem
```

### 2. Configurar no `.env.local`

```bash
# Copie as chaves do passo anterior para:
AGT_PRODUCER_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQE...
-----END PRIVATE KEY-----"

AGT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQE...
-----END PRIVATE KEY-----"
```

### 3. Testar Configuração

```bash
# Verificar diagnóstico
node scripts/diagnose-keys.js

# Testar assinaturas
node lib/jws-signer.js
```

### 4. Extrair Fingerprints das Chaves Públicas

```bash
# Produtor
openssl rsa -in producer-key.pem -pubout | openssl sha256

# Emissor
openssl rsa -in issuer-key.pem -pubout | openssl sha256
```

### 5. Registar com AGT

Envie os fingerprints SHA256 para AGT registar as chaves públicas.

### 6. Testar com AGT HML

```bash
node scripts/test-hml-auth.js
```

## 📊 Conformidade com Documentação

| Item | Decreto.md | Implementação |
|------|-----------|---------------|
| Chave do Produtor | Página 6 | ✅ `PRODUCER_PRIVATE_KEY` |  
| Chave do Emissor | Página 7 | ✅ `ISSUER_PRIVATE_KEY` |
| jwsSoftwareSignature | Chave do Produtor | ✅ Implementado |
| jwsDocumentSignature | Chave do Emissor | ✅ Implementado |
| Campos Assinados (Software) | productId, productVersion, softwareValidationNumber | ✅ Correto |
| Campos Assinados (Document) | 8 campos específicos | ✅ Correto |
| Tamanho da Assinatura | 256 caracteres | ✅ Implementado |

## ⚠️ Erros Agora Diagnosticáveis

### Erro E08: jwsSoftwareSignature Inválida
**Causa**: Chave do produtor não registada na AGT
**Solução**: 
1. Extraia a chave pública do produtor
2. Envie o fingerprint SHA256 para AGT registar
3. Aguarde confirmação

### Erro E40: jwsDocumentSignature Inválida
**Causa**: Chave do emissor não registada na AGT
**Solução**:
1. Extraia a chave pública do emissor
2. Envie o fingerprint SHA256 para AGT registar
3. Aguarde confirmação

## 🔍 Flowchart de Assinatura

```
registarFactura Request
    │
    ├─→ softwareInfo
    │   ├─→ softwareInfoDetail (productId, productVersion, softwareValidationNumber)
    │   │   ↓
    │   │   createSoftwareSignature()
    │   │   │
    │   │   └─→ createJWSSignature(payload, PRODUCER_PRIVATE_KEY)
    │   │       └─→ RSA-SHA256 Signature
    │   │           └─→ jwsSoftwareSignature (256 chars)
    │   │
    │   └─→ ✅ Assinado com chave DO PRODUTOR
    │
    ├─→ documents[]
    │   ├─→ document
    │   │   ├─→ documentNo, documentType, documentDate, ...
    │   │   ├─→ taxRegistrationNumber, companyName, customerTaxID, ...
    │   │   ├─→ customerCountry, documentTotals
    │   │   │
    │   │   └─→ createDocumentSignature()
    │   │       │
    │   │       └─→ createJWSSignature(payload, ISSUER_PRIVATE_KEY)
    │   │           └─→ RSA-SHA256 Signature
    │   │               └─→ jwsDocumentSignature (256 chars)
    │   │
    │   └─→ ✅ Assinado com chave DO EMISSOR
    │
    └─→ Submit to AGT /registarFactura
```

## 📚 Referências

- 📄 [decreto.md](decreto.md) - Especificação oficial AGT
- 📄 [new-tec-specs.md](new-tec-specs.md) - Specs técnicas
- 📄 [CHAVES_CONFIGURACAO.md](CHAVES_CONFIGURACAO.md) - Guia de configuração
- 📄 [IMPLEMENTACAO_CHAVES.md](IMPLEMENTACAO_CHAVES.md) - Detalhes técnicos

## ✅ Checklist de Implementação

- ✅ Separação de chaves (Produtor vs Emissor)
- ✅ Validação de ambas as chaves no startup
- ✅ Uso correto de cada chave em seu contexto
- ✅ Documentação completa
- ✅ Script de diagnóstico
- ✅ Template de `.env.local`
- ✅ Conformidade com decreto.md
- ✅ Tratamento de erros E08/E40

## 🎓 Próximas Etapas

1. **Gere as chaves RSA** (ambas)
2. **Configure no `.env.local`** (ambas)
3. **Teste com `diagnose-keys.js`** 
4. **Registar fingerprints em AGT**
5. **Teste com `test-hml-auth.js`**
6. **Quando E08/E40 desaparecerem**, estará pronto para produção

---

**Implementação Completa**: ✅
**Status**: Pronto para uso após configurar ambas as chaves
**Documentação**: 📚 Completa (4 guias + código comentado)
