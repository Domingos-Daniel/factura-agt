/**
 * DEMONSTRAÇÃO - Visualizar dados do repositório
 */

const fs = require('fs');
const path = require('path');

const STORAGE_FILE = path.join(__dirname, '..', 'data', 'storage', 'facturas.json');

console.log('\n' + '='.repeat(80));
console.log('📊 DEMONSTRAÇÃO - DADOS NO REPOSITÓRIO DE FACTURAS');
console.log('='.repeat(80) + '\n');

if (!fs.existsSync(STORAGE_FILE)) {
  console.log('⚠️  Arquivo não encontrado. Execute primeiro: node scripts/test-repository.js\n');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(STORAGE_FILE, 'utf-8'));

// Metadata
console.log('📋 METADATA:');
console.log(`  • Última atualização: ${data.metadata.lastUpdated}`);
console.log(`  • Versão: ${data.metadata.version}`);
console.log(`  • Total de operações: ${data.metadata.totalOperations}\n`);

// Facturas
console.log('📄 FACTURAS REGISTADAS:');
console.log(`  Total: ${data.facturas.length}`);
data.facturas.forEach((f, i) => {
  console.log(`  ${i + 1}. ${f.metadata.documentNo} (${f.status})`);
  console.log(`     • ID: ${f.id}`);
  console.log(`     • RequestID: ${f.requestID}`);
  console.log(`     • NIF: ${f.metadata.nif}`);
  console.log(`     • Serviço: ${f.serviceName}`);
  console.log(`     • Criada: ${f.createdAt.substring(0, 19)}\n`);
});

// Séries
console.log('✨ SÉRIES CRIADAS:');
console.log(`  Total: ${data.series.length}`);
data.series.forEach((s, i) => {
  console.log(`  ${i + 1}. ${s.metadata.documentNo}`);
  console.log(`     • ID: ${s.id}`);
  console.log(`     • Serviço: ${s.serviceName}`);
  console.log(`     • Status: ${s.status}\n`);
});

// Validações
console.log('✅ VALIDAÇÕES REALIZADAS:');
console.log(`  Total: ${data.validations.length}`);
data.validations.forEach((v, i) => {
  const action = v.request.action === 'C' ? 'CONFIRMADA' : 'REJEITADA';
  console.log(`  ${i + 1}. ${v.metadata.documentNo} - ${action}`);
  console.log(`     • Status: ${v.status}`);
  console.log(`     • Realizada: ${v.createdAt.substring(0, 19)}\n`);
});

// Consultas
console.log('🔍 CONSULTAS REALIZADAS:');
console.log(`  Total: ${data.consultations.length}`);
data.consultations.forEach((c, i) => {
  const operacao = c.metadata.documentNo;
  console.log(`  ${i + 1}. ${operacao}`);
  console.log(`     • Realizada: ${c.createdAt.substring(0, 19)}\n`);
});

// Resumo
console.log('='.repeat(80));
console.log('📈 ESTATÍSTICAS RESUMIDAS:');
console.log(`  • Facturas: ${data.facturas.length}`);
console.log(`  • Séries: ${data.series.length}`);
console.log(`  • Validações: ${data.validations.length}`);
console.log(`  • Consultas: ${data.consultations.length}`);
console.log(`  • Total de Operações: ${data.metadata.totalOperations}`);
console.log(`  • Arquivo: ${STORAGE_FILE}`);
console.log(`  • Tamanho: ${(fs.statSync(STORAGE_FILE).size / 1024).toFixed(2)} KB`);
console.log('\n' + '='.repeat(80) + '\n');
