// Teste com múltiplas facturas

const testData = {
  rows: [
    // Factura 1
    {
      'Nº Docum': 'FT 2025/00010',
      'Nº Cliente': '111111111',
      'Tipo Doc': 'FT',
      'Data Doc': '2025-01-11',
      'Nome E': 'Cliente ABC Lda',
      'LINE': JSON.stringify([{
        lineNumber: 1,
        productCode: 'PROD001',
        productDescription: 'Produto A',
        quantity: 5,
        unitOfMeasure: 'UN',
        unitPrice: 10000,
        unitPriceBase: 10000,
        debitAmount: 50000,
        taxes: [{
          taxType: 'IVA',
          taxCountryRegion: 'AO',
          taxCode: 'NOR',
          taxPercentage: 14,
          taxAmount: 7000,
          taxContribution: 7000
        }],
        settlementAmount: 0
      }]),
      'DOCUMENT_TOTALS': JSON.stringify({
        netTotal: 50000,
        taxPayable: 7000,
        grossTotal: 57000
      })
    },
    // Factura 2
    {
      'Nº Docum': 'FT 2025/00011',
      'Nº Cliente': '222222222',
      'Tipo Doc': 'FT',
      'Data Doc': '2025-01-11',
      'Nome E': 'Cliente XYZ Inc',
      'LINE': JSON.stringify([{
        lineNumber: 1,
        productCode: 'PROD002',
        productDescription: 'Produto B',
        quantity: 3,
        unitOfMeasure: 'UN',
        unitPrice: 20000,
        unitPriceBase: 20000,
        debitAmount: 60000,
        taxes: [{
          taxType: 'IVA',
          taxCountryRegion: 'AO',
          taxCode: 'NOR',
          taxPercentage: 14,
          taxAmount: 8400,
          taxContribution: 8400
        }],
        settlementAmount: 0
      }]),
      'DOCUMENT_TOTALS': JSON.stringify({
        netTotal: 60000,
        taxPayable: 8400,
        grossTotal: 68400
      })
    },
    // Factura 3
    {
      'Nº Docum': 'FT 2025/00012',
      'Nº Cliente': '333333333',
      'Tipo Doc': 'FT',
      'Data Doc': '2025-01-11',
      'Nome E': 'Cliente DEF SA',
      'LINE': JSON.stringify([{
        lineNumber: 1,
        productCode: 'PROD003',
        productDescription: 'Produto C',
        quantity: 10,
        unitOfMeasure: 'UN',
        unitPrice: 5000,
        unitPriceBase: 5000,
        debitAmount: 50000,
        taxes: [{
          taxType: 'IVA',
          taxCountryRegion: 'AO',
          taxCode: 'NOR',
          taxPercentage: 14,
          taxAmount: 7000,
          taxContribution: 7000
        }],
        settlementAmount: 0
      }]),
      'DOCUMENT_TOTALS': JSON.stringify({
        netTotal: 50000,
        taxPayable: 7000,
        grossTotal: 57000
      })
    }
  ],
  companyNIF: '999888777',
  companyName: 'Empresa Teste',
  seriesCode: 'FT25'
};

fetch('http://localhost:3000/api/excel/process', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(testData)
})
.then(res => {
  console.log('Status:', res.status);
  return res.json();
})
.then(data => {
  console.log('\n=== RESULTADO GERAL ===');
  console.log('Success:', data.success);
  console.log('Processed:', data.processed, 'linhas');
  console.log('Documents:', data.documents, 'documentos AGT');
  console.log('Total Results:', data.results.length);
  
  console.log('\n=== DETALHES POR FACTURA ===');
  data.results.forEach((result, idx) => {
    console.log(`\nFactura ${idx + 1}:`);
    console.log('  Documento:', result.documentNo);
    console.log('  Success:', result.success);
    console.log('  Request ID:', result.requestID);
    console.log('  Factura ID:', result.facturaId);
  });
})
.catch(err => {
  console.error('Error:', err);
});
