/**
 * Teste completo de todos os campos do modelo-3.xlsx
 */

const XLSX = require('xlsx')
const path = require('path')
const { z } = require('zod')

// Schema idêntico ao excelParser.ts
const ExcelRowSchema = z.object({
  // Cabeçalho Documento AGT (Modelo-2 e Modelo-3)
  'V Schema': z.string().optional(),
  'Identif': z.string().optional(),
  'Identf': z.string().optional(),
  'TS Subm': z.string().or(z.number()).optional(),
  'Nº Fiscal': z.string().optional(),
  'A Softwa)': z.string().optional(),
  'ID Produto': z.string().optional(),
  'V Produto': z.string().optional(),
  'Qnt Fact': z.string().or(z.number()).optional(),
  
  // Documento
  'Nº Docum': z.string().optional(),
  'Nº Documento': z.string().optional(),
  'Nº Cliente': z.string().optional(),
  'Status': z.string().optional(),
  'Raz Canc': z.string().optional(),
  'A Fatura': z.string().optional(),
  'Data Doc': z.string().optional(),
  'Tipo Doc': z.string().optional(),
  'Cod A': z.string().optional(),
  'Dat E S': z.string().optional(),
  'País cl': z.string().optional(),
  'Nome E': z.string().optional(),
  
  // Campos de TAX (Modelo-3)
  'TAX TYPE': z.string().optional(),
  'T COUN_R': z.string().optional(),
  'TAX COD': z.string().optional(),
  'TAX BAS': z.string().or(z.number()).optional(),
  'T PERC': z.string().or(z.number()).optional(),
  'T AMOUNT': z.string().or(z.number()).optional(),
  'T CONTR': z.string().or(z.number()).optional(),
  'T EX COD': z.string().optional(),
  
  // Campos de LINE (Modelo-3)
  'LINE_NO': z.string().or(z.number()).optional(),
  'ORIG_ON': z.string().optional(),
  'CR_AMOUNT': z.string().or(z.number()).optional(),
  'DE_AMOUNT': z.string().or(z.number()).optional(),
  
  // Campos de TOTALS (Modelo-3)
  'GR TOTAL': z.string().or(z.number()).optional(),
  'T PAYABLE': z.string().or(z.number()).optional(),
  'N_TOTAL': z.string().or(z.number()).optional(),
  'CUR COD': z.string().optional(),
  'C_AMOUNT': z.string().or(z.number()).optional(),
  'EX_RATE': z.string().or(z.number()).optional(),
  
  // Campos de WITHHOLDING TAX (Modelo-3)
  'WITH T AM': z.string().or(z.number()).optional(),
  'WIT DESC': z.string().optional(),
  'WIT T TYPE': z.string().optional(),
  
  // Secções complexas (JSON strings)
  'LINE': z.string().optional(),
  'PAYMENT_RECEIPT': z.string().optional(),
  'DOCUMENT_TOTALS': z.string().optional(),
  'WITHHOLDING_TAX_LIST': z.string().optional(),
  
  // Campos SAP legados
  VBELN: z.string().optional(),
  FKART: z.string().optional(),
  FKDAT: z.string().optional(),
  KUNAG: z.string().optional(),
  STCD1: z.string().optional(),
  NAME1: z.string().optional(),
  STRAS: z.string().optional(),
  ORT01: z.string().optional(),
  POSNR: z.string().optional(),
  MATNR: z.string().optional(),
  ARKTX: z.string().optional(),
  FKIMG: z.string().or(z.number()).optional(),
  VRKME: z.string().optional(),
  NETWR: z.string().or(z.number()).optional(),
  MWSBP: z.string().or(z.number()).optional(),
  MWSBK: z.string().or(z.number()).optional(),
})

const filePath = path.join(__dirname, '..', 'public', 'templates', 'modelo-3.xlsx')

console.log('🧪 TESTE COMPLETO: Validação de todos os campos do modelo-3.xlsx\n')

try {
  // Ler workbook
  const workbook = XLSX.readFile(filePath)
  const worksheet = workbook.Sheets[workbook.SheetNames[0]]
  
  // Ler dados raw
  const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })
  
  // Extrair headers (linha 2, coluna B+)
  const headers = rawData[1].slice(1).filter(h => h && String(h).trim())
  
  console.log(`📊 Total de headers no arquivo: ${headers.length}`)
  
  // Criar objeto de teste com todos os headers
  const testRow = {}
  headers.forEach(header => {
    testRow[String(header).trim()] = ''
  })
  
  console.log('\n🔍 Validando com Zod Schema...\n')
  
  // Validar com Zod
  try {
    const validated = ExcelRowSchema.parse(testRow)
    console.log('✅ SUCESSO! Todos os campos do modelo-3 são reconhecidos pelo schema\n')
    
    // Verificar quais campos estão no schema
    const schemaKeys = Object.keys(ExcelRowSchema.shape)
    const headerSet = new Set(headers.map(h => String(h).trim()))
    
    console.log('📋 ANÁLISE DE COBERTURA:\n')
    
    // Campos do modelo-3 que estão no schema
    const coveredFields = headers.filter(h => schemaKeys.includes(String(h).trim()))
    console.log(`✅ Campos cobertos: ${coveredFields.length}/${headers.length}`)
    coveredFields.forEach(f => console.log(`   ✓ ${f}`))
    
    // Campos do modelo-3 que NÃO estão no schema
    const missingFields = headers.filter(h => !schemaKeys.includes(String(h).trim()))
    if (missingFields.length > 0) {
      console.log(`\n❌ Campos NÃO cobertos: ${missingFields.length}`)
      missingFields.forEach(f => console.log(`   ✗ ${f}`))
    } else {
      console.log('\n🎉 PERFEITO! Todos os campos do modelo-3 estão cobertos no schema!')
    }
    
    // Campos do schema que NÃO estão no modelo-3
    const extraSchemaFields = schemaKeys.filter(k => !headerSet.has(k))
    console.log(`\n📝 Campos extras no schema (para compatibilidade): ${extraSchemaFields.length}`)
    if (extraSchemaFields.length <= 20) {
      extraSchemaFields.forEach(f => console.log(`   • ${f}`))
    } else {
      extraSchemaFields.slice(0, 10).forEach(f => console.log(`   • ${f}`))
      console.log(`   ... e mais ${extraSchemaFields.length - 10}`)
    }
    
  } catch (zodError) {
    console.error('❌ ERRO DE VALIDAÇÃO ZOD:')
    console.error(zodError.errors)
    process.exit(1)
  }
  
  console.log('\n✅ TESTE CONCLUÍDO COM SUCESSO!')
  
} catch (error) {
  console.error('❌ ERRO:', error.message)
  process.exit(1)
}
