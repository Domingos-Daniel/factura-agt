# Quick Start - Integração SAP → AGT
## Para Programadores SAP (ECC/S/4HANA)

---

## 🚀 Início Rápido (5 minutos)

### 1. Obter Token de Autenticação

```bash
curl -X POST https://seu-sistema.ao/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"nif":"123456789","password":"admin123"}'
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600
  }
}
```

### 2. Registar Factura

```bash
curl -X POST https://seu-sistema.ao/api/agt/registarFactura \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d @factura.json
```

**factura.json:**
```json
{
  "nif": "999888777",
  "documentType": "FT",
  "seriesNumber": "FT 2025/00001",
  "issueDate": "2025-12-11T10:30:00",
  "client": {
    "nif": "123456789",
    "name": "Cliente Teste Lda"
  },
  "lines": [{
    "lineNumber": 1,
    "productCode": "PROD001",
    "description": "Produto Teste",
    "quantity": 10,
    "unit": "UN",
    "unitPrice": 1000.00,
    "taxes": [{"type": "IVA", "rate": 14}]
  }],
  "totals": {
    "subtotal": 10000.00,
    "totalTax": 1400.00,
    "total": 11400.00
  },
  "payment": {
    "method": "TB",
    "amount": 11400.00,
    "currency": "AOA"
  }
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "documentCode": "FT2025-00001-AGT-XYZ789",
    "hash": "A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6",
    "qrCode": "data:image/png;base64,iVBORw0KGgo...",
    "status": "APPROVED"
  }
}
```

---

## 📦 Mapeamento Rápido SAP → AGT

| SAP Tabela/Campo | AGT JSON Path | Transformação |
|------------------|---------------|---------------|
| **VBRK-VBELN** | documentNumber | Direto |
| **VBRK-FKART** | documentType | F1→FT, F2→FS, RE→NC |
| **VBRK-FKDAT** | issueDate | YYYYMMDD → ISO8601 |
| **KNA1-STCD1** | client.nif | Direto (9 dígitos) |
| **KNA1-NAME1** | client.name | Direto |
| **VBRP-MATNR** | lines[].productCode | Direto |
| **VBRP-FKIMG** | lines[].quantity | Decimal |
| **VBRP-NETWR** | totals.subtotal | Soma todas linhas |
| **KONV-KBETR** | taxes[].rate | Dividir por 10 |

---

## 🔧 ABAP - Função Exemplo

```abap
FUNCTION z_agt_send_invoice.
  DATA: lv_json TYPE string,
        lv_response TYPE string,
        lv_http_code TYPE i.

  " Construir JSON
  lv_json = '{'
         && '"nif": "999888777",'
         && '"documentType": "FT",'
         && '"issueDate": "' && sy-datum && 'T12:00:00",'
         && '"client": {'
         && '  "nif": "123456789",'
         && '  "name": "Cliente"'
         && '},'
         && '"totals": {"total": 11400.00}'
         && '}'.

  " Chamar API REST
  CALL METHOD cl_http_client=>create_by_url
    EXPORTING
      url = 'https://seu-sistema.ao/api/agt/registarFactura'
    IMPORTING
      client = lo_http_client.

  lo_http_client->request->set_method('POST').
  lo_http_client->request->set_header_field(
    name = 'Content-Type' value = 'application/json').
  lo_http_client->request->set_header_field(
    name = 'Authorization' value = 'Bearer TOKEN').
  lo_http_client->request->set_cdata(lv_json).

  lo_http_client->send( ).
  lo_http_client->receive( ).

  lv_http_code = lo_http_client->response->get_status( )-code.
  lv_response = lo_http_client->response->get_cdata( ).

  IF lv_http_code = 200.
    " Sucesso - processar resposta
    WRITE: / 'Factura registada com sucesso'.
  ELSE.
    " Erro - logar
    WRITE: / 'Erro:', lv_http_code, lv_response.
  ENDIF.

  lo_http_client->close( ).
ENDFUNCTION.
```

---

## 🔗 SAP PI/PO - Configuração

### Sender Agreement
- **Sender**: SAP_ECC
- **Receiver**: AGT_SYSTEM
- **Interface**: SI_Invoice_Out

### Receiver Determination
- **Receiver**: AGT_SYSTEM
- **Condition**: DocumentType = 'INVOIC'

### Interface Mapping
- **Source**: SAP_IDoc_INVOIC02
- **Target**: AGT_Invoice_MT

### Receiver Agreement
- **Adapter Type**: REST
- **URL**: `https://seu-sistema.ao/api/agt/registarFactura`
- **Method**: POST
- **Auth**: Bearer Token
- **Content-Type**: application/json

---

## 🎯 Tipos de Documento

| SAP FKART | AGT Type | Descrição |
|-----------|----------|-----------|
| F1 | FT | Factura |
| F2 | FS | Factura Simplificada |
| G2 | FR | Factura Recibo |
| RE | NC | Nota de Crédito |
| L2 | ND | Nota de Débito |
| S1 | RC | Recibo |

---

## 📥 Downloads

- **WSDL**: [AGT_FacturaService.wsdl](/wsdl/AGT_FacturaService.wsdl)
- **Postman**: [AGT_API_Collection.json](/postman/AGT_API_Collection.json)
- **Guia Completo**: [INTEGRACAO_SAP_AGT.md](/INTEGRACAO_SAP_AGT.md)

---

## 🆘 Códigos de Erro

| HTTP | Descrição | Ação |
|------|-----------|------|
| 200 | Sucesso | Processar resposta |
| 400 | Dados inválidos | Validar payload |
| 401 | Token expirado | Renovar autenticação |
| 422 | Validação fiscal falhou | Corrigir totais/impostos |
| 500 | Erro servidor | Retry após 5min |

---

## 📞 Suporte

**Email**: dev@seu-sistema.ao  
**Documentação**: https://seu-sistema.ao/docs  
**Status API**: https://seu-sistema.ao/api/integrations/status

---

**Versão**: 1.0 | **Data**: 11/12/2025
