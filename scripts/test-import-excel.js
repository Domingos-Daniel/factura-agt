/**
 * Script de teste para importação de Excel via API
 * 
 * Este script:
 * 1. Lê o ficheiro Excel
 * 2. Parseia os dados
 * 3. Envia para a API como JSON
 */

const fs = require('fs')
const path = require('path')
const http = require('http')
const XLSX = require('xlsx')

async function testImport() {
  console.log('🧪 Teste de Importação Excel\n')
  
  const excelPath = path.join(__dirname, '../public/templates/factura-appypay-linhas.xlsx')
  
  if (!fs.existsSync(excelPath)) {
    console.error('❌ Ficheiro não encontrado:', excelPath)
    process.exit(1)
  }
  
  console.log('📁 Ficheiro:', excelPath)
  
  // Ler e parsear Excel
  console.log('\n📊 Parseando Excel...')
  const workbook = XLSX.readFile(excelPath)
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  
  // Headers estão na linha 2 (B2:...), dados na linha 4
  // Usamos range a partir de B2
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:Z100')
  range.s.r = 1 // Começar da linha 2 (0-indexed)
  range.s.c = 1 // Começar da coluna B
  
  const rows = XLSX.utils.sheet_to_json(sheet, { range: range })
  
  console.log('   Linhas encontradas:', rows.length)
  
  if (rows.length === 0) {
    console.error('❌ Nenhuma linha encontrada no Excel')
    process.exit(1)
  }
  
  // Mostrar primeira linha
  const firstRow = rows[0]
  console.log('   Primeira linha:')
  console.log('     Nº Cliente:', firstRow['Nº Cliente'])
  console.log('     Nº Docum:', firstRow['Nº Docum'])
  console.log('     LINE:', firstRow['LINE'] ? 'Presente' : 'Ausente')
  
  // Parsear linhas da primeira factura
  if (firstRow['LINE']) {
    const lines = JSON.parse(firstRow['LINE'])
    console.log('     Linhas de produto:', lines.length)
    lines.forEach((l, i) => {
      console.log(`       ${i+1}. ${l.productDescription} - ${l.quantity}x ${l.unitPrice}`)
    })
  }
  
  // Preparar dados para a API
  const testData = {
    rows: rows,
    companyNIF: firstRow['Nº Fiscal'] || '5000413178',
    companyName: 'Empresa Emissora Teste',
    seriesCode: 'FT25'
  }
  
  console.log('\n📤 Enviando para API...')
  
  const body = JSON.stringify(testData)
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/excel/process',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      }
    }
    
    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const result = JSON.parse(data)
          console.log('\n📥 Resposta da API:')
          console.log(JSON.stringify(result, null, 2))
          
          if (result.success) {
            console.log('\n✅ Importação bem sucedida!')
            console.log('   Documentos processados:', result.results?.length || 0)
            
            if (result.results?.[0]) {
              console.log('   Document ID:', result.results[0].requestID)
              console.log('   Factura ID:', result.results[0].facturaId)
            }
          } else {
            console.log('\n❌ Erro na importação:', result.error)
          }
          resolve(result)
        } catch (e) {
          console.error('Erro ao parsear resposta:', data.substring(0, 500))
          reject(e)
        }
      })
    })
    
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

testImport().catch(console.error)
