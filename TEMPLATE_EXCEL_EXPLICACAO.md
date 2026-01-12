# ⚠️ IMPORTANTE: Template vs Exemplo

## 📂 Ficheiros Disponíveis

### 1. `modelo-planilha.xlsx` - Template Vazio
- **Uso**: Para criar novos documentos do zero
- **Conteúdo**: Apenas headers, sem dados
- **Quando usar**: Quando você precisa preencher manualmente

### 2. `modelo-planilha-exemplo.xlsx` - Template com Dados
- **Uso**: Para ver como preencher o ficheiro
- **Conteúdo**: Headers + 2 documentos exemplo
- **Quando usar**: Para entender o formato e testar importação

### 3. `exemplo_facturas_sap.csv` - Formato SAP Legado
- **Uso**: Compatibilidade com sistema antigo
- **Conteúdo**: Formato VBRK/VBRP SAP
- **Quando usar**: Se você tem dados exportados do SAP

---

## 🔍 Por que o Template Vazio Mostra Linhas Vazias?

Quando você carrega `modelo-planilha.xlsx` (template vazio), verá:

```
Total de Linhas: 3
Válidas: 3
Com Erros: 0
Valor Total: 0,00 Kz

Preview:
1. - FT - - - -
2. - FT - - - -
3. - FT - - - -
```

**Isso é normal!** O template contém:
- **Linha 0**: Headers (V Schema, Identif, etc)
- **Linhas 1-3**: Células vazias ou com valores placeholder

### ✅ Como Usar o Template Vazio

1. **Baixar o template**
2. **Abrir no Excel**
3. **Preencher as linhas com seus dados**:
   - Coluna `Nº Docum`: FT 2025/00001
   - Coluna `Nº Cliente`: 123456789
   - Coluna `Tipo Doc`: FT
   - Coluna `Data Doc`: 2025-01-11
   - Coluna `Nome E`: Nome do Cliente
   - Coluna `LINE`: JSON com linhas (ver exemplo abaixo)
   - Coluna `DOCUMENT_TOTALS`: JSON com totais

4. **Salvar e importar**

---

## 📝 Exemplo de Preenchimento

### Formato AGT (modelo-planilha-exemplo.xlsx)

| V Schema | Nº Docum | Nº Cliente | Tipo Doc | Data Doc | Nome E | LINE | DOCUMENT_TOTALS |
|----------|----------|------------|----------|----------|--------|------|-----------------|
| 1.0 | FT 2025/00001 | 123456789 | FT | 2025-01-11 | Empresa ABC | `[{...}]` | `{...}` |

**Campo LINE** (JSON):
```json
[
  {
    "lineNumber": 1,
    "productCode": "PROD001",
    "productDescription": "Produto Teste",
    "quantity": 10,
    "unitOfMeasure": "UN",
    "unitPrice": 5000,
    "unitPriceBase": 5000,
    "debitAmount": 50000,
    "taxes": [{
      "taxType": "IVA",
      "taxCountryRegion": "AO",
      "taxCode": "NOR",
      "taxPercentage": 14,
      "taxAmount": 7000,
      "taxContribution": 7000
    }],
    "settlementAmount": 0
  }
]
```

**Campo DOCUMENT_TOTALS** (JSON):
```json
{
  "netTotal": 50000,
  "taxPayable": 7000,
  "grossTotal": 57000
}
```

---

## 🚀 Recomendações

### Para Começar Rápido
✅ Use `modelo-planilha-exemplo.xlsx`
- Já tem dados prontos
- Pode testar a importação imediatamente
- Veja como os campos devem ser preenchidos

### Para Produção
✅ Use `modelo-planilha.xlsx` ou copie o exemplo
- Limpe os dados exemplo
- Preencha com seus dados reais
- Mantenha a estrutura dos campos JSON

### Para Compatibilidade SAP
✅ Use `exemplo_facturas_sap.csv`
- Formato VBRK/VBRP
- Mais simples (sem JSON)
- Sistema converte automaticamente

---

## 🐛 Troubleshooting

### "Todas as linhas aparecem vazias (-)"
✅ **Normal para template vazio!**
- Baixe `modelo-planilha-exemplo.xlsx` para ver com dados
- Ou preencha o template vazio com seus dados

### "Erro: Invalid JSON in LINE field"
❌ Campo LINE deve ser JSON válido
- Use o exemplo como referência
- Valide JSON em https://jsonlint.com

### "Valor Total: 0,00 Kz"
✅ Normal se:
- Template vazio
- Campos DOCUMENT_TOTALS vazios
- Não é erro, apenas não há valores

---

## 📞 Suporte

Consulte:
- **FORMATO_EXCEL_AGT.md** - Documentação completa
- **GUIA_IMPORTACAO_EXCEL.md** - Guia passo-a-passo
- **modelo-planilha-exemplo.xlsx** - Exemplo funcional

---

**Última atualização**: 11 de Janeiro de 2026
