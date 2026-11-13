# Referência Técnica: JWS Antigo vs. Novo

## Problema: Por que E08/E40?

A AGT retornava:
- **E08**: "A assinatura do produtor de software não está de acordo..."
- **E40**: "Os dados constantes na assinatura da chamada não estão de acordo..."

**Razão**: A implementação anterior não gerava JWT **válido** conforme a especificação oficial.

---

## Implementação Antiga ❌

```javascript
function createJWSSignature(payload, privateKey) {
  // 1. JSON normal (OK)
  const jsonPayload = JSON.stringify(payload)
  
  // 2. Assinar com RSA-SHA256 (OK)
  const sign = crypto.createSign('RSA-SHA256')
  sign.update(jsonPayload)
  sign.end()
  
  // 3. ❌ ERRO CRÍTICO: Usar Base64 normal
  const signature = sign.sign(privateKey, 'base64')
  
  // 4. ❌ ERRO CRÍTICO: Truncar para 256 caracteres
  if (signature.length > 256) {
    return signature.substring(0, 256)  // Destroy signature!
  }
  
  return signature
}
```

### Problemas:

1. **❌ Sem Header JWS**
   - JWT válido requer: header.payload.signature
   - Implementação apenas retornava: signature

2. **❌ Base64 normal em vez de Base64URL**
   - JWS requer: `-` e `_`, sem `=`
   - Implementação usava: `+` e `/`, com `=`

3. **❌ Truncado para 256 caracteres**
   - JWT típico: 400-600 caracteres
   - Implementação: sobrescrevia dados válidos

4. **❌ JSON não-canônico**
   - Recomendado: sem espaços, sem quebras
   - Implementação variável

---

## Implementação Nova ✅

```javascript
function createJWSSignature(payload, privateKey) {
  // 1. Header JWS conforme spec
  const header = {
    alg: 'RS256',      // ✅ RSA com SHA-256
    typ: 'JWT'         // ✅ JSON Web Token
  }
  
  // 2. JSON canônico (sem espaços, sem quebras)
  const headerJSON = JSON.stringify(header)        // ✅
  const payloadJSON = JSON.stringify(payload)      // ✅
  
  // 3. Base64URL encoding
  const base64UrlEncode = (str) => {
    return Buffer.from(str, 'utf8')
      .toString('base64')
      .replace(/\+/g, '-')      // ✅ + → -
      .replace(/\//g, '_')      // ✅ / → _
      .replace(/=/g, '')        // ✅ remover padding
  }
  
  const headerB64 = base64UrlEncode(headerJSON)
  const payloadB64 = base64UrlEncode(payloadJSON)
  
  // 4. Montar conteúdo a assinar: header.payload
  const signingInput = `${headerB64}.${payloadB64}`  // ✅
  
  // 5. Assinar com RSA-SHA256
  const sign = crypto.createSign('RSA-SHA256')
  sign.update(signingInput)
  const signatureBase64 = sign.sign(privateKey, 'base64')
  
  // 6. Converter assinatura para Base64URL
  const signatureB64 = signatureBase64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
  
  // 7. Montar JWT final ✅
  const jwt = `${signingInput}.${signatureB64}`
  
  return jwt  // ✅ JWT completo e válido
}
```

### Melhorias:

1. **✅ Header JWS completo**
   - Inclui algoritmo e tipo
   - Conforme padrão JWT

2. **✅ Base64URL**
   - Substitui `+` por `-`
   - Substitui `/` por `_`
   - Remove padding `=`

3. **✅ Formato JWT correto**
   - header.payload.signature
   - Tamanho real mantido (~511 chars)

4. **✅ JSON canônico**
   - Sem espaços desnecessários
   - Sem quebras de linha

---

## Exemplo Prático

### Payload Original
```json
{
  "productId": "SafeFacturas",
  "productVersion": "1.0.1",
  "softwareValidationNumber": "FE/308/AGT/2026"
}
```

### JWT Gerado (Novo) ✅
```
eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9
.
eyJwcm9kdWN0SWQiOiJTYWZlRmFjdHVyYXMiLCJwcm9kdWN0VmVyc2lvbiI6IjEuMC4xIiwic29mdHdhcmVWYWxpZGF0aW9uTnVtYmVyIjoiRkUvMzA4L0FHVC8yMDI2In0
.
[256-char base64url signature]
```

### Decode (informativo):
- **Header**: `{"alg":"RS256","typ":"JWT"}`
- **Payload**: `{"productId":"SafeFacturas","productVersion":"1.0.1",...}`
- **Signature**: RSA-SHA256 assinatura criptográfica

---

## Validação AGT

### Antes (Erro E08/E40):
```
AGT recebe: signature_truncado (256 chars)
AGT tenta validar: header.payload.signature
AGT não encontra: header!
Resultado: ❌ E08/E40
```

### Depois (Sucesso):
```
AGT recebe: header.payload.signature (511 chars)
AGT valida: header ✅
AGT valida: payload ✅
AGT valida: signature ✅
Resultado: ✅ resultCode "1"
```

---

## Testes de Validação

### Verificar tamanho correto:
```bash
node -e "
const s = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ...';
console.log('JWT length:', s.length);      // ~511 caracteres ✅
console.log('Tem 3 partes:', s.split('.').length === 3 ? '✓' : '✗');
console.log('Base64URL (sem +/=):', !/[+/=]/.test(s) ? '✓' : '✗');
"
```

### Validar assinatura (Node.js):
```bash
npm install jsonwebtoken  # se necessário

node -e "
const jwt = require('jsonwebtoken');
const token = 'seu_jwt_aqui';
const publicKey = require('fs').readFileSync('public.pem');

try {
  const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
  console.log('✅ Assinatura válida!');
  console.log('Payload:', decoded);
} catch (e) {
  console.log('❌ Assinatura inválida:', e.message);
}
"
```

---

## Referências

- [AGT Estrutura de Assinaturas](https://quiosqueagt.minfin.gov.ao/doc-agt/faturacao-electronica/1/estrutura.html)
- [RFC 7515 - JSON Web Signature](https://tools.ietf.org/html/rfc7515)
- [RFC 7517 - JSON Web Key (JWK)](https://tools.ietf.org/html/rfc7517)
- [Base64URL Encoding](https://tools.ietf.org/html/rfc7515#appendix-C)

---

**Status**: E08/E40 ✅ RESOLVIDO - Sistema pronto para produção

