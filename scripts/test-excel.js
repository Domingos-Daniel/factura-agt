const XLSX = require('xlsx');

const wb = XLSX.readFile('public/templates/modelo-planilha.xlsx');
console.log('Sheet names:', wb.SheetNames);

const ws = wb.Sheets[wb.SheetNames[0]];
console.log('Range:', ws['!ref']);

// Ler como array
const jsonArray = XLSX.utils.sheet_to_json(ws, {header: 1, defval: ''});
console.log('\nTotal rows:', jsonArray.length);

// Mostrar primeiras 5 linhas
for (let i = 0; i < Math.min(5, jsonArray.length); i++) {
  const nonEmpty = jsonArray[i].filter(c => c !== '');
  console.log(`Row ${i}:`, nonEmpty.length > 0 ? nonEmpty.slice(0, 5) : '[empty]');
}

// Ler como objeto (com headers)
console.log('\n--- Reading as objects ---');
const jsonObjects = XLSX.utils.sheet_to_json(ws);
console.log('Total objects:', jsonObjects.length);
console.log('First object keys:', Object.keys(jsonObjects[0] || {}));
console.log('First object:', JSON.stringify(jsonObjects[0], null, 2));
