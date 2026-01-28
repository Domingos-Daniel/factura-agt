# 📦 Modelo-3: Múltiplas Linhas de Produtos - GUIA PRÁTICO

## ✅ Status: IMPLEMENTADO E TESTADO

O modelo-3 agora **agrupa automaticamente** múltiplas linhas de produtos por factura!

---

## 🎯 Como Funciona

### Conceito
- **Cada linha Excel = 1 produto da factura**
- Múltiplas linhas com o mesmo `Nº Docum` = 1 factura com vários produtos
- O sistema agrupa automaticamente por `Nº Docum`

### Exemplo Prático

```
| Nº Docum      | LINE_NO | ID Produto | V Produto         | DE_AMOUNT |
|---------------|---------|------------|-------------------|-----------|
| FT 2025/00001 | 1       | PROD001    | Computador HP     | 100000    |
| FT 2025/00001 | 2       | PROD002    | Monitor LG        | 80000     |
| FT 2025/00001 | 3       | PROD003    | Mouse Logitech    | 120000    |
```

**Resultado**: 1 factura com 3 linhas de produtos!

---

## 📋 Estrutura do Arquivo

### Layout Físico
```
Linha 1: Vazia (será ignorada)
Linha 2: Headers (começam na coluna B)
Linha 3: Vazia (será ignorada)
Linha 4: Produto 1 da factura 1
Linha 5: Produto 2 da factura 1
Linha 6: Produto 3 da factura 1
Linha 7: Produto 1 da factura 2
...
```

### Campos por Linha

#### Campos de Cabeçalho (repetidos em cada linha)
- `Nº Docum` - **CHAVE DE AGRUPAMENTO** ⚡
- `Tipo Doc` - Tipo do documento
- `Data Doc` - Data do documento
- `Nº Cliente` - NIF do cliente
- `Nome E` - Nome do cliente
- `Status` - Status do documento
- `Cod A` - Código EAC

#### Campos Específicos da Linha/Produto
- `LINE_NO` - Número da linha (1, 2, 3...)
- `ID Produto` - Código do produto
- `V Produto` - Descrição do produto
- `DE_AMOUNT` - Valor do produto (débito)
- `TAX TYPE` - Tipo de imposto (IVA, IS, etc)
- `T PERC` - Percentagem de imposto
- `T AMOUNT` - Valor do imposto
- `TAX COD` - Código do imposto (NOR, ISE, etc)

#### Campos de Totais (na primeira linha de cada documento)
- `N_TOTAL` - Total líquido
- `T PAYABLE` - Total de impostos
- `GR TOTAL` - Total bruto
- `CUR COD` - Código da moeda (AOA)
- `EX_RATE` - Taxa de câmbio

---

## 💡 Exemplo Completo

### Factura com 3 Produtos

```excel
| A (vazia) | Nº Docum      | Tipo Doc | Data Doc   | Cliente NIF | Cliente Nome      | LINE_NO | Produto ID | Produto Desc    | DE_AMOUNT | TAX TYPE | T PERC | T AMOUNT | N_TOTAL | T PAYABLE | GR TOTAL |
|-----------|---------------|----------|------------|-------------|-------------------|---------|------------|-----------------|-----------|----------|--------|----------|---------|-----------|----------|
|           | FT 2025/00001 | FT       | 2025-01-20 | 123456789   | Empresa Teste Lda | 1       | PROD001    | Computador HP   | 100000    | IVA      | 14     | 14000    | 300000  | 42000     | 342000   |
|           | FT 2025/00001 | FT       | 2025-01-20 | 123456789   | Empresa Teste Lda | 2       | PROD002    | Monitor LG      | 80000     | IVA      | 14     | 11200    |         |           |          |
|           | FT 2025/00001 | FT       | 2025-01-20 | 123456789   | Empresa Teste Lda | 3       | PROD003    | Mouse Logitech  | 120000    | IVA      | 14     | 16800    |         |           |          |
```

**Nota**: Os campos de totais (N_TOTAL, T_PAYABLE, GR_TOTAL) são necessários apenas na **primeira linha** de cada documento.

---

## 🚀 Como Importar

### Passo 1: Preparar o Excel

1. Baixe o template: `public/templates/modelo-3-exemplo-linhas.xlsx`
2. Preencha os dados:
   - **Mesma factura**: use o mesmo `Nº Docum` em todas as linhas
   - **Produtos diferentes**: use `LINE_NO` sequencial (1, 2, 3...)
   - **Campos de cabeçalho**: repita os mesmos valores em todas as linhas da mesma factura
   - **Totais**: preencha apenas na primeira linha

### Passo 2: Upload via UI

1. Navegue até: `/facturas/importar`
2. Selecione o arquivo Excel
3. O sistema detectará automaticamente: "Modelo-3"
4. Visualize o preview com agrupamento
5. Confirme a importação

### Passo 3: Verificar Resultado

O sistema criará documentos AGT com:
```json
{
  "documents": [
    {
      "documentNo": "FT 2025/00001",
      "lines": [
        { "lineNumber": 1, "productCode": "PROD001", ... },
        { "lineNumber": 2, "productCode": "PROD002", ... },
        { "lineNumber": 3, "productCode": "PROD003", ... }
      ],
      "documentTotals": { "grossTotal": 342000, ... }
    }
  ]
}
```

---

## 📊 Logs do Sistema

Durante a importação, verá:

```
📋 Detectado formato modelo-2/modelo-3 (headers em B2, dados a partir de linha 4)
📊 Modelo-2/3: 3 linhas de dados processadas
📋 Modelo-3: Agrupados 1 documentos de 3 linhas
✅ Modelo-3: Processados 1 documentos com total de 3 linhas
```

---

## ✅ Casos de Teste

### Caso 1: Factura com 1 Produto
```
Linhas: 1
Documentos: 1
Produtos: 1
```

### Caso 2: Factura com 3 Produtos ✅ (Testado)
```
Linhas: 3
Documentos: 1
Produtos: 3
```

### Caso 3: 2 Facturas (2 produtos + 1 produto)
```
Linhas: 3
Documentos: 2
Produtos: 3 total (2+1)
```

### Caso 4: Múltiplas Facturas com Múltiplos Produtos
```
Linhas: 10
Documentos: 3
Produtos: 10 total
```

---

## 🧪 Testes Disponíveis

Execute os testes para verificar funcionamento:

```bash
# Teste básico de agrupamento
node scripts/test-modelo-3-linhas.js

# Criar arquivo de exemplo
node scripts/create-modelo-3-exemplo-linhas.js

# Teste completo de importação
node scripts/test-modelo-3-importacao-completa.js
```

---

## 📝 Regras de Agrupamento

### ✅ Campos Obrigatórios por Documento
- `Nº Docum` - Presente em todas as linhas
- `Tipo Doc` - Presente em todas as linhas
- `Data Doc` - Presente em todas as linhas
- `Nº Cliente` - Presente em todas as linhas

### ✅ Campos Obrigatórios por Linha
- `LINE_NO` - Número sequencial
- `ID Produto` - Código do produto
- `DE_AMOUNT` - Valor da linha

### ⚡ Campo Chave
O agrupamento é feito por **`Nº Docum`**. Todas as linhas com o mesmo `Nº Docum` serão agrupadas em um único documento AGT.

---

## 💰 Cálculo de Totais

O sistema usa **duas estratégias**:

### 1. Totais Explícitos (Recomendado)
Preencha `N_TOTAL`, `T_PAYABLE`, `GR_TOTAL` na primeira linha:
```
N_TOTAL: 300000
T_PAYABLE: 42000
GR_TOTAL: 342000
```

### 2. Totais Calculados (Fallback)
Se os totais não estiverem preenchidos, o sistema calcula:
```javascript
netTotal = soma(DE_AMOUNT de todas as linhas)
taxPayable = soma(T_AMOUNT de todas as linhas)
grossTotal = netTotal + taxPayable
```

---

## 🎉 Benefícios

✅ **Múltiplos produtos por factura**  
✅ **Agrupamento automático**  
✅ **Detecção inteligente**  
✅ **Cálculo automático de totais**  
✅ **Compatível com UI existente**  
✅ **Testado e validado**  

---

## 📚 Arquivos Relacionados

- **Parser**: `lib/excelParser.ts`
- **Mapeamento**: `lib/excelMapping.ts` (função `processModelo3Format`)
- **Exemplo**: `public/templates/modelo-3-exemplo-linhas.xlsx`
- **Testes**: `scripts/test-modelo-3-*.js`

---

**Data**: 20 de Janeiro de 2026  
**Versão**: 1.0  
**Status**: ✅ Produção Ready
