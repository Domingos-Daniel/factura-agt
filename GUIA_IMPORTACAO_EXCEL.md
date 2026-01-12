# Guia de Importação de Facturas via Excel

## 📋 O que é o Módulo de Importação?

Este módulo permite importar facturas diretamente de um ficheiro **Excel do SAP**, mapeá-las para o formato AGT, visualizar um preview, e processá-las automaticamente para envio ao servidor da AGT.

### 🔄 Fluxo

```
Excel (SAP) → Parser → Validação Zod → Preview → Processamento → API AGT
   ↓           ↓         ↓              ↓         ↓              ↓
 VBRK/VBRP  JSON Array  Erros        Tabela    Middleware    requestID
 KONV       Grouped     Warnings     Interativa  + Assinatura  + Status
```

---

## 📁 Arquivo Excel Esperado

### Formato: VBRK/VBRP (SAP Standard)

O ficheiro deve ter as seguintes colunas (em qualquer ordem):

| Coluna | Tipo | Obrigatório | Exemplo | Descrição |
|--------|------|-------------|---------|-----------|
| **VBELN** | String | Não | 90000123 | Número documento SAP |
| **FKART** | String | Não | F1 | Tipo documento (F1=FT, F2=FS, RE=NC) |
| **FKDAT** | String | Não | 20250107 | Data emissão (YYYYMMDD) |
| **KUNAG** | String | Não | 0000012345 | Código cliente SAP |
| **STCD1** | String | Sim | 123456789 | NIF do cliente (9 dígitos) |
| **NAME1** | String | Sim | Empresa ABC Lda | Nome do cliente |
| **STRAS** | String | Não | Rua da Liberdade, 123 | Endereço |
| **ORT01** | String | Não | Luanda | Cidade |
| **POSNR** | String | Não | 000010 | Número da linha |
| **MATNR** | String | Sim | MAT001 | Código do material/produto |
| **ARKTX** | String | Sim | Computador Portátil HP | Descrição do produto |
| **FKIMG** | Number | Sim | 5 | Quantidade |
| **VRKME** | String | Não | EA | Unidade medida (EA=UN, KG=KG, etc) |
| **NETWR** | Number | Sim | 50000.00 | Valor total linha (sem imposto) |
| **MWSBP** | Number | Não | 7000.00 | Valor IVA (será calculado se omisso) |
| **MWSBK** | Number | Não | 7000.00 | Total IVA factura |

### Exemplo de Ficheiro Excel

```
VBELN      | FKART | FKDAT    | KUNAG      | STCD1     | NAME1            | MATNR   | ARKTX                  | FKIMG | VRKME | NETWR     | MWSBP
-----------|-------|----------|------------|-----------|------------------|---------|------------------------|----- -|-------|-----------|--------
90000123   | F1    | 20250107 | 0000012345 | 123456789 | Empresa ABC Lda  | MAT001  | Computador Portátil HP | 5     | EA    | 50000.00  | 7000.00
90000123   | F1    | 20250107 | 0000012345 | 123456789 | Empresa ABC Lda  | MAT002  | Monitor LG 27"         | 2     | EA    | 100000.00 | 14000.00
90000124   | F1    | 20250107 | 0000067890 | 987654321 | Empresa XYZ Inc  | MAT001  | Computador Portátil HP | 1     | EA    | 10000.00  | 1400.00
```

---

## 🚀 Como Usar

### Passo 1: Preparar o Ficheiro Excel

1. **Exportar do SAP** (ou usar ficheiro exemplo)
   - Ir a **VF03** (Listar Facturas)
   - Clicar **Documento** → **Enviar para** → **Ficheiro local** → **Folha de cálculo**
   - Escolher **Separador de Tabulação**

2. **Validar Estrutura**
   - Certifique-se que tem colunas STCD1, NAME1, MATNR, ARKTX, FKIMG, NETWR
   - Remova linhas em branco
   - Certifique-se que datas estão em formato YYYYMMDD

### Passo 2: Abrir Página de Importação

1. Navegue até **Facturas** → **Importar de Excel**
2. Ou aceda diretamente: `/facturas/importar`

### Passo 3: Carregar o Ficheiro

1. **Arrastar** o ficheiro Excel para a zona de upload, ou
2. **Clicar** e selecionar o ficheiro
3. O sistema automaticamente:
   - ✅ Lê o ficheiro
   - ✅ Valida cada linha com Zod
   - ✅ Agrupa por documento (VBELN)
   - ✅ Mapeia campos SAP → AGT

### Passo 4: Rever Preview

1. Verifique o resumo no topo:
   - Total de linhas
   - Linhas válidas
   - Linhas com erro
   - Valor total

2. Revise os **tipos de documento** detectados

3. Revise a **tabela de preview** com primeiras 5 linhas

4. Se houver erros, clique **Detalhes dos Erros** para ver quais são

5. Clique **✓ Processar X linha(s)** para enviar para AGT

### Passo 5: Processar para AGT

1. O sistema irá:
   - ✅ Converter dados SAP → formato AGT oficial
   - ✅ Gerar UUIDs e assinaturas digitais JWS
   - ✅ Enviar para servidor AGT (SIGT)
   - ✅ Receber requestID para polling de status

2. Após conclusão, verá:
   - ✅ Número de linhas processadas
   - ✅ Número de documentos criados
   - ✅ Status individual de cada documento

---

## 🔍 Entender o Preview

### Resumo (Topo)

```
┌─────────────────┬─────────────┬────────────┬──────────────────┐
│ Total de Linhas │ Válidas ✅  │ Com Erros ❌│ Valor Total      │
├─────────────────┼─────────────┼────────────┼──────────────────┤
│       3         │      3      │     0      │ 160.000,00 AOA   │
└─────────────────┴─────────────┴────────────┴──────────────────┘
```

### Tipos de Documento

```
F1: 2   F2: 1   RE: 0
(Factura: 2, Factura Simplificada: 1, Nota Crédito: 0)
```

### Tabela de Preview

| # | Documento | Tipo | Data | Cliente (NIF) | Produto | Qtd | Valor |
|---|-----------|------|------|---------------|---------|-----|-------|
| 1 | 90000123 | FT | 07/01/2025 | 123456789 | MAT001 | 5.00 | 50.000 |
| 2 | 90000123 | FT | 07/01/2025 | 123456789 | MAT002 | 2.00 | 100.000 |
| 3 | 90000124 | FT | 07/01/2025 | 987654321 | MAT001 | 1.00 | 10.000 |

### Erros

Se houver linhas com erro, clique **Detalhes dos Erros**:

```
Linha 5: Campo STCD1 - String must contain at least 1 character(s)
Linha 7: Campo NETWR - Expected number, received string
```

---

## ⚙️ Configuração (Sidebar)

Antes de processar, configure:

- **NIF da Empresa**: NIF do emissor (deve ser válido em AGT)
- **Nome da Empresa**: Nome exato da empresa
- **Código da Série**: Série a usar (ex: "FT25" ou "FT2025")

```
ℹ️ A série DEVE estar registada em AGT antes de processar!
   Se não tiver série registada, vá para Séries → Nova Série
```

---

## 🔄 Mapeamento Automático

O sistema converte automaticamente:

### Tipos de Documento

| SAP | AGT | Significado |
|-----|-----|-------------|
| F1 | FT | Factura |
| F2 | FS | Factura Simplificada |
| RE | NC | Nota de Crédito |
| ZA | FA | Factura Adiantamento |

### Unidades de Medida

| SAP | AGT | 
|-----|-----|
| EA | UN |
| PC | UN |
| KG | KG |
| L | L |

### Datas

```
Entrada: 20250107 (YYYYMMDD - SAP)
Saída: 2025-01-07 (YYYY-MM-DD - ISO8601 AGT)
```

### Impostos

- **IVA Padrão**: 14% (calculado automaticamente)
- **Base**: NETWR (valor líquido)
- **Imposto**: Base × 14% / 100

---

## ✅ Validações Implementadas

### Nível de Linha (Zod Schema)

- ✅ STCD1: String 9+ caracteres
- ✅ NAME1: String não vazio
- ✅ MATNR: String não vazio
- ✅ ARKTX: String não vazio
- ✅ FKIMG: Number ≥ 0
- ✅ NETWR: Number ≥ 0
- ✅ FKDAT: Formato YYYYMMDD

### Nível de Documento (Agrupamento)

- ✅ Agrupa por VBELN
- ✅ Calcula totais por documento
- ✅ Gera número AGT único por série

### Nível de API (Middleware)

- ✅ Valida NIF empresa (9 dígitos)
- ✅ Valida série existe em AGT
- ✅ Assinatura digital JWS RS256
- ✅ Envelope JSON conforme decreto AGT

---

## 🛠️ Troubleshooting

### Erro: "Ficheiro não é Excel"

**Solução**: Certifique-se que:
- Ficheiro tem extensão `.xlsx` ou `.xls` ou `.csv`
- Não é ficheiro ZIP mal nomeado
- Não está corrupto

### Erro: "Campo STCD1 - String must contain at least 1 character"

**Solução**: 
- A coluna STCD1 (NIF Cliente) não pode estar vazia
- Todas as linhas devem ter NIF do cliente preenchido

### Erro: "Expected number, received string"

**Solução**:
- Coluna FKIMG (Quantidade) deve ser número, não texto
- Coluna NETWR (Valor) deve ser número (ex: 50000.00)
- Não inclua símbolos de moeda (ex: "50.000,00 Kz" → "50000.00")

### Erro: "Série não registada em AGT"

**Solução**:
- A série (ex: "FT25") deve estar registada em AGT
- Vá para **Séries** → **Nova Série** para registar
- Use exatamente o mesmo código na importação

### Erro: "NIF diferente"

**Solução**:
- O NIF da empresa deve ser válido e estar registado em AGT
- Confirme que é o NIF correto
- Não confunda com NIB (Número de Identificação Bancária)

---

## 📊 Exemplo Completo

### Ficheiro Excel (3 documentos)

```
VBELN      | FKART | FKDAT    | STCD1     | NAME1              | MATNR  | ARKTX             | FKIMG | NETWR
-----------|-------|----------|-----------|-------------------|--------|-------------------|-------|----------
90000100   | F1    | 20250107 | 123456789 | Cliente A Lda      | P001   | Produto 1         | 10    | 10000.00
90000100   | F1    | 20250107 | 123456789 | Cliente A Lda      | P002   | Produto 2         | 5     | 20000.00
90000101   | F1    | 20250107 | 987654321 | Cliente B Inc      | P001   | Produto 1         | 2     | 5000.00
90000102   | NC    | 20250107 | 555666777 | Cliente C SA       | P003   | Devolução Produto | 1     | 3000.00
```

### Resultado de Processamento

```
✓ Processadas 4 linha(s) em 3 documento(s)

Documento 1: FT 2025/000156 (Cliente A - 2 linhas)
  ✓ Linhas validadas
  ✓ Total: 30.000,00 AOA
  ✓ Enviado para AGT
  ✓ requestID: AJWVK-12345678-9999

Documento 2: FT 2025/000157 (Cliente B - 1 linha)
  ✓ Total: 5.000,00 AOA
  ✓ Enviado para AGT
  ✓ requestID: AJWVK-12345679-9999

Documento 3: NC 2025/000001 (Cliente C - 1 linha)
  ✓ Total: 3.000,00 AOA
  ✓ Enviado para AGT
  ✓ requestID: AJWVK-12345680-9999

TOTAL: 38.000,00 AOA
```

---

## 💾 Ficheiro Exemplo

Pode descarregar um ficheiro Excel exemplo em:
- `/public/templates/exemplo_facturas_sap.xlsx`

Ou copiar os dados acima para um novo ficheiro Excel.

---

## 🔐 Segurança

- ✅ Validação Zod em todas as linhas
- ✅ Assinatura digital JWS RS256
- ✅ HTTPS obrigatório em produção
- ✅ NIF empresa validado
- ✅ Série validada contra AGT

---

## 📞 Suporte

Problemas?
- Verifique o **preview dos dados**
- Leia as **mensagens de erro** detalhadas
- Consulte o **Guia Completo** do sistema
- Entre em contato com TI

