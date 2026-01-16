# 🧪 Guia de Teste com AGT HML (Homologação)

## Configuração do Ambiente

### 1. Variáveis de Ambiente Configuradas

Arquivo: `.env.local`

```env
# === AGT Configuration ===
AGT_ENVIRONMENT=hml

# HML (Homologação/Teste)
AGT_HML_BASE_URL=https://sifphml.minfin.gov.ao/sigt/fe/v1
AGT_HML_NIF_TEST=5000413178

AGT_USE_MOCK=false
AGT_TIMEOUT_MS=30000
AGT_MAX_RETRIES=2
```

### 2. Endpoints AGT HML

| Serviço | Endpoint |
|---------|----------|
| **Registar Factura** | `https://sifphml.minfin.gov.ao/sigt/fe/v1/registarFactura` |
| **Obter Estado** | `https://sifphml.minfin.gov.ao/sigt/fe/v1/obterEstado` |
| **Listar Facturas** | `https://sifphml.minfin.gov.ao/sigt/fe/v1/listarFacturas` |
| **Consultar Factura** | `https://sifphml.minfin.gov.ao/sigt/fe/v1/consultarFactura` |
| **Solicitar Série** | `https://sifphml.minfin.gov.ao/sigt/fe/v1/solicitarSerie` |
| **Listar Séries** | `https://sifphml.minfin.gov.ao/sigt/fe/v1/listarSeries` |
| **Validar Documento** | `https://sifphml.minfin.gov.ao/sigt/fe/v1/validarDocumento` |

---

## NIFs de Teste

Usar os NIFs fornecidos pela AGT para ambiente de teste:

### NIF Emissor de Teste
```
5000413178
```

### Outros NIFs de Teste (se fornecidos)
- [Adicionar outros NIFs de teste conforme necessário]

---

## 📋 Processo de Teste via Excel

### Passo 1: Preparar Ficheiro Excel

Usar um dos modelos suportados:
- `modelo-planilha.xlsx` (formato AGT)
- `modelo-2.xlsx` (formato SAP B2)

**Importante**: 
- No campo **NIF do emissor** (taxRegistrationNumber): usar `5000413178`
- No campo **NIF do cliente** (customerTaxID): pode usar `999999999` (sem identificação) ou outro NIF de teste

### Passo 2: Importar via Interface

1. Aceder: `http://localhost:3000/facturas/importar`
2. Fazer upload do ficheiro Excel
3. Verificar preview dos dados
4. Confirmar importação

### Passo 3: Verificar Envio para AGT

Após confirmar a importação, o sistema irá:

1. ✅ Processar o Excel
2. ✅ Converter para formato AGT
3. ✅ Assinar digitalmente (JWS)
4. ✅ Enviar para AGT HML via POST
5. ✅ Receber `requestID` da AGT
6. ✅ Salvar em `data/facturas.json`

### Passo 4: Verificar Logs

No terminal do servidor Next.js, você verá:

```
🌍 AGT Environment: hml
🧪 Usando AGT HML (Homologação): https://sifphml.minfin.gov.ao/sigt/fe/v1
📤 POST https://sifphml.minfin.gov.ao/sigt/fe/v1/registarFactura
📦 Payload: {...}
✅ Resposta AGT: { requestID: "REQ-..." }
```

---

## 🧪 Estrutura do Payload para AGT

### Exemplo Mínimo (1 factura com 1 linha)

```json
{
  "schemaVersion": "1.0",
  "submissionUUID": "550e8400-e29b-41d4-a716-446655440000",
  "taxRegistrationNumber": "5000413178",
  "submissionTimeStamp": "2026-01-16T16:00:00Z",
  "softwareInfo": {
    "softwareInfoDetail": {
      "productId": "SafeFacturas",
      "productVersion": "1.0.0",
      "softwareValidationNumber": "AGT-2025-001"
    },
    "jwsSoftwareSignature": "eyJhbGc..."
  },
  "numberOfEntries": 1,
  "documents": [
    {
      "documentNo": "FT 2026/00001",
      "documentStatus": "N",
      "jwsDocumentSignature": "eyJhbGc...",
      "documentDate": "2026-01-16",
      "documentType": "FT",
      "eacCode": "47190",
      "systemEntryDate": "2026-01-16T16:00:00Z",
      "customerTaxID": "999999999",
      "customerCountry": "AO",
      "companyName": "Cliente Genérico",
      "lines": [
        {
          "lineNumber": "1",
          "productCode": "PROD001",
          "productDescription": "Produto Teste",
          "quantity": "1",
          "unitOfMeasure": "UN",
          "unitPrice": "1000.00",
          "unitPriceBase": "1000.00",
          "debitAmount": "1000.00",
          "taxes": [
            {
              "taxType": "IVA",
              "taxCountryRegion": "AO",
              "taxCode": "NOR",
              "taxPercentage": "14",
              "taxAmount": "140.00",
              "taxContribution": "140.00"
            }
          ],
          "settlementAmount": "0"
        }
      ],
      "documentTotals": {
        "taxPayable": "140.00",
        "netTotal": "1000.00",
        "grossTotal": "1140.00"
      }
    }
  ]
}
```

---

## 📊 Respostas Esperadas da AGT

### Sucesso
```json
{
  "requestID": "REQ-1737045600123"
}
```

### Erro de Validação
```json
{
  "errorList": [
    {
      "idError": "E001",
      "documentNo": "FT 2026/00001",
      "descriptionError": "NIF do emissor inválido"
    }
  ]
}
```

---

## 🔍 Verificação de Estado

Após receber o `requestID`, pode consultar o estado:

### Via API
```bash
curl -X POST https://sifphml.minfin.gov.ao/sigt/fe/v1/obterEstado \
  -H "Content-Type: application/json" \
  -d '{
    "requestID": "REQ-1737045600123"
  }'
```

### Via Interface
1. Aceder: `http://localhost:3000/facturas/lista`
2. Clicar na factura importada
3. Verificar campo `requestID` e status

---

## ⚠️ Possíveis Erros

### Erro: Timeout
```
AGT 504: Gateway Timeout
```
**Solução**: Aumentar `AGT_TIMEOUT_MS` para 60000 (60 segundos)

### Erro: NIF Inválido
```json
{
  "errorList": [{
    "idError": "E001",
    "descriptionError": "NIF do emissor não está registado no sistema AGT"
  }]
}
```
**Solução**: Verificar se está usando NIF de teste: `5000413178`

### Erro: Assinatura Inválida
```json
{
  "errorList": [{
    "idError": "E010",
    "descriptionError": "Assinatura JWS inválida"
  }]
}
```
**Solução**: Verificar chave privada RSA no `.env.local`

### Erro: Campos Obrigatórios
```json
{
  "errorList": [{
    "idError": "E002",
    "descriptionError": "Campo obrigatório não preenchido: documentDate"
  }]
}
```
**Solução**: Verificar se todos os campos obrigatórios estão presentes

---

## 📝 Checklist de Teste

Antes de testar:

- [ ] `.env.local` configurado com `AGT_ENVIRONMENT=hml`
- [ ] NIF de teste configurado: `5000413178`
- [ ] Servidor Next.js rodando: `npm run dev`
- [ ] Ficheiro Excel preparado com dados de teste
- [ ] NIF no Excel corresponde ao NIF de teste
- [ ] Data da factura não é futura

Durante o teste:

- [ ] Upload do Excel bem-sucedido
- [ ] Preview mostra dados corretos
- [ ] Importação retorna `requestID`
- [ ] Factura aparece em `/facturas/lista`
- [ ] Detalhes da factura mostram `requestID`
- [ ] Logs mostram "Usando AGT HML"

Após o teste:

- [ ] Verificar `data/facturas.json` contém a factura
- [ ] `requestID` foi salvo corretamente
- [ ] Callback da AGT foi recebido (se configurado)
- [ ] Status de validação atualizado

---

## 🚀 Próximos Passos

1. **Testar Import Excel** → ✅ Verificar conexão com AGT HML
2. **Consultar Estado** → Verificar se factura foi validada
3. **Testar Callback** → Configurar URL callback para receber notificações
4. **Testar Outros Serviços** → Listar facturas, consultar, etc.

---

## 📞 Suporte

Em caso de problemas:
1. Verificar logs do servidor Next.js
2. Verificar arquivo `data/agt-callbacks.log`
3. Consultar especificação técnica: `new-tec-specs.md`
4. Contactar suporte AGT: [email/telefone]

---

## 🔄 Voltar ao Mock

Para voltar a usar o Mock (desenvolvimento local):

```env
# .env.local
AGT_ENVIRONMENT=mock
```

Reiniciar o servidor.
