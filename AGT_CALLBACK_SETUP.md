# 🔔 Configuração do Callback URL da AGT

## O que é o Callback URL?

O **Callback URL** é um endpoint obrigatório que a AGT usa para enviar automaticamente o resultado da validação das facturas.

### Como funciona:

```
┌─────────────┐          ┌─────────────┐          ┌─────────────┐
│ SafeFacturas│ ─────>   │     AGT     │ ─────>   │ SafeFacturas│
│   (envio)   │          │  (valida)   │          │  (callback) │
└─────────────┘          └─────────────┘          └─────────────┘
     1. POST                   2. Processa              3. POST
   registarFactura          valida documento        callback result
```

## Status de Retorno

A AGT informa se a factura foi:

| Status | Significado | Emoji |
|--------|-------------|-------|
| **V** | ✅ Validada | Factura aprovada pela AGT |
| **R** | ❌ Rejeitada | Factura recusada pela AGT |
| **E** | ⚠️ Com Erros | Factura com problemas de validação |

---

## 📌 Configuração

### URL do Callback (Produção)

```
https://safefacturas.safeq-ao.ao/api/agt/callback
```

### URL do Callback (Desenvolvimento Local)

Para testar localmente, você precisa expor sua aplicação usando um serviço de tunelamento:

#### Opção 1: ngrok
```bash
ngrok http 3000
```
URL gerada: `https://abc123.ngrok.io/api/agt/callback`

#### Opção 2: localtunnel
```bash
npm install -g localtunnel
lt --port 3000 --subdomain safefacturas
```
URL gerada: `https://safefacturas.loca.lt/api/agt/callback`

#### Opção 3: Cloudflare Tunnel
```bash
cloudflared tunnel --url http://localhost:3000
```
URL gerada: `https://xyz.trycloudflare.com/api/agt/callback`

---

## 📥 Payload do Callback

A AGT envia um **HTTP POST** com dados em **JSON**:

### Exemplo: Factura Validada ✅
```json
{
  "requestID": "REQ-1737034800123",
  "status": "V",
  "documentNo": "FT CI2000202503/3240000030",
  "validationDate": "2026-01-16T10:30:00Z",
  "details": {
    "qrCode": "https://agt.minfin.gov.ao/validar/qrcode/ABC123",
    "hash": "3a5c8f9e2b1d4a7c6f8e9b2a1c3d4e5f",
    "certificateNumber": "CERT-2026-001234"
  }
}
```

### Exemplo: Factura Rejeitada ❌
```json
{
  "requestID": "REQ-1737034800123",
  "status": "R",
  "documentNo": "FT CI2000202503/3240000030",
  "validationDate": "2026-01-16T10:35:00Z",
  "errors": [
    {
      "code": "E001",
      "message": "NIF do cliente inválido",
      "field": "customerTaxID"
    },
    {
      "code": "E002",
      "message": "Data da factura posterior à data atual",
      "field": "documentDate"
    }
  ]
}
```

### Exemplo: Factura com Erros ⚠️
```json
{
  "requestID": "REQ-1737034800123",
  "status": "E",
  "documentNo": "FT CI2000202503/3240000030",
  "validationDate": "2026-01-16T10:40:00Z",
  "errors": [
    {
      "code": "W001",
      "message": "Valor total não confere com soma das linhas",
      "field": "documentTotals"
    }
  ]
}
```

---

## 🔧 Implementação no SafeFacturas

### Endpoint Criado

```typescript
// app/api/agt/callback/route.ts

export async function POST(request: NextRequest) {
  const payload = await request.json()
  
  // 1. Validar requestID e status
  // 2. Encontrar factura no JSON pelo requestID
  // 3. Atualizar status e dados de validação
  // 4. Salvar no arquivo facturas.json
  
  return NextResponse.json({ success: true })
}
```

### O que o endpoint faz:

1. ✅ **Recebe o callback** da AGT via POST
2. ✅ **Valida o payload** (requestID e status obrigatórios)
3. ✅ **Busca a factura** no `data/facturas.json` pelo `requestID`
4. ✅ **Atualiza o status**:
   - `validationStatus`: V, R ou E
   - `validationDate`: data da validação
   - `validationResult`: detalhes (QR code, hash, erros)
5. ✅ **Salva no JSON** para persistência
6. ✅ **Loga no console** para debug
7. ✅ **Salva em log** se requestID não for encontrado

---

## 🧪 Como Testar

### 1. Verificar se o endpoint está funcionando

```bash
curl http://localhost:3000/api/agt/callback
```

Resposta esperada:
```json
{
  "endpoint": "/api/agt/callback",
  "method": "POST",
  "description": "Endpoint para receber callbacks da AGT..."
}
```

### 2. Simular um callback de validação

```bash
curl -X POST http://localhost:3000/api/agt/callback \
  -H "Content-Type: application/json" \
  -d '{
    "requestID": "REQ-1737034800123",
    "status": "V",
    "documentNo": "FT CI2000202503/3240000030",
    "validationDate": "2026-01-16T10:30:00Z",
    "details": {
      "qrCode": "https://agt.minfin.gov.ao/validar/ABC123",
      "hash": "3a5c8f9e2b1d4a7c6f8e9b2a1c3d4e5f",
      "certificateNumber": "CERT-2026-001234"
    }
  }'
```

### 3. Verificar no arquivo JSON

```bash
cat data/facturas.json | jq '.[] | select(.requestID == "REQ-1737034800123")'
```

Ou abrir diretamente: `data/facturas.json`

---

## 📊 Monitoramento

### Logs do servidor

O endpoint loga todas as operações no console:

```
🔔 Callback AGT recebido em: 2026-01-16T10:30:00Z
📦 Payload recebido: { requestID: "REQ-...", status: "V", ... }
✅ Factura FT CI2000202503/3240000030 VALIDADA
💾 Factura atualizada no JSON (ID: 996c5729-d3cc-4151-a4a0-8a35930e9f3a)
```

### Log de callbacks não encontrados

Se um `requestID` não for encontrado, o callback é salvo em:
```
data/agt-callbacks.log
```

---

## 🔐 Segurança (Recomendações)

Para produção, considere adicionar:

1. **Autenticação via Token**
   ```typescript
   const authToken = request.headers.get('Authorization')
   if (authToken !== `Bearer ${process.env.AGT_CALLBACK_SECRET}`) {
     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
   }
   ```

2. **Validação de IP** (apenas IPs da AGT)
   ```typescript
   const clientIP = request.headers.get('x-forwarded-for') || request.ip
   const allowedIPs = ['197.149.x.x', '41.223.x.x'] // IPs da AGT
   if (!allowedIPs.includes(clientIP)) {
     return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
   }
   ```

3. **Rate Limiting** (limitar requisições por IP)

4. **Assinatura HMAC** (verificar integridade do payload)

---

## ✅ Checklist de Configuração

- [ ] Endpoint `/api/agt/callback` criado e funcionando
- [ ] Aplicação acessível via HTTPS (produção) ou túnel (dev)
- [ ] URL configurada no portal da AGT
- [ ] Testado com callback simulado
- [ ] Monitoramento de logs configurado
- [ ] Segurança implementada (autenticação, IP whitelist)
- [ ] Arquivo `facturas.json` com permissões de escrita
- [ ] Pasta `data/` criada e acessível

---

## 🆘 Troubleshooting

### Problema: Callback não está chegando

1. Verificar se a URL está correta no portal da AGT
2. Verificar se a aplicação está acessível externamente
3. Verificar logs do servidor
4. Testar com curl manualmente

### Problema: requestID não encontrado

1. Verificar se a factura foi salva com `requestID` correto
2. Verificar arquivo `data/agt-callbacks.log`
3. Comparar `requestID` enviado vs. recebido

### Problema: Erro ao salvar JSON

1. Verificar permissões da pasta `data/`
2. Verificar se o arquivo `facturas.json` é válido JSON
3. Verificar espaço em disco

---

## 📚 Referências

- [Documentação AGT](https://agt.minfin.gov.ao/docs)
- [Especificação API REST](https://agt.minfin.gov.ao/api/docs)
- [Guia de Integração](./INTEGRACAO_SAP_AGT.md)
