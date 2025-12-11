# 🔄 Fluxo Completo: SAP → Sistema Mediador → AGT

## 📋 Visão Geral da Arquitetura

Este documento detalha o fluxo completo de integração desde a criação de uma factura no SAP até à certificação pela AGT (Administração Geral Tributária de Angola).

---

## 🏗️ Arquitetura de 3 Camadas

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CAMADA 1: SAP (ORIGEM)                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │   SAP ECC    │  │ SAP S/4HANA  │  │   SAP BW     │                  │
│  │  (On-Prem)   │  │   (Cloud)    │  │  (Analytics) │                  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                  │
│         │                 │                 │                            │
│         └─────────────────┴─────────────────┘                            │
│                           │                                              │
│                  Módulos: SD, FI, MM                                     │
│                  Tabelas: VBRK, VBRP, KNA1, KONV                        │
│                  Transações: VF01, VF02, VF03                           │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │
                              │ IDoc INVOIC02 / RFC / Web Service
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    CAMADA 2: MIDDLEWARE SAP                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │   SAP PI/PO  │  │   SAP CPI    │  │  Custom RFC  │                  │
│  │   (On-Prem)  │  │   (Cloud)    │  │  Z-Function  │                  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                  │
│         │                 │                 │                            │
│         └─────────────────┴─────────────────┘                            │
│                           │                                              │
│         Funções:                                                         │
│         • Transformação IDoc → JSON                                      │
│         • Mapeamento de campos SAP → AGT                                 │
│         • Gestão de autenticação JWT                                     │
│         • Retry logic e error handling                                   │
│         • Logs e auditoria                                               │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │
                              │ HTTPS REST/SOAP + JWT Bearer Token
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              CAMADA 3: SISTEMA MEDIADOR (ESTE SISTEMA)                   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────┐        │
│  │                    Next.js 14 + TypeScript                   │        │
│  │                                                               │        │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐│        │
│  │  │  API REST       │  │  SOAP/WSDL      │  │  Autenticação││        │
│  │  │  /api/agt/*     │  │  Endpoints      │  │  JWT RS256  ││        │
│  │  └────────┬────────┘  └────────┬────────┘  └──────┬──────┘│        │
│  │           │                     │                   │        │        │
│  │           └─────────────────────┴───────────────────┘        │        │
│  │                              │                                │        │
│  │  ┌────────────────────────────────────────────────────────┐ │        │
│  │  │           Business Logic Layer                         │ │        │
│  │  │  • Validação fiscal (IVA, IS, IEC)                    │ │        │
│  │  │  • Cálculo de totais                                  │ │        │
│  │  │  • Geração de hashes (SHA-256)                        │ │        │
│  │  │  • Geração de QR Codes (350x350 PNG)                 │ │        │
│  │  │  • Verificação de séries AGT                         │ │        │
│  │  │  • Conformidade Decreto 71/25                        │ │        │
│  │  └────────────────────┬───────────────────────────────────┘ │        │
│  │                       │                                       │        │
│  │  ┌────────────────────▼───────────────────────────────────┐ │        │
│  │  │           Data Persistence Layer                       │ │        │
│  │  │  • localStorage (Demo)                                │ │        │
│  │  │  • PostgreSQL/MySQL (Produção)                       │ │        │
│  │  │  • Cache Redis (Opcional)                            │ │        │
│  │  └────────────────────────────────────────────────────────┘ │        │
│  └─────────────────────────────────────────────────────────────┘        │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │
                              │ API REST + Certificado Digital
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              CAMADA 4: AGT (ADMINISTRAÇÃO GERAL TRIBUTÁRIA)              │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────┐        │
│  │                  Portal AGT (agt.gov.ao)                     │        │
│  │                                                               │        │
│  │  • Validação de NIF                                          │        │
│  │  • Certificação de documentos fiscais                        │        │
│  │  • Emissão de códigos únicos                                │        │
│  │  • Aprovação/Rejeição de séries                             │        │
│  │  • Auditoria e fiscalização                                 │        │
│  │  • Base de dados nacional de facturas                       │        │
│  └─────────────────────────────────────────────────────────────┘        │
│                                                                           │
│  Serviços AGT:                                                           │
│  ✓ Registar Factura                                                      │
│  ✓ Consultar Estado                                                      │
│  ✓ Solicitar Série                                                       │
│  ✓ Validar NIF                                                           │
│  ✓ Obter Tabelas (IVA, IS, IEC, CAE)                                    │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 📄 **A Importância Crucial do WSDL**

### **O que é WSDL?**

**WSDL** (Web Services Description Language) é um documento XML que funciona como um **contrato formal** entre sistemas. É a "certidão de nascimento" de um web service.

#### Componentes do WSDL:

```xml
<definitions>
  <!-- 1. TYPES: Define estruturas de dados -->
  <types>
    <xsd:complexType name="ClienteType">
      <xsd:element name="nif" type="xsd:string"/>
      <xsd:element name="nome" type="xsd:string"/>
    </xsd:complexType>
  </types>

  <!-- 2. MESSAGES: Define mensagens trocadas -->
  <message name="RegistarFacturaRequest">
    <part name="parameters" element="tns:RegistarFacturaRequest"/>
  </message>

  <!-- 3. PORT TYPE: Define operações disponíveis -->
  <portType name="AGTFacturaServicePortType">
    <operation name="RegistarFactura">
      <input message="tns:RegistarFacturaRequestMsg"/>
      <output message="tns:RegistarFacturaResponseMsg"/>
    </operation>
  </portType>

  <!-- 4. BINDING: Define protocolo (SOAP/HTTP) -->
  <binding name="AGTFacturaServiceSoapBinding">
    <soap:binding style="document" transport="http://schemas.xmlsoap.org/soap/http"/>
  </binding>

  <!-- 5. SERVICE: Define endpoint (URL) -->
  <service name="AGTFacturaService">
    <port binding="tns:AGTFacturaServiceSoapBinding">
      <soap:address location="https://seu-sistema.ao/api/agt/soap"/>
    </port>
  </service>
</definitions>
```

### **Por que o WSDL é ESSENCIAL para SAP?**

#### ✅ **1. Geração Automática de Código**

Sem WSDL (manual):
```abap
" Programador precisa escrever tudo manualmente
DATA: lv_url TYPE string VALUE 'https://...',
      lv_xml TYPE string,
      lo_http TYPE REF TO if_http_client.

" Construir XML manualmente (propenso a erros)
lv_xml = '<?xml version="1.0"?>'
      && '<soap:Envelope>'
      && '<soap:Body>'
      && '<RegistarFactura>'
      && '<nif>999888777</nif>'
      && '...' " 200+ linhas de XML
      && '</RegistarFactura>'
      && '</soap:Body>'
      && '</soap:Envelope>'.

" Parsear resposta manualmente
" ... mais 100 linhas de código
```

Com WSDL (automático):
```abap
" SAP lê WSDL e gera tudo automaticamente via SPROXY
DATA: lo_proxy TYPE REF TO cl_agt_factura_service, " Gerado pelo WSDL
      ls_request TYPE zagt_registar_factura_req,     " Gerado pelo WSDL
      ls_response TYPE zagt_registar_factura_res.    " Gerado pelo WSDL

CREATE OBJECT lo_proxy.

" Estruturas já existem - basta preencher
ls_request-nif = '999888777'.
ls_request-document_type = 'FT'.
ls_request-client-nif = '123456789'.

" Chamada simples
CALL METHOD lo_proxy->registar_factura
  EXPORTING input = ls_request
  RECEIVING output = ls_response.

" Campos tipados - IntelliSense funciona!
IF ls_response-success = abap_true.
  WRITE: / 'Código:', ls_response-document_code.
ENDIF.
```

**Economia**: De 500 linhas de código para 15 linhas!

#### ✅ **2. Contrato Formal e Versionamento**

```
Sem WSDL:
Programador SAP: "Qual o nome do campo para o NIF do cliente?"
Programador Sistema: "Acho que é 'client_nif'... ou seria 'clientNif'?"
→ Resultado: Erros em produção, retrabalho

Com WSDL:
<xsd:element name="client">
  <xsd:complexType>
    <xsd:element name="nif" type="xsd:string" minOccurs="1"/>
    <!-- ↑ Documentação clara: campo obrigatório, tipo string -->
  </xsd:complexType>
</xsd:element>
→ Resultado: Zero ambiguidade
```

#### ✅ **3. Validação em Tempo de Design**

Quando importa o WSDL no SAP PI/PO:

```
┌────────────────────────────────────────┐
│  SAP NetWeaver (SPROXY)                │
│                                        │
│  Import WSDL → AGT_FacturaService.wsdl│
│                                        │
│  ✓ Parsing XML: OK                    │
│  ✓ Namespaces: OK                     │
│  ✓ Data Types: OK                     │
│  ✓ Operations: 3 found                │
│  ✓ Endpoint: Valid URL                │
│  ✓ Security: SOAP 1.2                 │
│                                        │
│  [Generate Proxy Classes] ← Click     │
└────────────────────────────────────────┘
           ↓
  Classes geradas:
  • CL_AGT_FACTURA_SERVICE (proxy)
  • ZAGT_CLIENTE_MT (estrutura cliente)
  • ZAGT_LINHA_MT (estrutura linha)
  • ZAGT_IMPOSTO_MT (estrutura imposto)
  • ... (30+ artefactos gerados)
```

#### ✅ **4. Compatibilidade entre Versões**

```xml
<!-- WSDL v1.0 -->
<operation name="RegistarFactura">
  <input message="tns:FacturaRequest_v1"/>
</operation>

<!-- WSDL v2.0 (novo campo opcional) -->
<operation name="RegistarFactura">
  <input message="tns:FacturaRequest_v2"/>
  <!-- Novo campo: observacoes (opcional) -->
  <xsd:element name="observacoes" minOccurs="0"/>
</operation>
```

SAP pode:
- Manter v1.0 em produção
- Testar v2.0 em QAS
- Migrar gradualmente

**Sem WSDL**: Breaking changes quebram sistema em produção!

#### ✅ **5. Documentação Viva**

```xml
<xsd:complexType name="ImpostoType">
  <xsd:annotation>
    <xsd:documentation>
      Representa um imposto aplicado a uma linha de factura.
      Tipos válidos: IVA, IS, IEC
      Taxas IVA: 0%, 5%, 7%, 14%
      Taxas IS: 0.1% a 10% (conforme tabela AGT)
    </xsd:documentation>
  </xsd:annotation>
  <xsd:element name="tipo" type="xsd:string"/>
  <xsd:element name="taxa" type="xsd:decimal"/>
</xsd:complexType>
```

Programador SAP vê isso no SAP GUI como **tooltip**!

#### ✅ **6. Segurança e Certificados**

```xml
<wsdl:service name="AGTFacturaService">
  <wsdl:port binding="tns:AGTFacturaServiceSoapBinding">
    <soap:address location="https://seu-sistema.ao/api/agt/soap"/>
    <wsdl:documentation>
      Segurança: HTTPS/TLS 1.3
      Autenticação: Bearer Token JWT (Header: Authorization)
      Certificado: Emitido por AGT
      Rate Limit: 100 req/min
    </wsdl:documentation>
  </wsdl:port>
</wsdl:service>
```

SAP PI/PO lê essas configurações e aplica automaticamente!

---

## 🔄 Fluxo Detalhado Passo-a-Passo

### **FASE 1: Criação de Factura no SAP** 🏢

```
┌─────────────────────────────────────────┐
│  Transação VF01 (Criar Factura)         │
│                                         │
│  Cliente: 0000012345                    │
│  Material: MAT001 (5 un)                │
│  Preço: 10.000,00 AOA                   │
│  IVA: 14%                               │
│  Total: 57.000,00 AOA                   │
│                                         │
│  [Salvar] ← Click                       │
└─────────────────────────────────────────┘
           ↓
  Documento criado: 90000123
  Tabelas atualizadas:
  • VBRK (Cabeçalho)
  • VBRP (5 linhas)
  • KONV (Impostos)
  • BKPF (Contabilidade)
           ↓
  Trigger: User Exit MV45AFZZ
           ↓
  RFC Call → Z_AGT_SEND_INVOICE
```

### **FASE 2: Middleware PI/PO**

```
┌──────────────────────────────────────────┐
│  SAP PI/PO Integration Builder          │
│                                          │
│  1. Recebe IDoc INVOIC02                │
│     • E1EDK01 (Header)                  │
│     • E1EDP01 (Lines)                   │
│     • E1EDKA1 (Partner)                 │
│                                          │
│  2. Message Mapping                     │
│     INVOIC02 → AGT_Invoice_MT           │
│     • VBELN → documentNumber            │
│     • FKART → documentType (F1→FT)      │
│     • FKDAT → issueDate (format)        │
│     • KNA1 → client (lookup)            │
│                                          │
│  3. Autenticação                        │
│     POST /api/auth/login                │
│     → Obter JWT Token                   │
│                                          │
│  4. Envio                               │
│     POST /api/agt/registarFactura       │
│     Headers:                            │
│       Authorization: Bearer <token>     │
│       Content-Type: application/json    │
│                                          │
│     Body: { JSON transformado }         │
└──────────────────────────────────────────┘
```

### **FASE 3: Sistema Mediador (Este Sistema)**

```typescript
// app/api/agt/registarFactura/route.ts

export async function POST(request: NextRequest) {
  // 1️⃣ AUTENTICAÇÃO
  const token = request.headers.get('authorization')?.split(' ')[1]
  if (!verifyJWT(token)) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
  }

  // 2️⃣ PARSE
  const factura = await request.json()

  // 3️⃣ VALIDAÇÃO DE SCHEMA
  const schemaValid = facturaSchema.safeParse(factura)
  if (!schemaValid.success) {
    return NextResponse.json({ 
      error: 'Dados inválidos', 
      details: schemaValid.error 
    }, { status: 400 })
  }

  // 4️⃣ VALIDAÇÕES FISCAIS
  
  // a) NIF 9 dígitos
  if (!/^\d{9}$/.test(factura.client.nif)) {
    return NextResponse.json({ error: 'NIF inválido' }, { status: 422 })
  }

  // b) Série aprovada AGT
  const serieValida = await verificarSerieAGT(factura.seriesNumber)
  if (!serieValida) {
    return NextResponse.json({ error: 'Série não aprovada' }, { status: 403 })
  }

  // c) Cálculo de totais
  const subtotalCalculado = factura.lines.reduce(
    (sum, line) => sum + (line.quantity * line.unitPrice), 0
  )
  if (Math.abs(subtotalCalculado - factura.totals.subtotal) > 0.01) {
    return NextResponse.json({ error: 'Totais incorretos' }, { status: 422 })
  }

  // d) Impostos conforme tabela AGT
  const taxasIVA = [0, 5, 7, 14] // % válidos
  factura.lines.forEach(line => {
    line.taxes.forEach(tax => {
      if (tax.type === 'IVA' && !taxasIVA.includes(tax.rate)) {
        throw new Error(`Taxa IVA ${tax.rate}% inválida`)
      }
    })
  })

  // e) CAE (Classificação Atividade Económica)
  const caeValido = await validarCAE(factura.nif, factura.lines[0].productCode)
  if (!caeValido) {
    return NextResponse.json({ 
      error: 'Produto não compatível com CAE da empresa' 
    }, { status: 422 })
  }

  // 5️⃣ GERAÇÃO DE HASH (SHA-256)
  const hash = crypto
    .createHash('sha256')
    .update([
      factura.nif,
      factura.documentType,
      factura.seriesNumber,
      factura.totals.total,
      new Date().toISOString()
    ].join('|'))
    .digest('hex')

  // 6️⃣ GERAÇÃO DE QR CODE
  const qrData = JSON.stringify({
    doc: `FT2025-${factura.seriesNumber}`,
    nif: factura.nif,
    total: factura.totals.total,
    hash: hash.substring(0, 16)
  })

  const qrCodePNG = await QRCode.toDataURL(qrData, {
    width: 350,
    errorCorrectionLevel: 'M'
  })

  // 7️⃣ PREPARAR PARA AGT
  const documentCode = `FT2025-${factura.seriesNumber}-AGT-${generateUID()}`
  
  const agtPayload = {
    ...factura,
    documentCode,
    hash,
    qrCode: qrCodePNG,
    processedAt: new Date().toISOString()
  }

  // 8️⃣ ENVIAR PARA AGT (Futura implementação real)
  const agtResponse = await sendToAGT(agtPayload)

  // 9️⃣ GUARDAR LOCALMENTE
  await saveFactura(agtPayload)

  // 🔟 RETORNAR SUCESSO
  return NextResponse.json({
    success: true,
    data: {
      documentCode,
      hash,
      qrCode: qrCodePNG,
      qrCodeUrl: `https://agt.gov.ao/validar?doc=${documentCode}`,
      status: 'APPROVED',
      processedAt: agtPayload.processedAt
    }
  })
}
```

### **FASE 4: AGT (Futura)**

```
┌────────────────────────────────────────┐
│  Portal AGT (api.agt.gov.ao)          │
│                                        │
│  1. Recebe documento                  │
│     • Valida certificado digital      │
│     • Verifica assinatura JWS RS256   │
│                                        │
│  2. Validações AGT                    │
│     ✓ NIF emitente ativo              │
│     ✓ NIF cliente válido              │
│     ✓ Série aprovada e em uso         │
│     ✓ Sequência numérica correta      │
│     ✓ Impostos conformes              │
│     ✓ CAE compatível                  │
│                                        │
│  3. Certificação                      │
│     • Gera código único AGT           │
│     • Assina documento                │
│     • Regista em blockchain (futuro)  │
│                                        │
│  4. Resposta                          │
│     {                                 │
│       "status": "APPROVED",           │
│       "agtCode": "FT2025-00123-AGT-XYZ",│
│       "certificate": "...",           │
│       "validUntil": "2026-12-31"      │
│     }                                 │
└────────────────────────────────────────┘
```

### **FASE 5: Retorno ao SAP**

```abap
" PI/PO recebe resposta JSON e atualiza SAP
FUNCTION z_agt_update_document.

  DATA: ls_vbrk TYPE vbrk.

  " Ler documento
  SELECT SINGLE * FROM vbrk INTO ls_vbrk
    WHERE vbeln = iv_vbeln.

  " Atualizar campos customizados
  UPDATE vbrk SET
    zagt_code = iv_agt_code      " FT2025-00123-AGT-XYZ
    zagt_hash = iv_hash          " A1B2C3D4E5...
    zagt_status = 'APPROVED'     " Status
    zagt_certified_at = sy-datum " Data certificação
    zagt_qr_code = iv_qr_base64  " QR Code em base64
  WHERE vbeln = iv_vbeln.

  COMMIT WORK.

  " Enviar email ao cliente
  PERFORM send_invoice_email
    USING iv_vbeln iv_qr_code.

  " Log
  WRITE: / 'Factura', iv_vbeln, 'certificada:', iv_agt_code.

ENDFUNCTION.
```

---

## 📊 Diagrama de Sequência Visual

```
Utilizador  SAP ECC   PI/PO    Mediador   AGT     SAP     Cliente
    │         │         │          │        │       │        │
    │  VF01   │         │          │        │       │        │
    ├────────>│         │          │        │       │        │
    │         │ Save    │          │        │       │        │
    │         │ VBRK    │          │        │       │        │
    │         │         │          │        │       │        │
    │         │ Trigger │          │        │       │        │
    │         ├────────>│          │        │       │        │
    │         │         │ Map      │        │       │        │
    │         │         │ IDoc→JSON│        │       │        │
    │         │         │          │        │       │        │
    │         │         │ POST     │        │       │        │
    │         │         ├─────────>│        │       │        │
    │         │         │          │Validate│       │        │
    │         │         │          │Generate│       │        │
    │         │         │          │  Hash  │       │        │
    │         │         │          │  QR    │       │        │
    │         │         │          │        │       │        │
    │         │         │          │ POST   │       │        │
    │         │         │          ├───────>│       │        │
    │         │         │          │        │Certify│        │
    │         │         │          │        │       │        │
    │         │         │          │ Response       │        │
    │         │         │          │<───────┤       │        │
    │         │         │          │        │       │        │
    │         │         │ JSON     │        │       │        │
    │         │         │<─────────┤        │       │        │
    │         │         │          │        │       │        │
    │         │         │ Update   │        │       │        │
    │         │         ├─────────────────────────>│        │
    │         │         │          │        │       │        │
    │         │ Success │          │        │       │        │
    │         │<────────┤          │        │       │        │
    │         │         │          │        │       │        │
    │         │ Email PDF+QR                │       │        │
    │         ├────────────────────────────────────────────>│
    │         │         │          │        │       │        │
    │ Status  │         │          │        │       │        │
    │<────────┤         │          │        │       │        │
    │ "OK"    │         │          │        │       │        │
```

---

## ⏱️ Performance e Timeouts

| Etapa | Tempo Médio | Timeout | Retry |
|-------|-------------|---------|-------|
| SAP cria doc | 2-5s | - | - |
| Trigger PI/PO | <1s | - | - |
| Transform IDoc | 1-2s | 10s | Não |
| Send to Mediador | 0.5-1s | 5s | Sim (3x) |
| Validate Mediador | 1-2s | 10s | Não |
| Send to AGT | 3-5s | 30s | Sim (3x) |
| AGT certify | 2-4s | 30s | - |
| Return to SAP | 1-2s | 10s | Sim (3x) |
| Update SAP | 1-2s | - | - |
| **TOTAL** | **11-24s** | **95s** | - |

### Estratégia de Retry (PI/PO)

```java
def sendWithRetry(factura, maxRetries = 3) {
    for (int i = 0; i < maxRetries; i++) {
        try {
            return httpClient.post(factura)
        } catch (TimeoutException e) {
            if (i == maxRetries - 1) throw e
            Thread.sleep(Math.pow(2, i) * 1000) // Backoff: 1s, 2s, 4s
        } catch (ServerException e) {
            if (e.statusCode >= 500 && i < maxRetries - 1) {
                Thread.sleep(5000)
                continue
            }
            throw e
        }
    }
}
```

---

## 🔐 Segurança em Todas as Camadas

### SAP → PI/PO
- ✅ **RFC Seguro**: SNC (Secure Network Communication)
- ✅ **Criptografia**: AES-256
- ✅ **VPN**: Túnel corporativo

### PI/PO → Sistema Mediador
- ✅ **HTTPS/TLS 1.3**: Criptografia em trânsito
- ✅ **JWT RS256**: Token assinado com chave privada
- ✅ **IP Whitelist**: Apenas IPs conhecidos
- ✅ **Rate Limiting**: 100 req/min

### Sistema Mediador → AGT
- ✅ **Mutual TLS**: Cliente e servidor se autenticam
- ✅ **Certificado Digital**: Emitido pela AGT
- ✅ **JWS RS256**: Payload assinado
- ✅ **API Key**: Chave secreta adicional

### Dados em Repouso
- ✅ **Encriptação**: AES-256-GCM
- ✅ **Backup**: Diário, retenção 7 anos
- ✅ **Auditoria**: Logs imutáveis

---

## 📈 Monitorização e Alertas

### Dashboard SAP
```
Transaction: /nSXMB_MONI (PI/PO Monitor)

KPIs:
• Taxa de sucesso: 99.8%
• Tempo médio resposta: 12s
• Erros última hora: 2
• Retry rate: 0.5%
```

### Dashboard Sistema Mediador
```
URL: /configuracoes → Integração SAP

Status:
• Facturas processadas hoje: 1.247
• Aprovadas AGT: 1.245 (99.8%)
• Pendentes: 2
• Erros: 0
• Uptime: 99.99%
```

### Alertas Automáticos
```yaml
alerts:
  - condition: error_rate > 5%
    action: email + sms
    recipients: ["dev@empresa.ao", "+244 9XX XXX XXX"]
  
  - condition: response_time > 30s
    action: log + notify
  
  - condition: agt_unavailable
    action: retry + escalate_after_3_failures
```

---

## ✅ Checklist de Implementação

### Fase 1: Preparação SAP
- [ ] Criar campos Z em VBRK (ZAGT_CODE, ZAGT_HASH, ZAGT_STATUS)
- [ ] Desenvolver função Z_AGT_SEND_INVOICE
- [ ] Implementar User Exit MV45AFZZ
- [ ] Configurar RFC destination
- [ ] Criar job batch de sincronização

### Fase 2: Configurar PI/PO
- [ ] Importar WSDL no SPROXY
- [ ] Criar Message Mapping (IDoc → JSON)
- [ ] Configurar Sender Agreement
- [ ] Configurar Receiver Determination
- [ ] Configurar Receiver Agreement
- [ ] Testar em DEV

### Fase 3: Deploy Sistema Mediador
- [ ] Deploy em servidor (Vercel/AWS/Azure)
- [ ] Configurar domínio HTTPS
- [ ] Gerar certificados SSL
- [ ] Configurar JWT secrets
- [ ] Ativar rate limiting
- [ ] Configurar logs

### Fase 4: Integração AGT
- [ ] Obter credenciais AGT
- [ ] Instalar certificado digital
- [ ] Configurar endpoint AGT
- [ ] Testar em homologação
- [ ] Go-live produção

---

**Documento criado**: 11 Dezembro 2025  
**Versão**: 1.0.0  
**Autor**: Equipa Técnica Sistema AGT  
**Para**: Programadores SAP e Arquitetos de Integração
