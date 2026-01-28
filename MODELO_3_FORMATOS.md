# Modelo-3: Dois Formatos de Uso

## 📋 Visão Geral

O modelo-3.xlsx suporta **dois formatos diferentes** de organização de dados:

---

## 🔹 Formato 1: Uma Linha Excel = Uma Linha de Produto

### Estrutura
- Cada linha do Excel representa **uma linha de produto**
- Linhas com mesmo `Nº Docum` são agrupadas em uma factura
- Use o campo `LINE_NO` para ordenar os produtos

### Exemplo

| Nº Docum | Cliente | Nome | LINE_NO | Produto | Valor |
|----------|---------|------|---------|---------|-------|
| FT 2025/001 | 123456789 | Empresa A | 1 | Computador | 100.000 |
| FT 2025/001 | 123456789 | Empresa A | 2 | Monitor | 80.000 |
| FT 2025/001 | 123456789 | Empresa A | 3 | Teclado | 20.000 |

**Resultado**: 3 linhas Excel → **1 factura com 3 produtos**

### Arquivo de Exemplo
📁 `modelo-3-exemplo-linhas.xlsx`

---

## 🔹 Formato 2: Uma Linha Excel = Uma Factura Completa

### Estrutura
- Cada linha do Excel representa **uma factura completa**
- Cada factura tem seu próprio `Nº Docum` único
- Linhas de produtos dentro da factura vão no campo `LINE` (JSON) ou campos expandidos

### Exemplo

| Nº Docum | Cliente | Nome | LINE_NO | Valor Total |
|----------|---------|------|---------|-------------|
| FT 2025/001 | 123456789 | Empresa A | 1 | 200.000 |
| FT 2025/002 | 987654321 | Empresa B | 1 | 150.000 |
| FT 2025/003 | 555555555 | Empresa C | 1 | 300.000 |

**Resultado**: 3 linhas Excel → **3 facturas diferentes**

### Arquivo de Exemplo
📁 `modelo-3-tres-facturas.xlsx`

---

## 🎯 Como o Sistema Detecta o Formato?

O sistema agrupa automaticamente por **`Nº Docum`**:

```javascript
// Agrupamento automático
const facturas = {}

rows.forEach(row => {
  const docNo = row['Nº Docum']
  
  if (!facturas[docNo]) {
    facturas[docNo] = {
      documentNo: docNo,
      lines: []
    }
  }
  
  facturas[docNo].lines.push({
    lineNo: row['LINE_NO'],
    amount: row['DE_AMOUNT']
  })
})
```

---

## 📊 Comparação

| Aspecto | Formato 1 (Linhas) | Formato 2 (Facturas) |
|---------|-------------------|---------------------|
| **Linhas Excel** | 3 | 3 |
| **Facturas geradas** | 1 | 3 |
| **Produtos por factura** | 3 | 1 cada |
| **`Nº Docum`** | Repetido | Único |
| **`LINE_NO`** | 1, 2, 3 | 1, 1, 1 |
| **Uso típico** | Factura com vários itens | Múltiplas facturas simples |

---

## ✅ Casos de Uso

### Formato 1 - Use quando:
- ✅ Uma factura tem múltiplos produtos
- ✅ Precisa detalhar cada item separadamente
- ✅ Vem de um sistema que exporta linha por linha
- ✅ Exemplo: Venda de equipamentos informáticos completos

### Formato 2 - Use quando:
- ✅ Cada factura tem apenas um produto
- ✅ Está importando múltiplas facturas de uma vez
- ✅ Vem de um export resumido
- ✅ Exemplo: Batch de facturas mensais

---

## 🧪 Como Testar

### Testar Formato 1 (Linhas de Produtos)
```bash
node scripts/test-modelo-3-importacao-completa.js
```
**Esperado**: 3 linhas Excel → 1 factura com 3 produtos

### Testar Formato 2 (Múltiplas Facturas)
```bash
node scripts/test-modelo-3-multiplas-facturas.js
```
**Esperado**: 3 linhas Excel → 3 facturas diferentes

---

## 📝 Campos Chave para Agrupamento

### Campos que devem ser **iguais** para agrupar em uma factura:
- ✅ `Nº Docum` - Número do documento
- ✅ `Nº Cliente` - NIF do cliente
- ✅ `Data Doc` - Data da factura
- ✅ `Tipo Doc` - Tipo de documento

### Campos que podem ser **diferentes** entre linhas:
- ✅ `LINE_NO` - Número da linha de produto
- ✅ `DE_AMOUNT` - Valor da linha
- ✅ `TAX BAS` - Base tributável da linha
- ✅ `T AMOUNT` - Imposto da linha

---

## 🎓 Exemplo Prático Completo

### Cenário: Loja de Informática

**Factura 1 - Cliente A comprou 3 itens:**

```
Linha 1: FT 2025/001 | 123456789 | LINE_NO: 1 | Computador  | 100.000 AOA
Linha 2: FT 2025/001 | 123456789 | LINE_NO: 2 | Monitor     |  80.000 AOA
Linha 3: FT 2025/001 | 123456789 | LINE_NO: 3 | Teclado     |  20.000 AOA
```
**Resultado**: 1 factura, 3 produtos, total: 200.000 AOA + IVA

**Facturas separadas - 3 clientes compraram 1 item cada:**

```
Linha 1: FT 2025/001 | 123456789 | LINE_NO: 1 | Computador  | 100.000 AOA
Linha 2: FT 2025/002 | 987654321 | LINE_NO: 1 | Computador  | 100.000 AOA
Linha 3: FT 2025/003 | 555555555 | LINE_NO: 1 | Computador  | 100.000 AOA
```
**Resultado**: 3 facturas, 1 produto cada

---

## 🚀 Upload e Processamento

Ambos os formatos são processados **automaticamente**:

1. **Upload** do arquivo via interface
2. **Detecção** automática do formato modelo-3
3. **Agrupamento** por `Nº Docum`
4. **Validação** de campos obrigatórios
5. **Conversão** para formato AGT
6. **Envio** para servidor AGT

---

## 💡 Dicas

### ✅ Boas Práticas
- Use números de documento únicos para facturas diferentes
- Preencha `LINE_NO` sequencialmente (1, 2, 3...)
- Mantenha consistência nos dados do cliente por factura
- Verifique totais antes de submeter

### ⚠️ Cuidados
- `Nº Docum` igual = mesma factura (linhas agrupadas)
- `Nº Docum` diferente = facturas separadas
- Campos vazios podem causar erros de validação
- Totais devem bater com soma das linhas

---

## 📚 Arquivos Relacionados

- [`modelo-3.xlsx`](public/templates/modelo-3.xlsx) - Template vazio
- [`modelo-3-exemplo-linhas.xlsx`](public/templates/modelo-3-exemplo-linhas.xlsx) - Formato 1
- [`modelo-3-tres-facturas.xlsx`](public/templates/modelo-3-tres-facturas.xlsx) - Formato 2
- [`MODELO_3_SUPORTE.md`](MODELO_3_SUPORTE.md) - Documentação técnica

---

**Última atualização**: 20 de Janeiro de 2026
