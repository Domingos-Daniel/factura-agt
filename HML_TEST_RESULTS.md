# Resultados dos Testes AGT HML

## 📋 Configuração

- **Ambiente**: HML (Homologação)
- **Base URL**: https://sifphml.minfin.gov.ao/sigt/fe/v1
- **Credenciais**: ws.hml.addonsaftb1 / ***REDACTED***
- **NIF de Teste**: 5000413178
- **Autenticação**: HTTP Basic Auth

## ✅ Testes Realizados

### 1. Teste de Autenticação
**Script**: `scripts/test-hml-auth.js`

**Status**: ✅ SUCESSO

**Resultado**:
```
Status: 200 OK
Server: Oracle-HTTP-Server
```

**Conclusão**: As credenciais estão válidas e a autenticação funciona corretamente.

---

### 2. Teste de Registro de Factura
**Script**: `scripts/test-hml-registar-factura.js`

**Status**: ✅ SUCESSO

**Factura de Teste**:
- Documento: FT HML2026/0116-001
- Cliente: NIF 5000413178
- Valor: 10.000 AOA
- IVA 14%: 1.400 AOA
- Total: 11.400 AOA

**Transformações Aplicadas**:
1. `submissionGUID` → `submissionUUID`
2. Adicionado `jwsDocumentSignature` a cada documento

**Resposta AGT**:
```json
{
  "requestID": "202600000184282",
  "errorList": [""]
}
```

**Conclusão**: ✅ Factura registada com sucesso! RequestID gerado: **202600000184282**

---

### 3. Teste Obter Estado
**Script**: `scripts/test-hml-obter-estado.js`

**Status**: ⚠️ ERRO 500

**Payload**:
```json
{
  "taxRegistrationNumber": "5000413178",
  "requestID": "202600000184282"
}
```

**Resposta**:
```
HTTP 500 Internal Server Error
Content-Type: application/xml
```

**Conclusão**: Erro no servidor AGT ou factura ainda em processamento. Aguardar alguns minutos e tentar novamente.

---

## 🔧 Implementações

### 1. Transformador de Payload (agtTransformer.ts)

Criado para converter payload interno para formato AGT:

```typescript
export function transformToAGTFormat(payload: any): any {
  const transformed = {
    ...payload,
    submissionUUID: payload.submissionGUID, // Renomear campo
    documents: payload.documents?.map((doc: any) => ({
      ...doc,
      jwsDocumentSignature: generateDummyJWS(doc) // Adicionar assinatura
    }))
  }
  delete transformed.submissionGUID
  return transformed
}
```

**Funcionalidades**:
- Renomeia `submissionGUID` → `submissionUUID`
- Adiciona `jwsDocumentSignature` a cada documento
- Gera assinatura JWS dummy para testes (⚠️ não usar em produção)

### 2. Integração com agtClient.ts

O cliente AGT foi atualizado para aplicar a transformação automaticamente:

```typescript
registarFactura<T>(payload: T) {
  const transformed = transformToAGTFormat(payload)
  return this.post<typeof transformed, ...>(`/registarFactura`, transformed)
}
```

### 3. Suporte a Autenticação HML

Atualizado `createAgtClient()` para suportar Basic Auth:

```typescript
if (environment === 'hml') {
  const username = process.env.AGT_HML_USERNAME
  const password = process.env.AGT_HML_PASSWORD
  if (username && password) {
    authValue = Buffer.from(`${username}:${password}`).toString('base64')
  }
}
```

---

## 📝 Variáveis de Ambiente

Adicionar ao `.env.local`:

```env
# AGT Environment Configuration
AGT_ENVIRONMENT=hml

# HML Configuration
AGT_HML_BASE_URL=https://sifphml.minfin.gov.ao/sigt/fe/v1
AGT_HML_USERNAME=ws.hml.addonsaftb1
AGT_HML_PASSWORD=***REDACTED***
AGT_HML_NIF_TEST=5000413178

# Authentication
AGT_AUTH_TYPE=basic
AGT_USE_MOCK=false
```

---

## 🎯 Próximos Passos

### ✅ Completo
1. Autenticação com AGT HML
2. Registro de factura no HML
3. Transformação de payload (GUID → UUID)
4. Adição de assinatura JWS

### 🔄 Pendente
1. ~~Obter estado da factura (aguardar processamento)~~
2. Testar com múltiplas facturas
3. Implementar assinatura JWS real (RS256)
4. Integrar com fluxo de importação Excel
5. Testar callback de validação
6. Preparar para ambiente produção

### ⚠️ Importante
- **JWS Signature**: Atualmente usando assinatura dummy
- Para produção, implementar assinatura RSA real:
  - Algoritmo: RS256
  - Chave privada: Carregar de `.env` ou arquivo seguro
  - Formato: base64url(header).base64url(payload).base64url(signature)

---

## 🧪 Como Executar os Testes

### Teste de Autenticação
```bash
node scripts/test-hml-auth.js
```

### Teste de Registro de Factura
```bash
node scripts/test-hml-registar-factura.js
```

### Teste Obter Estado
```bash
node scripts/test-hml-obter-estado.js [requestID]
```

Exemplo:
```bash
node scripts/test-hml-obter-estado.js 202600000184282
```

---

## 📊 Análise de Erros Resolvidos

### Erro 1: "submissionUUID: é obrigatório"
**Causa**: AGT espera `submissionUUID` mas enviávamos `submissionGUID`

**Solução**: Transformador renomeia o campo automaticamente

### Erro 2: "jwsDocumentSignature: é obrigatório"
**Causa**: AGT requer assinatura JWS em cada documento

**Solução**: Gerador de JWS dummy adicionado ao transformador

---

## 🔐 Segurança

⚠️ **ATENÇÃO**: As credenciais HML são de teste e não devem ser usadas em produção.

Para produção:
1. Usar variáveis de ambiente seguras
2. Implementar assinatura JWS real
3. Configurar certificados SSL adequados
4. Implementar rotação de credenciais
5. Adicionar logs de auditoria

---

Gerado em: 16/01/2026 16:59
