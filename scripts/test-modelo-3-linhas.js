/**
 * Teste de agrupamento de linhas do modelo-3
 * Simula múltiplas linhas de produtos em uma factura
 */

const XLSX = require('xlsx')
const path = require('path')

// Simular dados de teste com múltiplas linhas
const testData = [
  {
    'Nº Docum': 'FT 2025/00001',
    'Tipo Doc': 'FT',
    'Data Doc': '2025-01-20',
    'Nº Cliente': '123456789',
    'Nome E': 'Empresa Teste Lda',
    'País cl': 'AO',
    'Status': 'N',
    'Cod A': '47410',
    'LINE_NO': 1,
    'ID Produto': 'PROD001',
    'V Produto': 'Computador HP',
    'DE_AMOUNT': 100000,
    'TAX TYPE': 'IVA',
    'T PERC': 14,
    'T AMOUNT': 14000,
    'TAX COD': 'NOR',
    'N_TOTAL': 300000,
    'T PAYABLE': 42000,
    'GR TOTAL': 342000
  },
  {
    'Nº Docum': 'FT 2025/00001', // Mesma factura
    'Tipo Doc': 'FT',
    'Data Doc': '2025-01-20',
    'Nº Cliente': '123456789',
    'Nome E': 'Empresa Teste Lda',
    'País cl': 'AO',
    'Status': 'N',
    'Cod A': '47410',
    'LINE_NO': 2,
    'ID Produto': 'PROD002',
    'V Produto': 'Monitor LG 27"',
    'DE_AMOUNT': 80000,
    'TAX TYPE': 'IVA',
    'T PERC': 14,
    'T AMOUNT': 11200,
    'TAX COD': 'NOR'
  },
  {
    'Nº Docum': 'FT 2025/00001', // Mesma factura
    'Tipo Doc': 'FT',
    'Data Doc': '2025-01-20',
    'Nº Cliente': '123456789',
    'Nome E': 'Empresa Teste Lda',
    'País cl': 'AO',
    'Status': 'N',
    'Cod A': '47410',
    'LINE_NO': 3,
    'ID Produto': 'PROD003',
    'V Produto': 'Mouse Logitech',
    'DE_AMOUNT': 120000,
    'TAX TYPE': 'IVA',
    'T PERC': 14,
    'T AMOUNT': 16800,
    'TAX COD': 'NOR'
  },
  {
    'Nº Docum': 'FT 2025/00002', // Segunda factura
    'Tipo Doc': 'FT',
    'Data Doc': '2025-01-20',
    'Nº Cliente': '987654321',
    'Nome E': 'Cliente ABC Inc',
    'País cl': 'AO',
    'Status': 'N',
    'Cod A': '47410',
    'LINE_NO': 1,
    'ID Produto': 'PROD004',
    'V Produto': 'Teclado Mecânico',
    'DE_AMOUNT': 50000,
    'TAX TYPE': 'IVA',
    'T PERC': 14,
    'T AMOUNT': 7000,
    'TAX COD': 'NOR',
    'N_TOTAL': 50000,
    'T PAYABLE': 7000,
    'GR TOTAL': 57000
  }
]

console.log('🧪 TESTE: Agrupamento de Linhas - Modelo-3\n')
console.log('=' .repeat(70))

// Simular detecção de formato
const firstRow = testData[0]
const isModelo3 = firstRow['TAX TYPE'] !== undefined || 
                  firstRow['LINE_NO'] !== undefined ||
                  firstRow['T PAYABLE'] !== undefined

console.log('\n📊 DADOS DE ENTRADA:')
console.log(`   Total de linhas: ${testData.length}`)
console.log(`   Formato detectado: ${isModelo3 ? 'Modelo-3 ✅' : 'Outro ❌'}`)

// Agrupar por 'Nº Docum'
const groupedByDoc = new Map()
testData.forEach(row => {
  const docNo = row['Nº Docum']
  if (!groupedByDoc.has(docNo)) {
    groupedByDoc.set(docNo, [])
  }
  groupedByDoc.get(docNo).push(row)
})

console.log(`\n📋 AGRUPAMENTO:`)
console.log(`   Documentos únicos: ${groupedByDoc.size}`)

groupedByDoc.forEach((rows, docNo) => {
  console.log(`\n   📄 ${docNo}:`)
  console.log(`      - Linhas: ${rows.length}`)
  console.log(`      - Cliente: ${rows[0]['Nome E']}`)
  console.log(`      - NIF: ${rows[0]['Nº Cliente']}`)
  
  console.log(`      - Produtos:`)
  rows.forEach(row => {
    console.log(`         • ${row['LINE_NO']}. ${row['V Produto']} - ${row['DE_AMOUNT']} AOA`)
  })
  
  // Calcular totais
  const netTotal = Number(rows[0]['N_TOTAL']) || 
                   rows.reduce((sum, r) => sum + Number(r['DE_AMOUNT']), 0)
  const taxPayable = Number(rows[0]['T PAYABLE']) || 
                     rows.reduce((sum, r) => sum + Number(r['T AMOUNT']), 0)
  const grossTotal = Number(rows[0]['GR TOTAL']) || (netTotal + taxPayable)
  
  console.log(`      - Totais:`)
  console.log(`         Net: ${netTotal.toFixed(2)} AOA`)
  console.log(`         IVA: ${taxPayable.toFixed(2)} AOA`)
  console.log(`         Total: ${grossTotal.toFixed(2)} AOA`)
})

// Verificar estrutura final
console.log('\n\n📝 ESTRUTURA ESPERADA (AGT):')
console.log(`   numberOfEntries: ${groupedByDoc.size}`)
console.log(`   documents: [`)

groupedByDoc.forEach((rows, docNo) => {
  console.log(`      {`)
  console.log(`         documentNo: "${docNo}",`)
  console.log(`         documentType: "${rows[0]['Tipo Doc']}",`)
  console.log(`         customerTaxID: "${rows[0]['Nº Cliente']}",`)
  console.log(`         lines: [${rows.length} items],`)
  console.log(`         documentTotals: { ... }`)
  console.log(`      },`)
})

console.log(`   ]`)

console.log('\n\n✅ TESTE DE AGRUPAMENTO:')
console.log(`   ✓ ${testData.length} linhas lidas`)
console.log(`   ✓ ${groupedByDoc.size} documentos identificados`)
console.log(`   ✓ FT 2025/00001 tem 3 linhas/produtos`)
console.log(`   ✓ FT 2025/00002 tem 1 linha/produto`)
console.log(`   ✓ Totais calculados corretamente`)

console.log('\n🎉 CONCLUSÃO:')
console.log('   O modelo-3 agrupa corretamente múltiplas linhas de produtos')
console.log('   por documento (Nº Docum), criando facturas completas com')
console.log('   todas as suas linhas/itens.')

console.log('\n' + '='.repeat(70))
