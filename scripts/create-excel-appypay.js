/**
 * Cria arquivo Excel compatível com importação AppyPay
 * 
 * Este Excel gera facturas com múltiplas linhas de produtos
 * formatado para funcionar com o Excel Importer e AppyPay API
 */

const XLSX = require('xlsx')
const path = require('path')

// ========================================
// DADOS DE EXEMPLO - FACTURA COM 4 PRODUTOS
// ========================================

// Estrutura das linhas em JSON (formato esperado pelo sistema)
const lines = [
  {
    lineNumber: 1,
    productCode: "COMP-001",
    productDescription: "Computador Desktop Dell OptiPlex 7000",
    quantity: 2,
    unitOfMeasure: "UN",
    unitPrice: 250000,
    unitPriceBase: 250000,
    debitAmount: 500000,
    taxes: [{
      taxType: "IVA",
      taxCountryRegion: "AO",
      taxCode: "NOR",
      taxPercentage: 14,
      taxAmount: 70000,
      taxContribution: 70000
    }],
    settlementAmount: 0
  },
  {
    lineNumber: 2,
    productCode: "MON-002",
    productDescription: "Monitor LED 27 polegadas Full HD",
    quantity: 2,
    unitOfMeasure: "UN",
    unitPrice: 85000,
    unitPriceBase: 85000,
    debitAmount: 170000,
    taxes: [{
      taxType: "IVA",
      taxCountryRegion: "AO",
      taxCode: "NOR",
      taxPercentage: 14,
      taxAmount: 23800,
      taxContribution: 23800
    }],
    settlementAmount: 0
  },
  {
    lineNumber: 3,
    productCode: "TEC-003",
    productDescription: "Teclado e Mouse Wireless Logitech",
    quantity: 2,
    unitOfMeasure: "UN",
    unitPrice: 25000,
    unitPriceBase: 25000,
    debitAmount: 50000,
    taxes: [{
      taxType: "IVA",
      taxCountryRegion: "AO",
      taxCode: "NOR",
      taxPercentage: 14,
      taxAmount: 7000,
      taxContribution: 7000
    }],
    settlementAmount: 0
  },
  {
    lineNumber: 4,
    productCode: "SERV-004",
    productDescription: "Instalação e Configuração de Equipamento",
    quantity: 1,
    unitOfMeasure: "UN",
    unitPrice: 30000,
    unitPriceBase: 30000,
    debitAmount: 30000,
    taxes: [{
      taxType: "IVA",
      taxCountryRegion: "AO",
      taxCode: "NOR",
      taxPercentage: 14,
      taxAmount: 4200,
      taxContribution: 4200
    }],
    settlementAmount: 0
  }
]

// Calcular totais
const netTotal = lines.reduce((sum, line) => sum + line.debitAmount, 0)
const taxPayable = lines.reduce((sum, line) => 
  sum + line.taxes.reduce((t, tax) => t + tax.taxAmount, 0), 0)
const grossTotal = netTotal + taxPayable

const documentTotals = {
  netTotal: netTotal,
  taxPayable: taxPayable,
  grossTotal: grossTotal,
  currency: {
    currencyCode: "AOA",
    currencyAmount: grossTotal,
    exchangeRate: 1.0
  }
}

console.log('📊 Calculando totais...')
console.log(`   Net Total: ${netTotal.toLocaleString()} AOA`)
console.log(`   IVA (14%): ${taxPayable.toLocaleString()} AOA`)
console.log(`   Gross Total: ${grossTotal.toLocaleString()} AOA`)

// ========================================
// CRIAR EXCEL - FORMATO AGT COMPLETO
// ========================================

const data = [
  // Linha 1: vazia
  [],
  // Linha 2: Headers (coluna B em diante)
  ['', 'V Schema', 'Identif', 'TS Subm', 'Nº Fiscal', 'A Softwa)', 'ID Produto', 'V Produto', 'Qnt Fact', 
   'Nº Docum', 'Nº Cliente', 'Status', 'Raz Canc', 'A Fatura', 'Data Doc', 'Tipo Doc', 'Cod A', 'Dat E S', 
   'País cl', 'Nome E', 'LINE', 'DOCUMENT_TOTALS'],
  // Linha 3: vazia
  [],
  // Linha 4: Dados da factura
  ['', 
   '1.0',                                          // V Schema
   '',                                             // Identif (será gerado)
   new Date().toISOString(),                       // TS Subm
   '5000413178',                                   // Nº Fiscal (NIF empresa)
   'FacturAGT-SIGN',                               // A Softwa)
   'FacturAGT',                                    // ID Produto
   '2.0.0',                                        // V Produto
   '1',                                            // Qnt Fact
   'FT FT001/00001',                               // Nº Docum (será substituído pela série)
   '123456789',                                    // Nº Cliente (NIF cliente)
   'N',                                            // Status (N=Normal)
   '',                                             // Raz Canc
   '',                                             // A Fatura (hash)
   new Date().toISOString().split('T')[0],         // Data Doc
   'FT',                                           // Tipo Doc
   '47410',                                        // Cod A (EAC Code - comércio)
   new Date().toISOString(),                       // Dat E S
   'AO',                                           // País cl
   'Empresa Cliente Exemplo Lda',                  // Nome E
   JSON.stringify(lines),                          // LINE (JSON array)
   JSON.stringify(documentTotals)                  // DOCUMENT_TOTALS (JSON object)
  ],
]

console.log('\n📝 Criando arquivo Excel...')

const ws = XLSX.utils.aoa_to_sheet(data)

// Ajustar largura das colunas
ws['!cols'] = [
  { wch: 3 },   // A (vazia)
  { wch: 10 },  // B - V Schema
  { wch: 38 },  // C - Identif
  { wch: 20 },  // D - TS Subm
  { wch: 12 },  // E - Nº Fiscal
  { wch: 15 },  // F - A Softwa)
  { wch: 12 },  // G - ID Produto
  { wch: 10 },  // H - V Produto
  { wch: 10 },  // I - Qnt Fact
  { wch: 18 },  // J - Nº Docum
  { wch: 12 },  // K - Nº Cliente
  { wch: 8 },   // L - Status
  { wch: 10 },  // M - Raz Canc
  { wch: 15 },  // N - A Fatura
  { wch: 12 },  // O - Data Doc
  { wch: 8 },   // P - Tipo Doc
  { wch: 8 },   // Q - Cod A
  { wch: 20 },  // R - Dat E S
  { wch: 8 },   // S - País cl
  { wch: 30 },  // T - Nome E
  { wch: 100 }, // U - LINE (JSON grande)
  { wch: 60 },  // V - DOCUMENT_TOTALS
]

const wb = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb, ws, 'Facturas')

const filePath = path.join(__dirname, '..', 'public', 'templates', 'factura-appypay-linhas.xlsx')
XLSX.writeFile(wb, filePath)

console.log('✅ Arquivo criado:', filePath)
console.log('\n📋 Conteúdo da factura:')
console.log('   Tipo: FT (Factura)')
console.log('   Cliente NIF: 123456789')
console.log('   Cliente: Empresa Cliente Exemplo Lda')
console.log('\n📦 Linhas de produtos:')
lines.forEach((line, idx) => {
  console.log(`   ${idx + 1}. ${line.productDescription}`)
  console.log(`      Qtd: ${line.quantity} x ${line.unitPrice.toLocaleString()} AOA = ${line.debitAmount.toLocaleString()} AOA`)
})
console.log(`\n💰 Totais:`)
console.log(`   Subtotal: ${netTotal.toLocaleString()} AOA`)
console.log(`   IVA (14%): ${taxPayable.toLocaleString()} AOA`)
console.log(`   TOTAL: ${grossTotal.toLocaleString()} AOA`)

console.log('\n🎯 Para usar:')
console.log('   1. Aceda a /facturas/importar')
console.log('   2. Carregue este arquivo Excel')
console.log('   3. Verifique os dados e submeta')
console.log('\n💡 O campo LINE contém as 4 linhas em formato JSON')
console.log('   O campo DOCUMENT_TOTALS contém os totais calculados')
