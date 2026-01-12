/**
 * Debug detalhado do modelo-2.xlsx
 */

const XLSX = require('xlsx')
const path = require('path')

const filePath = path.join(__dirname, '..', 'public', 'templates', 'modelo-2.xlsx')
const workbook = XLSX.readFile(filePath)
const sheet = workbook.Sheets[workbook.SheetNames[0]]

const rawData = XLSX.utils.sheet_to_json(sheet, { 
  header: 1,
  defval: '',
  blankrows: false 
})

console.log('\n=== DEBUG DETALHADO modelo-2.xlsx ===\n')

// Headers da linha 2 (index 1), a partir da coluna B (index 1)
const headers = rawData[1].slice(1)

console.log('📋 Todos os headers:')
headers.forEach((h, idx) => {
  console.log(`  Col ${String.fromCharCode(66 + idx)} [${idx}]: "${h}"`)
})

// Primeira linha de dados (row 4, index 3)
console.log('\n📄 Primeira linha de dados (row 4):')
const firstDataRow = rawData[3]
if (firstDataRow) {
  const cells = firstDataRow.slice(1)
  headers.forEach((header, idx) => {
    if (header) {
      const value = cells[idx] !== undefined ? cells[idx] : ''
      console.log(`  ${header.trim()}: "${value}"`)
    }
  })
}

// Criar objeto da primeira linha
console.log('\n🔍 Objeto criado da primeira linha:')
const obj = {}
const cells = firstDataRow.slice(1)
headers.forEach((header, idx) => {
  if (header && header.toString().trim()) {
    obj[header.toString().trim()] = cells[idx] !== undefined ? cells[idx] : ''
  }
})

Object.entries(obj).forEach(([key, value]) => {
  console.log(`  "${key}": "${value}"`)
})

console.log('\n✅ Debug completo')
