/**
 * Testar leitura do modelo-2.xlsx a partir de B2
 */

const XLSX = require('xlsx')
const path = require('path')

const filePath = path.join(__dirname, '..', 'public', 'templates', 'modelo-2.xlsx')
const workbook = XLSX.readFile(filePath)
const sheetName = workbook.SheetNames[0]
const sheet = workbook.Sheets[sheetName]

console.log('\n=== TESTE DE LEITURA modelo-2.xlsx (B2) ===\n')

// Ler tudo como array
const rawData = XLSX.utils.sheet_to_json(sheet, { 
  header: 1,
  defval: '',
  blankrows: false 
})

console.log('📋 Estrutura do arquivo:\n')

// Mostrar primeiras 5 linhas
for (let i = 0; i < Math.min(5, rawData.length); i++) {
  console.log(`Row ${i + 1}:`)
  const row = rawData[i]
  console.log(`  Coluna A [0]: "${row[0] || ''}"`)
  console.log(`  Coluna B [1]: "${row[1] || ''}"`)
  console.log(`  Coluna C [2]: "${row[2] || ''}"`)
  console.log(`  Total colunas: ${row.length}`)
  console.log('')
}

// Detectar formato modelo-2
const isModelo2 = rawData.length >= 2 && 
                 rawData[1] && 
                 rawData[1][0] === '' && // Coluna A vazia
                 rawData[1][1] && // Coluna B tem conteúdo
                 typeof rawData[1][1] === 'string' &&
                 (rawData[1][1].includes('Schema') || rawData[1][1].includes('Identf'))

console.log(`\n🔍 É formato modelo-2? ${isModelo2 ? '✅ SIM' : '❌ NÃO'}`)

if (isModelo2) {
  console.log('\n📊 Processando formato modelo-2...\n')
  
  // Headers a partir de B2 (row index 1, col index 1+)
  const headers = rawData[1].slice(1)
  console.log('Headers (linha 2, a partir de coluna B):')
  headers.forEach((h, idx) => {
    if (h && h.trim()) {
      console.log(`  [${idx + 1}] "${h.trim()}"`)
    }
  })
  
  // Dados a partir de row 4 (index 3)
  const dataRows = rawData.slice(3)
  console.log(`\n📄 Linhas de dados: ${dataRows.length}`)
  
  // Converter para objetos
  const jsonData = dataRows
    .filter(row => row && row.length > 1)
    .map(row => {
      const obj = {}
      const cells = row.slice(1) // Remove coluna A
      headers.forEach((header, idx) => {
        if (header && header.trim()) {
          obj[header.trim()] = cells[idx] !== undefined ? cells[idx] : ''
        }
      })
      return obj
    })
    .filter(obj => Object.keys(obj).length > 0)
  
  console.log(`📝 Objetos criados: ${jsonData.length}\n`)
  
  // Mostrar primeiro documento
  if (jsonData.length > 0) {
    console.log('Primeiro documento:')
    const doc = jsonData[0]
    console.log(`  Nº Documento: "${doc['Nº Documento']}"`)
    console.log(`  Tipo Doc: "${doc['Tipo Doc']}"`)
    console.log(`  Data Doc: "${doc['Data Doc']}"`)
    console.log(`  Nome E: "${doc['Nome E']}"`)
    console.log(`  Qnt Fact: "${doc['Qnt Fact']}"`)
    console.log(`  Dat E S: "${doc['Dat E S']}"`)
  }
  
  console.log('\n✅ Leitura a partir de B2 bem-sucedida!')
}
