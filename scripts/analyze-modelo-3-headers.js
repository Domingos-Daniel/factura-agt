/**
 * Script para analisar TODOS os headers do modelo-3.xlsx
 */

const XLSX = require('xlsx')
const path = require('path')

const filePath = path.join(__dirname, '..', 'public', 'templates', 'modelo-3.xlsx')

console.log('🔍 ANÁLISE COMPLETA DOS HEADERS: modelo-3.xlsx\n')

try {
  const workbook = XLSX.readFile(filePath)
  const worksheet = workbook.Sheets[workbook.SheetNames[0]]
  
  // Ler dados raw
  const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })
  
  // Extrair headers (linha 2, índice 1, a partir da coluna B)
  const headers = rawData[1].slice(1).filter(h => h && String(h).trim())
  
  console.log(`📊 Total de headers: ${headers.length}\n`)
  console.log('📋 LISTA COMPLETA DE HEADERS:\n')
  
  headers.forEach((header, index) => {
    console.log(`${String(index + 1).padStart(2, ' ')}. "${header}"`)
  })
  
  console.log('\n\n📝 HEADERS EM FORMATO JSON:')
  console.log(JSON.stringify(headers, null, 2))
  
  console.log('\n\n💻 CÓDIGO PARA ZOD SCHEMA:')
  headers.forEach(header => {
    const cleanHeader = String(header).trim()
    console.log(`  '${cleanHeader}': z.string().optional(),`)
  })
  
} catch (error) {
  console.error('❌ ERRO:', error.message)
  process.exit(1)
}
