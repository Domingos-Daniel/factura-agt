# 📋 Formato Excel AGT - Documentação de Campos

## 🆕 Novo Modelo: `modelo-planilha.xlsx`

O sistema agora suporta **dois formatos** de importação:
1. **Formato AGT completo** (modelo-planilha.xlsx) - Estrutura oficial AGT
2. **Formato SAP legado** (exemplo_facturas_sap.csv) - Compatibilidade retroativa

---

## 📊 Campos do Formato AGT

### 1. **Cabeçalho da Submissão**

| Campo | Tipo | Obrigatório | Descrição | Exemplo |
|-------|------|-------------|-----------|---------|
| `V Schema` | string | Não | Versão do schema AGT | `1.0` |
| `Identif` | string | Não | GUID único da submissão | `550e8400-e29b-41d4-a716-446655440000` |
| `TS Subm` | string | Não | Timestamp ISO8601 da submissão | `2025-01-11T10:30:00Z` |
| `Nº Fiscal` | string | Sim | NIF da empresa emissora (9 dígitos) | `999888777` |
| `A Softwa)` | string | Não | Assinatura JWS do software | `eyJhbGciOiJSUzI1NiJ9...` |
| `ID Produto` | string | Não | ID do produto software | `FacturAGT` |
| `V Produto` | string | Não | Versão do software | `1.0.0` |
| `Qnt Fact` | number | Não | Quantidade de facturas no ficheiro | `3` |

### 2. **Documento Individual**

| Campo | Tipo | Obrigatório | Descrição | Exemplo |
|-------|------|-------------|-----------|---------|
| `Nº Docum` | string | Sim | Número completo do documento | `FT 2025/00001` |
| `Nº Cliente` | string | Sim | NIF do cliente (9 dígitos) | `123456789` |
| `Status` | string | Sim | Status: `N`=Normal, `A`=Anulado | `N` |
| `Raz Canc` | string | Não | Razão de cancelamento (se Status=A) | `Erro de emissão` |
| `A Fatura` | string | Não | Hash/Assinatura da factura | `ABC123...` |
| `Data Doc` | string | Sim | Data do documento (YYYY-MM-DD) | `2025-01-11` |
| `Tipo Doc` | string | Sim | Tipo: FT, FS, NC, ND, FA, etc | `FT` |
| `Cod A` | string | Não | Código EAC (Classificação Atividade) | `12110` |
| `Dat E S` | string | Não | Data entrada no sistema (ISO8601) | `2025-01-11T10:00:00Z` |
| `País cl` | string | Sim | Código país do cliente (ISO 3166) | `AO` |
| `Nome E` | string | Sim | Nome da empresa/cliente | `Empresa ABC Lda` |

### 3. **Secções Complexas (JSON)**

Estes campos contêm JSON strings com estruturas complexas:

#### 3.1 `LINE` - Linhas do Documento

```json
[
  {
    "lineNumber": 1,
    "productCode": "MAT001",
    "productDescription": "Computador Portátil HP",
    "quantity": 5,
    "unitOfMeasure": "UN",
    "unitPrice": 10000.00,
    "unitPriceBase": 10000.00,
    "debitAmount": 50000.00,
    "taxes": [
      {
        "taxType": "IVA",
        "taxCountryRegion": "AO",
        "taxCode": "NOR",
        "taxPercentage": 14,
        "taxAmount": 7000.00,
        "taxContribution": 7000.00
      }
    ],
    "settlementAmount": 0
  }
]
```

**Campos de cada linha:**
- `lineNumber`: Número sequencial da linha
- `productCode`: Código do produto/serviço
- `productDescription`: Descrição do produto
- `quantity`: Quantidade
- `unitOfMeasure`: Unidade (UN, KG, L, HOR, etc)
- `unitPrice`: Preço unitário sem impostos
- `unitPriceBase`: Preço base (geralmente igual ao unitPrice)
- `debitAmount`: Valor total da linha (quantity × unitPrice)
- `taxes`: Array de impostos aplicados
- `settlementAmount`: Valor de liquidação (geralmente 0)

#### 3.2 `DOCUMENT_TOTALS` - Totais do Documento

```json
{
  "netTotal": 50000.00,
  "taxPayable": 7000.00,
  "grossTotal": 57000.00
}
```

**Campos:**
- `netTotal`: Total sem impostos (soma de debitAmount)
- `taxPayable`: Total de impostos (soma de taxContribution)
- `grossTotal`: Total final (netTotal + taxPayable)

#### 3.3 `PAYMENT_RECEIPT` - Recibos de Pagamento

```json
{
  "receiptNo": "RC 2025/00001",
  "receiptDate": "2025-01-11",
  "paymentMethod": "NU",
  "amount": 57000.00
}
```

**Métodos de pagamento:**
- `NU`: Numerário
- `MB`: Multibanco
- `TB`: Transferência Bancária
- `CC`: Cartão de Crédito
- `CD`: Cartão de Débito
- `CH`: Cheque
- `OU`: Outros

#### 3.4 `WITHHOLDING_TAX_LIST` - Retenções na Fonte

```json
[
  {
    "withholdingTaxType": "IRT",
    "withholdingTaxDescription": "Imposto sobre o Rendimento",
    "withholdingTaxAmount": 3500.00
  }
]
```

---

## 🔄 Compatibilidade com Formato SAP Legado

O sistema mantém compatibilidade com o formato anterior:

| Campo SAP | Campo AGT Equivalente | Notas |
|-----------|----------------------|-------|
| `VBELN` | `Nº Docum` | Convertido para formato AGT |
| `FKART` | `Tipo Doc` | Mapeado (F1→FT, F2→FS, RE→NC) |
| `FKDAT` | `Data Doc` | Convertido de YYYYMMDD para YYYY-MM-DD |
| `STCD1` | `Nº Cliente` | NIF do cliente |
| `NAME1` | `Nome E` | Nome do cliente |
| `MATNR` | `LINE[].productCode` | Código produto |
| `ARKTX` | `LINE[].productDescription` | Descrição |
| `FKIMG` | `LINE[].quantity` | Quantidade |
| `NETWR` | `LINE[].debitAmount` | Valor |

---

## 📝 Exemplo Completo (Uma Linha Excel)

```
| V Schema | Identif | TS Subm | Nº Fiscal | ... | LINE | DOCUMENT_TOTALS |
|----------|---------|---------|-----------|-----|------|-----------------|
| 1.0 | uuid-123 | 2025-01-11T10:00:00Z | 999888777 | ... | [{"lineNumber":1,...}] | {"netTotal":50000,...} |
```

---

## ✅ Validações Aplicadas

1. **NIF**: Deve ter 9 dígitos
2. **Tipo Doc**: Deve ser um dos tipos válidos (FT, FS, NC, ND, FA, FR, AR, VD, AC)
3. **Data Doc**: Formato ISO8601 (YYYY-MM-DD)
4. **País cl**: Código ISO 3166 de 2 letras
5. **LINE**: JSON válido com array de linhas
6. **DOCUMENT_TOTALS**: JSON válido com totais corretos
7. **Totais**: grossTotal = netTotal + taxPayable

---

## 🚀 Como Usar

### 1. Preparar Ficheiro Excel

Use o template `public/templates/modelo-planilha.xlsx` como base.

### 2. Preencher Dados

- **Linha 1**: Deixar em branco (reservado)
- **Linha 2**: Headers dos campos (não alterar)
- **Linha 3+**: Dados dos documentos

### 3. Importar

1. Aceder a `/facturas/importar`
2. Arrastar ficheiro para zona de upload
3. Revisar preview dos dados
4. Confirmar processamento

### 4. Verificar Resultado

O sistema irá:
- Validar todos os campos
- Converter para formato AGT interno
- Enviar para servidor AGT
- Mostrar resultado (sucesso/erros)

---

## 🔧 Processamento Interno

```typescript
// 1. Detectar formato
const isAGTFormat = row['Nº Docum'] !== undefined

// 2. Se formato AGT, parse JSON direto
if (isAGTFormat) {
  const lines = JSON.parse(row['LINE'])
  const totals = JSON.parse(row['DOCUMENT_TOTALS'])
}

// 3. Se formato SAP, converter
else {
  const lines = mapSAPToAGT(row)
}

// 4. Enviar para AGT
await registarFactura(document)
```

---

## 📌 Notas Importantes

1. **JSON válido**: Campos LINE, DOCUMENT_TOTALS, etc devem ser JSON válido
2. **Encoding**: Use UTF-8 para caracteres especiais
3. **Decimais**: Use ponto (.) como separador decimal, não vírgula
4. **Datas**: Sempre em formato ISO8601
5. **Arrays vazios**: Use `[]` não deixe vazio
6. **Objetos vazios**: Use `{}` não deixe vazio

---

## 🐛 Troubleshooting

### Erro: "Invalid JSON in LINE field"
**Solução**: Verifique se o JSON está correto. Use um validador JSON online.

### Erro: "Missing required field 'Nº Docum'"
**Solução**: Preencha o número do documento no formato correto (ex: `FT 2025/00001`)

### Erro: "Invalid NIF format"
**Solução**: NIF deve ter exatamente 9 dígitos numéricos

### Totais não batem
**Solução**: Verifique se `grossTotal = netTotal + taxPayable`

---

## 📚 Recursos

- **Template Excel**: `public/templates/modelo-planilha.xlsx`
- **Exemplo SAP**: `public/templates/exemplo_facturas_sap.csv`
- **Guia Completo**: `GUIA_IMPORTACAO_EXCEL.md`
- **Especificação AGT**: `decreto.md`

---

**Última atualização**: 11 de Janeiro de 2026
