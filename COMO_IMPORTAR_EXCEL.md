# 📥 Como Importar Facturas do Excel

## 🎯 Passo a Passo Rápido

### 1️⃣ Escolha o Template

Há **3 opções** disponíveis em `/facturas/importar`:

| Ficheiro | Quando Usar | Download |
|----------|-------------|----------|
| **modelo-planilha-exemplo.xlsx** | ✅ **Começar agora** (tem dados exemplo) | [📥 Baixar](/templates/modelo-planilha-exemplo.xlsx) |
| **modelo-planilha.xlsx** | Para criar do zero (vazio) | [📥 Baixar](/templates/modelo-planilha.xlsx) |
| **exemplo_facturas_sap.csv** | Formato SAP legado | [📥 Baixar](/templates/exemplo_facturas_sap.csv) |

### 2️⃣ Entenda o Ficheiro

#### Formato AGT (Recomendado)
**Ficheiro**: `modelo-planilha-exemplo.xlsx`

**Campos principais**:
- `Nº Docum`: FT 2025/00001
- `Nº Cliente`: 123456789 (NIF)
- `Tipo Doc`: FT, FS, NC, etc
- `Data Doc`: 2025-01-11
- `Nome E`: Nome do Cliente
- `LINE`: JSON com linhas do documento
- `DOCUMENT_TOTALS`: JSON com totais

**Exemplo de LINE**:
```json
[{"lineNumber": 1, "productCode": "PROD001", "productDescription": "Produto", "quantity": 10, "unitPrice": 5000, "debitAmount": 50000, "taxes": [...]}]
```

#### Formato SAP (Legado)
**Ficheiro**: `exemplo_facturas_sap.csv`

**Campos**: VBELN, FKART, FKDAT, STCD1, NAME1, MATNR, ARKTX, FKIMG, NETWR

Mais simples, sem JSON. Sistema converte automaticamente.

### 3️⃣ Preencher Dados (se usar template vazio)

1. Abrir `modelo-planilha.xlsx` no Excel
2. **Não alterar linha de headers (linha 0)**
3. Preencher dados a partir da **linha 1**
4. Salvar como `.xlsx`

**⚠️ Importante**:
- NIF deve ter 9 dígitos
- Datas em formato ISO: YYYY-MM-DD
- Campos JSON devem ser válidos
- Totais: grossTotal = netTotal + taxPayable

### 4️⃣ Importar

1. Ir para `/facturas/importar`
2. Arrastar ficheiro para zona de upload
3. Aguardar validação
4. Revisar **Preview dos Dados**
5. Confirmar configuração (NIF, Nome, Série)
6. Clicar **"✓ Processar"**

### 5️⃣ Verificar Resultado

Sistema mostrará:
- ✅ Sucesso: quantas linhas foram processadas
- ❌ Erros: detalhes do que falhou

---

## ⚠️ Problema Comum: "Linhas aparecem vazias"

Se ao carregar o ficheiro ver:

```
Preview dos Dados:
1. - FT - - - - -
2. - FT - - - - -
```

**Isso significa**:
- ✅ Você carregou o **template vazio** (`modelo-planilha.xlsx`)
- ✅ Ficheiro validou corretamente
- ❌ Mas não tem dados para processar

**Solução**:
1. Use `modelo-planilha-exemplo.xlsx` para testar **OU**
2. Preencha o template vazio com seus dados

---

## 📊 Comparação de Formatos

| Característica | Formato AGT | Formato SAP |
|----------------|-------------|-------------|
| **Complexidade** | Alta (JSON) | Baixa (CSV) |
| **Flexibilidade** | Total controle | Limitado |
| **Campos** | 24 campos AGT | 15 campos SAP |
| **Recomendado para** | Novos sistemas | Migração SAP |
| **Suporta** | Totais, Impostos, Pagamentos | Linhas básicas |

---

## 🔧 Resolução de Problemas

### Erro: "Invalid JSON in LINE field"
```
❌ Campo LINE deve ser JSON válido
✅ Copie do exemplo: modelo-planilha-exemplo.xlsx
✅ Valide em: https://jsonlint.com
```

### Erro: "Invalid NIF format"
```
❌ NIF deve ter exatamente 9 dígitos
✅ Exemplo correto: 123456789
❌ Exemplo errado: 12345678 (8 dígitos)
```

### Erro: "Totais não batem"
```
❌ grossTotal ≠ netTotal + taxPayable
✅ Recalcular: 50000 + 7000 = 57000
```

### "Valor Total: 0,00 Kz"
```
✅ Normal se:
   - Template vazio
   - DOCUMENT_TOTALS vazio
   - Não é erro
```

---

## 📚 Documentação Completa

- **FORMATO_EXCEL_AGT.md** - Todos os 24 campos detalhados
- **TEMPLATE_EXCEL_EXPLICACAO.md** - Template vazio vs exemplo
- **GUIA_IMPORTACAO_EXCEL.md** - Guia completo passo-a-passo

---

## ✅ Checklist Antes de Importar

- [ ] Ficheiro tem extensão .xlsx, .xls ou .csv
- [ ] Headers estão na linha correta (não alterados)
- [ ] NIFs têm 9 dígitos
- [ ] Datas em formato ISO (YYYY-MM-DD)
- [ ] Se formato AGT: campos JSON são válidos
- [ ] Totais batem (grossTotal = netTotal + taxPayable)
- [ ] Configuração: NIF empresa, Nome, Série preenchidos

---

**🚀 Pronto para começar? Baixe `modelo-planilha-exemplo.xlsx` e teste agora!**

---

**Última atualização**: 11 de Janeiro de 2026
