# Implementação: Separação de Chaves Produtor vs Emissor

## Resumo das Alterações

Implementação da lógica de separação entre **Chave do Produtor** e **Chave do Emissor** conforme especificação técnica da AGT (decreto.md).

## Arquivos Modificados

### 1. `lib/jws-signer.js` (MODIFICADO)
**Mudanças principais:**

- ✅ **Adicionado**: Validação de duas chaves privadas distintas
- ✅ **Variáveis de Ambiente**:
  - `AGT_PRODUCER_PRIVATE_KEY` → Chave do Produtor (Software)
  - `AGT_PRIVATE_KEY` → Chave do Emissor (Contribuinte)

- ✅ **Função `createJWSSignature(payload, privateKey)`**
  - Agora aceita a chave privada como parâmetro
  - Permite usar a chave apropriada conforme o tipo de assinatura

- ✅ **Função `createSoftwareSignature(softwareInfo)`**
  - ℹ️ **Antes**: Usava `PRIVATE_KEY` (genérica)
  - ✅ **Agora**: Usa `PRODUCER_PRIVATE_KEY` (específica do produtor)
  - Assina: `productId`, `productVersion`, `softwareValidationNumber`

- ✅ **Função `createDocumentSignature(document, taxRegistrationNumber)`**
  - ℹ️ **Antes**: Usava `PRIVATE_KEY` (genérica)
  - ✅ **Agora**: Usa `ISSUER_PRIVATE_KEY` (específica do emissor)
  - Assina: 8 campos específicos do documento

- ✅ **Testes Melhorados**
  - Exibe qual chave está sendo usada
  - Mostra fingerprint SHA256 das chaves públicas
  - Validação clara de ambas as chaves

### 2. `CHAVES_CONFIGURACAO.md` (NOVO)
📋 **Documentação completa sobre:**
- Diferença entre chave do produtor e emissor
- Como configurar no `.env.local`
- Exemplo de estrutura de assinatura
- Como gerar chaves RSA com OpenSSL
- Troubleshooting de erros E08 e E40
- Próximos passos para registar com AGT

### 3. `.env.local.example` (NOVO)
📝 **Modelo de configuração com:**
- Ambas as chaves privadas (placeholder)
- Documentação inline de cada variável
- Credenciais AGT HML
- Dados da empresa e software

## Fluxo Técnico

```
Requisição AGT
    ↓
├─ softwareInfo
│   └─ jwsSoftwareSignature
│       └─ Assinado com: AGT_PRODUCER_PRIVATE_KEY ✅
│
├─ documents[]
│   └─ document
│       └─ jwsDocumentSignature
│           └─ Assinado com: AGT_PRIVATE_KEY ✅
```

## Validações Implementadas

✅ **Ambas as chaves obrigatórias**:
```javascript
if (!PRODUCER_PRIVATE_KEY) { ... }
if (!ISSUER_PRIVATE_KEY) { ... }
```

✅ **Função `getKeyInfo()`**: Retorna informações sobre ambas as chaves

✅ **Fingerprints SHA256**: Para validação e debug

## Como Usar

### 1. Configurar Chaves

Adicione ao seu `.env.local`:
```bash
AGT_PRODUCER_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQE...
-----END PRIVATE KEY-----"

AGT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQE...
-----END PRIVATE KEY-----"
```

### 2. Testar Configuração

```bash
node lib/jws-signer.js
```

**Saída esperada:**
```
🔐 Chaves Privadas Configuradas:
   ✅ AGT_PRODUCER_PRIVATE_KEY: ✓ Configurada
   ✅ AGT_PRIVATE_KEY: ✓ Configurada

1️⃣ Testando jwsSoftwareSignature (CHAVE DO PRODUTOR)...
   ✅ Assinatura criada (256 chars)

2️⃣ Testando jwsDocumentSignature (CHAVE DO EMISSOR)...
   ✅ Assinatura criada (256 chars)
```

### 3. Usar no Código

```javascript
const { createSoftwareSignature, createDocumentSignature } = require('./lib/jws-signer')

// Assinatura de software (com chave DO PRODUTOR)
const softwareSig = createSoftwareSignature(softwareInfo)

// Assinatura de documento (com chave DO EMISSOR)
const docSig = createDocumentSignature(document, taxId)
```

## Conformidade com Documentação

| Campo | Especificação | Implementação |
|-------|---------------|--------------|
| `jwsSoftwareSignature` | Chave privada do **produtor** | ✅ `PRODUCER_PRIVATE_KEY` |
| `jwsDocumentSignature` | Chave privada do **emissor** | ✅ `ISSUER_PRIVATE_KEY` |
| Campos assinados software | `productId, productVersion, softwareValidationNumber` | ✅ Correto |
| Campos assinados documento | `documentNo, taxRegistrationNumber, documentType, documentDate, customerTaxID, customerCountry, companyName, documentTotals` | ✅ Correto |

## Próximas Etapas

1. **Registar chaves públicas com AGT**:
   - Extraia as chaves públicas de ambas as chaves privadas
   - Envie os fingerprints SHA256 para AGT
   - Aguarde confirmação de registo

2. **Testar com `test-hml-auth.js`**:
   ```bash
   node scripts/test-hml-auth.js
   ```

3. **Verificar erros**:
   - **E08**: Chave do produtor não registada na AGT
   - **E40**: Chave do emissor não registada na AGT

## Referências

- 📘 [decreto.md](decreto.md) - Página 6-7: Especificação de assinaturas
- 📘 [new-tec-specs.md](new-tec-specs.md) - Estrutura de dados AGT
- 📘 [CHAVES_CONFIGURACAO.md](CHAVES_CONFIGURACAO.md) - Guia de configuração

---

**Implementação Completa**: ✅ Lógica de separação de chaves (Produtor + Emissor)
**Status**: Pronto para uso após configurar ambas as chaves no `.env.local`
