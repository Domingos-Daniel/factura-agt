# Diagnóstico: Erros E08 e E40 no AGT HML

**Data**: 19 de março de 2026  
**Teste**: Endpoint `/listarSeries` com NIF teste `5000660086`  
**Credenciais**: `ws.hml.safefacturas` / `mfn+38470+2026` ✅

---

## Respostas do AGT

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

---

## Análise

### ✅ O que está correto:
- **Credenciais HML**: `ws.hml.safefacturas` + `mfn+38470+2026` ✅
- **Software Validation**: `FE/308/AGT/2026` ✅  
- **NIF Teste**: `5000660086` ✅
- **URL HML**: `https://sifphml.minfin.gov.ao/sigt/fe/v1` ✅
- **Assinaturas JWS**: Ambas geradas com 256 caracteres ✅
- **Formato JSON**: Válido ✅

### ❌ Problemas Identificados

#### 1. **Erro E08: Software signature inválida**
- **Causa provável**: As chaves privadas no `.env.local` não correspondem aos **certificados registrados com AGT**
- **Validação esperada**: AGT valida a assinatura usando a chave PÚBLICA que você registrou
- **Ação necessária**:
  1. Verifique se o software `FE/308/AGT/2026` foi registrado no portal AGT
  2. Confirme que a chave pública que enviou corresponde à chave privada em `AGT_PRODUCER_PRIVATE_KEY`
  3. Possível: A chave foi registrada com outro nome/tipo

#### 2. **Erro E40: Assinatura da chamada inválida**
- **Causa provável**: A assinatura não foi gerada corretamente ou o payload mudou após assinar
- **O que AGT espera**:
  - `jwsSignature` deve assinar o `taxRegistrationNumber` 
  - Para `listarSeries`: apenas `{ taxRegistrationNumber: nif }`
  - Formato: RSA-SHA256, 256 caracteres Base64

---

## Próximas Ações

### 1️⃣ **Validar Chaves Registradas com AGT**
```bash
# Gerar fingerprint da chave pública (para verificação com AGT)
node -e "
const crypto = require('crypto');
const key = process.env.AGT_PRODUCER_PRIVATE_KEY;
const pubKey = crypto.createPrivateKey(key).export({ type: 'spki', format: 'pem' });
console.log(crypto.createHash('sha256').update(pubKey).digest('hex'));
" # Não funciona, mas conceito é: enviar fingerprint para AGT confirmar
```

### 2️⃣ **Verificar Registro com AGT**
- Acesse: https://portaldocontribuinte.minfin.gov.ao
- Verifique:
  - ✅ Software `FE/308/AGT/2026` está ativo?
  - ✅ Chave pública corresponde?
  - ✅ NIF `5000660086` está aderido?

### 3️⃣ **Testar com NIF Pre-registrado**
Se disponível, teste com um NIF que sabidamente funciona para excluir problemas de chaves.

### 4️⃣ **Contato com AGT**
Para suporte técnico:
- 📧 Email: sapps@agt.minfin.gov.ao
- ☎️ Telefone: (+244) 222 706 000
- 🌐 Portal: https://portaldocontribuinte.minfin.gov.ao

---

## Checklist de Resolução

- [ ] Software está registrado com AGT no portal do contribuinte
- [ ] Chave pública corresponde à chave privada em .env.local
- [ ] NIF 5000660086 está aderido a facturação eletrônica
- [ ] Conectado ao ambiente HML (não produção)
- [ ] Usando credenciais corretas: `ws.hml.safefacturas`

---

## Arquivos Envolvidos

- `.env.local` - Credenciais e chaves
- `lib/jws-signer.js` - Gerador de assinaturas
- `scripts/test-hml-auth.js` - Testes contra AGT HML

