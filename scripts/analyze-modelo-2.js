// Script para ler e analisar modelo-2.xlsx
const XLSX = require('xlsx');

const filePath = './public/templates/modelo-2.xlsx';

try {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Converter para JSON
  const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  
  console.log('📊 ANÁLISE DO ARQUIVO modelo-2.xlsx\n');
  console.log(`Sheet: ${sheetName}`);
  console.log(`Total de linhas: ${data.length}\n`);
  
  if (data.length > 0) {
    console.log('📋 CABEÇALHOS (Primeira linha):');
    const headers = Object.keys(data[0]);
    headers.forEach((header, idx) => {
      console.log(`  ${idx + 1}. "${header}"`);
    });
    
    console.log('\n📄 AMOSTRA DE DADOS (Primeiras 3 linhas):\n');
    data.slice(0, 3).forEach((row, idx) => {
      console.log(`--- LINHA ${idx + 1} ---`);
      Object.entries(row).forEach(([key, value]) => {
        if (value && value !== '') {
          console.log(`  ${key}: ${JSON.stringify(value)}`);
        }
      });
      console.log('');
    });
    
    console.log('\n📊 ESTRUTURA COMPLETA (JSON):');
    console.log(JSON.stringify(data.slice(0, 2), null, 2));
  } else {
    console.log('⚠️ Arquivo vazio ou sem dados');
  }
  
} catch (error) {
  console.error('❌ Erro ao ler arquivo:', error.message);
}
