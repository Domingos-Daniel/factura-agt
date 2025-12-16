# Guia de Integração SAP ↔ AGT

## 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Arquitetura de Integração](#arquitetura-de-integração)
3. [WSDL e Endpoints](#wsdl-e-endpoints)
4. [Mapeamento SAP → AGT](#mapeamento-sap--agt)
5. [Exemplos de Payload](#exemplos-de-payload)
6. [Configuração no SAP](#configuração-no-sap)
7. [Tratamento de Erros](#tratamento-de-erros)
8. [Testes e Validação](#testes-e-validação)

---

## 🎯 Visão Geral

Este documento fornece todas as informações técnicas necessárias para o programador SAP integrar o sistema ERP (SAP ECC ou SAP S/4HANA) com a AGT (Administração Geral Tributária de Angola).

### Objetivo da Integração
- Enviar facturas criadas no SAP para validação e certificação AGT
- Obter QR Codes e hashes criptográficos para conformidade fiscal
- Consultar estados de documentos fiscais
- Solicitar e gerir séries de numeração oficial

### Fluxo Básico
```
SAP (SD/FI) → Middleware (PI/PO ou CPI) → Sistema AGT → AGT API → Resposta SAP
```

---

## 🏗️ Arquitetura de Integração

### Componentes

#### 1. **SAP ECC/S/4HANA**
- Módulos: SD (Vendas), FI (Financeiro)
- Documentos: VBRK/VBRP (Facturas), BKPF/BSEG (Contabilidade)
- User Exit/BAdI: MV45AFZZ, BADI_SD_PRICING

#### 2. **Middleware SAP PI/PO ou CPI**
- Protocolo: SOAP/REST
- Mapeamento: SAP IDoc → JSON AGT
- Segurança: JWT RS256, certificados SSL

#### 3. **Sistema AGT (Este Sistema)**
- API REST: Next.js 14 + TypeScript
- Endpoints: `/api/agt/*`
- Formato: JSON (REST) ou XML (SOAP)

### Diagrama de Sequência

```
┌─────┐         ┌──────────┐         ┌─────────┐         ┌─────┐
│ SAP │         │ PI/PO/CPI│         │ Sistema │         │ AGT │
└──┬──┘         └────┬─────┘         │   AGT   │         └──┬──┘
   │                 │                └────┬────┘            │
   │ 1. Criar Factura│                     │                 │
   ├────────────────>│                     │                 │
   │                 │ 2. Transformar      │                 │
   │                 │    SAP → JSON       │                 │
   │                 ├────────────────────>│                 │
   │                 │                     │ 3. Validar      │
   │                 │                     ├────────────────>│
   │                 │                     │ 4. Certificar   │
   │                 │                     │<────────────────┤
   │                 │ 5. Resposta         │                 │
   │                 │<────────────────────┤                 │
   │ 6. Atualizar SAP│                     │                 │
   │<────────────────┤                     │                 │
   │ (QR, Hash, etc) │                     │                 │
```

---

## 📡 WSDL e Endpoints

### WSDL Principal
**Localização**: `/public/wsdl/AGT_FacturaService.wsdl`

**Download**: 
```
https://seu-sistema.ao/wsdl/AGT_FacturaService.wsdl
```

### Endpoints REST (Recomendado)

#### Base URL
```
https://seu-sistema.ao/api/agt
```

#### Endpoints Disponíveis

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/registarFactura` | Registar nova factura |

### Testes e WSDL (novas instruções)

- O serviço SOAP está disponível em: `https://seu-sistema.ao/api/soap` e o WSDL oficial em `?wsdl`.
- Antes de ligar o SAP ao endpoint, execute os testes locais:
  - Instale dependências: `npm install` (ver `devDependencies` para `ts-node`)
  - Validar WSDL: `npm run validate:wsdl`
  - Executar testes de schemas: `npm run test:schemas`
  - Executar testes de mapeamento SOAP: `npm run test:soap`

- Variáveis de ambiente importantes para integração com AGT real:
  - `AGT_BASE_URL` — URL base da API AGT (ex.: `https://sandbox.agt.gov.ao/api/efatura/v1`)
  - `AGT_AUTH_TYPE` / `AGT_AUTH_VALUE` — tipo de autenticação e token/credenciais
  - `AGT_PRIVATE_KEY` — chave privada do emissor (usada para gerar JWS; protegido em produção)

- Para testar com SAP (PI/PO ou CPI):
  1. Configure o canal SOAP/HTTP para o endpoint `https://seu-sistema.ao/api/soap`.
  2. Aponte o `SOAPAction` para a operação (ex: `http://agt.minfin.gov.ao/facturacao/v1/registarFactura`).
  3. Use o WSDL fornecido para gerar o cliente SOAP no PI/PO ou CPI.
  4. Envie um `RegistarFactura` de teste e verifique o retorno `requestID` ou `errorList`.

> Nota: Localmente o sistema usa um Mock AGT se `AGT_BASE_URL` não estiver definido (`AGT_USE_MOCK=true`). Para testar com a AGT real defina `AGT_USE_MOCK=false` e `AGT_BASE_URL`.
| POST | `/consultarFactura` | Consultar factura por código |
| GET | `/obterEstado?codigo={cod}` | Obter estado do documento |
| POST | `/solicitarSerie` | Solicitar série de numeração |
| GET | `/listarSeries` | Listar séries aprovadas |
| POST | `/validarDocumento` | Validar documento antes de envio |

### Autenticação

**Tipo**: Bearer Token (JWT)

**Header Obrigatório**:
```http
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Obter Token**:
```http
POST /api/auth/login
Content-Type: application/json

{
  "nif": "123456789",
  "password": "senha_segura"
}
```

**Resposta**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600,
    "user": {
      "nif": "123456789",
      "name": "Empresa Demo Lda",
      "email": "admin@empresa.ao"
    }
  }
}
```

---

## 🔄 Mapeamento SAP → AGT

### 1. Cabeçalho da Factura (VBRK)

| Campo SAP | Campo AGT | Transformação | Observações |
|-----------|-----------|---------------|-------------|
| VBRK-VBELN | documentNumber | Direto | Número interno SAP |
| VBRK-FKART | documentType | Mapeamento | Ver tabela tipos |
| VBRK-FKDAT | issueDate | ISO 8601 | `YYYY-MM-DDThh:mm:ss` |
| VBRK-KUNAG | client.nif | Lookup KNA1 | Validar 9 dígitos |
| VBRK-NETWR | totals.subtotal | Decimal | 2 casas decimais |
| VBRK-MWSBK | totals.totalTax | Decimal | Soma impostos |
| VBRK-KURRF | payment.exchangeRate | Decimal | Se moeda ≠ AOA |

### 2. Linhas da Factura (VBRP)

| Campo SAP | Campo AGT | Transformação | Observações |
|-----------|-----------|---------------|-------------|
| VBRP-POSNR | lineNumber | Integer | Número linha |
| VBRP-MATNR | productCode | Direto | Código material |
| VBRP-ARKTX | description | Direto | Descrição produto |
| VBRP-FKIMG | quantity | Decimal | Quantidade |
| VBRP-VRKME | unit | Direto | Unidade medida |
| VBRP-NETWR | unitPrice | Cálculo | NETWR / FKIMG |
| VBRP-MWSBP | taxes[] | Array | Ver tabela IVA |

### 3. Cliente (KNA1/KNB1)

| Campo SAP | Campo AGT | Transformação | Observações |
|-----------|-----------|---------------|-------------|
| KNA1-STCD1 | client.nif | Validar NIF | 9 dígitos obrigatório |
| KNA1-NAME1 | client.name | Direto | Nome cliente |
| KNA1-STRAS | client.address | Concatenar | Rua + Nº |
| KNA1-ORT01 | client.address | Concatenar | + Cidade |
| KNA1-TELF1 | client.phone | Formatar | +244 formato |
| KNA1-SMTP_ADDR | client.email | Validar | Email válido |

### 4. Impostos (KONV)

| Campo SAP | Campo AGT | Mapeamento | Observações |
|-----------|-----------|------------|-------------|
| KONV-KSCHL = 'MWST' | taxes[].type = 'IVA' | IVA | Imposto Valor Acrescentado |
| KONV-KSCHL = 'SECO' | taxes[].type = 'IS' | IS | Imposto de Selo |
| KONV-KBETR | taxes[].rate | /10 | Taxa % (dividir por 10) |
| KONV-KWERT | taxes[].amount | Decimal | Montante imposto |

### 5. Tipos de Documento

| SAP FKART | AGT documentType | Designação |
|-----------|------------------|------------|
| F1 | FT | Factura |
| F2 | FS | Factura Simplificada |
| G2 | FR | Factura Recibo |
| RE | NC | Nota de Crédito |
| L2 | ND | Nota de Débito |
| S1 | RC | Recibo |

### 6. Métodos de Pagamento

| SAP ZLSCH | AGT paymentMethod | Designação |
|-----------|-------------------|------------|
| C | NU | Numerário |
| T | TB | Transferência Bancária |
| D | CD | Cartão Débito |
| K | CC | Cartão Crédito |

---

## 📦 Exemplos de Payload

### Exemplo 1: Factura Completa (SAP → AGT)

#### Dados SAP (VBRK/VBRP)
```abap
* Cabeçalho VBRK
VBELN: 90000123
FKART: F1
FKDAT: 20251211
KUNAG: 0000012345
NETWR: 150000.00
MWSBK: 21000.00
WAERK: AOA

* Linhas VBRP
POSNR: 000010, MATNR: MAT001, FKIMG: 5, NETWR: 50000.00
POSNR: 000020, MATNR: MAT002, FKIMG: 2, NETWR: 100000.00

* Cliente KNA1
STCD1: 123456789
NAME1: Empresa ABC Lda
STRAS: Rua da Liberdade, 123
ORT01: Luanda
```

#### JSON para AGT
```json
{
  "nif": "999888777",
  "documentType": "FT",
  "seriesNumber": "FT 2025/00123",
  "issueDate": "2025-12-11T10:30:00",
  "client": {
    "nif": "123456789",
    "name": "Empresa ABC Lda",
    "address": "Rua da Liberdade, 123, Luanda",
    "phone": "+244 923 456 789",
    "email": "contato@empresaabc.ao"
  },
  "lines": [
    {
      "lineNumber": 1,
      "productCode": "MAT001",
      "description": "Computador Portátil HP",
      "quantity": 5,
      "unit": "UN",
      "unitPrice": 10000.00,
      "discount": 0,
      "taxes": [
        {
          "type": "IVA",
          "rate": 14,
          "reason": null,
          "amount": 7000.00
        }
      ]
    },
    {
      "lineNumber": 2,
      "productCode": "MAT002",
      "description": "Monitor LG 27 polegadas",
      "quantity": 2,
      "unit": "UN",
      "unitPrice": 50000.00,
      "discount": 0,
      "taxes": [
        {
          "type": "IVA",
          "rate": 14,
          "reason": null,
          "amount": 14000.00
        }
      ]
    }
  ],
  "totals": {
    "subtotal": 150000.00,
    "totalTax": 21000.00,
    "totalDiscount": 0,
    "total": 171000.00
  },
  "payment": {
    "method": "TB",
    "amount": 171000.00,
    "currency": "AOA"
  },
  "observations": "Factura gerada via SAP ECC - Doc: 90000123"
}
```

#### Resposta AGT
```json
{
  "success": true,
  "data": {
    "documentCode": "FT2025-00123-AGT-XYZ789",
    "hash": "A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0",
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "qrCodeUrl": "https://agt.gov.ao/validar?doc=FT2025-00123-AGT-XYZ789",
    "processedAt": "2025-12-11T10:30:15",
    "status": "APPROVED",
    "message": "Documento registado e aprovado com sucesso"
  }
}
```

### Exemplo 2: Nota de Crédito (Devolução)

#### JSON para AGT
```json
{
  "nif": "999888777",
  "documentType": "NC",
  "seriesNumber": "NC 2025/00045",
  "issueDate": "2025-12-11T14:20:00",
  "relatedDocument": "FT2025-00100-AGT-ABC123",
  "client": {
    "nif": "123456789",
    "name": "Empresa ABC Lda",
    "address": "Rua da Liberdade, 123, Luanda"
  },
  "lines": [
    {
      "lineNumber": 1,
      "productCode": "MAT001",
      "description": "Computador Portátil HP - DEVOLUÇÃO",
      "quantity": -1,
      "unit": "UN",
      "unitPrice": 10000.00,
      "discount": 0,
      "taxes": [
        {
          "type": "IVA",
          "rate": 14,
          "amount": -1400.00
        }
      ]
    }
  ],
  "totals": {
    "subtotal": -10000.00,
    "totalTax": -1400.00,
    "totalDiscount": 0,
    "total": -11400.00
  },
  "payment": {
    "method": "TB",
    "amount": -11400.00,
    "currency": "AOA"
  },
  "observations": "Devolução de produto defeituoso - Ref SAP: 90000124"
}
```

### Exemplo 3: Consultar Estado

#### Request
```http
GET /api/agt/obterEstado?codigo=FT2025-00123-AGT-XYZ789
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Response
```json
{
  "success": true,
  "data": {
    "documentCode": "FT2025-00123-AGT-XYZ789",
    "status": "APPROVED",
    "processedAt": "2025-12-11T10:30:15",
    "validatedBy": "AGT Sistema Automático",
    "details": {
      "checks": [
        {"rule": "NIF_VALIDO", "passed": true},
        {"rule": "SERIE_VALIDA", "passed": true},
        {"rule": "IMPOSTOS_CORRETOS", "passed": true},
        {"rule": "TOTAIS_CONFEREM", "passed": true}
      ]
    }
  }
}
```

### Exemplo 4: Solicitar Série de Numeração

#### Request
```json
{
  "nif": "999888777",
  "documentType": "FT",
  "designation": "Factura Vendas - Matriz Luanda",
  "fiscalYear": 2025
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "seriesNumber": "FT 2025/00001",
    "status": "APPROVED",
    "approvedAt": "2025-12-11T09:00:00",
    "validFrom": "2025-01-01",
    "validUntil": "2025-12-31",
    "currentSequence": 0,
    "maxSequence": 999999,
    "message": "Série aprovada e pronta para uso"
  }
}
```

---

## ⚙️ Configuração no SAP

### ABAP - Função de Conversão

```abap
FUNCTION z_agt_convert_invoice.
*"----------------------------------------------------------------------
*"*"Interface Local:
*"  IMPORTING
*"     VALUE(IV_VBELN) TYPE  VBELN_VF
*"  EXPORTING
*"     VALUE(EV_JSON) TYPE  STRING
*"     VALUE(EV_SUCCESS) TYPE  ABAP_BOOL
*"----------------------------------------------------------------------

  DATA: ls_vbrk   TYPE vbrk,
        lt_vbrp   TYPE TABLE OF vbrp,
        ls_kna1   TYPE kna1,
        lv_json   TYPE string,
        lt_lines  TYPE string_table,
        lv_line   TYPE string.

  " Ler cabeçalho
  SELECT SINGLE * FROM vbrk INTO ls_vbrk WHERE vbeln = iv_vbeln.
  IF sy-subrc <> 0.
    ev_success = abap_false.
    RETURN.
  ENDIF.

  " Ler linhas
  SELECT * FROM vbrp INTO TABLE lt_vbrp WHERE vbeln = iv_vbeln.

  " Ler cliente
  SELECT SINGLE * FROM kna1 INTO ls_kna1 WHERE kunnr = ls_vbrk-kunag.

  " Construir JSON
  CONCATENATE '{'
              '"nif": "999888777",'
              '"documentType": "' z_map_document_type( ls_vbrk-fkart ) '",'
              '"issueDate": "' ls_vbrk-fkdat+0(4) '-' ls_vbrk-fkdat+4(2) '-' ls_vbrk-fkdat+6(2) 'T12:00:00",'
              INTO lv_json.

  " Cliente
  CONCATENATE lv_json
              '"client": {'
              '"nif": "' ls_kna1-stcd1 '",'
              '"name": "' ls_kna1-name1 '",'
              '"address": "' ls_kna1-stras ', ' ls_kna1-ort01 '"'
              '},'
              INTO lv_json.

  " Linhas (simplificado - loop necessário)
  CONCATENATE lv_json '"lines": [' INTO lv_json.
  LOOP AT lt_vbrp INTO DATA(ls_vbrp).
    " ... construir cada linha
  ENDLOOP.
  CONCATENATE lv_json '],' INTO lv_json.

  " Totais
  CONCATENATE lv_json
              '"totals": {'
              '"subtotal": ' ls_vbrk-netwr ','
              '"totalTax": ' ls_vbrk-mwsbk ','
              '"total": ' ls_vbrk-netwr + ls_vbrk-mwsbk
              '}'
              '}' INTO lv_json.

  ev_json = lv_json.
  ev_success = abap_true.

ENDFUNCTION.
```

### SAP PI/PO - Message Mapping

**Origem**: SAP IDoc INVOIC02
**Destino**: JSON AGT

#### Mapeamento Básico (GraphicMapping)
```
INVOIC02/E1EDK01/BELNR → documentNumber
INVOIC02/E1EDK01/FKART → documentType (usar Value Mapping)
INVOIC02/E1EDK01/FKDAT → issueDate (usar Date Conversion)
INVOIC02/E1EDKA1[PARVW='AG']/PARTN → client.nif
INVOIC02/E1EDKA1[PARVW='AG']/NAME1 → client.name
INVOIC02/E1EDP01/POSEX → lines[].lineNumber
INVOIC02/E1EDP01/MATNR → lines[].productCode
INVOIC02/E1EDP01/MENGE → lines[].quantity
```

### SAP CPI (Cloud Platform Integration)

#### iFlow Configuration
1. **Adapter Type**: REST
2. **URL**: `https://seu-sistema.ao/api/agt/registarFactura`
3. **Method**: POST
4. **Authentication**: Bearer Token (JWT)
5. **Content-Type**: application/json

#### Groovy Script (Transformação)
```groovy
import com.sap.gateway.ip.core.customdev.util.Message
import groovy.json.JsonBuilder

def Message processData(Message message) {
    
    def body = message.getBody(String)
    def root = new XmlSlurper().parseText(body)
    
    def jsonBuilder = new JsonBuilder()
    jsonBuilder {
        nif "999888777"
        documentType mapDocType(root.INVOIC02.E1EDK01.FKART.text())
        issueDate formatDate(root.INVOIC02.E1EDK01.FKDAT.text())
        client {
            nif root.INVOIC02.E1EDKA1.find { it.PARVW == 'AG' }.PARTN.text()
            name root.INVOIC02.E1EDKA1.find { it.PARVW == 'AG' }.NAME1.text()
        }
        lines root.INVOIC02.E1EDP01.collect { line ->
            [
                lineNumber: line.POSEX.text() as Integer,
                productCode: line.MATNR.text(),
                quantity: line.MENGE.text() as Double
            ]
        }
    }
    
    message.setBody(jsonBuilder.toString())
    return message
}

def String mapDocType(String sapType) {
    switch(sapType) {
        case 'F1': return 'FT'
        case 'F2': return 'FS'
        case 'RE': return 'NC'
        default: return 'FT'
    }
}

def String formatDate(String sapDate) {
    // YYYYMMDD → YYYY-MM-DDThh:mm:ss
    return "${sapDate[0..3]}-${sapDate[4..5]}-${sapDate[6..7]}T12:00:00"
}
```

---

## ❗ Tratamento de Erros

### Códigos de Erro AGT

| Código | Descrição | Ação SAP |
|--------|-----------|----------|
| 400 | Dados inválidos | Validar payload, corrigir e reenviar |
| 401 | Não autenticado | Renovar token JWT |
| 403 | Sem permissão | Verificar NIF e credenciais |
| 404 | Documento não encontrado | Verificar código documento |
| 409 | Série já existe | Usar série existente |
| 422 | Validação fiscal falhou | Corrigir impostos/totais |
| 500 | Erro servidor | Retry após 5 minutos |
| 503 | Serviço indisponível | Retry com backoff exponencial |

### Estratégia de Retry (SAP)

```abap
DATA: lv_retry_count TYPE i VALUE 0,
      lv_max_retries TYPE i VALUE 3,
      lv_wait_seconds TYPE i VALUE 5.

WHILE lv_retry_count < lv_max_retries.
  
  CALL FUNCTION 'Z_AGT_SEND_INVOICE'
    EXPORTING
      iv_json = lv_json
    IMPORTING
      ev_success = lv_success
      ev_http_code = lv_http_code.
  
  IF lv_success = abap_true.
    EXIT.
  ENDIF.
  
  " Retry logic
  IF lv_http_code >= 500.  " Erro servidor
    WAIT UP TO lv_wait_seconds SECONDS.
    lv_wait_seconds = lv_wait_seconds * 2.  " Backoff exponencial
    lv_retry_count = lv_retry_count + 1.
  ELSE.
    EXIT.  " Erro cliente - não fazer retry
  ENDIF.
  
ENDWHILE.
```

### Log de Erros

Criar tabela customizada `ZAGT_ERROR_LOG`:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| MANDT | CLNT3 | Mandante |
| VBELN | VBELN_VF | Nº Factura SAP |
| TIMESTAMP | TIMESTAMP | Data/Hora erro |
| HTTP_CODE | NUMC3 | Código HTTP |
| ERROR_MSG | STRING | Mensagem erro |
| JSON_SENT | STRING | JSON enviado |
| RETRY_COUNT | NUMC2 | Tentativas |
| STATUS | CHAR1 | P=Pendente, S=Sucesso, E=Erro |

---

## 🧪 Testes e Validação

### Ambiente de Testes

| Ambiente | URL | Credenciais |
|----------|-----|-------------|
| Desenvolvimento | `http://localhost:3000/api/agt` | NIF: 123456789, Senha: admin123 |
| Homologação | `https://hml.seu-sistema.ao/api/agt` | Fornecidas pela equipa |
| Produção | `https://prod.seu-sistema.ao/api/agt` | Credenciais oficiais AGT |

### Checklist de Testes

- [ ] Autenticação e obtenção de token JWT
- [ ] Envio de factura simples (1 linha, sem impostos)
- [ ] Envio de factura complexa (múltiplas linhas, IVA 14%)
- [ ] Envio de nota de crédito
- [ ] Consulta de estado de documento
- [ ] Solicitar nova série de numeração
- [ ] Listar séries aprovadas
- [ ] Validação de NIF inválido (deve falhar)
- [ ] Validação de total incorreto (deve falhar)
- [ ] Teste de retry em caso de erro 500
- [ ] Teste de timeout (>30s)
- [ ] Teste de volume (100 facturas/minuto)

### Ferramentas de Teste

#### Postman Collection
Importar: `/public/postman/AGT_API_Collection.json`

#### SoapUI Project
Importar WSDL: `/public/wsdl/AGT_FacturaService.wsdl`

#### cURL Exemplo
```bash
# Autenticar
curl -X POST https://seu-sistema.ao/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"nif":"123456789","password":"admin123"}'

# Registar Factura
curl -X POST https://seu-sistema.ao/api/agt/registarFactura \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -d @factura_exemplo.json
```

---

## 📞 Suporte

### Contactos Técnicos

**Equipa AGT Integration**
- Email: dev@seu-sistema.ao
- Slack: #integracao-sap-agt
- Jira: PROJECT-INT

**Equipa SAP**
- Arquiteto SAP: [nome@empresa.ao](mailto:nome@empresa.ao)
- Analista PI/PO: [nome@empresa.ao](mailto:nome@empresa.ao)

### Documentação Adicional

- [API Reference completa](/docs/api-reference.md)
- [Tabelas oficiais AGT](/docs/tabelas-agt.md)
- [Certificados e Segurança](/docs/seguranca.md)
- [FAQ Integração SAP](/docs/faq-sap.md)

---

## 📄 Anexos

### A. Campos Obrigatórios vs Opcionais

| Campo | Obrigatório | Validação |
|-------|-------------|-----------|
| nif | ✅ Sim | 9 dígitos numéricos |
| documentType | ✅ Sim | Enum: FT, FS, FR, NC, ND, RC |
| issueDate | ✅ Sim | ISO 8601, não futuro |
| client.nif | ✅ Sim | 9 dígitos, validar AGT |
| client.name | ✅ Sim | Mínimo 3 caracteres |
| lines[] | ✅ Sim | Mínimo 1 linha |
| totals.total | ✅ Sim | Deve conferir soma |
| payment.method | ✅ Sim | Enum: NU, TB, CD, CC |
| client.email | ❌ Não | Se fornecido, validar formato |
| observations | ❌ Não | Máximo 500 caracteres |

### B. Limites e Quotas

| Recurso | Limite |
|---------|--------|
| Tamanho máximo JSON | 5 MB |
| Linhas por factura | 1000 |
| Requests por minuto | 100 |
| Facturas por dia | 50.000 |
| Timeout request | 30 segundos |

### C. Conformidade Legal

✅ Decreto Presidencial 71/25  
✅ Portaria AGT 12/2025  
✅ Anexos Técnicos I, II e III  
✅ RGPD (Proteção de Dados)  

---

**Versão**: 1.0.0  
**Data**: 11 Dezembro 2025  
**Autor**: Equipa Técnica Sistema AGT  
**Revisão**: Aprovado para produção
