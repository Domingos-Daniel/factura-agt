// Script melhorado para ler modelo-2.xlsx
const XLSX = require('xlsx');

const filePath = './public/templates/modelo-2.xlsx';

try {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Ler sem header para ver a estrutura bruta
  const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  console.log('📊 ANÁLISE DO ARQUIVO modelo-2.xlsx\n');
  console.log(`Sheet: ${sheetName}`);
  console.log(`Total de linhas: ${rawData.length}\n`);
  
  console.log('📋 LINHA 1 (Headers):');
  if (rawData[0]) {
    rawData[0].forEach((cell, idx) => {
      if (cell && cell !== '') {
        console.log(`  Col ${idx + 1}: "${cell}"`);
      }
    });
  }
  
  console.log('\n📋 LINHAS DE DADOS:');
  rawData.slice(1, 6).forEach((row, idx) => {
    console.log(`\n--- LINHA ${idx + 2} ---`);
    row.forEach((cell, colIdx) => {
      if (cell && cell !== '') {
        const header = rawData[0][colIdx] || `Col${colIdx}`;
        console.log(`  ${header}: "${cell}"`);
      }
    });
  });
  
  // Tentar ler com header correto
  console.log('\n\n📄 DADOS COM HEADERS CORRETOS:\n');
  const dataWithHeaders = XLSX.utils.sheet_to_json(worksheet, { 
    range: 1, // Pular primeira linha se for header
    defval: '' 
  });
  
  console.log(JSON.stringify(dataWithHeaders.slice(0, 3), null, 2));
  
} catch (error) {
  console.error('❌ Erro ao ler arquivo:', error.message);
}
