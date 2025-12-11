# 📋 DOCUMENTAÇÃO TÉCNICA COMPLETA
## Sistema de Facturação Electrónica AGT - Middleware

**Versão:** 1.0.0  
**Data:** Dezembro 2025  
**Conformidade:** Decreto Executivo 683/25, Decreto Presidencial 71/25  
**Status:** ✅ Pronto para Integração com Portal AGT

---

## 📑 Índice

1. [Visão Geral](#1-visão-geral)
2. [Arquitectura do Sistema](#2-arquitectura-do-sistema)
3. [Serviços AGT Implementados](#3-serviços-agt-implementados)
4. [Estrutura de Ficheiros](#4-estrutura-de-ficheiros)
5. [Tipos e Interfaces](#5-tipos-e-interfaces)
6. [Assinaturas Digitais (JWS)](#6-assinaturas-digitais-jws)
7. [Endpoints API REST](#7-endpoints-api-rest)
8. [WSDL/SOAP para SAP](#8-wsdlsoap-para-sap)
9. [Configuração e Ambiente](#9-configuração-e-ambiente)
10. [Guia de Integração](#10-guia-de-integração)
11. [Códigos de Erro](#11-códigos-de-erro)
12. [Testes e Validação](#12-testes-e-validação)

---

## 1. Visão Geral

### 1.1 Objectivo

Este sistema middleware implementa a interface completa entre software de facturação (ERP/SAP) e o Portal da AGT Angola para facturação electrónica, conforme as especificações técnicas oficiais.

### 1.2 Funcionalidades Principais

| Funcionalidade | Status | Descrição |
|---------------|--------|-----------|
| Registar Facturas | ✅ | Envio de até 30 documentos por lote |
| Obter Estado | ✅ | Consulta de status de validação |
| Listar Facturas | ✅ | Listagem por período (máx. 30 dias) |
| Consultar Factura | ✅ | Detalhes de documento específico |
| Solicitar Série | ✅ | Criação de séries de numeração |
| Listar Séries | ✅ | Listagem de séries existentes |
| Validar Documento | ✅ | Confirmar/rejeitar documentos recebidos |

### 1.3 Stack Tecnológico

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 14)                │
│  React 18 • TypeScript • TailwindCSS • shadcn/ui        │
├─────────────────────────────────────────────────────────┤
│                    API LAYER (Next.js)                  │
│  REST Endpoints • SOAP Handler • Validação Zod          │
├─────────────────────────────────────────────────────────┤
│                  SERVIÇOS DE NEGÓCIO                    │
│  AGTClient • JWS Signing • Mock Service                 │
├─────────────────────────────────────────────────────────┤
│                  INTEGRAÇÃO EXTERNA                     │
│  Portal AGT (REST) • SAP (SOAP/WSDL)                    │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Arquitectura do Sistema

### 2.1 Diagrama de Componentes

```
┌──────────────────────────────────────────────────────────────┐
│                        ERP / SAP                              │
│                    (Sistema de Origem)                        │
└─────────────────────────────┬────────────────────────────────┘
                              │
                    SOAP/REST │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                    MIDDLEWARE (Next.js)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │
│  │  API REST   │  │ SOAP Handler│  │ Validação & JWS     │   │
│  │  /api/agt/* │  │ /api/soap   │  │ Schemas • Assinatura│   │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘   │
│         │                │                     │              │
│         └────────────────┼─────────────────────┘              │
│                          │                                    │
│               ┌──────────▼──────────┐                         │
│               │     AGT Client      │                         │
│               │  (Real ou Mock)     │                         │
│               └──────────┬──────────┘                         │
└──────────────────────────┼───────────────────────────────────┘
                           │
                  HTTPS/JWT│
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                      PORTAL AGT                               │
│           api.agt.minfin.gov.ao/facturacao-electronica/v1    │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 Fluxo de Dados

```
1. EMISSÃO DE FACTURA
   ERP → Middleware → AGT
   
   [ERP Envia Factura] 
        ↓
   [Middleware Valida Schema]
        ↓
   [Middleware Assina JWS]
        ↓
   [AGT Processa]
        ↓
   [Retorna RequestID]

2. CONSULTA DE ESTADO
   ERP ← Middleware ← AGT
   
   [ERP Solicita Estado]
        ↓
   [Middleware Assina Pedido]
        ↓
   [AGT Retorna Status]
        ↓
   [V=Válido | I=Inválido | P=Penalizado]
```

---

## 3. Serviços AGT Implementados

### 3.1 Tabela de Serviços

| # | Serviço | Método | Endpoint | Descrição |
|---|---------|--------|----------|-----------|
| 1 | registarFactura | POST | `/api/agt/registarFactura` | Regista facturas electrónicas |
| 2 | obterEstado | POST | `/api/agt/obterEstado` | Obtém estado de validação |
| 3 | listarFacturas | POST | `/api/agt/listarFacturas` | Lista facturas por período |
| 4 | consultarFactura | POST | `/api/agt/consultarFactura` | Consulta factura específica |
| 5 | solicitarSerie | POST | `/api/agt/solicitarSerie` | Solicita nova série |
| 6 | listarSeries | POST | `/api/agt/listarSeries` | Lista séries existentes |
| 7 | validarDocumento | POST | `/api/agt/validarDocumento` | Confirma/rejeita documento |

### 3.2 Detalhes dos Serviços

#### 3.2.1 registarFactura

**Propósito:** Registar uma ou mais facturas electrónicas (máximo 30 por pedido)

**Request:**
```typescript
{
  schemaVersion: string;           // "1.0.0"
  taxRegistrationNumber: string;   // NIF do emissor
  submissionTimeStamp: string;     // ISO 8601
  submissionGUID: string;          // UUID v4
  softwareInfo: AGTSoftwareInfo;   // Info do software
  documents: AGTDocument[];        // Array de documentos (max 30)
}
```

**Response Sucesso:**
```typescript
{
  requestID: string;               // "xxxxx-99999999-9999"
}
```

**Response Erro:**
```typescript
{
  errorList: AGTErrorEntry[];      // Lista de erros
}
```

#### 3.2.2 obterEstado

**Propósito:** Consultar o estado de validação de um lote submetido

**Request:**
```typescript
{
  schemaVersion: string;
  taxRegistrationNumber: string;
  requestID: string;               // ID retornado em registarFactura
  jwsSignature: string;
}
```

**Response:**
```typescript
{
  requestID: string;
  status: 'pending' | 'processed';
  documents: Array<{
    documentNo: string;
    validationStatus: 'V' | 'I' | 'P';
    validationMessage?: string;
  }>;
}
```

#### 3.2.3 listarFacturas

**Propósito:** Listar facturas de um período (máximo 30 dias)

**Request:**
```typescript
{
  schemaVersion: string;
  taxRegistrationNumber: string;
  startDate: string;               // YYYY-MM-DD
  endDate: string;                 // YYYY-MM-DD
  jwsSignature: string;
  softwareInfo: AGTSoftwareInfo;
}
```

**Response:**
```typescript
{
  totalDocuments: number;
  documents: AGTDocument[];
}
```

#### 3.2.4 consultarFactura

**Propósito:** Obter detalhes de uma factura específica

**Request:**
```typescript
{
  schemaVersion: string;
  taxRegistrationNumber: string;
  documentNo: string;              // FT A/1
  jwsSignature: string;
  softwareInfo: AGTSoftwareInfo;
}
```

**Response:**
```typescript
{
  document: AGTDocument;
  validationStatus: 'V' | 'I' | 'P';
  receivedAt: string;
}
```

#### 3.2.5 solicitarSerie

**Propósito:** Solicitar uma nova série de numeração

**Request:**
```typescript
{
  schemaVersion: string;
  taxRegistrationNumber: string;
  expectedInitialDate: string;     // YYYY-MM-DD
  invoicingMethod: 'FEPC' | 'FESF' | 'SF';
  seriesType: AGTDocumentType;     // FT, FA, NC, etc.
  documentClassification: 'F' | 'R' | 'O';
  typePrinter: 'P' | 'N';
  jwsSignature: string;
  softwareInfo: AGTSoftwareInfo;
}
```

**Response:**
```typescript
{
  seriesID: string;                // "FTXYW0J1"
  seriesType: string;
  initialNo: number;
  status: 'A' | 'U' | 'F';
  createdAt: string;
}
```

#### 3.2.6 listarSeries

**Propósito:** Listar séries de numeração existentes

**Request:**
```typescript
{
  schemaVersion: string;
  taxRegistrationNumber: string;
  status?: 'A' | 'U' | 'F';
  jwsSignature: string;
  softwareInfo: AGTSoftwareInfo;
}
```

**Response:**
```typescript
{
  totalSeries: number;
  series: AGTSeriesInfo[];
}
```

#### 3.2.7 validarDocumento

**Propósito:** Confirmar ou rejeitar documento recebido de fornecedor

**Request:**
```typescript
{
  schemaVersion: string;
  taxRegistrationNumber: string;   // NIF do receptor
  documentNo: string;
  emitterTaxRegistrationNumber: string;
  action: 'C' | 'R';               // Confirmar | Rejeitar
  rejectionReason?: string;
  jwsSignature: string;
  softwareInfo: AGTSoftwareInfo;
}
```

**Response:**
```typescript
{
  documentNo: string;
  action: 'C' | 'R';
  confirmationDate: string;
}
```

---

## 4. Estrutura de Ficheiros

```
factura-agt/
├── app/
│   └── api/
│       └── agt/
│           ├── registarFactura/
│           │   └── route.ts          # Handler registar facturas
│           ├── obterEstado/
│           │   └── route.ts          # Handler obter estado
│           ├── listarFacturas/
│           │   └── route.ts          # Handler listar facturas
│           ├── consultarFactura/
│           │   └── route.ts          # Handler consultar factura
│           ├── solicitarSerie/
│           │   └── route.ts          # Handler solicitar série
│           ├── listarSeries/
│           │   └── route.ts          # Handler listar séries
│           └── validarDocumento/
│               └── route.ts          # Handler validar documento
│
├── lib/
│   ├── types/
│   │   ├── index.ts                  # Tipos base do sistema
│   │   └── agt-official.ts           # Tipos oficiais AGT (736 linhas)
│   │
│   ├── server/
│   │   ├── agtClient.ts              # Cliente AGT original
│   │   ├── agtClientOfficial.ts      # Cliente AGT oficial (451 linhas)
│   │   ├── agtMockService.ts         # Mock service (874 linhas)
│   │   ├── jws.ts                    # Funções JWS originais
│   │   └── jwsUtils.ts               # Utilitários JWS completos (432 linhas)
│   │
│   └── schemas/
│       ├── facturaSchema.ts          # Schema Zod para facturas
│       └── seriesSchema.ts           # Schema Zod para séries
│
├── public/
│   └── wsdl/
│       ├── AGT_FacturaService.wsdl   # WSDL original
│       └── AGT_FacturacaoElectronica_v1.wsdl  # WSDL completo
│
└── types/
    └── qrcode.d.ts                   # Types QR Code
```

---

## 5. Tipos e Interfaces

### 5.1 Tipos de Documento (AGTDocumentType)

| Código | Descrição | Classificação |
|--------|-----------|---------------|
| FA | Factura de Adiantamento | Factura |
| FT | Factura | Factura |
| FR | Factura/Recibo | Factura |
| FG | Factura Global | Factura |
| AC | Aviso de Cobrança | Factura |
| AR | Aviso de Cobrança/Recibo | Recibo |
| TV | Talão de Venda | Factura |
| RC | Recibo Emitido | Recibo |
| RG | Outros Recibos Emitidos | Recibo |
| RE | Estorno ou Recibo de Estorno | Recibo |
| ND | Nota de Débito | Outros |
| NC | Nota de Crédito | Outros |
| AF | Factura/Recibo de Autofacturação | Factura |
| RP | Prémio ou Recibo de Prémio | Seguros |
| RA | Resseguro Aceite | Seguros |
| CS | Imputação a Co-seguradoras | Seguros |
| LD | Imputação a Co-seguradora Líder | Seguros |

### 5.2 Estados de Documento (AGTDocumentStatus)

| Código | Descrição |
|--------|-----------|
| N | Normal |
| S | Autofacturação |
| A | Anulado |
| R | Documento de resumo |
| C | Correcção de documento rejeitado |

### 5.3 Estados de Validação (AGTValidationStatus)

| Código | Descrição |
|--------|-----------|
| V | Factura válida |
| I | Factura inválida |
| P | Factura válida com penalização (>24h atraso) |

### 5.4 Tipos de Imposto (AGTTaxType)

| Código | Descrição |
|--------|-----------|
| IVA | Imposto sobre o Valor Acrescentado |
| IS | Imposto de Selo |
| IEC | Imposto Especial de Consumo |
| NS | Não Sujeito |

### 5.5 Códigos de IVA (AGTIVATaxCode)

| Código | Descrição | Taxa |
|--------|-----------|------|
| NOR | Taxa Normal | 14% |
| INT | Taxa Intermédia | 7% |
| RED | Taxa Reduzida | 5% |
| ISE | Isento | 0% |
| OUT | Outros | Variável |

### 5.6 Interface Principal: AGTDocument

```typescript
interface AGTDocument {
  // Identificação
  documentNo: string;                // "FT A/1"
  documentType: AGTDocumentType;     // "FT", "NC", etc.
  documentStatus: AGTDocumentStatus; // "N", "A", etc.
  documentDate: string;              // "2025-01-15"
  
  // Série
  seriesID: string;                  // "FTXYW0J1"
  systemEntryDate: string;           // ISO 8601
  transactionID?: string;            // UUID
  
  // Cliente
  customerTaxID: string;             // NIF cliente
  customerCountry: string;           // "AO"
  companyName?: string;              // Nome empresa cliente
  
  // Conteúdo
  lines: AGTLine[];                  // Linhas do documento
  documentTotals: AGTDocumentTotals; // Totais
  
  // Opcionais
  paymentReceipt?: AGTPaymentReceipt;      // Para recibos
  withholdingTax?: AGTWithholdingTax[];    // Retenções
  referenceInfo?: AGTReferenceInfo;        // Para NC/ND
  cancelInfo?: AGTCancelInfo;              // Para anulações
  
  // Assinatura
  jwsDocumentSignature: string;      // Assinatura JWS
}
```

### 5.7 Interface: AGTLine

```typescript
interface AGTLine {
  lineNo: number;                    // Número da linha
  productCode: string;               // Código produto
  productDescription: string;        // Descrição
  quantity: number;                  // Quantidade
  unitOfMeasure: string;             // Unidade
  unitPrice: number;                 // Preço unitário
  unitPriceBase?: number;            // Preço base (antes IVA)
  taxPointDate?: string;             // Data tributável
  settlementAmount?: number;         // Desconto
  
  // Impostos
  taxLines: AGTTaxLine[];            // Linhas de imposto
}
```

### 5.8 Interface: AGTDocumentTotals

```typescript
interface AGTDocumentTotals {
  taxPayable: number;                // Total impostos
  netTotal: number;                  // Total líquido
  grossTotal: number;                // Total bruto
  currency?: string;                 // "AOA"
}
```

---

## 6. Assinaturas Digitais (JWS)

### 6.1 Especificação

As assinaturas seguem o padrão JWS (JSON Web Signature) conforme:
- **RFC 7515** - JSON Web Signature
- **Algoritmo:** RS256 (RSA with SHA-256)
- **Tamanho:** 256 caracteres (após codificação Base64URL)

### 6.2 Estrutura JWS

```
Header.Payload.Signature
```

**Header (Base64URL):**
```json
{
  "alg": "RS256",
  "typ": "JWT"
}
```

### 6.3 Funções Disponíveis

```typescript
// Assinatura de documento
signDocument(document: AGTDocument, privateKey: string): string

// Assinatura de info do software
signSoftwareInfo(softwareInfo: AGTSoftwareInfo, privateKey: string): string

// Assinatura de pedido de consulta
signSearchRequest(request: object, privateKey: string): string

// Assinatura de pedido de série
signSeriesRequest(request: object, privateKey: string): string

// Verificação de assinatura
verifyJWSSignature(jws: string, publicKey: string): boolean
```

### 6.4 Exemplo de Uso

```typescript
import { signDocument } from '@/lib/server/jwsUtils';

const documento: AGTDocument = {
  documentNo: 'FT A/1',
  documentType: 'FT',
  // ... outros campos
};

const privateKey = process.env.AGT_PRIVATE_KEY;
const assinatura = signDocument(documento, privateKey);

// assinatura: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJkb2N..."
```

---

## 7. Endpoints API REST

### 7.1 Base URL

| Ambiente | URL |
|----------|-----|
| Produção | `https://api.agt.minfin.gov.ao/facturacao-electronica/v1` |
| Sandbox | `https://sandbox.agt.minfin.gov.ao/facturacao-electronica/v1` |
| Mock Local | `http://localhost:3000/api/agt` |

### 7.2 Headers Requeridos

```http
Content-Type: application/json
Accept: application/json
Authorization: Bearer <JWT_TOKEN>
```

### 7.3 Exemplos de Chamadas

#### Registar Factura

```bash
curl -X POST http://localhost:3000/api/agt/registarFactura \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "schemaVersion": "1.0.0",
    "taxRegistrationNumber": "5417040377",
    "submissionTimeStamp": "2025-01-15T10:30:00Z",
    "submissionGUID": "550e8400-e29b-41d4-a716-446655440000",
    "softwareInfo": {
      "softwareInfoDetail": {
        "productId": "FS001",
        "productVersion": "1.0.0",
        "softwareValidationNumber": "AGT/2025/001"
      },
      "jwsSoftwareSignature": "eyJ..."
    },
    "documents": [
      {
        "documentNo": "FT A/1",
        "documentType": "FT",
        "documentStatus": "N",
        "documentDate": "2025-01-15",
        "seriesID": "FTXYW0J1",
        "systemEntryDate": "2025-01-15T10:30:00Z",
        "customerTaxID": "5417040378",
        "customerCountry": "AO",
        "companyName": "Cliente Exemplo Lda",
        "lines": [
          {
            "lineNo": 1,
            "productCode": "PROD001",
            "productDescription": "Produto de Teste",
            "quantity": 2,
            "unitOfMeasure": "UN",
            "unitPrice": 10000.00,
            "taxLines": [
              {
                "taxType": "IVA",
                "taxCode": "NOR",
                "taxPercentage": 14,
                "taxBase": 20000.00,
                "taxAmount": 2800.00
              }
            ]
          }
        ],
        "documentTotals": {
          "taxPayable": 2800.00,
          "netTotal": 20000.00,
          "grossTotal": 22800.00,
          "currency": "AOA"
        },
        "jwsDocumentSignature": "eyJ..."
      }
    ]
  }'
```

#### Obter Estado

```bash
curl -X POST http://localhost:3000/api/agt/obterEstado \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "schemaVersion": "1.0.0",
    "taxRegistrationNumber": "5417040377",
    "requestID": "xxxxx-12345678-0001",
    "jwsSignature": "eyJ..."
  }'
```

---

## 8. WSDL/SOAP para SAP

### 8.1 Localização do WSDL

```
public/wsdl/AGT_FacturacaoElectronica_v1.wsdl
```

### 8.2 Namespace

```xml
targetNamespace="http://agt.minfin.gov.ao/facturacao/v1"
```

### 8.3 Operações Disponíveis

```xml
<wsdl:portType name="FacturacaoPortType">
  <wsdl:operation name="registarFactura"/>
  <wsdl:operation name="obterEstado"/>
  <wsdl:operation name="listarFacturas"/>
  <wsdl:operation name="consultarFactura"/>
  <wsdl:operation name="solicitarSerie"/>
  <wsdl:operation name="listarSeries"/>
  <wsdl:operation name="validarDocumento"/>
</wsdl:portType>
```

### 8.4 Exemplo SOAP Request

```xml
<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope 
    xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:fact="http://agt.minfin.gov.ao/facturacao/v1">
  <soapenv:Header/>
  <soapenv:Body>
    <fact:registarFacturaRequest>
      <fact:schemaVersion>1.0.0</fact:schemaVersion>
      <fact:taxRegistrationNumber>5417040377</fact:taxRegistrationNumber>
      <fact:submissionTimeStamp>2025-01-15T10:30:00Z</fact:submissionTimeStamp>
      <fact:submissionGUID>550e8400-e29b-41d4-a716-446655440000</fact:submissionGUID>
      <fact:softwareInfo>
        <fact:softwareInfoDetail>
          <fact:productId>FS001</fact:productId>
          <fact:productVersion>1.0.0</fact:productVersion>
          <fact:softwareValidationNumber>AGT/2025/001</fact:softwareValidationNumber>
        </fact:softwareInfoDetail>
        <fact:jwsSoftwareSignature>eyJ...</fact:jwsSoftwareSignature>
      </fact:softwareInfo>
      <fact:documents>
        <!-- Documentos aqui -->
      </fact:documents>
    </fact:registarFacturaRequest>
  </soapenv:Body>
</soapenv:Envelope>
```

---

## 9. Configuração e Ambiente

### 9.1 Variáveis de Ambiente

```env
# .env.local

# ===========================================
# CONFIGURAÇÃO AGT
# ===========================================

# URL do endpoint AGT (usar mock para desenvolvimento)
AGT_API_URL=http://localhost:3000/api/agt

# Credenciais de autenticação
AGT_CLIENT_ID=your-client-id
AGT_CLIENT_SECRET=your-client-secret

# Chave privada RSA para assinaturas JWS (Base64)
AGT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
...sua chave privada RSA...
-----END PRIVATE KEY-----"

# Chave pública RSA para verificação
AGT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----
...sua chave pública RSA...
-----END PUBLIC KEY-----"

# ===========================================
# INFORMAÇÕES DO SOFTWARE
# ===========================================

SOFTWARE_PRODUCT_ID=FS001
SOFTWARE_PRODUCT_VERSION=1.0.0
SOFTWARE_VALIDATION_NUMBER=AGT/2025/001

# ===========================================
# AMBIENTE
# ===========================================

# mock | sandbox | production
AGT_ENVIRONMENT=mock

# Timeout em milissegundos
AGT_TIMEOUT=30000
```

### 9.2 Geração de Chaves RSA

```bash
# Gerar chave privada RSA 2048 bits
openssl genrsa -out private_key.pem 2048

# Extrair chave pública
openssl rsa -in private_key.pem -pubout -out public_key.pem

# Converter para PKCS#8 (formato requerido)
openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt \
  -in private_key.pem -out private_key_pkcs8.pem
```

### 9.3 Instalação

```bash
# Clonar repositório
git clone <repo-url>
cd factura-agt

# Instalar dependências
npm install

# Configurar ambiente
cp .env.example .env.local
# Editar .env.local com suas configurações

# Iniciar em modo desenvolvimento
npm run dev

# Build para produção
npm run build
npm start
```

---

## 10. Guia de Integração

### 10.1 Fluxo Típico de Integração SAP

```
1. SAP emite factura internamente
        ↓
2. SAP envia para Middleware via SOAP/REST
        ↓
3. Middleware valida dados
        ↓
4. Middleware assina com JWS
        ↓
5. Middleware envia para AGT
        ↓
6. AGT retorna requestID
        ↓
7. Middleware retorna requestID para SAP
        ↓
8. SAP armazena requestID
        ↓
9. (Após alguns segundos)
        ↓
10. SAP consulta estado via obterEstado
        ↓
11. Middleware consulta AGT
        ↓
12. AGT retorna V/I/P
        ↓
13. Middleware retorna resultado para SAP
        ↓
14. SAP actualiza status interno
```

### 10.2 Código de Integração (TypeScript)

```typescript
import { AGTClient, AGT_MOCK_CONFIG } from '@/lib/server/agtClientOfficial';

// Criar cliente
const client = new AGTClient(AGT_MOCK_CONFIG);

// Autenticar
await client.authenticate('client_id', 'client_secret');

// Registar factura
const request = {
  schemaVersion: '1.0.0',
  taxRegistrationNumber: '5417040377',
  submissionTimeStamp: new Date().toISOString(),
  submissionGUID: crypto.randomUUID(),
  softwareInfo: {
    softwareInfoDetail: {
      productId: 'FS001',
      productVersion: '1.0.0',
      softwareValidationNumber: 'AGT/2025/001'
    },
    jwsSoftwareSignature: '' // Será preenchido automaticamente
  },
  documents: [
    // ... documentos
  ]
};

const response = await client.registarFactura(request);

if (response.requestID) {
  console.log('Sucesso! RequestID:', response.requestID);
  
  // Aguardar processamento
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Consultar estado
  const estado = await client.obterEstado({
    schemaVersion: '1.0.0',
    taxRegistrationNumber: '5417040377',
    requestID: response.requestID
  });
  
  console.log('Estado:', estado);
} else {
  console.error('Erros:', response.errorList);
}
```

### 10.3 Integração com Mock Service

```typescript
import { AGTMockService } from '@/lib/server/agtMockService';

// Criar instância do mock
const mockService = new AGTMockService();

// Usar exactamente como o cliente real
const response = await mockService.registarFactura(request);
```

---

## 11. Códigos de Erro

### 11.1 Erros de Validação AGT

| Código | Descrição |
|--------|-----------|
| E001 | schemaVersion inválido |
| E002 | taxRegistrationNumber inválido |
| E003 | submissionTimeStamp inválido |
| E004 | submissionGUID duplicado |
| E005 | Documento inválido |
| E006 | Linha de documento inválida |
| E007 | Totais não correspondem |
| E008 | Assinatura JWS inválida |
| E009 | Série não encontrada |
| E010 | Série inactiva |

### 11.2 Erros HTTP do Middleware

| Código | Descrição |
|--------|-----------|
| E94 | Não autorizado - verificar credenciais |
| E95 | NIF emissor diferente do autenticado |
| E96 | Pedido inválido |
| E97 | Timeout na comunicação com AGT |
| E98 | Rate limit excedido |

### 11.3 Códigos HTTP

| Status | Significado |
|--------|-------------|
| 200 | Sucesso |
| 400 | Pedido inválido |
| 401 | Não autorizado |
| 403 | Proibido |
| 404 | Não encontrado |
| 422 | Pedido ainda em processamento |
| 429 | Muitas solicitações |
| 500 | Erro interno |
| 502 | Bad Gateway (erro AGT) |
| 504 | Gateway Timeout |

---

## 12. Testes e Validação

### 12.1 Executar Testes

```bash
# Testes unitários
npm run test

# Testes de integração
npm run test:integration

# Cobertura de código
npm run test:coverage
```

### 12.2 Testes Manuais com Mock

```bash
# Iniciar servidor
npm run dev

# Testar registar factura (PowerShell)
$body = @{
    schemaVersion = "1.0.0"
    taxRegistrationNumber = "5417040377"
    submissionTimeStamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
    submissionGUID = [guid]::NewGuid().ToString()
    softwareInfo = @{
        softwareInfoDetail = @{
            productId = "FS001"
            productVersion = "1.0.0"
            softwareValidationNumber = "AGT/2025/001"
        }
        jwsSoftwareSignature = "test"
    }
    documents = @()
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "http://localhost:3000/api/agt/registarFactura" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body
```

### 12.3 Validação de Conformidade

| Item | Requisito | Status |
|------|-----------|--------|
| Tipos de documento | 17 tipos conforme Anexo I | ✅ |
| Serviços REST | 7 serviços conforme Anexo III | ✅ |
| Assinaturas JWS | RS256, 256 caracteres | ✅ |
| Formato requestID | xxxxx-99999999-9999 | ✅ |
| Máximo documentos/lote | 30 | ✅ |
| Período máximo listagem | 30 dias | ✅ |
| WSDL para SAP | Completo | ✅ |

---

## 📞 Suporte

Para questões sobre este middleware:
- Email: suporte@example.com
- Documentação AGT: https://agt.minfin.gov.ao/facturacao-electronica

Para questões sobre a API da AGT:
- Departamento de Facturação Electrónica
- Administração Geral Tributária de Angola

---

**Documento gerado automaticamente**  
**Sistema Middleware Facturação Electrónica AGT v1.0.0**
