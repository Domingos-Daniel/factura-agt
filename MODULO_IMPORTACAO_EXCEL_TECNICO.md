# 📦 Módulo de Importação Excel - Documentação Técnica

## 📁 Estrutura de Ficheiros Criados

```
factura-agt/
├── lib/
│   ├── excelParser.ts           ← Parser e validação com Zod
│   └── excelMapping.ts          ← Mapeamento SAP → AGT
├── components/
│   └── upload/
│       ├── ExcelUploader.tsx    ← Componente drag-drop
│       └── ExcelPreview.tsx     ← Preview e tabela dados
├── app/
│   ├── api/
│   │   └── excel/
│   │       └── process.ts       ← Endpoint POST para processar
│   └── facturas/
│       └── importar/
│           └── page.tsx         ← Página principal UI
├── public/
│   └── templates/
│       └── exemplo_facturas_sap.csv ← Ficheiro exemplo
└── GUIA_IMPORTACAO_EXCEL.md     ← Guia completo para utilizadores
```

---

## 🔧 Componentes Técnicos

### 1. **excelParser.ts** - Parser de Ficheiros Excel

**O que faz:**
- Lê ficheiro Excel (.xlsx, .xls, .csv)
- Valida cada linha com Zod schema
- Retorna dados estruturados + erros

**Funções principais:**

```typescript
// Parse ficheiro Excel com validação
parseExcelFile(file: File): Promise<ParsedExcelData>

// Retorna:
{
  success: boolean,          // Todas linhas válidas?
  rows: ExcelRow[],          // Linhas validadas
  errors: [...],             // Array de erros
  summary: {
    totalRows,               // Total linhas
    validRows,               // Linhas OK
    errorRows,               // Linhas com erro
    documentTypes,           // Mapa de tipos: {F1: 2, RE: 1}
    totalAmount              // Soma de valores
  }
}
```

**Schema Zod:**
```typescript
ExcelRowSchema = z.object({
  VBELN: z.string().optional(),          // Nº doc SAP
  FKART: z.string().optional(),          // Tipo doc
  FKDAT: z.string().optional(),          // Data (YYYYMMDD)
  STCD1: z.string().optional(),          // NIF cliente
  NAME1: z.string().optional(),          // Nome cliente
  MATNR: z.string().optional(),          // Código produto
  ARKTX: z.string().optional(),          // Descrição
  FKIMG: z.string().or(z.number()),      // Quantidade
  NETWR: z.string().or(z.number()),      // Valor
  // ... outros campos
})
```

---

### 2. **excelMapping.ts** - Mapeamento SAP → AGT

**O que faz:**
- Converte tipos documento (F1→FT, RE→NC)
- Formata datas (YYYYMMDD → ISO8601)
- Agrupa linhas por documento
- Gera documento AGT completo

**Funções principais:**

```typescript
// Mapear tipo documento
mapDocumentType(sapType: string): string
// F1 → FT, F2 → FS, RE → NC, etc

// Mapear data SAP para ISO8601
mapDate(sapDate: string): string
// 20250107 → 2025-01-07

// Converter unidade medida
mapUnit(sapUnit: string): string
// EA → UN, KG → KG, etc

// Converter linha SAP para AGT
mapExcelRowToAGTLine(
  row: ExcelRow,
  lineNumber: number,
  ivaPercentage?: number
): AGTLine

// Agrupar e converter documento completo
groupExcelRowsToAGTDocuments(
  excelRows: ExcelRow[],
  companyNIF: string,
  companyName: string,
  seriesCode: string
): AGTDocument[]
```

**Exemplo Conversão:**

```typescript
// ENTRADA (SAP)
{
  VBELN: "90000123",
  FKART: "F1",
  FKDAT: "20250107",
  STCD1: "123456789",
  NAME1: "Empresa ABC",
  MATNR: "MAT001",
  ARKTX: "Produto A",
  FKIMG: 5,
  NETWR: 50000.00
}

// SAÍDA (AGT)
{
  documentNo: "FT 2025/000156",
  documentType: "FT",
  documentDate: "2025-01-07",
  customerTaxID: "123456789",
  companyName: "Empresa ABC",
  lines: [{
    lineNumber: 1,
    productCode: "MAT001",
    productDescription: "Produto A",
    quantity: 5,
    unitOfMeasure: "UN",
    unitPrice: 10000.00,
    debitAmount: 50000.00,
    taxes: [{
      taxType: "IVA",
      taxCode: "NOR",
      taxPercentage: 14,
      taxContribution: 7000.00
    }]
  }],
  documentTotals: {
    netTotal: 50000.00,
    taxPayable: 7000.00,
    grossTotal: 57000.00
  }
}
```

---

### 3. **ExcelUploader.tsx** - Componente de Upload

**O que faz:**
- Interface drag-drop para upload
- Validação de tipo ficheiro
- Feedback visual durante parsing

**Props:**
```typescript
interface ExcelUploaderProps {
  onDataParsed: (data: ParsedExcelData) => void  // Callback
  isProcessing?: boolean                          // Estado
}
```

**Features:**
- ✅ Drag-and-drop
- ✅ Click-to-select
- ✅ Validação .xlsx/.xls/.csv
- ✅ Loading spinner
- ✅ Error handling

---

### 4. **ExcelPreview.tsx** - Preview dos Dados

**O que faz:**
- Mostra resumo (total, válidas, erros, valor)
- Tabela interativa com primeiras 5 linhas
- Detalhes dos erros dobrável
- Botões Cancelar/Processar

**Props:**
```typescript
interface ExcelPreviewProps {
  data: ParsedExcelData              // Dados parseados
  onConfirm: (rows: ExcelRow[]) => void  // Processar
  onCancel: () => void               // Cancelar
  isProcessing?: boolean
}
```

**Display:**
- Cartões de resumo (4 colunas)
- Badge com tipos documento
- Tabela com scroll horizontal
- Erros detalhados dropdown

---

### 5. **POST /api/excel/process** - Endpoint de Processamento

**O que faz:**
- Recebe linhas Excel do frontend
- Agrupa em documentos AGT
- Envia para middleware (`registarFactura`)
- Retorna resultado

**Request:**
```json
{
  "rows": [...ExcelRow],
  "companyNIF": "999888777",
  "companyName": "Empresa Angola Lda",
  "seriesCode": "FT25"
}
```

**Response (Sucesso):**
```json
{
  "success": true,
  "processed": 4,
  "documents": 3,
  "results": [
    {
      "success": true,
      "documentCount": 1,
      "response": {...AGT response}
    }
  ]
}
```

**Response (Erro):**
```json
{
  "success": false,
  "processed": 0,
  "documents": 0,
  "results": [{
    "success": false,
    "error": "Mensagem de erro"
  }]
}
```

---

### 6. **app/facturas/importar/page.tsx** - Página Principal

**O que faz:**
- Gerencia fluxo: upload → preview → processing → result
- Formulário de configuração (NIF, nome, série)
- Estados da UI

**Estados (Step):**
1. `upload` - Mostrar ExcelUploader
2. `preview` - Mostrar ExcelPreview
3. `processing` - Spinner enquanto envia para AGT
4. `result` - Mostrar resultado (sucesso/erro)

**Configuração:**
```typescript
const [companyNIF, setCompanyNIF] = useState('999888777')
const [companyName, setCompanyName] = useState('Empresa Angola Lda')
const [seriesCode, setSeriesCode] = useState('FT25')
```

---

## 🔄 Fluxo Completo

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. UTILIZADOR CARREGA FICHEIRO EXCEL                            │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. ExcelUploader.tsx - Drag-Drop & Validação                   │
│    - onDataParsed() chamado com ParsedExcelData               │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. lib/excelParser.ts - parseExcelFile()                        │
│    - Lê Excel com XLSX                                         │
│    - Valida com Zod schema                                     │
│    - Retorna {success, rows, errors, summary}                 │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. ExcelPreview.tsx - Mostra Resumo & Tabela                   │
│    - Utilizado clica "✓ Processar"                             │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. POST /api/excel/process                                      │
│    - Recebe ExcelRow[] + configuração                          │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. lib/excelMapping.ts - groupExcelRowsToAGTDocuments()        │
│    - Agrupa por VBELN                                          │
│    - Mapeia SAP → AGT                                          │
│    - Calcula totais e impostos                                 │
│    - Retorna AGTDocument[]                                     │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. lib/api.ts - registarFactura()                              │
│    - Chama /api/agt/registarFactura                            │
│    - Envia AGTDocument + assinatura                            │
│    - Recebe requestID                                          │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8. AGT Server (SIGT) - Validação & Processamento              │
│    - Valida estrutura JSON                                    │
│    - Valida NIF cliente                                       │
│    - Valida série                                             │
│    - Retorna requestID + status                               │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 9. Página - Mostra Resultado                                    │
│    - Tabela com status de cada documento                       │
│    - Link para "Ver Facturas Importadas"                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 Validações Implementadas

### Nível Parser (Zod)

```typescript
✅ STCD1 - NIF obrigatório
✅ NAME1 - Nome obrigatório
✅ MATNR - Código produto obrigatório
✅ ARKTX - Descrição obrigatório
✅ FKIMG - Quantidade numérica, ≥ 0
✅ NETWR - Valor numérico, ≥ 0
✅ FKDAT - Data formato YYYYMMDD
```

### Nível Mapeamento

```typescript
✅ Agrupa linhas por VBELN (documento)
✅ Calcula totais por documento
✅ Gera número sequencial AGT
✅ Mapeia tipos documento
✅ Formata datas ISO8601
✅ Calcula IVA automático (14%)
✅ Gera UUID v4 para submissionGUID
```

### Nível API

```typescript
✅ Valida NIF empresa (9 dígitos)
✅ Valida serie code
✅ Chamada POST a /api/agt/registarFactura
✅ Trata erros HTTP
✅ Retorna resultado estruturado
```

---

## 🚀 Como Usar (Para Desenvolvedores)

### Instalação (já feita)

Nenhuma instalação extra necessária - uses bibliotecas já presentes:
- `xlsx` - para ler Excel
- `zod` - para validação
- `react-hook-form` - para forms
- `shadcn/ui` - para componentes UI

### Usar na Aplicação

1. **Abrir página**: `/facturas/importar`
2. **Carregar Excel**
3. **Revisar preview**
4. **Confirmar processamento**

### Adicionar em Outro Local

Para adicionar upload Excel noutra página:

```tsx
import { ExcelUploader } from '@/components/upload/ExcelUploader'
import { ExcelPreview } from '@/components/upload/ExcelPreview'

export default function MyPage() {
  const [data, setData] = useState<ParsedExcelData | null>(null)
  
  return (
    <>
      {!data && <ExcelUploader onDataParsed={setData} />}
      {data && (
        <ExcelPreview
          data={data}
          onConfirm={handleConfirm}
          onCancel={() => setData(null)}
        />
      )}
    </>
  )
}
```

---

## 📊 Estatísticas

- **Ficheiros Criados**: 6
- **Linhas de Código**: ~1000
- **Componentes React**: 2
- **Funções Utilitário**: 10+
- **Validações Zod**: 15 campos
- **Estados UI**: 4 (upload, preview, processing, result)

---

## 🔐 Segurança

- ✅ Validação Zod no cliente E servidor
- ✅ Limites de tamanho ficheiro
- ✅ Assinatura JWS para comunicação AGT
- ✅ NIF validado antes envio
- ✅ HTTPS em produção

---

## 🐛 Troubleshooting

### Ficheiro não parseado
- Verifique se tem colunas STCD1, MATNR, etc
- Remova linhas em branco
- Use formato YYYYMMDD para datas

### Erro "Série não registada"
- Crie série em `/series/nova`
- Use mesmo código na importação

### Erro "NIF diferente"
- NIF deve ter 9 dígitos
- Deve estar registado em AGT
- Não confunda com NIB

---

## 📞 Próximas Melhorias

- [ ] Upload múltiplos ficheiros
- [ ] Template Excel downloadável
- [ ] Histórico de importações
- [ ] Retry automático em erro
- [ ] Exportar resultado como ficheiro
- [ ] Integração com SAP CPI direto

