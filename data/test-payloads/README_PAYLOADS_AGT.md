# 🇦🇴 Payloads JSON - Certificação AGT (Facturação Electrónica Angola)

Sistema completo de geração de payloads válidos para certificação de software de facturação electrónica junto à **Administração Geral Tributária (AGT)** de Angola.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Estrutura de Arquivos](#estrutura-de-arquivos)
- [Instalação](#instalação)
- [Uso Rápido](#uso-rápido)
- [Cenários Implementados](#cenários-implementados)
- [Configuração](#configuração)
- [Exemplos de Payloads](#exemplos-de-payloads)
- [Validação e Testes](#validação-e-testes)
- [Referências Técnicas](#referências-técnicas)

---

## 🎯 Visão Geral

Este sistema TypeScript gera automaticamente **6 cenários completos** de documentos fiscais electrónicos conforme especificações técnicas da AGT (versão 1.1, Novembro 2025):

✅ **C1** - Aviso de Cobrança (AC)  
✅ **C2** - Factura/Recibo (FR)  
✅ **C3** - Factura (FT)  
✅ **C4** - Nota de Crédito (NC)  
✅ **C5** - Nota de Débito (ND)  
✅ **C6** - Recibo em Numerário (RC)

### Características Principais

- ✅ **Cálculos Automáticos**: IVA, IEC, IS, totais
- ✅ **Validação Estrutural**: Campos obrigatórios, tipos, formatos
- ✅ **Assinatura Digital**: Mock JWS (preparado para certificado real)
- ✅ **Cenários Realistas**: Múltiplas linhas, clientes com/sem NIF, retenções na fonte
- ✅ **TypeScript Tipado**: Autocompletar e type-safety
- ✅ **JSON Pronto**: Output direto para API AGT

---

## 📁 Estrutura de Arquivos

```
lib/
├── agt-payload-types.ts         # Tipos TypeScript (interfaces completas)
├── agt-payload-helpers.ts       # Funções helper (cálculos, UUID, assinatura)
└── agt-payload-generators.ts    # Geradores dos 6 cenários

scripts/
└── generate-agt-payloads.ts     # Script CLI para gerar e validar

data/test-payloads/
├── C1_AC_AC_A_000001.json       # Payload gerado C1
├── C2_FR_FR_B_000042.json       # Payload gerado C2
├── C3_FT_FT_A_000125.json       # Payload gerado C3
├── C4_NC_NC_A_000015.json       # Payload gerado C4
├── C5_ND_ND_A_000008.json       # Payload gerado C5
├── C6_RC_RC_C_000256.json       # Payload gerado C6
├── _ALL_PAYLOADS.json           # Array consolidado
└── agt-api-test.http            # Exemplos HTTP REST Client
```

---

## 🚀 Instalação

### Pré-requisitos

- Node.js >= 16.x
- npm ou yarn

### Instalar Dependências

```bash
npm install uuid
npm install --save-dev @types/uuid
npm install --save-dev ts-node typescript
```

---

## ⚡ Uso Rápido

### 1. Gerar Todos os Payloads

```bash
npx ts-node scripts/generate-agt-payloads.ts
```

**Output:**
- 6 arquivos JSON individuais em `/data/test-payloads/`
- 1 arquivo consolidado `_ALL_PAYLOADS.json`
- Resumo no console com totais, impostos, clientes

### 2. Usar em Código TypeScript

```typescript
import {
  generateFactura,
  generateNotaCredito,
  ALL_TEST_SCENARIOS
} from './lib/agt-payload-generators';

// Gerar uma factura
const facturaPayload = generateFactura();
console.log(JSON.stringify(facturaPayload, null, 2));

// OU iterar todos os cenários
ALL_TEST_SCENARIOS.forEach((scenario) => {
  const payload = scenario.generator();
  console.log(`${scenario.code}: ${scenario.name}`);
  // Enviar para API AGT...
});
```

### 3. Enviar para API AGT (Exemplo com Fetch)

```typescript
const payload = generateFactura();

const response = await fetch('https://sifphml.minfin.gov.ao/sigt/fe/v1/registarFactura', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify(payload)
});

const result = await response.json();
console.log('Request ID:', result.requestID);
```

---

## 🧪 Cenários Implementados

### C1 - Aviso de Cobrança (AC)

**Cliente:** Empresa com NIF (987654321)  
**Linhas:**
- 40h Consultoria TI @ 15.000 AOA
- 1 Licença Software @ 250.000 AOA
- 5 dias Formação @ 8.000 AOA

**IVA:** 14%  
**Total:** 913.200 AOA

---

### C2 - Factura/Recibo (FR)

**Cliente:** Consumidor Final (sem NIF)  
**Linhas:**
- 2 Notebooks Dell @ 185.000 AOA
- 2 Mouse Wireless @ 4.500 AOA
- 2 Mochilas @ 12.000 AOA

**IVA:** 14%  
**Total:** 459.420 AOA  
**Pagamento:** Imediato

---

### C3 - Factura (FT)

**Cliente:** Empresa Portuguesa (PT) - NIF 501234567  
**Linhas:**
- 80h Auditoria Financeira @ 25.000 AOA
- 60h Consultoria Fiscal @ 22.000 AOA
- 1 Relatório Executivo @ 150.000 AOA

**IVA:** 14%  
**Retenção na Fonte:** 6,5% sobre IVA (cliente estrangeiro)  
**Total:** 3.705.600 AOA  
**Retenção:** 33.579,60 AOA

---

### C4 - Nota de Crédito (NC)

**Referencia:** FT A/000100 (25/01/2025)  
**Motivo:** Devolução de mercadoria defeituosa  
**Linhas:**
- 1 Notebook Dell @ 185.000 AOA (devolução)

**IVA:** 14%  
**Total:** -210.900 AOA (crédito ao cliente)

---

### C5 - Nota de Débito (ND)

**Referencia:** FT A/000095 (15/12/2024)  
**Motivo:** Juros de mora (50 dias atraso)  
**Linhas:**
- Juros de mora @ 45.000 AOA (isento IVA)
- Despesas de cobrança @ 8.000 AOA (isento IVA)

**IVA:** 0% (juros isentos)  
**Total:** 53.000 AOA

---

### C6 - Recibo em Numerário (RC)

**Cliente:** Consumidor Final  
**Facturas Pagas:**
- FT A/000080 (20/01/2025): 250.000 AOA
- FT A/000081 (22/01/2025): 180.000 AOA

**Total Pago:** 430.000 AOA  
**Método:** Dinheiro (cash)

---

## ⚙️ Configuração

### 1. Dados do Software (OBRIGATÓRIO)

Editar `lib/agt-payload-generators.ts`:

```typescript
const SOFTWARE_CONFIG = {
  productId: 'SOFT-FACT-2025',           // Seu ID de produto
  productVersion: '1.0.0',               // Versão do software
  validationNumber: 'AGT-CERT-2025-001234', // ❗ Fornecido pela AGT
  emitterNIF: '123456789'                // ❗ NIF da sua empresa
};
```

### 2. Assinatura Digital (PRODUÇÃO)

Editar `lib/agt-payload-helpers.ts`, função `signPayload()`:

```typescript
export function signPayload(data: any): string {
  // PRODUÇÃO: Implementar com certificado real
  const privateKey = fs.readFileSync('path/to/private-key.pem');
  const sign = crypto.createSign('SHA256');
  sign.update(JSON.stringify(data));
  sign.end();
  
  const signature = sign.sign(privateKey, 'base64');
  return signature.substring(0, 256).padEnd(256, '=');
}
```

### 3. Taxas e Impostos

Ajustar em `lib/agt-payload-types.ts`:

```typescript
export const IVA_RATES = {
  NORMAL: 14.0,    // Taxa geral IVA Angola
  ZERO: 0.0        // Exportações, etc
};
```

---

## 📄 Exemplos de Payloads

### Estrutura Básica (Todos os Cenários)

```json
{
  "schemaVersion": "1.0",
  "submissionGUID": "550e8400-e29b-41d4-a716-446655440000",
  "taxRegistrationNumber": "123456789",
  "submissionTimeStamp": "2025-02-03T14:30:00.000Z",
  "softwareInfo": {
    "softwareInfoDetail": {
      "productId": "SOFT-FACT-2025",
      "productVersion": "1.0.0",
      "softwareValidationNumber": "AGT-CERT-2025-001234"
    },
    "jwsSoftwareSignature": "BASE64_SIGNATURE_256_CHARS..."
  },
  "numberOfEntries": 1,
  "documents": [
    {
      "documentNo": "FT A/000125",
      "documentStatus": "N",
      "jwsDocumentSignature": "BASE64_SIGNATURE_256_CHARS...",
      "documentDate": "2025-02-03",
      "documentType": "FT",
      "eacCode": "70220",
      "systemEntryDate": "2025-02-03T14:30:00.000Z",
      "customerCountry": "AO",
      "customerTaxID": "987654321",
      "companyName": "EMPRESA EXEMPLO, LDA",
      "lines": [
        {
          "lineNumber": "1",
          "productCode": "SERV-001",
          "productDescription": "Consultoria em TI",
          "quantity": "40.00",
          "unitOfMeasure": "Hora",
          "unitPrice": "15000.00",
          "taxes": [
            {
              "taxType": "IVA",
              "taxCountryRegion": "AO",
              "taxCode": "NOR",
              "taxBase": "600000.00",
              "taxPercentage": "14.00",
              "taxAmount": "84000.00"
            }
          ],
          "settlementAmount": "684000.00"
        }
      ],
      "documentTotals": {
        "taxPayable": "84000.00",
        "netTotal": "600000.00",
        "grossTotal": "684000.00"
      }
    }
  ]
}
```

### Exemplo com Retenção na Fonte

```json
"withholdingTaxList": [
  {
    "withholdingTaxType": "IVA",
    "withholdingTaxDescription": "Retenção de IVA na fonte - 6,5% sobre IVA",
    "withholdingTaxAmount": "5460.00"
  }
]
```

### Exemplo com Recibo (sourceDocuments)

```json
"paymentReceipt": {
  "sourceDocuments": [
    {
      "lineNo": "1",
      "sourceDocumentID": {
        "originatingON": "FT A/000080",
        "documentDate": "2025-01-20"
      },
      "creditAmount": "250000.00"
    }
  ]
}
```

---

## ✅ Validação e Testes

### Validação Automática

O script já inclui validação básica:

```typescript
function validatePayload(payload: RegistarFacturaRequest): {
  valid: boolean;
  errors: string[];
}
```

**Checklist de Validação:**
- ✅ Campos obrigatórios presentes
- ✅ UUID formato v4
- ✅ Timestamps ISO 8601
- ✅ NIF 9 dígitos
- ✅ Assinaturas 256 caracteres
- ✅ Valores numéricos como strings
- ✅ Totais consistentes

### Testar com API AGT

1. **Validar estrutura** (endpoint opcional):
   ```bash
   POST https://sifphml.minfin.gov.ao/sigt/fe/v1/validarDocumento
   ```

2. **Registar factura** (HML):
   ```bash
   POST https://sifphml.minfin.gov.ao/sigt/fe/v1/registarFactura
   ```

3. **Consultar estado**:
   ```bash
   GET https://sifphml.minfin.gov.ao/sigt/fe/v1/obterEstado?requestID=XXX
   ```

### Códigos de Erro Comuns

| Código | Descrição | Solução |
|--------|-----------|---------|
| E001 | Campo obrigatório ausente | Verificar estrutura JSON |
| E002 | Formato de data inválido | Usar ISO 8601 (YYYY-MM-DD) |
| E003 | NIF inválido | 9 dígitos numéricos |
| E004 | Assinatura inválida | Verificar certificado/chave privada |
| E005 | CAE inválido | Consultar Tabela 1 do decreto |
| E006 | Total inconsistente | Recalcular soma de linhas |

---

## 📚 Referências Técnicas

### Documentos Base

1. **new-tec-specs.md** - Especificação Técnica AGT v1.1 (Nov 2025)
2. **decreto.md** - Estrutura de Dados e Tabelas de Referência

### Endpoints AGT

| Ambiente | Base URL |
|----------|----------|
| **HML** (Homologação) | `https://sifphml.minfin.gov.ao/sigt/fe/v1` |
| **PRD** (Produção) | `https://sifp.minfin.gov.ao/sigt/fe/v1` |

### Serviços Disponíveis

- `POST /registarFactura` - Submeter documento(s)
- `GET /obterEstado` - Consultar validação
- `GET /consultarFactura` - Detalhes de factura
- `GET /listarFacturas` - Listar documentos
- `POST /solicitarSerie` - Pedir nova série
- `GET /listarSeries` - Listar séries autorizadas
- `POST /validarDocumento` - Pré-validação

### Taxas Fiscais Angola (2025)

| Imposto | Taxa | Aplicação |
|---------|------|-----------|
| **IVA Normal** | 14% | Bens e serviços gerais |
| **IVA Zero** | 0% | Exportações, saúde, educação |
| **IEC** | Variável | Bebidas, tabacos, combustíveis |
| **IS** | Variável | Serviços financeiros, contratos |

### Códigos CAE Comuns

| CAE | Descrição |
|-----|-----------|
| 47190 | Comércio a retalho não especializado |
| 62010 | Programação informática |
| 56101 | Restaurantes |
| 70220 | Consultoria de gestão |
| 41200 | Construção de edifícios |

---

## 🔒 Segurança

### Assinatura Digital JWS

Em **produção**, implementar:

1. **Gerar par de chaves** (RSA 2048 ou ECDSA P-256)
2. **Obter certificado** da AGT
3. **Assinar payload** com chave privada
4. **Incluir certificado** no header JWS

### Exemplo (Node.js crypto):

```typescript
import crypto from 'crypto';

function signPayloadProduction(data: any, privateKeyPath: string): string {
  const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
  const sign = crypto.createSign('RSA-SHA256');
  
  const canonicalJson = JSON.stringify(data, Object.keys(data).sort());
  sign.update(canonicalJson);
  sign.end();
  
  return sign.sign(privateKey, 'base64');
}
```

---

## 🤝 Contribuir

Para melhorias:

1. Adicionar mais cenários (ex: Facturas com IEC/IS)
2. Implementar validação avançada (checksums, IBAN)
3. Integrar com bibliotecas de assinatura digital
4. Criar testes unitários automatizados

---

## 📞 Suporte

- **Portal AGT**: https://portaldoparceiro.minfin.gov.ao
- **Documentação Oficial**: Especificação Técnica FE v1.1
- **Email Suporte AGT**: correspondencia.agt@minfin.gov.ao

---

## 📝 Licença

Este código é fornecido como **exemplo educacional** para certificação AGT.  
Adapte conforme necessário para seu software comercial.

---

## 🎉 Pronto para Certificação!

Após ajustar configurações e testar em HML, seu software estará pronto para certificação oficial AGT. 🇦🇴✅
