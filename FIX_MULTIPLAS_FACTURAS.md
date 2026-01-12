# ✅ Correção: Múltiplas Facturas Excel

## Problema Identificado:

### ❌ **ANTES:**
- Excel com 3 facturas → processava mas salvava apenas 1
- Retornava 1 requestID para múltiplas facturas
- `groupExcelRowsToAGTDocuments()` criava 1 AGTDocument com múltiplos `documents[]` dentro
- Loop processava 1 AGTDocument → 1 requestID → 1 factura salva

### ✅ **DEPOIS:**
- Excel com 3 facturas → processa e salva 3 facturas separadas
- Retorna 1 requestID por factura
- Cada `document` dentro do AGTDocument é processado individualmente
- Loop itera sobre cada factura → N requestIDs → N facturas salvas

---

## Alterações Realizadas:

### 1. **app/api/excel/process/route.ts**

**Mudança Principal**: Loop duplo para processar cada factura individualmente

```typescript
// ANTES: Loop simples (1 AGTDocument = 1 processamento)
for (const agtDoc of agtDocuments) {
  const response = await agtClient.registarFactura(agtDoc)
  const requestID = response?.requestID
  // Salva 1 factura com N documents dentro
}

// DEPOIS: Loop duplo (1 document = 1 processamento)
for (const agtDoc of agtDocuments) {
  for (const singleDoc of agtDoc.documents) {
    // Criar AGTDocument individual
    const individualAgtDoc = {
      ...agtDoc,
      submissionGUID: generateUUID(), // Novo UUID
      numberOfEntries: 1,
      documents: [singleDoc], // Apenas 1 document
    }
    
    const response = await agtClient.registarFactura(individualAgtDoc)
    const requestID = response?.requestID
    // Salva 1 factura com 1 document
  }
}
```

**Benefícios**:
- ✅ Cada factura recebe seu próprio UUID
- ✅ Cada factura recebe seu próprio requestID do AGT
- ✅ Cada factura é salva separadamente no JSON
- ✅ Se uma falhar, outras continuam

---

### 2. **app/facturas/importar/page.tsx**

**UI Melhorada**: Exibe detalhes de cada factura processada

```tsx
// Antes: "3 linhas processadas em 1 documento"
✓ {result.processed} linha(s) processadas em {result.documents} documento(s)!

// Depois: "3 factura(s) processadas com sucesso"
✓ {result.results.length} factura(s) processada(s) com sucesso de {result.processed} linha(s) Excel!
```

**Detalhes por Factura**:
```tsx
✓ Factura 1/3 [FT 2025/00010]
  🎫 Request ID: AGT-20260111-50d9d5e4
  🆔 Factura ID: 5b6bd9e6-55b4-4d26-badd-a2a5dc217fae

✓ Factura 2/3 [FT 2025/00011]
  🎫 Request ID: AGT-20260111-361b67ad
  🆔 Factura ID: 152050a0-5ca5-40fb-ae7a-60fbc9bbae7d

✓ Factura 3/3 [FT 2025/00012]
  🎫 Request ID: AGT-20260111-513614bc
  🆔 Factura ID: 293764be-1212-4ff6-8f26-1ef03f2306da
```

---

## Teste Realizado:

### Entrada: 3 linhas Excel (3 facturas diferentes)

```javascript
{
  rows: [
    { 'Nº Docum': 'FT 2025/00010', 'Nº Cliente': '111111111', ... },
    { 'Nº Docum': 'FT 2025/00011', 'Nº Cliente': '222222222', ... },
    { 'Nº Docum': 'FT 2025/00012', 'Nº Cliente': '333333333', ... }
  ]
}
```

### Resultado API:

```json
{
  "success": true,
  "processed": 3,
  "documents": 1,
  "results": [
    {
      "success": true,
      "documentNo": "FT 2025/00010",
      "requestID": "AGT-20260111-50d9d5e4",
      "facturaId": "5b6bd9e6-55b4-4d26-badd-a2a5dc217fae"
    },
    {
      "success": true,
      "documentNo": "FT 2025/00011",
      "requestID": "AGT-20260111-361b67ad",
      "facturaId": "152050a0-5ca5-40fb-ae7a-60fbc9bbae7d"
    },
    {
      "success": true,
      "documentNo": "FT 2025/00012",
      "requestID": "AGT-20260111-513614bc",
      "facturaId": "293764be-1212-4ff6-8f26-1ef03f2306da"
    }
  ]
}
```

### Facturas Salvas no JSON:

```bash
$ cat data/facturas.json | jq 'length'
9  # Total facturas (6 anteriores + 3 novas)

$ cat data/facturas.json | jq '.[-3:] | .[] | {id, requestID, doc: .documents[0].documentNo}'
{
  "id": "5b6bd9e6-55b4-4d26-badd-a2a5dc217fae",
  "requestID": "AGT-20260111-50d9d5e4",
  "doc": "FT 2025/00010"
}
{
  "id": "152050a0-5ca5-40fb-ae7a-60fbc9bbae7d",
  "requestID": "AGT-20260111-361b67ad",
  "doc": "FT 2025/00011"
}
{
  "id": "293764be-1212-4ff6-8f26-1ef03f2306da",
  "requestID": "AGT-20260111-513614bc",
  "doc": "FT 2025/00012"
}
```

✅ **3 linhas Excel → 3 facturas salvas → 3 requestIDs**

---

## Fluxo Completo:

```
┌─────────────────────┐
│ Excel: 3 linhas     │
│ FT 2025/00010       │
│ FT 2025/00011       │
│ FT 2025/00012       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ excelParser.ts      │
│ Parse & Validate    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ excelMapping.ts     │
│ Group by Nº Docum   │
│ → 1 AGTDocument     │
│   with 3 documents  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────┐
│ route.ts - Loop Duplo               │
│ for agtDoc in agtDocuments:         │
│   for doc in agtDoc.documents:      │
│     1. Create individual AGTDoc     │
│     2. Send to AGT → requestID      │
│     3. Save to JSON                 │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────┐
│ AGT Mock Service    │
│ 3 chamadas          │
│ 3 requestIDs        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ data/facturas.json  │
│ 3 facturas salvas   │
│ cada uma com:       │
│ - UUID único        │
│ - requestID único   │
│ - 1 document        │
└─────────────────────┘
```

---

## Casos de Uso Cobertos:

### ✅ Caso 1: Excel com 1 factura
```
Input: 1 linha
Output: 1 factura, 1 requestID
JSON: +1 entrada
```

### ✅ Caso 2: Excel com múltiplas facturas
```
Input: N linhas
Output: N facturas, N requestIDs
JSON: +N entradas
```

### ✅ Caso 3: Excel com factura multi-linha
```
Input: 2 linhas com mesmo Nº Docum
Output: 1 factura com 2 lines[], 1 requestID
JSON: +1 entrada com 2 lines
```

### ✅ Caso 4: Erro em factura específica
```
Input: 3 linhas
Factura 2 falha
Output: 
  - Factura 1: ✓ requestID-1
  - Factura 2: ✗ Erro
  - Factura 3: ✓ requestID-3
JSON: +2 entradas (1 e 3)
Status: 207 Multi-Status
```

---

## Arquivos Modificados:

1. ✅ `app/api/excel/process/route.ts`
   - Loop duplo para processar individualmente
   - Criação de UUID único por factura
   - Retorno de requestID por factura
   
2. ✅ `app/facturas/importar/page.tsx`
   - UI mostra N factura(s) processada(s)
   - Detalhes incluem documentNo
   - Exibe requestID e facturaId de cada
   
3. ✅ `scripts/test-multiple-facturas.js`
   - Script de teste com 3 facturas
   - Validação de resultados

---

## Resultado Final:

🎯 **PROBLEMA RESOLVIDO!**

- ✅ Cada factura Excel recebe processamento individual
- ✅ Cada factura recebe requestID único do AGT
- ✅ Todas as facturas são salvas no JSON
- ✅ UI exibe requestID de cada factura processada
- ✅ Rastreamento completo: linha Excel → factura → requestID

**Status**: 🟢 FUNCIONANDO PERFEITAMENTE
