/**
 * Teste: Processar modelo-3 com múltiplas facturas
 */

const XLSX = require('xlsx')
const path = require('path')

console.log('🧪 TESTE: Modelo-3 com 3 Facturas Diferentes\n')

const filePath = path.join(__dirname, '..', 'public', 'templates', 'modelo-3-tres-facturas.xlsx')

const workbook = XLSX.readFile(filePath)
const worksheet = workbook.Sheets[workbook.SheetNames[0]]
const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '' })

console.log(`📊 Total de linhas Excel: ${rawData.length}`)
console.log('')

// Agrupar por Nº Docum (cada número único = 1 factura)
const facturasMap = new Map()

rawData.forEach((row, idx) => {
  const docNo = row['Nº Docum']
  
  if (!docNo) {
    console.log(`⚠️  Linha ${idx + 1}: Sem número de documento, ignorando`)
    return
  }
  
  if (!facturasMap.has(docNo)) {
    facturasMap.set(docNo, {
      documentNo: docNo,
      customer: row['Nº Cliente'],
      customerName: row['Nome E'],
      documentDate: row['Data Doc'],
      documentType: row['Tipo Doc'],
      lines: []
    })
  }
  
  // Adicionar linha de produto
  facturasMap.get(docNo).lines.push({
    lineNo: row['LINE_NO'] || facturasMap.get(docNo).lines.length + 1,
    amount: row['DE_AMOUNT'] || 0
  })
})

const facturas = Array.from(facturasMap.values())

console.log(`📦 Total de facturas processadas: ${facturas.length}\n`)

facturas.forEach((factura, idx) => {
  console.log(`✅ Factura ${idx + 1}/${facturas.length}`)
  console.log(`   📄 Documento: ${factura.documentNo}`)
  console.log(`   👤 Cliente: ${factura.customer} - ${factura.customerName}`)
  console.log(`   📅 Data: ${factura.documentDate}`)
  console.log(`   📦 Linhas de produtos: ${factura.lines.length}`)
  
  factura.lines.forEach((line, i) => {
    console.log(`      ${i + 1}. Linha ${line.lineNo}: ${line.amount} AOA`)
  })
  
  console.log('')
})

console.log('📊 RESUMO:')
console.log(`   - ${rawData.length} linhas Excel lidas`)
console.log(`   - ${facturas.length} facturas processadas`)
console.log(`   - ${facturas.reduce((sum, f) => sum + f.lines.length, 0)} linhas de produtos no total`)

if (facturas.length === rawData.length) {
  console.log('\n✅ CORRETO: Cada linha Excel = 1 factura')
} else if (facturas.length === 1 && rawData.length > 1) {
  console.log('\n⚠️  ATENÇÃO: Múltiplas linhas Excel agrupadas em 1 factura')
  console.log('   Isto está correto se cada linha Excel representa um produto da mesma factura.')
} else {
  console.log('\n✅ Agrupamento por número de documento funcionando corretamente')
}
