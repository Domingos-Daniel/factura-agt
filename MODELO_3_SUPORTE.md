# Suporte ao Modelo-3.xlsx

## 📋 Visão Geral

O **modelo-3.xlsx** segue o mesmo formato do modelo-2 e é totalmente compatível com o sistema de importação existente.

## 🏗️ Estrutura do Arquivo

### Layout
- **Linha 1**: Vazia
- **Linha 2**: Headers (começando na coluna B)
- **Linha 3**: Vazia
- **Linha 4+**: Dados das facturas

### Características
- Coluna A permanece vazia em todas as linhas
- Headers começam na coluna B (linha 2)
- Dados começam na linha 4
- Mesmo conjunto de campos que o modelo-2

## 📊 Campos Suportados

O modelo-3 suporta **40 campos** organizados em categorias:

### Cabeçalho do Sistema (8 campos)
- `V Schema` - Versão do schema
- `Identf` - GUID de submissão
- `TS Subm` - Timestamp de submissão
- `Nº Fiscal` - NIF da empresa emissora
- `A Softwa)` - Assinatura do software
- `ID Produto` - ID do produto software
- `V Produto` - Versão do produto
- `Qnt Fact` - Quantidade de facturas

### Dados do Documento (11 campos)
- `Nº Docum` - Número do documento (ex: FT 2025/00001)
- `Nº Cliente` - NIF do cliente
- `Status` - Status (N=Normal, A=Anulado)
- `Raz Canc` - Razão de cancelamento
- `A Fatura` - Hash/Assinatura da factura
- `Data Doc` - Data do documento
- `Tipo Doc` - Tipo (FT, FS, NC, etc)
- `Cod A` - Código EAC
- `Dat E S` - Data entrada no sistema
- `País cl` - País do cliente
- `Nome E` - Nome da empresa/cliente

### Campos de Impostos/Tax (8 campos)
- `TAX TYPE` - Tipo de imposto (IVA, IS, IEC, NS)
- `T COUN_R` - Tax Country Region
- `TAX COD` - Código do imposto
- `TAX BAS` - Base tributável
- `T PERC` - Percentagem de imposto
- `T AMOUNT` - Valor do imposto
- `T CONTR` - Contribuição do imposto
- `T EX COD` - Tax Exemption Code

### Campos de Linhas (4 campos)
- `LINE_NO` - Número da linha
- `ORIG_ON` - Original line reference
- `CR_AMOUNT` - Credit Amount
- `DE_AMOUNT` - Debit Amount

### Campos de Totais (6 campos)
- `GR TOTAL` - Gross Total
- `T PAYABLE` - Tax Payable / Total a pagar
- `N_TOTAL` - Net Total
- `CUR COD` - Currency Code
- `C_AMOUNT` - Currency Amount
- `EX_RATE` - Exchange Rate

### Campos de Retenção na Fonte (3 campos)
- `WITH T AM` - Withholding Tax Amount
- `WIT DESC` - Withholding Tax Description
- `WIT T TYPE` - Withholding Tax Type

### Secções Complexas (Opcionais - para dados JSON)
- `LINE` - Array de linhas do documento (JSON)
- `PAYMENT_RECEIPT` - Recibos de pagamento (JSON)
- `DOCUMENT_TOTALS` - Totais do documento (JSON)
- `WITHHOLDING_TAX_LIST` - Lista de retenções (JSON)

## 🔍 Detecção Automática

O parser detecta automaticamente o formato modelo-3 verificando:

1. ✅ Linha 2 (índice 1) com coluna A vazia
2. ✅ Coluna B da linha 2 contém "Schema" ou "Identf"
3. ✅ Headers começam na coluna B

```typescript
const isModelo2Or3 = rawData.length >= 2 && 
                     rawData[1] && 
                     rawData[1][0] === '' && 
                     rawData[1][1] && 
                     typeof rawData[1][1] === 'string' &&
                     (rawData[1][1].includes('Schema') || 
                      rawData[1][1].includes('Identf'))
```

## 🚀 Como Usar

### 1. Upload do Arquivo

Através da interface web:
```
/facturas → Importar Excel → Selecionar modelo-3.xlsx
```

### 2. Processamento Automático

O sistema irá:
1. ✅ Detectar automaticamente o formato modelo-3
2. ✅ Extrair headers da linha 2, coluna B
3. ✅ Processar dados a partir da linha 4
4. ✅ Converter para formato AGT
5. ✅ Validar campos obrigatórios

### 3. Logs do Sistema

Durante o processamento, verá:
```
📋 Detectado formato modelo-2/modelo-3 (headers em B2, dados a partir de linha 4)
📊 Modelo-2/3: X linhas de dados processadas
```

## 🧪 Teste de Compatibilidade

Execute o script de teste:

```bash
node scripts/test-modelo-3.js
```

Resultado esperado:
```
✅ Arquivo lido com sucesso
✅ É modelo-2/modelo-3? SIM
📊 Headers encontrados: 40
📝 Conclusão: O modelo-3.xlsx segue o mesmo formato do modelo-2
   e já é compatível com o parser atual.
```

## 📝 Exemplo de Preenchimento

| A (vazia) | B (V Schema) | C (Identf) | D (TS Subm) | E (Nº Fiscal) | F (Nº Docum) | ... | TAX TYPE | T PERC | LINE_NO |
|-----------|--------------|------------|-------------|---------------|--------------|-----|----------|--------|---------|
|           |              |            |             |               |              |     |          |        |         |
|           | 1.0          | 123456789  | 1234567890  | 912345678     | FT 2025/001  | ... | IVA      | 14     | 1       |

### Valores de Exemplo

```
V Schema: 1.0
Identf: 550e8400-e29b-41d4-a716-446655440000
TS Subm: 1705757432
Nº Fiscal: 912345678
A Softwa): ASSINATURA123ABC
ID Produto: PROD001
V Produto: 1.0.0
Qnt Fact: 1
Nº Docum: FT 2025/00001
Nº Cliente: 123456789
Status: N
Data Doc: 2025-01-20
Tipo Doc: FT
TAX TYPE: IVA
TAX COD: ISE
TAX BAS: 100000
T PERC: 14
T AMOUNT: 14000
LINE_NO: 1
DE_AMOUNT: 100000
GR TOTAL: 114000
T PAYABLE: 114000
N_TOTAL: 100000
CUR COD: AOA
```

## ⚙️ Código Relevante

### Parser Principal
- [`lib/excelParser.ts`](lib/excelParser.ts) - Detecção e parsing
- [`lib/excelMapping.ts`](lib/excelMapping.ts) - Mapeamento para AGT

### Scripts de Teste
- [`scripts/test-modelo-3.js`](scripts/test-modelo-3.js) - Teste de compatibilidade

## 🔄 Diferenças entre Modelos

| Característica | Modelo-2 | Modelo-3 | Modelo Padrão |
|----------------|----------|----------|---------------|
| Headers        | B2       | B2       | A1            |
| Dados          | Linha 4+ | Linha 4+ | Linha 2+      |
| Coluna A       | Vazia    | Vazia    | Usada         |
| Compatível     | ✅       | ✅       | ✅            |

## ✅ Status de Compatibilidade

| Funcionalidade | Status | Campos |
|----------------|--------|--------|
| Leitura de arquivo | ✅ Suportado | 40/40 |
| Detecção automática | ✅ Suportado | 100% |
| Extração de headers | ✅ Suportado | 100% |
| Processamento de dados | ✅ Suportado | 100% |
| Validação de campos | ✅ Suportado | 40/40 |
| Conversão para AGT | ✅ Suportado | 100% |
| Upload via UI | ✅ Suportado | 100% |

### ✅ Todos os 40 campos do modelo-3 estão cobertos:
- ✅ 8 campos de cabeçalho do sistema
- ✅ 11 campos de dados do documento
- ✅ 8 campos de impostos/tax
- ✅ 4 campos de linhas
- ✅ 6 campos de totais
- ✅ 3 campos de retenção na fonte

## 🎯 Conclusão

O **modelo-3.xlsx** está **totalmente suportado** pelo sistema de importação. Não são necessárias alterações de código, pois o formato é idêntico ao modelo-2 que já está implementado.

## 📚 Documentação Relacionada

- [GUIA_IMPORTACAO_EXCEL.md](GUIA_IMPORTACAO_EXCEL.md) - Guia geral de importação
- [FORMATO_EXCEL_AGT.md](FORMATO_EXCEL_AGT.md) - Formato dos campos AGT
- [MODULO_IMPORTACAO_EXCEL_TECNICO.md](MODULO_IMPORTACAO_EXCEL_TECNICO.md) - Detalhes técnicos

---

**Última atualização**: 20 de Janeiro de 2026
