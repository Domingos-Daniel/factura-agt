/**
 * Teste completo de importação modelo-3 com múltiplas linhas
 */

const XLSX = require('xlsx')
const path = require('path')

// Simular a função parseExcelFile
function parseModelo3WithLines(filePath) {
  const workbook = XLSX.readFile(filePath)
  const worksheet = workbook.Sheets[workbook.SheetNames[0]]
  
  // Ler dados raw
  const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })
  
  // A biblioteca pula linhas completamente vazias
  // No nosso caso: linha física 1 (vazia) foi pulada
  // Então: rawData[0] = linha física 2 (headers)
  // rawData[1] = linha física 3 (vazia)
  // rawData[2+] = linha física 4+ (dados)
  
  // Detectar formato modelo-2/modelo-3 (headers em rawData[0])
  const headerRow = rawData[0] || []
  const isModelo2Or3 = headerRow[0] === '' && // Coluna A vazia
                       headerRow[1] && // Coluna B tem conteúdo
                       typeof headerRow[1] === 'string' &&
                       (headerRow[1].includes('Schema') || headerRow[1].includes('Identf'))
  
  if (!isModelo2Or3) {
    throw new Error('Formato não reconhecido')
  }
  
  // Extrair headers (rawData[0], a partir de coluna B)
  const headers = headerRow.slice(1)
  
  // Extrair dados (rawData[2+], pulando a linha vazia em rawData[1])
  const dataRows = rawData.slice(2)
  
  // Converter para objetos
  const jsonData = dataRows
    .filter(row => row && row.length > 1)
    .map(row => {
      const obj = {}
      const cells = row.slice(1)
      headers.forEach((header, idx) => {
        if (header && header.trim()) {
          obj[header.trim()] = cells[idx] !== undefined ? cells[idx] : ''
        }
      })
      return obj
    })
    .filter(obj => Object.keys(obj).length > 0)
  
  return jsonData
}

// Simular agrupamento (da função excelMapping.ts)
function groupByDocument(rows) {
  const grouped = new Map()
  
  rows.forEach(row => {
    const docNo = row['Nº Docum'] || 'UNKNOWN'
    if (!grouped.has(docNo)) {
      grouped.set(docNo, [])
    }
    grouped.get(docNo).push(row)
  })
  
  return grouped
}

const filePath = path.join(__dirname, '..', 'public', 'templates', 'modelo-3-exemplo-linhas.xlsx')

console.log('🧪 TESTE COMPLETO: Importação Modelo-3 com Múltiplas Linhas\n')
console.log('=' .repeat(70))

try {
  // Fase 1: Parse
  console.log('\n📝 FASE 1: PARSING DO ARQUIVO\n')
  const rows = parseModelo3WithLines(filePath)
  console.log(`✅ Linhas lidas: ${rows.length}`)
  
  // Verificar se é modelo-3
  const firstRow = rows[0]
  const isModelo3 = firstRow['TAX TYPE'] !== undefined || 
                    firstRow['LINE_NO'] !== undefined
  console.log(`✅ Formato detectado: ${isModelo3 ? 'Modelo-3' : 'Outro'}`)
  
  // Fase 2: Agrupamento
  console.log('\n📝 FASE 2: AGRUPAMENTO POR DOCUMENTO\n')
  const grouped = groupByDocument(rows)
  console.log(`✅ Documentos únicos: ${grouped.size}`)
  
  // Fase 3: Análise detalhada
  console.log('\n📝 FASE 3: ANÁLISE DETALHADA\n')
  
  grouped.forEach((docRows, docNo) => {
    const firstRow = docRows[0]
    
    console.log(`📄 Documento: ${docNo}`)
    console.log(`   Tipo: ${firstRow['Tipo Doc']}`)
    console.log(`   Data: ${firstRow['Data Doc']}`)
    console.log(`   Cliente: ${firstRow['Nome E']} (NIF: ${firstRow['Nº Cliente']})`)
    console.log(`   Status: ${firstRow['Status']}`)
    console.log(`   Código EAC: ${firstRow['Cod A']}`)
    console.log(`   Número de linhas: ${docRows.length}`)
    console.log(`\n   📦 PRODUTOS:`)
    
    docRows.forEach(row => {
      console.log(`      ${row['LINE_NO']}. ${row['V Produto']}`)
      console.log(`         Código: ${row['ID Produto']}`)
      console.log(`         Valor: ${Number(row['DE_AMOUNT']).toLocaleString('pt-AO')} AOA`)
      console.log(`         IVA (${row['T PERC']}%): ${Number(row['T AMOUNT']).toLocaleString('pt-AO')} AOA`)
      console.log(`         Tipo imposto: ${row['TAX TYPE']} (Código: ${row['TAX COD']})`)
    })
    
    // Calcular totais
    const netTotal = Number(firstRow['N_TOTAL']) || 
                     docRows.reduce((sum, r) => sum + Number(r['DE_AMOUNT'] || 0), 0)
    const taxPayable = Number(firstRow['T PAYABLE']) || 
                       docRows.reduce((sum, r) => sum + Number(r['T AMOUNT'] || 0), 0)
    const grossTotal = Number(firstRow['GR TOTAL']) || (netTotal + taxPayable)
    
    console.log(`\n   💰 TOTAIS:`)
    console.log(`      Líquido: ${netTotal.toLocaleString('pt-AO')} AOA`)
    console.log(`      IVA: ${taxPayable.toLocaleString('pt-AO')} AOA`)
    console.log(`      Total: ${grossTotal.toLocaleString('pt-AO')} AOA`)
    console.log(`      Moeda: ${firstRow['CUR COD'] || 'AOA'}`)
    console.log(`      Taxa câmbio: ${firstRow['EX_RATE'] || '1.0'}`)
  })
  
  // Fase 4: Validação
  console.log('\n📝 FASE 4: VALIDAÇÃO\n')
  
  let allValid = true
  const validations = []
  
  // Validar campos obrigatórios
  grouped.forEach((docRows, docNo) => {
    const firstRow = docRows[0]
    
    if (!firstRow['Nº Docum']) {
      validations.push(`❌ ${docNo}: Falta 'Nº Docum'`)
      allValid = false
    } else {
      validations.push(`✅ ${docNo}: 'Nº Docum' presente`)
    }
    
    if (!firstRow['Nº Cliente']) {
      validations.push(`❌ ${docNo}: Falta 'Nº Cliente'`)
      allValid = false
    } else {
      validations.push(`✅ ${docNo}: 'Nº Cliente' presente`)
    }
    
    if (docRows.length === 0) {
      validations.push(`❌ ${docNo}: Sem linhas de produtos`)
      allValid = false
    } else {
      validations.push(`✅ ${docNo}: ${docRows.length} linha(s) de produtos`)
    }
    
    // Validar cada linha
    docRows.forEach((row, idx) => {
      if (!row['LINE_NO']) {
        validations.push(`❌ ${docNo} linha ${idx + 1}: Falta 'LINE_NO'`)
        allValid = false
      }
      if (!row['ID Produto']) {
        validations.push(`❌ ${docNo} linha ${idx + 1}: Falta 'ID Produto'`)
        allValid = false
      }
      if (!row['V Produto']) {
        validations.push(`⚠️  ${docNo} linha ${idx + 1}: Falta 'V Produto'`)
      }
    })
  })
  
  validations.forEach(v => console.log(`   ${v}`))
  
  // Conclusão
  console.log('\n📝 CONCLUSÃO\n')
  console.log('=' .repeat(70))
  
  if (allValid) {
    console.log('✅ TESTE PASSOU! Arquivo modelo-3 pronto para importação')
    console.log(`\n📊 Estatísticas:`)
    console.log(`   - Linhas lidas: ${rows.length}`)
    console.log(`   - Documentos: ${grouped.size}`)
    console.log(`   - Produtos totais: ${rows.length}`)
    console.log(`\n🎉 O modelo-3 está funcionando perfeitamente!`)
    console.log(`   Cada linha Excel representa um produto da factura.`)
    console.log(`   O sistema agrupa automaticamente por 'Nº Docum'.`)
  } else {
    console.log('❌ TESTE FALHOU! Verifique as validações acima')
  }
  
} catch (error) {
  console.error('❌ ERRO:', error.message)
  console.error(error.stack)
  process.exit(1)
}
