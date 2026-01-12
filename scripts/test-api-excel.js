// Teste rápido da API /api/excel/process

const testData = {
  rows: [
    {
      'Nº Docum': 'FT 2025/00001',
      'Nº Cliente': '123456789',
      'Tipo Doc': 'FT',
      'Data Doc': '2025-01-11',
      'Nome E': 'Cliente Teste',
      'LINE': JSON.stringify([{
        lineNumber: 1,
        productCode: 'PROD001',
        productDescription: 'Produto Teste',
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
  console.log('Response:', JSON.stringify(data, null, 2));
})
.catch(err => {
  console.error('Error:', err);
});
