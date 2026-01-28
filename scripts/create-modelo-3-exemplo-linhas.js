/**
 * Cria arquivo Excel modelo-3 de exemplo com múltiplas linhas
 */

const XLSX = require('xlsx')
const path = require('path')

// Dados de exemplo: 1 factura com 3 produtos
const data = [
  // Linha 1: vazia
  [],
  // Linha 2: Headers (começa na coluna B)
  ['', 'V Schema', 'Identf', 'TS Subm', 'Nº Fiscal', 'A Softwa)', 'ID Produto', 'V Produto', 'Qnt Fact', 
   'Nº Docum', 'Nº Cliente', 'Status', 'Raz Canc', 'A Fatura', 'Data Doc', 'Tipo Doc', 'Cod A', 'Dat E S', 
   'País cl', 'Nome E', 'TAX TYPE', 'T COUN_R', 'TAX COD', 'TAX BAS', 'T PERC', 'T AMOUNT', 'T CONTR', 
   'T EX COD', 'LINE_NO', 'ORIG_ON', 'CR_AMOUNT', 'DE_AMOUNT', 'GR TOTAL', 'T PAYABLE', 'N_TOTAL', 
   'CUR COD', 'C_AMOUNT', 'EX_RATE', 'WITH T AM', 'WIT DESC', 'WIT T TYPE'],
  // Linha 3: vazia
  [],
  // Linha 4+: Dados (produto 1)
  ['', '1.0', '550e8400-e29b-41d4-a716-446655440000', '1705757432', '5000413178', 'SIGN123', 'PROD001', 
   'Computador HP ProBook 450', '1', 'FT 2025/00001', '123456789', 'N', '', 'HASH123', '2025-01-20', 'FT', 
   '47410', '20250120100000', 'AO', 'Empresa Teste Lda', 'IVA', 'AO', 'NOR', '100000', '14', '14000', 
   '14000', '', '1', '', '0', '100000', '342000', '42000', '300000', 'AOA', '342000', '1.0', '', '', ''],
  // Produto 2 da mesma factura
  ['', '1.0', '550e8400-e29b-41d4-a716-446655440000', '1705757432', '5000413178', 'SIGN123', 'PROD002', 
   'Monitor LG 27" UltraWide', '1', 'FT 2025/00001', '123456789', 'N', '', 'HASH123', '2025-01-20', 'FT', 
   '47410', '20250120100000', 'AO', 'Empresa Teste Lda', 'IVA', 'AO', 'NOR', '80000', '14', '11200', 
   '11200', '', '2', '', '0', '80000', '342000', '42000', '300000', 'AOA', '342000', '1.0', '', '', ''],
  // Produto 3 da mesma factura
  ['', '1.0', '550e8400-e29b-41d4-a716-446655440000', '1705757432', '5000413178', 'SIGN123', 'PROD003', 
   'Mouse Logitech MX Master 3', '1', 'FT 2025/00001', '123456789', 'N', '', 'HASH123', '2025-01-20', 'FT', 
   '47410', '20250120100000', 'AO', 'Empresa Teste Lda', 'IVA', 'AO', 'NOR', '120000', '14', '16800', 
   '16800', '', '3', '', '0', '120000', '342000', '42000', '300000', 'AOA', '342000', '1.0', '', '', ''],
]

console.log('📝 Criando arquivo modelo-3-exemplo-linhas.xlsx...\n')

const ws = XLSX.utils.aoa_to_sheet(data)
const wb = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb, ws, 'Data')

const filePath = path.join(__dirname, '..', 'public', 'templates', 'modelo-3-exemplo-linhas.xlsx')
XLSX.writeFile(wb, filePath)

console.log('✅ Arquivo criado:', filePath)
console.log('\n📊 Conteúdo:')
console.log('   - 1 factura (FT 2025/00001)')
console.log('   - 3 linhas de produtos:')
console.log('      1. Computador HP ProBook 450 - 100.000 AOA')
console.log('      2. Monitor LG 27" UltraWide - 80.000 AOA')
console.log('      3. Mouse Logitech MX Master 3 - 120.000 AOA')
console.log('   - Total líquido: 300.000 AOA')
console.log('   - IVA (14%): 42.000 AOA')
console.log('   - Total: 342.000 AOA')

console.log('\n🎯 Use este arquivo para testar a importação via UI:')
console.log('   /facturas/importar')
