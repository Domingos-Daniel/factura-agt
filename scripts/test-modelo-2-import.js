/**
 * Script para testar o import do formato modelo-2.xlsx
 */

const XLSX = require('xlsx')
const path = require('path')

// Ler arquivo modelo-2.xlsx
const filePath = path.join(__dirname, '..', 'public', 'templates', 'modelo-2.xlsx')
const workbook = XLSX.readFile(filePath)
const sheetName = workbook.SheetNames[0]
const sheet = workbook.Sheets[sheetName]

// Ler com header na row 2 (índice 1)
const data = XLSX.utils.sheet_to_json(sheet, { 
  header: 1,
  defval: '',
  blankrows: false 
})

console.log('\n=== TESTE DE IMPORT MODELO-2 ===\n')
console.log('Total de linhas:', data.length)

// Row 0: vazio
// Row 1: Field names
// Row 2: vazio
// Row 3+: Data

if (data.length < 4) {
  console.log('❌ Arquivo não tem dados suficientes')
  process.exit(1)
}

const headers = data[1] // Row 2 (índice 1)
console.log('\n📋 Headers (Row 2):')
headers.forEach((h, idx) => {
  if (h && h.trim()) {
    console.log(`  [${idx}] "${h.trim()}"`)
  }
})

// Função para encontrar índice por nome (case-insensitive, trim)
function findIndex(needle) {
  return headers.findIndex(h => 
    h && h.toString().trim().toLowerCase() === needle.toLowerCase()
  )
}

// Pegar índices dos campos importantes
const indexes = {
  'V Schema': findIndex('V Schema'),
  'Identif': findIndex('Identf'),
  'Nº Documento': findIndex('Nº Documento'),
  'Tipo Doc': findIndex('Tipo Doc'),
  'Data Doc': findIndex('Data Doc'),
  'Dat E S': findIndex('Dat E S'),
  'Nome E': findIndex('Nome E'),
  'Nº Fiscal': findIndex('Nº Fiscal'),
  'Qnt Fact': findIndex('Qnt Fact'),
  'ID Produto': findIndex('ID Produto'),
  'V Produto': findIndex('V Produto'),
  'País cl': findIndex('País cl'),
}

console.log('\n📌 Índices dos campos:')
Object.entries(indexes).forEach(([field, idx]) => {
  console.log(`  ${field}: ${idx}`)
})

// Processar data rows (a partir de row 3, índice 3)
console.log('\n📄 Documentos encontrados:\n')

const documents = new Map()

for (let i = 3; i < data.length; i++) {
  const row = data[i]
  
  // Debug: mostrar primeira linha
  if (i === 3) {
    console.log('🔍 DEBUG - Primeira linha de dados (row 4):')
    row.forEach((val, idx) => {
      if (val) console.log(`  [${idx}] ${headers[idx]}: "${val}"`)
    })
    console.log('')
  }
  
  const docNo = row[indexes['Nº Documento']]
  const tipo = row[indexes['Tipo Doc']]
  const dataDoc = row[indexes['Data Doc']]
  const datES = row[indexes['Dat E S']]
  const nomeE = row[indexes['Nome E']]
  const nifFiscal = row[indexes['Nº Fiscal']]
  const paisCl = row[indexes['País cl']]
  const produto = row[indexes['V Produto']]
  const qntFact = row[indexes['Qnt Fact']]
  const idProduto = row[indexes['ID Produto']]
  
  if (!docNo) continue // Skip linhas vazias
  
  if (!documents.has(docNo)) {
    documents.set(docNo, {
      docNo,
      tipo,
      dataDoc,
      datES,
      nomeE: (nomeE || '').trim(),
      nifFiscal,
      paisCl,
      linhas: []
    })
  }
  
  documents.get(docNo).linhas.push({
    idProduto: (idProduto || '').trim(),
    produto: (produto || '').trim(),
    quantidade: qntFact
  })
}

documents.forEach((doc, docNo) => {
  console.log(`📝 ${doc.tipo} ${docNo}`)
  console.log(`   Cliente: "${doc.nomeE}"`)
  console.log(`   NIF: ${doc.nifFiscal}`)
  console.log(`   País: ${doc.paisCl}`)
  console.log(`   Data: ${doc.dataDoc} → ${parseDateModelo2(doc.dataDoc)}`)
  console.log(`   Timestamp: ${doc.datES} → ${parseTimestamp(doc.datES)}`)
  console.log(`   Linhas: ${doc.linhas.length}`)
  doc.linhas.forEach((linha, idx) => {
    console.log(`     ${idx + 1}. [${linha.idProduto}] ${linha.produto} (Qtd: ${linha.quantidade})`)
  })
  console.log('')
})

console.log(`✅ Total de documentos: ${documents.size}`)

// Helper functions
function parseDateModelo2(dateStr) {
  if (!dateStr) return new Date().toISOString().split('T')[0]
  
  // dd.mm.yyyy
  if (dateStr.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
    const [day, month, year] = dateStr.split('.')
    return `${year}-${month}-${day}`
  }
  
  return dateStr
}

function parseTimestamp(datES) {
  if (!datES || typeof datES !== 'string' || datES.length !== 14) {
    return new Date().toISOString()
  }
  
  // yyyymmddhhmmss
  const year = datES.substring(0, 4)
  const month = datES.substring(4, 6)
  const day = datES.substring(6, 8)
  const hour = datES.substring(8, 10)
  const minute = datES.substring(10, 12)
  const second = datES.substring(12, 14)
  
  return `${year}-${month}-${day}T${hour}:${minute}:${second}Z`
}
