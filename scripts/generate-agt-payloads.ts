/**
 * SCRIPT DE TESTE E GERAÇÃO DE PAYLOADS AGT
 * 
 * Este script:
 * 1. Gera todos os 6 cenários de certificação
 * 2. Salva JSONs individuais em /data/test-payloads/
 * 3. Exibe resumo de cada payload
 * 4. Valida estrutura básica
 * 5. Exporta array consolidado para testes automatizados
 * 
 * USO:
 * ```bash
 * npx ts-node scripts/generate-agt-payloads.ts
 * ```
 * 
 * OU importar diretamente:
 * ```typescript
 * import { ALL_TEST_SCENARIOS } from './lib/agt-payload-generators';
 * const payload = ALL_TEST_SCENARIOS[0].generator();
 * ```
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  ALL_TEST_SCENARIOS,
  TestScenario
} from '../lib/agt-payload-generators.js';
import { RegistarFacturaRequest } from '../lib/agt-payload-types.js';

// Cores para console (opcional)
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

/**
 * Cria diretório se não existir
 */
function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`${colors.green}✓${colors.reset} Diretório criado: ${dirPath}`);
  }
}

/**
 * Salva payload em arquivo JSON
 */
function savePayloadToFile(
  payload: RegistarFacturaRequest,
  scenarioCode: string,
  outputDir: string
): string {
  const fileName = `${scenarioCode}_${payload.documents[0].documentType}_${payload.documents[0].documentNo.replace(/\s/g, '_')}.json`;
  const filePath = path.join(outputDir, fileName);
  
  const jsonContent = JSON.stringify(payload, null, 2);
  fs.writeFileSync(filePath, jsonContent, 'utf8');
  
  return filePath;
}

/**
 * Valida estrutura básica do payload
 */
function validatePayload(payload: RegistarFacturaRequest): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validações obrigatórias
  if (!payload.schemaVersion) errors.push('schemaVersion ausente');
  if (!payload.submissionGUID) errors.push('submissionGUID ausente');
  if (!payload.taxRegistrationNumber) errors.push('taxRegistrationNumber ausente');
  if (!payload.submissionTimeStamp) errors.push('submissionTimeStamp ausente');
  if (!payload.softwareInfo) errors.push('softwareInfo ausente');
  if (!payload.documents || payload.documents.length === 0) {
    errors.push('documents array vazio');
  }

  // Validar cada documento
  payload.documents?.forEach((doc, idx) => {
    if (!doc.documentNo) errors.push(`Documento ${idx}: documentNo ausente`);
    if (!doc.documentType) errors.push(`Documento ${idx}: documentType ausente`);
    if (!doc.documentDate) errors.push(`Documento ${idx}: documentDate ausente`);
    if (!doc.jwsDocumentSignature) errors.push(`Documento ${idx}: assinatura ausente`);
    if (!doc.lines || doc.lines.length === 0) {
      errors.push(`Documento ${idx}: sem linhas`);
    }
    if (!doc.documentTotals) errors.push(`Documento ${idx}: documentTotals ausente`);
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Exibe resumo do payload
 */
function printPayloadSummary(
  scenario: TestScenario,
  payload: RegistarFacturaRequest
): void {
  const doc = payload.documents[0];
  const totals = doc.documentTotals;

  console.log('\n' + '='.repeat(80));
  console.log(`${colors.bright}${colors.cyan}${scenario.code} - ${scenario.name}${colors.reset}`);
  console.log('='.repeat(80));
  console.log(`${colors.blue}Descrição:${colors.reset} ${scenario.description}`);
  console.log('');
  console.log(`📄 Documento:       ${doc.documentType} ${doc.documentNo}`);
  console.log(`📅 Data:            ${doc.documentDate}`);
  console.log(`🏢 Cliente:         ${doc.companyName}`);
  console.log(`🆔 NIF Cliente:     ${doc.customerTaxID}`);
  console.log(`🌍 País:            ${doc.customerCountry}`);
  console.log(`🔢 CAE:             ${doc.eacCode}`);
  console.log(`📋 Linhas:          ${doc.lines.length}`);
  console.log('');
  console.log(`${colors.bright}TOTAIS:${colors.reset}`);
  console.log(`  💰 Subtotal:      ${totals.netTotal} AOA`);
  console.log(`  📊 Impostos:      ${totals.taxPayable} AOA`);
  console.log(`  ${colors.green}${colors.bright}💵 TOTAL:${colors.reset}         ${colors.green}${colors.bright}${totals.grossTotal} AOA${colors.reset}`);
  
  if (doc.withholdingTaxList && doc.withholdingTaxList.length > 0) {
    console.log('');
    console.log(`${colors.yellow}⚠️  RETENÇÃO NA FONTE:${colors.reset}`);
    doc.withholdingTaxList.forEach((wht) => {
      console.log(`  ${wht.withholdingTaxType}: ${wht.withholdingTaxAmount} AOA`);
      console.log(`  ${wht.withholdingTaxDescription}`);
    });
  }

  if (doc.paymentReceipt) {
    console.log('');
    console.log(`${colors.yellow}💳 PAGAMENTO - Facturas Referenciadas:${colors.reset}`);
    doc.paymentReceipt.sourceDocuments.forEach((src) => {
      console.log(`  - ${src.sourceDocumentID.originatingON} (${src.sourceDocumentID.documentDate}): ${src.creditAmount} AOA`);
    });
  }

  console.log('');
  console.log(`🔐 Assinatura:      ${doc.jwsDocumentSignature.substring(0, 40)}...`);
  console.log(`🆔 Submission GUID: ${payload.submissionGUID}`);
}

/**
 * FUNÇÃO PRINCIPAL
 */
async function main() {
  console.log(`${colors.bright}${colors.blue}`);
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║         GERADOR DE PAYLOADS JSON - CERTIFICAÇÃO AGT                        ║');
  console.log('║         Sistema de Facturação Electrónica de Angola                        ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  const outputDir = path.join(process.cwd(), 'data', 'test-payloads');
  ensureDirectoryExists(outputDir);

  console.log(`\n📁 Diretório de saída: ${outputDir}\n`);

  const allPayloads: Array<{
    scenario: string;
    payload: RegistarFacturaRequest;
    filePath: string;
  }> = [];

  // Gerar cada cenário
  for (const scenario of ALL_TEST_SCENARIOS) {
    try {
      console.log(`\n${colors.bright}Gerando ${scenario.code}...${colors.reset}`);
      
      // Gerar payload
      const payload = scenario.generator();
      
      // Validar
      const validation = validatePayload(payload);
      if (!validation.valid) {
        console.log(`${colors.red}✗ ERROS DE VALIDAÇÃO:${colors.reset}`);
        validation.errors.forEach((err) => console.log(`  - ${err}`));
        continue;
      }
      
      // Salvar arquivo
      const filePath = savePayloadToFile(payload, scenario.code, outputDir);
      console.log(`${colors.green}✓${colors.reset} Salvo: ${path.basename(filePath)}`);
      
      // Exibir resumo
      printPayloadSummary(scenario, payload);
      
      allPayloads.push({
        scenario: scenario.code,
        payload,
        filePath
      });
      
    } catch (error) {
      console.error(`${colors.red}✗ Erro ao gerar ${scenario.code}:${colors.reset}`, error);
    }
  }

  // Salvar array consolidado
  const consolidatedPath = path.join(outputDir, '_ALL_PAYLOADS.json');
  fs.writeFileSync(
    consolidatedPath,
    JSON.stringify(allPayloads.map(p => p.payload), null, 2),
    'utf8'
  );
  console.log(`\n${colors.green}✓ Arquivo consolidado salvo: ${consolidatedPath}${colors.reset}`);

  // Relatório final
  console.log('\n' + '='.repeat(80));
  console.log(`${colors.bright}${colors.green}✓ GERAÇÃO CONCLUÍDA${colors.reset}`);
  console.log('='.repeat(80));
  console.log(`Total de payloads gerados: ${colors.bright}${allPayloads.length}${colors.reset}`);
  console.log(`Diretório: ${outputDir}`);
  console.log('\n📋 ARQUIVOS GERADOS:');
  allPayloads.forEach((item, idx) => {
    console.log(`  ${idx + 1}. ${colors.cyan}${item.scenario}${colors.reset} → ${path.basename(item.filePath)}`);
  });

  console.log(`\n${colors.yellow}PRÓXIMOS PASSOS:${colors.reset}`);
  console.log('1. Revisar JSONs gerados em /data/test-payloads/');
  console.log('2. Ajustar SOFTWARE_CONFIG em agt-payload-generators.ts com dados reais');
  console.log('3. Implementar assinatura digital real em signPayload()');
  console.log('4. Testar envio para endpoint AGT HML:');
  console.log(`   ${colors.cyan}POST https://sifphml.minfin.gov.ao/sigt/fe/v1/registarFactura${colors.reset}`);
  console.log('5. Validar resposta e ajustar conforme feedback AGT');
  
  console.log(`\n${colors.bright}${colors.blue}════════════════════════════════════════════════════════════════════════════${colors.reset}\n`);
}

// Executar se chamado diretamente
if (require.main === module) {
  main().catch((error) => {
    console.error(`${colors.red}ERRO FATAL:${colors.reset}`, error);
    process.exit(1);
  });
}

export { main as generateAllPayloads };
