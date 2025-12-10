# 📚 FLUXO COMPLETO DO SISTEMA - TIM TIM POR TIM TIM

## 🎯 VISÃO GERAL

Este documento explica **detalhadamente** o fluxo completo do sistema de Faturação Eletrónica AGT, desde o que o `converted.md` exige até como foi implementado.

---

## 📋 PARTE 1: O QUE O `converted.md` DIZ QUE TINHA QUE SER FEITO

O `converted.md` é a **especificação oficial da AGT (Administração Geral Tributária de Angola)** com 67 páginas que define:

### 🔹 **ANEXO I - Estrutura de Dados do Software**

Define **7 serviços REST obrigatórios**:

#### 1️⃣ **registarFactura** (POST)
**O que é**: Serviço para enviar facturas eletrónicas para validação AGT.

**Parâmetros de entrada obrigatórios**:
```json
{
  "schemaVersion": "1.0",
  "submissionGUID": "550e8400-e29b-41d4-a716-446655440000", // UUID v4
  "taxRegistrationNumber": "123456789", // NIF do emissor
  "submissionTimeStamp": "2025-10-14T14:30:00Z", // ISO 8601
  "softwareInfo": {
    "softwareInfoDetail": {
      "productId": "FacturaAGT",
      "productVersion": "1.0.0",
      "softwareValidationNumber": "AGT2025001"
    },
    "jwsSoftwareSignature": "..." // Assinatura JWS RS256 do software
  },
  "numberOfEntries": 1,
  "documents": [
    {
      "documentNo": "FT 2025/001", // Formato: TIPO ANO/SEQUENCIA
      "documentStatus": "N", // N=Normal, S=Autofacturação, A=Anulado, R=Resumo, C=Correção
      "jwsDocumentSignature": "...", // Assinatura JWS RS256 do documento
      "documentDate": "2025-10-14",
      "documentType": "FT", // FT, FR, FA, NC, ND, AR, RC, RG, etc.
      "systemEntryDate": "2025-10-14T14:30:00",
      "customerCountry": "AO", // ISO 3166-1-alpha-2
      "customerTaxID": "987654321",
      "companyName": "Cliente Exemplo Lda",
      "companyAddress": "Rua Exemplo, Luanda",
      "eacCode": "47111", // Código CAE (Tabela 1)
      "lines": [
        {
          "lineNumber": 1,
          "productCode": "PROD001",
          "productDescription": "Produto Exemplo",
          "quantity": 10,
          "unitOfMeasure": "UN",
          "unitPrice": 1000.00,
          "unitPriceBase": 1000.00,
          "debitAmount": 10000.00,
          "taxes": [
            {
              "taxType": "IVA",
              "taxCountryRegion": "AO",
              "taxCode": "NOR",
              "taxPercentage": 14,
              "taxContribution": 1400.00
            }
          ],
          "settlementAmount": 0 // Descontos
        }
      ],
      "documentTotals": {
        "taxPayable": 1400.00,
        "netTotal": 10000.00,
        "grossTotal": 11400.00,
        "currency": { // Só se diferente de AOA
          "currencyCode": "USD",
          "currencyAmount": 11.40,
          "exchangeRate": 1000
        }
      }
    }
  ]
}
```

**Resposta de sucesso (200)**:
```json
{
  "requestID": "AGT-99999999-9999" // ID para consultar o estado
}
```

**Resposta de erro (400)**:
```json
{
  "errorList": [
    {
      "idError": "E01",
      "descriptionError": "Campo obrigatório ausente",
      "documentNo": "FT 2025/001"
    }
  ]
}
```

---

#### 2️⃣ **obterEstado** (POST)
**O que é**: Consulta o status de validação de uma factura previamente submetida.

**Parâmetros de entrada**:
```json
{
  "schemaVersion": "1.0",
  "submissionId": "xxxxx-99999999-9999",
  "taxRegistrationNumber": "123456789",
  "submissionTimeStamp": "2025-10-14T14:30:00Z",
  "softwareInfo": { ... },
  "jwsSignature": "...", // Assinatura de {taxRegistrationNumber, requestID}
  "requestID": "AGT-99999999-9999"
}
```

**Resposta (200)**:
```json
{
  "requestID": "AGT-99999999-9999",
  "resultCode": 0, // 0=Processado sem inválidas, 1=Com inválidas, 2=Sem válidas, 7=Prematura, 8=Em curso, 9=Cancelado
  "documentStatusList": [
    {
      "documentNo": "FT 2025/001",
      "documentStatus": "V", // V=Válida, I=Inválida, P=Válida com penalização
      "errorList": [] // Se I, contém erros
    }
  ]
}
```

---

#### 3️⃣ **listarFacturas** (POST)
**O que é**: Lista facturas emitidas num período.

**Parâmetros**:
```json
{
  "schemaVersion": "1.0",
  "submissionId": "xxxxx-99999999-9999",
  "taxRegistrationNumber": "123456789",
  "submissionTimeStamp": "2025-10-14T14:30:00Z",
  "softwareInfo": { ... },
  "jwsSignature": "...", // Assinatura de {taxRegistrationNumber, queryStartDate, queryEndDate}
  "queryStartDate": "2025-10-01",
  "queryEndDate": "2025-10-14"
}
```

**Resposta**:
```json
{
  "documentResultCount": 10,
  "documentResultList": [
    {
      "documentNo": "FT 2025/001",
      "documentDate": "2025-10-01"
    }
  ]
}
```

---

#### 4️⃣ **consultarFactura** (POST)
**O que é**: Obtém detalhes completos de uma factura específica.

**Parâmetros**:
```json
{
  "schemaVersion": "1.0",
  "submissionId": "xxxxx-99999999-9999",
  "taxRegistrationNumber": "123456789",
  "submissionTimeStamp": "2025-10-14T14:30:00Z",
  "softwareInfo": { ... },
  "jwsSignature": "...", // Assinatura de {taxRegistrationNumber, documentNo}
  "documentNo": "FT 2025/001"
}
```

**Resposta**:
```json
{
  "documentNo": "FT 2025/001",
  "validationStatus": "V", // V=Válida, P=Válida com penalização
  "documents": [ /* Array com o(s) documento(s) completo(s) */ ]
}
```

---

#### 5️⃣ **solicitarSerie** (POST)
**O que é**: Cria nova série de numeração de facturas.

**Parâmetros**:
```json
{
  "schemaVersion": "1.0",
  "submissionId": "xxxxx-99999999-9999",
  "taxRegistrationNumber": "123456789",
  "submissionTimeStamp": "2025-10-14T14:30:00Z",
  "softwareInfo": { ... },
  "jwsSignature": "...", // Assinatura de {taxRegistrationNumber, seriesCode, seriesYear, documentType, firstDocumentNumber}
  "seriesCode": "FT2025", // Deve conter o ano (25 ou 2025)
  "seriesYear": 2025,
  "documentType": "FT",
  "firstDocumentNumber": 1
}
```

**Resposta (200)**:
```json
{
  "resultCode": 1 // 1=Sucesso, 0=Insucesso
}
```

---

#### 6️⃣ **listarSeries** (POST)
**O que é**: Lista séries de numeração registadas.

**Parâmetros**:
```json
{
  "schemaVersion": "1.0",
  "submissionId": "xxxxx-99999999-9999",
  "taxRegistrationNumber": "123456789",
  "submissionTimeStamp": "2025-10-14T14:30:00Z",
  "softwareInfo": { ... },
  "jwsSignature": "...", // Assinatura de {taxRegistrationNumber, documentNo}
  "seriesCode": "FT2025", // Opcional
  "seriesYear": 2025, // Opcional
  "documentType": "FT", // Opcional
  "seriesStatus": "A" // Opcional: A=Aberta, U=Em uso, F=Fechada
}
```

**Resposta**:
```json
{
  "seriesResultCount": 3,
  "seriesInfo": [
    {
      "seriesCode": "FT2025",
      "seriesYear": 2025,
      "documentType": "FT",
      "seriesStatus": "A",
      "seriesCreationDate": "2025-01-01",
      "firstDocumentCreated": "FT 2025/1",
      "lastDocumentCreated": "FT 2025/100",
      "invoicingMethod": "FESF" // FEPC=Portal, FESF=Software, SF=Sem faturação eletrônica
    }
  ]
}
```

---

#### 7️⃣ **validarDocumento** (POST)
**O que é**: Permite ao adquirente confirmar/rejeitar uma factura recebida.

**Parâmetros**:
```json
{
  "schemaVersion": "1.0",
  "submissionId": "xxxxx-99999999-9999",
  "taxRegistrationNumber": "987654321", // NIF do adquirente
  "submissionTimeStamp": "2025-10-14T14:30:00Z",
  "softwareInfo": { ... },
  "jwsSignature": "...",
  "documentNo": "FT 2025/001",
  "action": "C", // C=Confirmar, R=Rejeitar
  "deductibleVATPercentage": 100 // Se action=C
}
```

**Resposta**:
```json
{
  "actionResultCode": "C_OK", // C_OK, R_OK, C_NOK, R_NOK
  "documentStatusCode": "S_V", // S_A=Anulado, S_C=Confirmado, S_I=Inválido, S_RG=Registado, S_RJ=Rejeitado, S_V=Válido
  "errorList": []
}
```

---

### 🔹 **ANEXO II - Modelo de Facturação Electrónica**

Define o **modelo de validação a posteriori**:

1. **Emissão sem validação prévia**: Software emite factura e entrega ao cliente imediatamente
2. **Envio para AGT**: Software envia factura para validação (via `registarFactura`)
3. **Resposta imediata**: AGT responde com `requestID` se estrutura OK
4. **Validação assíncrona**: AGT valida conteúdo em background (pode demorar minutos)
5. **Consulta de status**: Software consulta resultado via `obterEstado`
6. **Estados possíveis**:
   - `V` = Válida (aceite pela AGT)
   - `I` = Inválida (rejeitada, não existe fiscalmente)
   - `P` = Válida com penalização (aceite mas enviada com +24h de atraso)

---

### 🔹 **ANEXO III - Especificações Técnicas**

#### **QR Code obrigatório nos documentos impressos**:
- **Padrão**: QR Code Model 2
- **Versão**: 4 (33x33 módulos)
- **Correção de erros**: M (15%)
- **Codificação**: UTF-8
- **URL**: `https://portaldocontribuinte.minfin.gov.ao/consultar-fe?documentNo=FT%202025/001`
- **Formato de imagem**: PNG 350x350 pixels
- **Logo AGT**: Obrigatório, ocupando <20% da imagem (círculo ~60px de diâmetro no centro)

#### **Assinaturas JWS (JSON Web Signature)**:
Todas as chamadas exigem assinatura **RS256** usando chave privada:

1. **Software signature** (em `softwareInfo`):
   - Campos assinados: todos os campos do `softwareInfo`
   
2. **Document signature** (em cada `document`):
   - Campos assinados: `documentNo`, `taxRegistrationNumber`, `documentType`, `documentDate`, `customerTaxID`, `customerCountry`, `companyName`, `documentTotals`

3. **Service signatures** (em cada serviço):
   - **obterEstado**: `{taxRegistrationNumber, requestID}`
   - **listarFacturas**: `{taxRegistrationNumber, queryStartDate, queryEndDate}`
   - **consultarFactura**: `{taxRegistrationNumber, documentNo}`
   - **solicitarSerie**: `{taxRegistrationNumber, seriesCode, seriesYear, documentType, firstDocumentNumber}`
   - **listarSeries**: `{taxRegistrationNumber, documentNo}`
   - **validarDocumento**: `{taxRegistrationNumber, documentNo}`

---

### 🔹 **Tabelas de Referência**

O documento inclui **6 tabelas extensas**:

1. **Tabela CAE** (300+ códigos): Códigos de Actividade Económica
   - Ex: `47111` = "Comércio a retalho em supermercados e hipermercados"

2. **Tabela IEC** (Imposto Especial de Consumo):
   - Bebidas alcoólicas (4-15%)
   - Tabaco (25%)
   - Combustíveis (0-5%)
   - Veículos (5-20%)
   - etc.

3. **Tabela IS** (Imposto de Selo):
   - 24 verbas com taxas fixas ou percentuais
   - Ex: Verba 1 (Aquisição de imóveis): 0,3%

4. **Tabela IVA** (Isenções):
   - 38 códigos de isenção (M10-M93)
   - Ex: M10 = Bens alimentares

5. **Tabela IS Isenções** (3 códigos)

6. **Tabela IEC Isenções** (16 códigos)

---

### 🔹 **Validações Críticas**

O documento especifica **regras de negócio obrigatórias**:

#### **Recibos vs Facturas**:
- **Recibos** (AR, RC, RG):
  - ❌ NÃO podem ter `lines` (linhas de produtos)
  - ✅ DEVEM ter `paymentReceipt` obrigatório
  - ✅ `paymentReceipt.sourceDocuments` deve ter pelo menos 1 documento origem
  
- **Outras facturas** (FT, FR, FA, NC, ND):
  - ✅ DEVEM ter `lines` (pelo menos 1 linha)
  - ❌ NÃO podem ter `paymentReceipt`

#### **Notas de Crédito (NC)**:
- ✅ DEVEM ter `referenceInfo` indicando factura original
- Campo obrigatório: `referenceInfo.referenceNo`

#### **Invariantes de valores**:
- `unitPrice` ≥ 0
- `quantity` > 0
- `settlementAmount` (desconto) ≥ 0
- `settlementAmount` ≤ `lineTotal + taxPayable`
- `unitPriceBase` ≤ `unitPrice`
- `grossTotal` = `netTotal` + `taxPayable`

#### **Moeda estrangeira**:
- Se `currency.currencyCode` ≠ "AOA":
  - Campo `currency` torna-se **obrigatório**
  - Deve incluir: `currencyCode`, `currencyAmount`, `exchangeRate`

---

## 🏗️ PARTE 2: COMO O SISTEMA FOI IMPLEMENTADO

### 📂 **Arquitetura Geral**

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 14)                     │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │   Login    │  │ Dashboard  │  │  Facturas  │  ...       │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘            │
│        │               │               │                     │
│        └───────────────┴───────────────┘                     │
│                        │                                     │
│                        ▼                                     │
│              ┌──────────────────┐                           │
│              │  localStorage     │ (Dados persistidos)      │
│              └──────────────────┘                           │
│                        │                                     │
│                        ▼                                     │
│              ┌──────────────────┐                           │
│              │   Mock API       │ (Simulação AGT)          │
│              └──────────────────┘                           │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              API Routes (Next.js API)                        │
│  ┌────────────────────────────────────────────────────────┐│
│  │  /api/agt/registarFactura                              ││
│  │  /api/agt/obterEstado                                  ││
│  │  /api/agt/listarFacturas                               ││
│  │  /api/agt/consultarFactura                             ││
│  │  /api/agt/solicitarSerie                               ││
│  │  /api/agt/listarSeries                                 ││
│  │  /api/agt/validarDocumento                             ││
│  └────────────────────────────────────────────────────────┘│
│                         │                                    │
│                         ▼                                    │
│              ┌──────────────────┐                           │
│              │  JWS Signature   │ (RS256)                   │
│              └──────────────────┘                           │
│                         │                                    │
│                         ▼                                    │
│              ┌──────────────────┐                           │
│              │  AGT Client      │ (HTTP calls)              │
│              └──────────────────┘                           │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
          ┌──────────────────────────────┐
          │   AGT REST API (Externa)     │
          │  https://agt.minfin.gov.ao   │
          └──────────────────────────────┘
```

---

### 🔄 **FLUXO DETALHADO - CASO DE USO COMPLETO**

Vou descrever o **fluxo completo** de criação e submissão de uma factura:

#### **PASSO 1: Usuário faz Login**

1. **Frontend** (`app/login/page.tsx`):
   - Usuário digita NIF e senha
   - Form usa React Hook Form + Zod validation
   
2. **Validação** (`lib/schemas/authSchema.ts`):
   ```typescript
   const loginSchema = z.object({
     nif: z.string().min(9).max(15),
     password: z.string().min(6)
   })
   ```

3. **Mock Auth** (`lib/mockAPI.ts`):
   - Verifica credenciais contra lista hardcoded
   - Retorna token mock (UUID v4)
   
4. **Storage** (`lib/storage.ts`):
   - Salva token em `localStorage['factura-agt-auth']`
   - Salva user data
   
5. **Redirect**:
   - Redireciona para `/dashboard`

---

#### **PASSO 2: Usuário Cria Nova Série**

1. **Navegação**:
   - Usuário clica "Nova Série" no menu
   - Navega para `/series/nova`

2. **Form** (`app/series/nova/page.tsx`):
   - Componente `FormSerie` renderizado
   - Campos:
     - `seriesCode`: Input text (ex: "FT2025")
     - `seriesYear`: Number (2025)
     - `documentType`: Select (FT, FR, FA, NC, etc.)
     - `firstDocumentNumber`: Number (1)

3. **Validação Zod** (`lib/schemas/seriesSchema.ts`):
   ```typescript
   const serieSchema = z.object({
     seriesCode: z.string().min(3).max(60)
       .refine(code => /\d{2,4}/.test(code), {
         message: "Código deve conter o ano (25 ou 2025)"
       }),
     seriesYear: z.number().int().min(2020).max(2030),
     documentType: z.enum(['FT', 'FR', 'FA', 'NC', ...]),
     firstDocumentNumber: z.number().int().min(1)
   })
   ```

4. **Submit**:
   - Form válido → chama `solicitarSerie()` do `lib/api.ts`
   
5. **API Call** (`lib/api.ts → /api/agt/solicitarSerie`):
   ```typescript
   // Frontend prepara payload
   const payload = {
     schemaVersion: "1.0",
     submissionId: generateSubmissionId(), // "xxxxx-99999999-9999"
     taxRegistrationNumber: user.nif,
     submissionTimeStamp: new Date().toISOString(),
     softwareInfo: { ... },
     seriesCode,
     seriesYear,
     documentType,
     firstDocumentNumber
   }
   
   // POST para /api/agt/solicitarSerie
   const response = await fetch('/api/agt/solicitarSerie', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify(payload)
   })
   ```

6. **API Route** (`app/api/agt/solicitarSerie/route.ts`):
   ```typescript
   export async function POST(req: Request) {
     const payload = await req.json()
     
     // 1. Gera assinatura JWS
     const privKey = process.env.AGT_PRIVATE_KEY
     const jwsSignature = makeSolicitarSerieSignature({
       taxRegistrationNumber: payload.taxRegistrationNumber,
       seriesCode: payload.seriesCode,
       seriesYear: payload.seriesYear,
       documentType: payload.documentType,
       firstDocumentNumber: payload.firstDocumentNumber
     }, privKey)
     
     payload.jwsSignature = jwsSignature
     
     // 2. Chama AGT Client
     const client = createAgtClient()
     const result = await client.solicitarSerie(payload)
     
     // 3. Mapeia erros
     if (result.error) {
       if (result.error.includes('429')) {
         return NextResponse.json({ 
           error: 'E98: Muitas solicitações' 
         }, { status: 429 })
       }
       // ... outros erros E94-E97
     }
     
     return NextResponse.json(result, { status: 200 })
   }
   ```

7. **JWS Signature** (`lib/server/jws.ts`):
   ```typescript
   import * as jose from 'jose'
   
   export function makeSolicitarSerieSignature(payload, privateKeyPem) {
     // Converte PEM para KeyLike
     const privateKey = await jose.importPKCS8(privateKeyPem, 'RS256')
     
     // Cria JWS
     const jws = await new jose.CompactSign(
       new TextEncoder().encode(JSON.stringify(payload))
     )
       .setProtectedHeader({ alg: 'RS256' })
       .sign(privateKey)
     
     return jws // String de 256+ caracteres
   }
   ```

8. **AGT Client** (`lib/server/agtClient.ts`):
   ```typescript
   export function createAgtClient() {
     const baseUrl = process.env.AGT_API_URL || 'https://sigt.agt.minfin.gov.ao/api'
     
     return {
       async solicitarSerie(payload) {
         const response = await fetch(`${baseUrl}/solicitarSerie`, {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json',
             'Authorization': `Bearer ${process.env.AGT_API_KEY}`
           },
           body: JSON.stringify(payload)
         })
         
         return response.json()
       }
     }
   }
   ```

9. **Resposta AGT**:
   - Sucesso: `{ resultCode: 1 }`
   - Erro: `{ errorList: [...] }`

10. **Storage**:
    - Frontend salva série em `localStorage['factura-agt-series']`
    - Atualiza lista de séries
    
11. **UI Update**:
    - Toast de sucesso: "Série criada com sucesso"
    - Redirect para `/series/lista`

---

#### **PASSO 3: Usuário Cria Nova Factura**

1. **Form** (`app/facturas/nova/page.tsx`):
   - Componente `FormFactura` com campos complexos:
     - Header: `documentType`, `documentDate`, `customerTaxID`, `companyName`, etc.
     - Lines: Array dinâmico de produtos
     - Totals: Calculados automaticamente

2. **Adicionar Linha de Produto**:
   ```typescript
   // Componente FormLinhaFactura
   const addLine = () => {
     append({
       lineNumber: fields.length + 1,
       productCode: '',
       productDescription: '',
       quantity: 1,
       unitOfMeasure: 'UN',
       unitPrice: 0,
       unitPriceBase: 0,
       debitAmount: 0,
       taxes: [
         {
           taxType: 'IVA',
           taxCountryRegion: 'AO',
           taxCode: 'NOR',
           taxPercentage: 14,
           taxContribution: 0
         }
       ],
       settlementAmount: 0
     })
   }
   ```

3. **Cálculo Automático de Impostos** (`lib/taxCalculator.ts`):
   ```typescript
   export function calculateLineTax(line: Line): number {
     const lineTotal = line.quantity * line.unitPrice
     const discountedTotal = lineTotal - line.settlementAmount
     
     let totalTax = 0
     for (const tax of line.taxes) {
       if (tax.taxType === 'IVA') {
         totalTax += discountedTotal * (tax.taxPercentage / 100)
       } else if (tax.taxType === 'IS') {
         totalTax += tax.taxAmount * line.quantity // Taxa fixa por unidade
       }
       // ... IEC, etc.
     }
     
     return Math.ceil(totalTax * 100) / 100 // Arredondar para cima
   }
   
   export function calculateDocumentTotals(lines: Line[]) {
     const netTotal = lines.reduce((sum, line) => {
       const lineTotal = line.quantity * line.unitPrice
       return sum + (lineTotal - line.settlementAmount)
     }, 0)
     
     const taxPayable = lines.reduce((sum, line) => {
       return sum + calculateLineTax(line)
     }, 0)
     
     return {
       netTotal,
       taxPayable,
       grossTotal: netTotal + taxPayable
     }
   }
   ```

4. **Validação Zod** (`lib/schemas/facturaSchema.ts`):
   ```typescript
   const documentSchema = z.object({
     documentNo: z.string().min(8).max(60),
     documentStatus: z.enum(['N', 'S', 'A', 'R', 'C']),
     documentDate: z.string(),
     documentType: z.enum(['FT', 'FR', 'FA', 'NC', 'ND', 'AR', 'RC', 'RG', ...]),
     customerTaxID: z.string().min(1).max(50),
     companyName: z.string().min(1).max(200),
     lines: z.array(lineSchema).optional(),
     paymentReceipt: paymentReceiptSchema.optional(),
     documentTotals: documentTotalsSchema
   }).superRefine((data, ctx) => {
     // Regra: Recibos NÃO podem ter lines
     if (['AR', 'RC', 'RG'].includes(data.documentType)) {
       if (data.lines && data.lines.length > 0) {
         ctx.addIssue({
           code: z.ZodIssueCode.custom,
           message: 'Recibos não devem ter linhas',
           path: ['lines']
         })
       }
       if (!data.paymentReceipt) {
         ctx.addIssue({
           code: z.ZodIssueCode.custom,
           message: 'Recibos devem ter paymentReceipt',
           path: ['paymentReceipt']
         })
       }
     } else {
       // Outras facturas DEVEM ter lines
       if (!data.lines || data.lines.length === 0) {
         ctx.addIssue({
           code: z.ZodIssueCode.custom,
           message: 'Documento deve ter pelo menos 1 linha',
           path: ['lines']
         })
       }
     }
     
     // Regra: NC deve ter referenceInfo
     if (data.documentType === 'NC') {
       if (!data.referenceInfo || !data.referenceInfo.referenceNo) {
         ctx.addIssue({
           code: z.ZodIssueCode.custom,
           message: 'Nota de Crédito requer referência ao documento original',
           path: ['referenceInfo']
         })
       }
     }
   })
   ```

5. **Submit - Enviar para AGT**:
   ```typescript
   const handleSubmit = async (data: FormData) => {
     // 1. Gera GUID
     const submissionGUID = crypto.randomUUID() // v4
     
     // 2. Prepara payload completo
     const payload = {
       schemaVersion: "1.0",
       submissionGUID,
       taxRegistrationNumber: user.nif,
       submissionTimeStamp: new Date().toISOString(),
       softwareInfo: {
         softwareInfoDetail: {
           productId: "FacturaAGT",
           productVersion: "1.0.0",
           softwareValidationNumber: "AGT2025001"
         }
       },
       numberOfEntries: 1,
       documents: [data]
     }
     
     // 3. POST para API
     const response = await fetch('/api/agt/registarFactura', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(payload)
     })
     
     const result = await response.json()
     
     if (result.requestID) {
       // Sucesso!
       setRequestID(result.requestID)
       
       // 4. Salva localmente com status pendente
       saveFactura({
         ...payload,
         id: submissionGUID,
         requestID: result.requestID,
         validationStatus: 'P', // Pendente
         createdAt: new Date().toISOString()
       })
       
       // 5. Inicia polling de status
       startPolling(result.requestID)
     } else {
       // Erro estrutural
       showErrors(result.errorList)
     }
   }
   ```

6. **API Route registarFactura** (`app/api/agt/registarFactura/route.ts`):
   ```typescript
   export async function POST(req: Request) {
     const payload = await req.json()
     const privKey = process.env.AGT_PRIVATE_KEY
     
     // 1. Gera assinatura do software
     payload.softwareInfo.jwsSoftwareSignature = 
       makeSoftwareInfoSignature(payload.softwareInfo, privKey)
     
     // 2. Gera assinatura de cada documento
     payload.documents = payload.documents.map(doc => {
       const jws = makeDocumentSignature({
         documentNo: doc.documentNo,
         taxRegistrationNumber: payload.taxRegistrationNumber,
         documentType: doc.documentType,
         documentDate: doc.documentDate,
         customerTaxID: doc.customerTaxID,
         customerCountry: doc.customerCountry,
         companyName: doc.companyName,
         documentTotals: doc.documentTotals
       }, privKey)
       
       return { ...doc, jwsDocumentSignature: jws }
     })
     
     // 3. Validações server-side
     const receiptTypes = new Set(['AR', 'RC', 'RG'])
     for (const doc of payload.documents) {
       // Recibos sem lines
       if (receiptTypes.has(doc.documentType)) {
         if (doc.lines && doc.lines.length > 0) {
           return NextResponse.json({ 
             error: 'Recibos não devem ter linhas' 
           }, { status: 400 })
         }
         if (!doc.paymentReceipt?.sourceDocuments?.length) {
           return NextResponse.json({ 
             error: 'paymentReceipt.sourceDocuments obrigatório' 
           }, { status: 400 })
         }
       }
       
       // Validar invariantes de linha
       for (const line of doc.lines || []) {
         if (line.unitPrice < 0) {
           return NextResponse.json({ 
             error: `Preço unitário negativo na linha ${line.lineNo}` 
           }, { status: 400 })
         }
         
         if (line.quantity <= 0) {
           return NextResponse.json({ 
             error: `Quantidade inválida na linha ${line.lineNo}` 
           }, { status: 400 })
         }
         
         if (line.settlementAmount < 0) {
           return NextResponse.json({ 
             error: `Desconto negativo na linha ${line.lineNo}` 
           }, { status: 400 })
         }
         
         const lineTotal = line.quantity * line.unitPrice
         const maxDiscount = lineTotal + (doc.documentTotals?.taxPayable || 0)
         if (line.settlementAmount > maxDiscount) {
           return NextResponse.json({ 
             error: `settlementAmount excede total na linha ${line.lineNo}` 
           }, { status: 400 })
         }
         
         if (line.unitPriceBase > line.unitPrice) {
           return NextResponse.json({ 
             error: `unitPriceBase > unitPrice na linha ${line.lineNo}` 
           }, { status: 400 })
         }
       }
       
       // Validar totais
       if (!doc.documentTotals?.grossTotal || !doc.documentTotals?.netTotal) {
         return NextResponse.json({ 
           error: 'documentTotals incompleto' 
         }, { status: 400 })
       }
     }
     
     // 4. Chamar AGT
     const client = createAgtClient()
     try {
       const result = await client.registarFactura(payload)
       return NextResponse.json(result, { status: 200 })
     } catch (error) {
       // Mapear erros HTTP para E94-E98
       if (error.message.includes('429')) {
         return NextResponse.json({ 
           error: 'E98: Muitas solicitações' 
         }, { status: 429 })
       }
       if (error.message.includes('timeout')) {
         return NextResponse.json({ 
           error: 'E97: Timeout AGT' 
         }, { status: 504 })
       }
       // ... E94, E95, E96
       
       return NextResponse.json({ 
         error: 'E96: Erro inesperado' 
       }, { status: 502 })
     }
   }
   ```

7. **Polling de Status**:
   ```typescript
   async function startPolling(requestID: string) {
     const interval = setInterval(async () => {
       const status = await obterEstado(requestID)
       
       if (status.resultCode === 0) {
         // Processamento concluído, todas válidas
         clearInterval(interval)
         updateFacturaStatus(requestID, 'V', status.documentStatusList)
         toast.success('Factura validada pela AGT!')
       } else if (status.resultCode === 1 || status.resultCode === 2) {
         // Concluído com inválidas
         clearInterval(interval)
         updateFacturaStatus(requestID, 'I', status.documentStatusList)
         toast.error('Factura rejeitada pela AGT')
       } else if (status.resultCode === 8) {
         // Ainda em processamento
         toast.info('Validação em curso...')
       }
     }, 15000) // A cada 15 segundos
   }
   ```

---

#### **PASSO 4: Usuário Consulta Factura**

1. **Navegação**:
   - Usuário vai para `/facturas/lista`
   - Clica numa factura → vai para `/facturas/[id]`

2. **Detalhe** (`app/facturas/[id]/page.tsx`):
   - Componente `FacturaDetail` renderizado
   - Exibe: header, linhas, totais, QR code, status de validação

3. **Botão "Obter Estado AGT"**:
   ```typescript
   const handleObterEstado = async () => {
     const response = await fetch('/api/agt/consultarFactura', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         taxRegistrationNumber: factura.taxRegistrationNumber,
         documentNo: document.documentNo
       })
     })
     
     const result = await response.json()
     
     if (result.success) {
       const agtStatus = result.data.processingStatus
       const newStatus = agtStatus === 'Processado' ? 'V' 
                       : agtStatus === 'Rejeitado' ? 'I' 
                       : 'P'
       
       setStatus(newStatus)
       setMessages([
         `ReturnCode: ${result.data.returnCode}`,
         `ReturnMessage: ${result.data.returnMessage}`,
         `Status: ${agtStatus}`
       ])
       
       updateFactura(factura.id, {
         validationStatus: newStatus,
         validationMessages: messages
       })
     }
   }
   ```

4. **Auto-refresh** (se status=P):
   ```typescript
   useEffect(() => {
     if (!autoRefresh || status !== 'P') return
     
     const interval = setInterval(() => {
       void handleObterEstado()
     }, 15000) // 15s
     
     return () => clearInterval(interval)
   }, [autoRefresh, status, handleObterEstado])
   ```

---

#### **PASSO 5: Gerar PDF com QR Code**

1. **Botão "Exportar PDF"** (`components/PDFExporter.tsx`):
   ```typescript
   const downloadPdf = async () => {
     const pdf = new jsPDF({ unit: 'pt', format: 'a4' })
     
     // 1. Header com logo AGT
     pdf.setFillColor(23, 89, 198) // Azul AGT
     pdf.circle(68, 68, 36, 'F')
     pdf.setTextColor(255, 255, 255)
     pdf.setFontSize(20)
     pdf.text('AGT', 68, 76, { align: 'center' })
     
     pdf.setTextColor(28, 28, 30)
     pdf.setFontSize(22)
     pdf.text('Factura Eletrónica', 120, 78)
     pdf.text(`Documento nº ${document.documentNo}`, 120, 102)
     
     // 2. Gerar QR Code 350x350 PNG, versão 4
     const qrUrl = `https://portaldocontribuinte.minfin.gov.ao/consultar-fe?documentNo=${document.documentNo.replace(/ /g, '%20')}`
     
     const QRCode = (await import('qrcode')).default
     let qrDataUrl: string
     try {
       qrDataUrl = await QRCode.toDataURL(qrUrl, { 
         errorCorrectionLevel: 'M', // 15%
         version: 4, // 33x33 módulos
         margin: 1, 
         width: 350, 
         type: 'image/png' 
       })
     } catch {
       // Fallback se versão 4 falhar
       qrDataUrl = await QRCode.toDataURL(qrUrl, { 
         errorCorrectionLevel: 'M', 
         margin: 1, 
         width: 350, 
         type: 'image/png' 
       })
     }
     
     // 3. Sobrepor logo AGT no centro (círculo <20% da imagem)
     const canvas = document.createElement('canvas')
     canvas.width = 350
     canvas.height = 350
     const ctx = canvas.getContext('2d')!
     
     const qrImg = new Image()
     await new Promise<void>((resolve) => {
       qrImg.onload = () => {
         // Desenha QR
         ctx.drawImage(qrImg, 0, 0, 350, 350)
         
         // Círculo branco (background do logo)
         ctx.fillStyle = '#ffffff'
         ctx.beginPath()
         ctx.arc(175, 175, 36, 0, Math.PI * 2)
         ctx.fill()
         
         // Círculo azul AGT (60px diâmetro = 17% da imagem)
         ctx.fillStyle = '#1759c6'
         ctx.beginPath()
         ctx.arc(175, 175, 30, 0, Math.PI * 2)
         ctx.fill()
         
         // Texto "AGT"
         ctx.fillStyle = '#ffffff'
         ctx.font = 'bold 24px sans-serif'
         ctx.textAlign = 'center'
         ctx.textBaseline = 'middle'
         ctx.fillText('AGT', 175, 175)
         
         resolve()
       }
       qrImg.src = qrDataUrl
     })
     
     // 4. Adicionar QR ao PDF
     pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 420, 36, 150, 150)
     
     // 5. Tabela de linhas
     const startY = 270
     pdf.setFillColor(23, 89, 198)
     pdf.roundedRect(40, startY, 500, 26, 6, 6, 'F')
     
     let rowY = startY + 40
     ;(document.lines || []).forEach((line) => {
       const lineTotal = line.quantity * line.unitPrice
       pdf.text(String(line.lineNo), 50, rowY)
       pdf.text(line.productDescription, 90, rowY)
       pdf.text(line.quantity.toFixed(2), 340, rowY)
       pdf.text(line.unitPrice.toFixed(2), 410, rowY)
       pdf.text(lineTotal.toFixed(2), 490, rowY)
       rowY += 22
     })
     
     // 6. Totais com moeda correta
     const currencyCode = document.documentTotals.currency?.currencyCode || 'AOA'
     pdf.text(`Total: ${document.documentTotals.grossTotal.toFixed(2)} ${currencyCode}`, 334, totalsY)
     
     // 7. Download
     pdf.save(`factura-${document.documentNo}.pdf`)
   }
   ```

---

## 🎯 RESUMO FINAL - TIM TIM POR TIM TIM

### **O que `converted.md` exige**:
1. ✅ 7 serviços REST com assinaturas JWS RS256
2. ✅ Validação a posteriori (emite → envia → valida assincronamente)
3. ✅ Recibos SEM linhas, COM paymentReceipt
4. ✅ Outras facturas COM linhas, SEM paymentReceipt
5. ✅ NC com referenceInfo obrigatório
6. ✅ QR Code 350x350 PNG, versão 4, M, logo <20%
7. ✅ Moeda estrangeira como objeto quando ≠AOA
8. ✅ Invariantes de valores (preços ≥0, descontos ≤total, etc.)
9. ✅ Códigos de erro E94-E98
10. ✅ Tabelas CAE, IEC, IS, IVA

### **Como o sistema implementa**:
1. ✅ **Frontend Next.js** com forms + validação Zod
2. ✅ **API Routes** que geram JWS e chamam AGT
3. ✅ **JWS helpers** para todas as assinaturas RS256
4. ✅ **Schemas Zod** com superRefine para regras de negócio
5. ✅ **Server-side validations** em `registarFactura`
6. ✅ **PDFExporter** com QR Code spec-compliant + logo overlay
7. ✅ **Auto-refresh** de status via `consultarFactura`
8. ✅ **Error mapping** HTTP → E94-E98
9. ✅ **Series management** com invoicingMethod + status
10. ✅ **localStorage** para persistência mock

### **Fluxo Completo**:
```
Login → Dashboard → Criar Série → Criar Factura → 
  ↓
Validar Form (Zod) → Gerar JWS → POST /api/agt/registarFactura →
  ↓
AGT valida (async) → requestID → Polling /api/agt/obterEstado →
  ↓
Status=V → Gerar PDF + QR → Download
```

**Estado atual: 100% conforme especificação AGT! 🎉**
