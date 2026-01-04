# Exemplos SOAP para Testar os 7 Serviços AGT

> **Nota**: Todos os XMLs usam o namespace `https://factura-agt.vercel.app/facturacao/v1`

---

## 1. REGISTAR FACTURA

Registar uma nova factura electrónica no sistema.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:tns="https://factura-agt.vercel.app/facturacao/v1">
  <soapenv:Header/>
  <soapenv:Body>
    <tns:RegistarFacturaRequest>
      <schemaVersion>1.0</schemaVersion>
      <submissionGUID>aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee</submissionGUID>
      <taxRegistrationNumber>123456789</taxRegistrationNumber>
      <submissionTimeStamp>2026-01-04T21:16:00Z</submissionTimeStamp>
      <numberOfEntries>1</numberOfEntries>
      <documents>
        <document>
          <documentNo>FT2026-NOVA-001</documentNo>
          <documentDate>2026-01-04</documentDate>
          <documentType>FT</documentType>
          <customerTaxID>987654321</customerTaxID>
          <companyName>Cliente SOAP</companyName>
          <totalTaxAmount>50.00</totalTaxAmount>
          <totalGrossAmount>250.00</totalGrossAmount>
        </document>
      </documents>
      <jwsSignature>PLACEHOLDER_JWS</jwsSignature>
      <softwareInfo>
        <softwareInfoDetail>
          <productId>TEST_SOFT</productId>
          <productVersion>1.0</productVersion>
          <softwareValidationNumber>VAL-TEST</softwareValidationNumber>
        </softwareInfoDetail>
        <jwsSoftwareSignature>...</jwsSoftwareSignature>
      </softwareInfo>
    </tns:RegistarFacturaRequest>
  </soapenv:Body>
</soapenv:Envelope>
```

**Resposta Esperada:**
```xml
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <fact:registarFacturaResponse xmlns:fact="http://agt.minfin.gov.ao/facturacao/v1">
      <fact:response>
        <fact:returnCode>0</fact:returnCode>
        <fact:requestID>req-XXX</fact:requestID>
      </fact:response>
      <fact:httpStatus>200</fact:httpStatus>
    </fact:registarFacturaResponse>
  </soap:Body>
</soap:Envelope>
```

---

## 2. OBTER ESTADO

Obter o estado de validação de uma factura registada usando o `requestID`.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:tns="https://factura-agt.vercel.app/facturacao/v1">
  <soapenv:Header/>
  <soapenv:Body>
    <tns:ObterEstadoRequest>
      <schemaVersion>1.0</schemaVersion>
      <taxRegistrationNumber>123456789</taxRegistrationNumber>
      <requestID>req-001</requestID>
      <submissionTimeStamp>2026-01-04T21:16:00Z</submissionTimeStamp>
      <jwsSignature>PLACEHOLDER_JWS</jwsSignature>
      <softwareInfo>
        <softwareInfoDetail>
          <productId>TEST_SOFT</productId>
          <productVersion>1.0</productVersion>
          <softwareValidationNumber>VAL-TEST</softwareValidationNumber>
        </softwareInfoDetail>
        <jwsSoftwareSignature>...</jwsSoftwareSignature>
      </softwareInfo>
    </tns:ObterEstadoRequest>
  </soapenv:Body>
</soapenv:Envelope>
```

**Resposta Esperada:**
```xml
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <fact:obterEstadoResponse xmlns:fact="http://agt.minfin.gov.ao/facturacao/v1">
      <fact:response>
        <fact:statusResult>
          <fact:requestID>req-001</fact:requestID>
          <fact:resultCode>0</fact:resultCode>
          <fact:documentStatusList>
            <fact:documentStatus>
              <fact:documentNo>FT2025-001</fact:documentNo>
              <fact:documentStatus>V</fact:documentStatus>
            </fact:documentStatus>
          </fact:documentStatusList>
        </fact:statusResult>
      </fact:response>
      <fact:httpStatus>200</fact:httpStatus>
    </fact:obterEstadoResponse>
  </soap:Body>
</soap:Envelope>
```

---

## 3. LISTAR FACTURAS (JÁ TESTADO)

Listar facturas de um período específico.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:tns="https://factura-agt.vercel.app/facturacao/v1">
  <soapenv:Header/>
  <soapenv:Body>
    <tns:ListarFacturasRequest>
      <schemaVersion>1.0</schemaVersion>
      <taxRegistrationNumber>123456789</taxRegistrationNumber>
      <queryStartDate>2026-01-01</queryStartDate>
      <queryEndDate>2026-01-31</queryEndDate>
      <submissionTimeStamp>2026-01-04T21:16:00Z</submissionTimeStamp>
      <jwsSignature>PLACEHOLDER_JWS</jwsSignature>
      <softwareInfo>
        <softwareInfoDetail>
          <productId>TEST_SOFT</productId>
          <productVersion>1.0</productVersion>
          <softwareValidationNumber>VAL-TEST</softwareValidationNumber>
        </softwareInfoDetail>
        <jwsSoftwareSignature>...</jwsSoftwareSignature>
      </softwareInfo>
    </tns:ListarFacturasRequest>
  </soapenv:Body>
</soapenv:Envelope>
```

**Resposta Esperada:**
```xml
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <fact:listarFacturasResponse xmlns:fact="http://agt.minfin.gov.ao/facturacao/v1">
      <fact:response>
        <fact:documentResultCount>3</fact:documentResultCount>
        <fact:documentResultList>
          <fact:documentNo>FT2025-001</fact:documentNo>
          <fact:documentDate>2026-01-04</fact:documentDate>
        </fact:documentResultList>
      </fact:response>
      <fact:httpStatus>200</fact:httpStatus>
    </fact:listarFacturasResponse>
  </soap:Body>
</soap:Envelope>
```

---

## 4. CONSULTAR FACTURA

Obter detalhes de uma factura específica pelo número de documento.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:tns="https://factura-agt.vercel.app/facturacao/v1">
  <soapenv:Header/>
  <soapenv:Body>
    <tns:ConsultarFacturaRequest>
      <schemaVersion>1.0</schemaVersion>
      <taxRegistrationNumber>123456789</taxRegistrationNumber>
      <documentNo>FT2025-001</documentNo>
      <submissionTimeStamp>2026-01-04T21:16:00Z</submissionTimeStamp>
      <jwsSignature>PLACEHOLDER_JWS</jwsSignature>
      <softwareInfo>
        <softwareInfoDetail>
          <productId>TEST_SOFT</productId>
          <productVersion>1.0</productVersion>
          <softwareValidationNumber>VAL-TEST</softwareValidationNumber>
        </softwareInfoDetail>
        <jwsSoftwareSignature>...</jwsSoftwareSignature>
      </softwareInfo>
    </tns:ConsultarFacturaRequest>
  </soapenv:Body>
</soapenv:Envelope>
```

**Resposta Esperada:**
```xml
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <fact:consultarFacturaResponse xmlns:fact="http://agt.minfin.gov.ao/facturacao/v1">
      <fact:response>
        <fact:documentNo>FT2025-001</fact:documentNo>
        <fact:validationStatus>V</fact:validationStatus>
        <fact:documents>
          <fact:document>
            <fact:documentNo>FT2025-001</fact:documentNo>
            <fact:documentDate>2026-01-04</fact:documentDate>
            <fact:customerTaxID>987654321</fact:customerTaxID>
            <fact:companyName>Cliente 1</fact:companyName>
          </fact:document>
        </fact:documents>
      </fact:response>
      <fact:httpStatus>200</fact:httpStatus>
    </fact:consultarFacturaResponse>
  </soap:Body>
</soap:Envelope>
```

---

## 5. SOLICITAR SÉRIE

Criar uma nova série de numeração para facturas.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:tns="https://factura-agt.vercel.app/facturacao/v1">
  <soapenv:Header/>
  <soapenv:Body>
    <tns:SolicitarSerieRequest>
      <schemaVersion>1.0</schemaVersion>
      <taxRegistrationNumber>123456789</taxRegistrationNumber>
      <seriesCode>FT-2026</seriesCode>
      <seriesYear>2026</seriesYear>
      <documentType>FT</documentType>
      <firstDocumentNumber>1</firstDocumentNumber>
      <submissionTimeStamp>2026-01-04T21:16:00Z</submissionTimeStamp>
      <jwsSignature>PLACEHOLDER_JWS</jwsSignature>
      <softwareInfo>
        <softwareInfoDetail>
          <productId>TEST_SOFT</productId>
          <productVersion>1.0</productVersion>
          <softwareValidationNumber>VAL-TEST</softwareValidationNumber>
        </softwareInfoDetail>
        <jwsSoftwareSignature>...</jwsSoftwareSignature>
      </softwareInfo>
    </tns:SolicitarSerieRequest>
  </soapenv:Body>
</soapenv:Envelope>
```

**Resposta Esperada:**
```xml
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <fact:solicitarSerieResponse xmlns:fact="http://agt.minfin.gov.ao/facturacao/v1">
      <fact:response>
        <fact:resultCode>1</fact:resultCode>
      </fact:response>
      <fact:httpStatus>200</fact:httpStatus>
    </fact:solicitarSerieResponse>
  </soap:Body>
</soap:Envelope>
```

---

## 6. LISTAR SÉRIES

Listar todas as séries de numeração existentes.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:tns="https://factura-agt.vercel.app/facturacao/v1">
  <soapenv:Header/>
  <soapenv:Body>
    <tns:ListarSeriesRequest>
      <schemaVersion>1.0</schemaVersion>
      <taxRegistrationNumber>123456789</taxRegistrationNumber>
      <submissionTimeStamp>2026-01-04T21:16:00Z</submissionTimeStamp>
      <jwsSignature>PLACEHOLDER_JWS</jwsSignature>
      <softwareInfo>
        <softwareInfoDetail>
          <productId>TEST_SOFT</productId>
          <productVersion>1.0</productVersion>
          <softwareValidationNumber>VAL-TEST</softwareValidationNumber>
        </softwareInfoDetail>
        <jwsSoftwareSignature>...</jwsSoftwareSignature>
      </softwareInfo>
    </tns:ListarSeriesRequest>
  </soapenv:Body>
</soapenv:Envelope>
```

**Filtros Opcionais:**
```xml
<!-- Adicionar dentro de ListarSeriesRequest para filtrar -->
<seriesCode>FT-2026</seriesCode>
<seriesYear>2026</seriesYear>
<documentType>FT</documentType>
<seriesStatus>A</seriesStatus>
```

**Resposta Esperada:**
```xml
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <fact:listarSeriesResponse xmlns:fact="http://agt.minfin.gov.ao/facturacao/v1">
      <fact:response>
        <fact:seriesResultCount>1</fact:seriesResultCount>
        <fact:seriesInfo>
          <fact:seriesCode>FT-2026</fact:seriesCode>
          <fact:seriesYear>2026</fact:seriesYear>
          <fact:documentType>FT</fact:documentType>
          <fact:seriesStatus>A</fact:seriesStatus>
          <fact:seriesCreationDate>2026-01-04</fact:seriesCreationDate>
          <fact:firstDocumentCreated>1</fact:firstDocumentCreated>
          <fact:invoicingMethod>FESF</fact:invoicingMethod>
        </fact:seriesInfo>
      </fact:response>
      <fact:httpStatus>200</fact:httpStatus>
    </fact:listarSeriesResponse>
  </soap:Body>
</soap:Envelope>
```

---

## 7. VALIDAR DOCUMENTO

Confirmar (C) ou Rejeitar (R) um documento registado.

### 7a. Confirmar Documento

```xml
<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:tns="https://factura-agt.vercel.app/facturacao/v1">
  <soapenv:Header/>
  <soapenv:Body>
    <tns:ValidarDocumentoRequest>
      <schemaVersion>1.0</schemaVersion>
      <taxRegistrationNumber>123456789</taxRegistrationNumber>
      <documentNo>FT2025-001</documentNo>
      <action>C</action>
      <submissionTimeStamp>2026-01-04T21:16:00Z</submissionTimeStamp>
      <jwsSignature>PLACEHOLDER_JWS</jwsSignature>
      <softwareInfo>
        <softwareInfoDetail>
          <productId>TEST_SOFT</productId>
          <productVersion>1.0</productVersion>
          <softwareValidationNumber>VAL-TEST</softwareValidationNumber>
        </softwareInfoDetail>
        <jwsSoftwareSignature>...</jwsSoftwareSignature>
      </softwareInfo>
    </tns:ValidarDocumentoRequest>
  </soapenv:Body>
</soapenv:Envelope>
```

### 7b. Rejeitar Documento

```xml
<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:tns="https://factura-agt.vercel.app/facturacao/v1">
  <soapenv:Header/>
  <soapenv:Body>
    <tns:ValidarDocumentoRequest>
      <schemaVersion>1.0</schemaVersion>
      <taxRegistrationNumber>123456789</taxRegistrationNumber>
      <documentNo>FT2025-001</documentNo>
      <action>R</action>
      <reasonForRejection>Dados incorretos do cliente</reasonForRejection>
      <submissionTimeStamp>2026-01-04T21:16:00Z</submissionTimeStamp>
      <jwsSignature>PLACEHOLDER_JWS</jwsSignature>
      <softwareInfo>
        <softwareInfoDetail>
          <productId>TEST_SOFT</productId>
          <productVersion>1.0</productVersion>
          <softwareValidationNumber>VAL-TEST</softwareValidationNumber>
        </softwareInfoDetail>
        <jwsSoftwareSignature>...</jwsSoftwareSignature>
      </softwareInfo>
    </tns:ValidarDocumentoRequest>
  </soapenv:Body>
</soapenv:Envelope>
```

**Resposta Esperada (Confirmação):**
```xml
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <fact:validarDocumentoResponse xmlns:fact="http://agt.minfin.gov.ao/facturacao/v1">
      <fact:response>
        <fact:resultCode>0</fact:resultCode>
        <fact:documentNo>FT2025-001</fact:documentNo>
        <fact:confirmationDate>2026-01-04T21:16:00Z</fact:confirmationDate>
      </fact:response>
      <fact:httpStatus>200</fact:httpStatus>
    </fact:validarDocumentoResponse>
  </soap:Body>
</soap:Envelope>
```

---

## Como Testar

### Via SoapUI:
1. Criar novo projeto SOAP
2. Copiar o endpoint: `http://localhost:3000/api/soap`
3. Para cada serviço, copiar o XML acima
4. Adaptar valores conforme necessário
5. Enviar pedido (POST)

### Via cURL:
```bash
curl -X POST http://localhost:3000/api/soap \
  -H "Content-Type: text/xml; charset=UTF-8" \
  -H "SOAPAction: " \
  -d @request.xml
```

### Via Postman:
1. Criar novo request (POST)
2. URL: `http://localhost:3000/api/soap`
3. Headers:
   - `Content-Type: application/xml`
   - `SOAPAction: (vazio)`
4. Body (raw, XML): Colar um dos XMLs acima
5. Send

---

## Notas Importantes

✅ **NIF sempre**: Use `123456789` para manter consistência com dados de teste
✅ **Timestamps**: Usar formato ISO 8601 (2026-01-04T21:16:00Z)
✅ **GUID**: Usar sempre o mesmo para teste (aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee)
✅ **Assinaturas**: PLACEHOLDER_JWS é suficiente em ambiente de desenvolvimento
✅ **Namespace**: Manter sempre `https://factura-agt.vercel.app/facturacao/v1`

---

## Validação de Respostas

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `returnCode` | string | "0" = sucesso |
| `resultCode` | int | 0 = sucesso, 1 = aviso, >2 = erro |
| `requestID` | string | ID único do pedido (para rastreio) |
| `documentResultCount` | int | Número de documentos retornados |
| `seriesResultCount` | int | Número de séries retornadas |
| `statusResult` | object | Resultado com lista de documentos e status |

