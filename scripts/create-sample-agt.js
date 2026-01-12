const XLSX = require('xlsx');

// Criar dados de exemplo
const data = [
  // Headers (linha 0)
  ['', 'V Schema', 'Identif', 'TS Subm', 'Nº Fiscal', 'A Softwa)', 'ID Produto', 'V Produto', 'Qnt Fact', 'Nº Docum', 'Nº Cliente', 'Status', 'Raz Canc', 'A Fatura', 'Data Doc', 'Tipo Doc', 'Cod A', 'Dat E S', 'País cl', 'Nome E', 'LINE', 'PAYMENT_RECEIPT', 'DOCUMENT_TOTALS', 'WITHHOLDING_TAX_LIST'],
  
  // Dados linha 1
  ['', '1.0', 'guid-001', '2025-01-11T10:00:00Z', '999888777', '', 'FacturAGT', '1.0.0', '1', 'FT 2025/00001', '123456789', 'N', '', '', '2025-01-11', 'FT', '12110', '2025-01-11T10:00:00Z', 'AO', 'Empresa ABC Lda', 
   JSON.stringify([{lineNumber: 1, productCode: 'PROD001', productDescription: 'Produto Teste', quantity: 10, unitOfMeasure: 'UN', unitPrice: 5000, unitPriceBase: 5000, debitAmount: 50000, taxes: [{taxType: 'IVA', taxCountryRegion: 'AO', taxCode: 'NOR', taxPercentage: 14, taxAmount: 7000, taxContribution: 7000}], settlementAmount: 0}]),
   '',
   JSON.stringify({netTotal: 50000, taxPayable: 7000, grossTotal: 57000}),
   ''
  ],
  
  // Dados linha 2
  ['', '1.0', 'guid-002', '2025-01-11T10:30:00Z', '999888777', '', 'FacturAGT', '1.0.0', '1', 'FT 2025/00002', '987654321', 'N', '', '', '2025-01-11', 'FT', '12110', '2025-01-11T10:30:00Z', 'AO', 'Empresa XYZ Inc',
   JSON.stringify([{lineNumber: 1, productCode: 'PROD002', productDescription: 'Serviço Consultoria', quantity: 5, unitOfMeasure: 'HOR', unitPrice: 15000, unitPriceBase: 15000, debitAmount: 75000, taxes: [{taxType: 'IVA', taxCountryRegion: 'AO', taxCode: 'NOR', taxPercentage: 14, taxAmount: 10500, taxContribution: 10500}], settlementAmount: 0}]),
   '',
   JSON.stringify({netTotal: 75000, taxPayable: 10500, grossTotal: 85500}),
   ''
  ],
];

// Criar workbook
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet(data);
XLSX.utils.book_append_sheet(wb, ws, 'Data');

// Guardar ficheiro
XLSX.writeFile(wb, 'public/templates/modelo-planilha-exemplo.xlsx');
console.log('✅ Ficheiro criado: public/templates/modelo-planilha-exemplo.xlsx');
console.log('📊 Contém 2 documentos com dados completos');
