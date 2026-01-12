/**
 * Teste completo de processamento modelo-2.xlsx com detecção B2
 */

const XLSX = require('xlsx')
const path = require('path')

const filePath = path.join(__dirname, '..', 'public', 'templates', 'modelo-2.xlsx')
const workbook = XLSX.readFile(filePath)
const sheet = workbook.Sheets[workbook.SheetNames[0]]

console.log('\n=== TESTE COMPLETO modelo-2.xlsx (Formato B2) ===\n')

// Simular o que o parseExcelFile faz
const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

// Detectar formato modelo-2
const isModelo2 = rawData.length >= 2 && 
                 rawData[1] && 
                 rawData[1][0] === '' && 
                 rawData[1][1] && 
                 typeof rawData[1][1] === 'string' &&
                 (rawData[1][1].includes('Schema') || rawData[1][1].includes('Identf'))

console.log(`🔍 Formato detectado: ${isModelo2 ? '✅ modelo-2 (B2)' : '❌ padrão (A1)'}\n`)

if (isModelo2) {
  // Ler headers da linha 2 (index 1), a partir da coluna B
  const headers = rawData[1].slice(1)
  
  // Dados a partir de row 4 (index 3)
  const dataRows = rawData.slice(3)
  
  // Converter para objetos
  const jsonData = dataRows
    .filter(row => row && row.length > 1)
    .map(row => {
      const obj = {}
      const cells = row.slice(1)
      headers.forEach((header, idx) => {
        if (header && header.toString().trim()) {
          obj[header.toString().trim()] = cells[idx] !== undefined ? cells[idx] : ''
        }
      })
      return obj
    })
    .filter(obj => Object.keys(obj).length > 0)
  
  console.log(`📊 Total de linhas processadas: ${jsonData.length}\n`)
  
  // Processar cada documento
  const documents = new Map()
  
  jsonData.forEach(row => {
    const docNo = row['Nº Documento'] || row['A Fatura']
    if (!docNo) return
    
    if (!documents.has(docNo)) {
      // Extrair tipo do documento
      let tipo = row['Tipo Doc'] || 'FT'
      if (!tipo || tipo.trim() === '') {
        const match = docNo.match(/^([A-Z]{2})\s/)
        if (match) tipo = match[1]
      }
      
      documents.set(docNo, {
        documentNo: docNo,
        tipo,
        dataDoc: row['Data Doc'],
        datES: row['Dat E S'],
        nomeE: (row['Nome E'] || '').trim(),
        nif: row['Nº Fiscal'] || row['Nº Cliente'] || '999999999',
        pais: row['País cl'] || 'AO',
        linhas: []
      })
    }
    
    documents.get(docNo).linhas.push({
      idProduto: row['ID Produto'] || 'GEN001',
      produto: (row['V Produto'] || '').trim() || 'Produto Genérico',
      quantidade: row['Qnt Fact'] || 1
    })
  })
  
  console.log('📝 Documentos processados:\n')
  
  documents.forEach((doc, docNo) => {
    console.log(`${doc.tipo} ${doc.documentNo}`)
    console.log(`  📅 Data: ${doc.dataDoc} → ${parseDateModelo2(doc.dataDoc)}`)
    console.log(`  🕐 Timestamp: ${doc.datES} → ${parseTimestamp(doc.datES)}`)
    console.log(`  👤 Cliente: "${doc.nomeE}"`)
    console.log(`  🆔 NIF: ${doc.nif}`)
    console.log(`  🌍 País: ${doc.pais}`)
    console.log(`  📦 Linhas: ${doc.linhas.length}`)
    doc.linhas.forEach((linha, idx) => {
      console.log(`     ${idx + 1}. [${linha.idProduto}] ${linha.produto} (Qtd: ${linha.quantidade})`)
    })
    console.log('')
  })
  
  console.log(`✅ Total de ${documents.size} documentos processados com sucesso!`)
}

// Helper functions
function parseDateModelo2(dateStr) {
  if (!dateStr) return new Date().toISOString().split('T')[0]
  
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
    return dateStr.split('T')[0]
  }
  
  if (dateStr.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
    const [day, month, year] = dateStr.split('.')
    return `${year}-${month}-${day}`
  }
  
  if (dateStr.match(/^\d{8}$/)) {
    return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`
  }
  
  return dateStr
}

function parseTimestamp(datES) {
  if (!datES || typeof datES !== 'string' || datES.length !== 14) {
    return new Date().toISOString()
  }
  
  const year = datES.substring(0, 4)
  const month = datES.substring(4, 6)
  const day = datES.substring(6, 8)
  const hour = datES.substring(8, 10)
  const minute = datES.substring(10, 12)
  const second = datES.substring(12, 14)
  
  return `${year}-${month}-${day}T${hour}:${minute}:${second}Z`
}
