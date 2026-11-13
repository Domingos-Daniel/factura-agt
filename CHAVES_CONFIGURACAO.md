# Configuração de Chaves: Produtor vs Emissor

## Visão Geral

Segundo a documentação oficial da AGT (decreto.md), existem **dois pares de chaves RSA**:

1. **Chave do Produtor** (Software Developer)
   - Usada para assinar `jwsSoftwareSignature`
   - Assina: `productId`, `productVersion`, `softwareValidationNumber`
   - Campo: `softwareInfo.jwsSoftwareSignature`
   - **Variável de ambiente**: `AGT_PRODUCER_PRIVATE_KEY`

2. **Chave do Emissor** (Taxpayer/Contribuinte)
   - Usada para assinar `jwsDocumentSignature`
   - Assina os campos do documento: `documentNo`, `taxRegistrationNumber`, `documentType`, `documentDate`, `customerTaxID`, `customerCountry`, `companyName`, `documentTotals`
   - Campo: `document.jwsDocumentSignature`
   - **Variável de ambiente**: `AGT_PRIVATE_KEY`

## Configuração no `.env.local`

Seu arquivo `.env.local` deve conter **ambas as chaves**:

```bash
# Chave privada RSA do PRODUTOR (Software)
# Usada para assinar informações de software (jwsSoftwareSignature)
AGT_PRODUCER_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQE...
... sua chave privada do produtor ...
-----END PRIVATE KEY-----"

# Chave privada RSA do EMISSOR (Contribuinte)
# Usada para assinar documentos de facturação (jwsDocumentSignature)
AGT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQE...
... sua chave privada do emissor ...
-----END PRIVATE KEY-----"
```

## Exemplo de Estrutura de Assinatura

### Requisição com Ambas as Chaves

```json
{
  "schemaVersion": "1.0",
  "submissionUUID": "...",
  "taxRegistrationNumber": "5417062030",
  "submissionTimeStamp": "2026-02-26T10:41:30.705Z",
  "softwareInfo": {
    "softwareInfoDetail": {
      "productId": "SafeFacturas",
      "productVersion": "1.0.1",
      "softwareValidationNumber": "FE/164/AGT/2026"
    },
    "jwsSoftwareSignature": "... assinado com CHAVE DO PRODUTOR ..."
  },
  "numberOfEntries": 1,
  "documents": [
    {
      "documentNo": "FT A/000001",
      "documentType": "FT",
      "documentDate": "2026-02-26",
      "taxRegistrationNumber": "5417062030",
      "customerTaxID": "999999999",
      "customerCountry": "AO",
      "companyName": "CONSUMIDOR FINAL",
      "documentTotals": { /* ... */ },
      "jwsDocumentSignature": "... assinado com CHAVE DO EMISSOR ..."
    }
  ]
}
```

## Fluxo de Assinatura no Código

Quando você submete uma factura:

1. **Software assina sua própria informação**
   ```javascript
   const softwareSig = createSoftwareSignature(softwareInfo, PRODUCER_PRIVATE_KEY)
   // Resultado → softwareInfo.jwsSoftwareSignature
   ```

2. **Emissor assina cada documento**
   ```javascript
   const docSig = createDocumentSignature(document, taxRegistrationNumber, ISSUER_PRIVATE_KEY)
   // Resultado → document.jwsDocumentSignature
   ```

## Como Gerar as Chaves

Se ainda não possui as chaves, gere com OpenSSL:

```bash
# Gerar chave RSA 2048 bits para Produtor
openssl genrsa -out producer-private-key.pem 2048

# Gerar chave RSA 2048 bits para Emissor
openssl genrsa -out issuer-private-key.pem 2048

# Converter para formato PKCS#8 (se necessário)
openssl pkcs8 -topk8 -in producer-private-key.pem -out producer-key-pkcs8.pem -nocrypt
openssl pkcs8 -topk8 -in issuer-private-key.pem -out issuer-key-pkcs8.pem -nocrypt

# Extrair chave pública (para AGT registrar)
openssl rsa -in producer-private-key.pem -pubout -out producer-public-key.pem
openssl rsa -in issuer-private-key.pem -pubout -out issuer-public-key.pem

# Gerar fingerprints SHA256 das chaves públicas
openssl x509 -noout -in producer-public-key.pem -pubkey | openssl sha256
openssl x509 -noout -in issuer-public-key.pem -pubkey | openssl sha256
```

## Problemas Comuns

### Erro E08: jwsSoftwareSignature Inválida
- Geralmente significa que a **chave do produtor não coincide** com a registada na AGT
- Solução: Envie a chave pública do produtor para AGT registar

### Erro E40: jwsDocumentSignature Inválida
- Significa que a **chave do emissor não coincide** com a registada na AGT
- Solução: Ensure que `AGT_PRIVATE_KEY` é a chave privada correcta do contribuinte

### Ambas as Chaves Faltando
O código exigirá que AMBAS estejam configuradas em `.env.local`. Se uma faltar, o script de teste retorna erro.

## Teste de Configuração

Execute o teste para validar ambas as chaves:

```bash
node lib/jws-signer.js
```

Deve ver:
```
🔐 Chaves Privadas Configuradas:
   ✅ AGT_PRODUCER_PRIVATE_KEY (para jwsSoftwareSignature): ✓ Configurada
   ✅ AGT_PRIVATE_KEY (para jwsDocumentSignature): ✓ Configurada

1️⃣ Testando jwsSoftwareSignature (CHAVE DO PRODUTOR)...
   ✅ Assinatura criada (256 chars)

2️⃣ Testando jwsDocumentSignature (CHAVE DO EMISSOR)...
   ✅ Assinatura criada (256 chars)
```

## Próximos Passos

1. **Registar chaves com AGT**: Envie os fingerprints SHA256 das chaves públicas para AGT
2. **Testar com payload real**: Use `scripts/test-hml-auth.js` para submeter dados de teste
3. **Monitorar erros E08/E40**: Se receber esses erros, significa que as chaves públicas não estão registadas na AGT

---

**Referência**: decree.md - AGT Electronic Invoicing Specification
- Page 6: `jwsSoftwareSignature` (chave privada do **produtor**)
- Page 7: `jwsDocumentSignature` (chave privada do **emissor**)
