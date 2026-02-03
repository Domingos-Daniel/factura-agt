// Script para corrigir os bugs nos payloads
const fs = require('fs');

let content = fs.readFileSync('scripts/generate-payloads-simple.js', 'utf8');

// 1. Corrigir submissionGUID para submissionUUID
content = content.replace(/submissionGUID/g, 'submissionUUID');

// 2. Adicionar unitPriceBase após unitPrice
content = content.replace(/unitPrice: formatCurrency\((\d+)\),\n(\s+)taxes:/g, 
  'unitPrice: formatCurrency($1),\n$2unitPriceBase: formatCurrency($1),\n$2taxes:');

fs.writeFileSync('scripts/generate-payloads-simple.js', content);
console.log('✓ Correções aplicadas!');
