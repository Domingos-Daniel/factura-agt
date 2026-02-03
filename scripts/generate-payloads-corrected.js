/**
 * GERADOR DE PAYLOADS AGT - VERSÃO CORRIGIDA
 * 
 * Correções aplicadas baseadas nos erros da AGT:
 * 1. NIF cliente → usar 999999999 (consumidor final) ou NIF válido
 * 2. taxContribution → campo obrigatório (valor "0.00" quando não aplicável)
 * 3. Valores decimais → formato correto sem vírgulas
 * 4. Cálculo de totais → baseado em debitAmount/creditAmount, não taxBase
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// =============================================================================
// CONFIGURAÇÃO
// =============================================================================

const SOFTWARE_CONFIG = {
  productId: 'SOFT-FACT-2025',
  productVersion: '1.0.0',
  validationNumber: 'AGT-CERT-2025-001234',
  emitterNIF: '5000413178'  // ✅ NIF real da empresa emissora
};

const IVA_NORMAL = 14.0;
const CONSUMIDOR_FINAL_NIF = '999999999';  // ✅ Sem NIF

// =============================================================================
// FUNÇÕES HELPER
// =============================================================================

function formatCurrency(value) {
  return value.toFixed(2);
}

function generateTimestamp(date = new Date()) {
  return date.toISOString();
}

function formatDocumentDate(date = new Date()) {
  return date.toISOString().split('T')[0];
}

function calculateIVA(baseValue, taxRate) {
  return (baseValue * taxRate) / 100;
}

/**
 * ✅ CORRIGIDO: Criar imposto IVA com taxContribution obrigatório
 */
function createIVATax(baseValue, taxRate = IVA_NORMAL, taxCode = 'NOR', exemptionCode = null) {
  const taxAmount = calculateIVA(baseValue, taxRate);
  const tax = {
    taxType: 'IVA',
    taxCountryRegion: 'AO',
    taxCode: taxCode,
    taxBase: formatCurrency(baseValue),
    taxPercentage: formatCurrency(taxRate),
    taxAmount: formatCurrency(taxAmount),
    taxContribution: formatCurrency(0)  // ✅ OBRIGATÓRIO: sempre presente
  };
  if (exemptionCode) {
    tax.taxExemptionCode = exemptionCode;
  }
  return tax;
}

function calculateLineTotal(quantity, unitPrice, taxRate = 0) {
  const subtotal = quantity * unitPrice;
  const taxAmount = calculateIVA(subtotal, taxRate);
  const total = subtotal + taxAmount;
  return { subtotal, taxAmount, total };
}

/**
 * ✅ CORRIGIDO: Calcular totais baseado em debitAmount/creditAmount
 */
function calculateTotals(lines) {
  let netTotal = 0;
  let taxPayable = 0;
  let grossTotal = 0;

  lines.forEach(line => {
    // ✅ Usar debitAmount (ou quantidade × preço) como base
    const lineDebit = parseFloat(line.debitAmount || '0');
    const lineCredit = parseFloat(line.creditAmount || '0');
    const lineAmount = lineDebit || lineCredit || parseFloat(line.settlementAmount);
    
    // Calcular valor sem impostos
    const lineTaxes = line.taxes.reduce((sum, tax) => sum + parseFloat(tax.taxAmount), 0);
    const lineNet = lineAmount - lineTaxes;
    
    netTotal += lineNet;
    taxPayable += lineTaxes;
    grossTotal += lineAmount;
  });

  return {
    taxPayable: formatCurrency(taxPayable),
    netTotal: formatCurrency(netTotal),
    grossTotal: formatCurrency(grossTotal)
  };
}

function signPayload(data) {
  const mockSignature = Buffer.from(
    JSON.stringify(data) + '_SIGNED_' + Date.now()
  )
    .toString('base64')
    .substring(0, 256)
    .padEnd(256, '=');
  return mockSignature;
}

function createSoftwareInfo() {
  const signature = signPayload({
    productId: SOFTWARE_CONFIG.productId,
    productVersion: SOFTWARE_CONFIG.productVersion,
    softwareValidationNumber: SOFTWARE_CONFIG.validationNumber,
    timestamp: generateTimestamp()
  });

  return {
    softwareInfoDetail: {
      productId: SOFTWARE_CONFIG.productId,
      productVersion: SOFTWARE_CONFIG.productVersion,
      softwareValidationNumber: SOFTWARE_CONFIG.validationNumber
    },
    jwsSoftwareSignature: signature
  };
}

function generateDocumentNumber(documentType, series, sequenceNumber) {
  const paddedNumber = sequenceNumber.toString().padStart(6, '0');
  return `${documentType} ${series}/${paddedNumber}`;
}

// =============================================================================
// C1 - AVISO DE COBRANÇA (CORRIGIDO)
// =============================================================================

function generateAvisoCobranca() {
  const documentDate = new Date('2025-02-03');
  const documentNo = generateDocumentNumber('AC', 'A', 1);

  // ✅ LINHA 1: Com debitAmount explícito
  const line1Calc = calculateLineTotal(40, 15000, IVA_NORMAL);
  const line1 = {
    lineNumber: '1',
    productCode: 'SERV-001',
    productDescription: 'Consultoria em Tecnologias de Informação - Desenvolvimento de Software',
    quantity: formatCurrency(40),
    unitOfMeasure: 'Hora',
    unitPrice: formatCurrency(15000),
    unitPriceBase: formatCurrency(15000),
    debitAmount: formatCurrency(line1Calc.subtotal),  // ✅ OBRIGATÓRIO para cálculo de totais
    taxes: [createIVATax(line1Calc.subtotal, IVA_NORMAL, 'NOR')],
    settlementAmount: formatCurrency(line1Calc.total)
  };

  const line2Calc = calculateLineTotal(1, 250000, IVA_NORMAL);
  const line2 = {
    lineNumber: '2',
    productCode: 'LIC-SOFT-001',
    productDescription: 'Licença Anual de Software de Gestão Empresarial',
    quantity: formatCurrency(1),
    unitOfMeasure: 'Unidade',
    unitPrice: formatCurrency(250000),
    unitPriceBase: formatCurrency(250000),
    debitAmount: formatCurrency(line2Calc.subtotal),  // ✅ OBRIGATÓRIO
    taxes: [createIVATax(line2Calc.subtotal, IVA_NORMAL, 'NOR')],
    settlementAmount: formatCurrency(line2Calc.total)
  };

  const line3Calc = calculateLineTotal(5, 8000, IVA_NORMAL);
  const line3 = {
    lineNumber: '3',
    productCode: 'FORM-001',
    productDescription: 'Formação em Gestão de Projectos - 5 dias',
    quantity: formatCurrency(5),
    unitOfMeasure: 'Dia',
    unitPrice: formatCurrency(8000),
    unitPriceBase: formatCurrency(8000),
    debitAmount: formatCurrency(line3Calc.subtotal),  // ✅ OBRIGATÓRIO
    taxes: [createIVATax(line3Calc.subtotal, IVA_NORMAL, 'NOR')],
    settlementAmount: formatCurrency(line3Calc.total)
  };

  const lines = [line1, line2, line3];
  const documentTotals = calculateTotals(lines);

  const document = {
    documentNo,
    documentStatus: 'N',
    jwsDocumentSignature: '',
    documentDate: formatDocumentDate(documentDate),
    documentType: 'AC',
    eacCode: '62010',
    systemEntryDate: generateTimestamp(documentDate),
    customerCountry: 'AO',
    customerTaxID: CONSUMIDOR_FINAL_NIF,  // ✅ Usar consumidor final (não precisa NIF registrado)
    companyName: 'CONSUMIDOR FINAL',
    lines,
    documentTotals
  };

  document.jwsDocumentSignature = signPayload(document);

  return {
    schemaVersion: '1.0',
    submissionUUID: uuidv4(),
    taxRegistrationNumber: SOFTWARE_CONFIG.emitterNIF,
    submissionTimeStamp: generateTimestamp(),
    softwareInfo: createSoftwareInfo(),
    numberOfEntries: 1,
    documents: [document]
  };
}

// =============================================================================
// C2 - FACTURA/RECIBO (CORRIGIDO)
// =============================================================================

function generateFacturaRecibo() {
  const documentDate = new Date('2025-02-03');
  const documentNo = generateDocumentNumber('FR', 'B', 42);

  const line1Calc = calculateLineTotal(2, 185000, IVA_NORMAL);
  const line1 = {
    lineNumber: '1',
    productCode: 'PROD-NB-001',
    productDescription: 'Notebook Dell Latitude 5520 - Intel i7, 16GB RAM, 512GB SSD',
    quantity: formatCurrency(2),
    unitOfMeasure: 'Unidade',
    unitPrice: formatCurrency(185000),
    unitPriceBase: formatCurrency(185000),
    debitAmount: formatCurrency(line1Calc.subtotal),
    taxes: [createIVATax(line1Calc.subtotal, IVA_NORMAL, 'NOR')],
    settlementAmount: formatCurrency(line1Calc.total)
  };

  const line2Calc = calculateLineTotal(2, 4500, IVA_NORMAL);
  const line2 = {
    lineNumber: '2',
    productCode: 'PROD-MS-001',
    productDescription: 'Mouse Wireless Logitech MX Master 3',
    quantity: formatCurrency(2),
    unitOfMeasure: 'Unidade',
    unitPrice: formatCurrency(4500),
    unitPriceBase: formatCurrency(4500),
    debitAmount: formatCurrency(line2Calc.subtotal),
    taxes: [createIVATax(line2Calc.subtotal, IVA_NORMAL, 'NOR')],
    settlementAmount: formatCurrency(line2Calc.total)
  };

  const line3Calc = calculateLineTotal(2, 12000, IVA_NORMAL);
  const line3 = {
    lineNumber: '3',
    productCode: 'PROD-MCH-001',
    productDescription: 'Mochila para Notebook até 15.6" - Impermeável',
    quantity: formatCurrency(2),
    unitOfMeasure: 'Unidade',
    unitPrice: formatCurrency(12000),
    unitPriceBase: formatCurrency(12000),
    debitAmount: formatCurrency(line3Calc.subtotal),
    taxes: [createIVATax(line3Calc.subtotal, IVA_NORMAL, 'NOR')],
    settlementAmount: formatCurrency(line3Calc.total)
  };

  const lines = [line1, line2, line3];
  const documentTotals = calculateTotals(lines);

  const document = {
    documentNo,
    documentStatus: 'N',
    jwsDocumentSignature: '',
    documentDate: formatDocumentDate(documentDate),
    documentType: 'FR',
    eacCode: '47190',
    systemEntryDate: generateTimestamp(documentDate),
    customerCountry: 'AO',
    customerTaxID: CONSUMIDOR_FINAL_NIF,
    companyName: 'CONSUMIDOR FINAL',
    lines,
    documentTotals
  };

  document.jwsDocumentSignature = signPayload(document);

  return {
    schemaVersion: '1.0',
    submissionUUID: uuidv4(),
    taxRegistrationNumber: SOFTWARE_CONFIG.emitterNIF,
    submissionTimeStamp: generateTimestamp(),
    softwareInfo: createSoftwareInfo(),
    numberOfEntries: 1,
    documents: [document]
  };
}

// =============================================================================
// C3 - FACTURA (CORRIGIDO)
// =============================================================================

function generateFactura() {
  const documentDate = new Date('2025-02-03');
  const documentNo = generateDocumentNumber('FT', 'A', 125);

  const line1Calc = calculateLineTotal(80, 25000, IVA_NORMAL);
  const line1 = {
    lineNumber: '1',
    productCode: 'SERV-AUD-001',
    productDescription: 'Auditoria Financeira e Revisão de Contas - Exercício 2024',
    quantity: formatCurrency(80),
    unitOfMeasure: 'Hora',
    unitPrice: formatCurrency(25000),
    unitPriceBase: formatCurrency(25000),
    debitAmount: formatCurrency(line1Calc.subtotal),
    taxes: [createIVATax(line1Calc.subtotal, IVA_NORMAL, 'NOR')],
    settlementAmount: formatCurrency(line1Calc.total)
  };

  const line2Calc = calculateLineTotal(60, 22000, IVA_NORMAL);
  const line2 = {
    lineNumber: '2',
    productCode: 'SERV-FISC-001',
    productDescription: 'Consultoria Fiscal e Planeamento Tributário',
    quantity: formatCurrency(60),
    unitOfMeasure: 'Hora',
    unitPrice: formatCurrency(22000),
    unitPriceBase: formatCurrency(22000),
    debitAmount: formatCurrency(line2Calc.subtotal),
    taxes: [createIVATax(line2Calc.subtotal, IVA_NORMAL, 'NOR')],
    settlementAmount: formatCurrency(line2Calc.total)
  };

  const line3Calc = calculateLineTotal(1, 150000, IVA_NORMAL);
  const line3 = {
    lineNumber: '3',
    productCode: 'SERV-REL-001',
    productDescription: 'Relatório Executivo de Auditoria e Recomendações',
    quantity: formatCurrency(1),
    unitOfMeasure: 'Unidade',
    unitPrice: formatCurrency(150000),
    unitPriceBase: formatCurrency(150000),
    debitAmount: formatCurrency(line3Calc.subtotal),
    taxes: [createIVATax(line3Calc.subtotal, IVA_NORMAL, 'NOR')],
    settlementAmount: formatCurrency(line3Calc.total)
  };

  const lines = [line1, line2, line3];
  const documentTotals = calculateTotals(lines);

  const totalIVA = parseFloat(documentTotals.taxPayable);
  const withholdingAmount = totalIVA * 0.065;

  const withholdingTaxList = [
    {
      withholdingTaxType: 'IVA',
      withholdingTaxDescription: 'Retenção de IVA na fonte - 6,5% sobre IVA',
      withholdingTaxAmount: formatCurrency(withholdingAmount)
    }
  ];

  const document = {
    documentNo,
    documentStatus: 'N',
    jwsDocumentSignature: '',
    documentDate: formatDocumentDate(documentDate),
    documentType: 'FT',
    eacCode: '70220',
    systemEntryDate: generateTimestamp(documentDate),
    customerCountry: 'AO',
    customerTaxID: CONSUMIDOR_FINAL_NIF,  // ✅ Usar consumidor final por segurança
    companyName: 'EMPRESA CLIENTE EXEMPLO, LDA',
    lines,
    documentTotals,
    withholdingTaxList
  };

  document.jwsDocumentSignature = signPayload(document);

  return {
    schemaVersion: '1.0',
    submissionUUID: uuidv4(),
    taxRegistrationNumber: SOFTWARE_CONFIG.emitterNIF,
    submissionTimeStamp: generateTimestamp(),
    softwareInfo: createSoftwareInfo(),
    numberOfEntries: 1,
    documents: [document]
  };
}

// =============================================================================
// C4 - NOTA DE CRÉDITO (CORRIGIDO)
// =============================================================================

function generateNotaCredito() {
  const documentDate = new Date('2025-02-03');
  const documentNo = generateDocumentNumber('NC', 'A', 15);

  const line1Calc = calculateLineTotal(1, 185000, IVA_NORMAL);
  const line1 = {
    lineNumber: '1',
    productCode: 'PROD-NB-001',
    productDescription: 'Notebook Dell Latitude 5520 - Devolução por defeito de fábrica',
    quantity: formatCurrency(1),
    unitOfMeasure: 'Unidade',
    unitPrice: formatCurrency(185000),
    unitPriceBase: formatCurrency(185000),
    referenceInfo: {
      reference: 'FT A/000100',
      referenceItemLineNo: 1,
      reason: 'Devolução de mercadoria'
    },
    creditAmount: formatCurrency(line1Calc.subtotal),  // ✅ creditAmount para NC
    taxes: [createIVATax(line1Calc.subtotal, IVA_NORMAL, 'NOR')],
    settlementAmount: formatCurrency(line1Calc.total)  // ✅ Positivo (AGT calcula sinal)
  };

  const lines = [line1];
  const documentTotals = calculateTotals(lines);

  const document = {
    documentNo,
    documentStatus: 'N',
    jwsDocumentSignature: '',
    documentDate: formatDocumentDate(documentDate),
    documentType: 'NC',
    eacCode: '47190',
    systemEntryDate: generateTimestamp(documentDate),
    customerCountry: 'AO',
    customerTaxID: CONSUMIDOR_FINAL_NIF,
    companyName: 'CONSUMIDOR FINAL',
    lines,
    documentTotals
  };

  document.jwsDocumentSignature = signPayload(document);

  return {
    schemaVersion: '1.0',
    submissionUUID: uuidv4(),
    taxRegistrationNumber: SOFTWARE_CONFIG.emitterNIF,
    submissionTimeStamp: generateTimestamp(),
    softwareInfo: createSoftwareInfo(),
    numberOfEntries: 1,
    documents: [document]
  };
}

// =============================================================================
// C5 - NOTA DE DÉBITO (CORRIGIDO)
// =============================================================================

function generateNotaDebito() {
  const documentDate = new Date('2025-02-03');
  const documentNo = generateDocumentNumber('ND', 'A', 8);

  const line1Calc = calculateLineTotal(1, 45000, 0);
  const line1 = {
    lineNumber: '1',
    productCode: 'JUROS-MORA',
    productDescription: 'Juros de mora por atraso de pagamento - 50 dias após vencimento',
    quantity: formatCurrency(1),
    unitOfMeasure: 'Unidade',
    unitPrice: formatCurrency(45000),
    unitPriceBase: formatCurrency(45000),
    referenceInfo: {
      reference: 'FT A/000095',
      reason: 'Juros de mora'
    },
    debitAmount: formatCurrency(line1Calc.subtotal),
    taxes: [createIVATax(line1Calc.subtotal, 0, 'ISE', 'M10')],
    settlementAmount: formatCurrency(line1Calc.total)
  };

  const line2Calc = calculateLineTotal(1, 8000, 0);
  const line2 = {
    lineNumber: '2',
    productCode: 'DESP-COB',
    productDescription: 'Despesas administrativas de cobrança',
    quantity: formatCurrency(1),
    unitOfMeasure: 'Unidade',
    unitPrice: formatCurrency(8000),
    unitPriceBase: formatCurrency(8000),
    referenceInfo: {
      reference: 'FT A/000095',
      reason: 'Despesas extras'
    },
    debitAmount: formatCurrency(line2Calc.subtotal),
    taxes: [createIVATax(line2Calc.subtotal, 0, 'ISE', 'M10')],
    settlementAmount: formatCurrency(line2Calc.total)
  };

  const lines = [line1, line2];
  const documentTotals = calculateTotals(lines);

  const document = {
    documentNo,
    documentStatus: 'N',
    jwsDocumentSignature: '',
    documentDate: formatDocumentDate(documentDate),
    documentType: 'ND',
    eacCode: '70220',
    systemEntryDate: generateTimestamp(documentDate),
    customerCountry: 'AO',
    customerTaxID: CONSUMIDOR_FINAL_NIF,
    companyName: 'CONSUMIDOR FINAL',
    lines,
    documentTotals
  };

  document.jwsDocumentSignature = signPayload(document);

  return {
    schemaVersion: '1.0',
    submissionUUID: uuidv4(),
    taxRegistrationNumber: SOFTWARE_CONFIG.emitterNIF,
    submissionTimeStamp: generateTimestamp(),
    softwareInfo: createSoftwareInfo(),
    numberOfEntries: 1,
    documents: [document]
  };
}

// =============================================================================
// C6 - RECIBO EM NUMERÁRIO (CORRIGIDO)
// =============================================================================

function generateReciboNumerario() {
  const documentDate = new Date('2025-02-03');
  const documentNo = generateDocumentNumber('RC', 'C', 256);

  const payment1Amount = 250000;
  const line1 = {
    lineNumber: '1',
    productCode: 'PGTO-CASH',
    productDescription: 'Pagamento em numerário referente à Factura FT A/000080',
    quantity: formatCurrency(1),
    unitOfMeasure: 'Unidade',
    unitPrice: formatCurrency(payment1Amount),
    unitPriceBase: formatCurrency(payment1Amount),
    debitAmount: formatCurrency(payment1Amount),
    taxes: [createIVATax(payment1Amount, 0, 'ISE', 'M10')],  // ✅ Recibo isento
    settlementAmount: formatCurrency(payment1Amount)
  };

  const payment2Amount = 180000;
  const line2 = {
    lineNumber: '2',
    productCode: 'PGTO-CASH',
    productDescription: 'Pagamento em numerário referente à Factura FT A/000081',
    quantity: formatCurrency(1),
    unitOfMeasure: 'Unidade',
    unitPrice: formatCurrency(payment2Amount),
    unitPriceBase: formatCurrency(payment2Amount),
    debitAmount: formatCurrency(payment2Amount),
    taxes: [createIVATax(payment2Amount, 0, 'ISE', 'M10')],
    settlementAmount: formatCurrency(payment2Amount)
  };

  const lines = [line1, line2];

  const paymentReceipt = {
    sourceDocuments: [
      {
        lineNo: '1',
        sourceDocumentID: {
          originatingON: 'FT A/000080',
          documentDate: '2025-01-20'
        },
        creditAmount: formatCurrency(payment1Amount)
      },
      {
        lineNo: '2',
        sourceDocumentID: {
          originatingON: 'FT A/000081',
          documentDate: '2025-01-22'
        },
        creditAmount: formatCurrency(payment2Amount)
      }
    ]
  };

  const documentTotals = calculateTotals(lines);

  const document = {
    documentNo,
    documentStatus: 'N',
    jwsDocumentSignature: '',
    documentDate: formatDocumentDate(documentDate),
    documentType: 'RC',
    eacCode: '47190',
    systemEntryDate: generateTimestamp(documentDate),
    customerCountry: 'AO',
    customerTaxID: CONSUMIDOR_FINAL_NIF,
    companyName: 'CONSUMIDOR FINAL',
    lines,
    paymentReceipt,
    documentTotals
  };

  document.jwsDocumentSignature = signPayload(document);

  return {
    schemaVersion: '1.0',
    submissionUUID: uuidv4(),
    taxRegistrationNumber: SOFTWARE_CONFIG.emitterNIF,
    submissionTimeStamp: generateTimestamp(),
    softwareInfo: createSoftwareInfo(),
    numberOfEntries: 1,
    documents: [document]
  };
}

// =============================================================================
// MAIN
// =============================================================================

function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   GERADOR DE PAYLOADS AGT - VERSÃO CORRIGIDA              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const outputDir = path.join(__dirname, '..', 'data', 'test-payloads');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const scenarios = [
    { code: 'C1', name: 'Aviso de Cobrança', generator: generateAvisoCobranca },
    { code: 'C2', name: 'Factura/Recibo', generator: generateFacturaRecibo },
    { code: 'C3', name: 'Factura', generator: generateFactura },
    { code: 'C4', name: 'Nota de Crédito', generator: generateNotaCredito },
    { code: 'C5', name: 'Nota de Débito', generator: generateNotaDebito },
    { code: 'C6', name: 'Recibo Numerário', generator: generateReciboNumerario }
  ];

  const allPayloads = [];

  scenarios.forEach(scenario => {
    console.log(`✅ Gerando ${scenario.code} - ${scenario.name}...`);
    
    const payload = scenario.generator();
    const doc = payload.documents[0];
    
    const fileName = `${scenario.code}_${doc.documentType}_${doc.documentNo.replace(/[\s\/]/g, '_')}.json`;
    const filePath = path.join(outputDir, fileName);
    
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
    
    console.log(`   📄 Salvo: ${fileName}`);
    console.log(`   💰 Total: ${doc.documentTotals.grossTotal} AOA`);
    console.log(`   🏢 Cliente: ${doc.companyName}`);
    console.log(`   ✅ taxContribution: incluído`);
    console.log(`   ✅ debitAmount: incluído\n`);
    
    allPayloads.push(payload);
  });

  const consolidatedPath = path.join(outputDir, '_ALL_PAYLOADS_CORRECTED.json');
  fs.writeFileSync(consolidatedPath, JSON.stringify(allPayloads, null, 2), 'utf8');

  console.log('═══════════════════════════════════════════════════════════');
  console.log(`✅ ${scenarios.length} payloads corrigidos gerados!`);
  console.log(`📁 Diretório: ${outputDir}`);
  console.log('\n🔧 CORREÇÕES APLICADAS:');
  console.log('   1. ✅ customerTaxID → 999999999 (consumidor final)');
  console.log('   2. ✅ taxContribution → sempre presente (0.00)');
  console.log('   3. ✅ debitAmount → adicionado para cálculo correto');
  console.log('   4. ✅ Cálculo de totais → baseado em debitAmount');
  console.log('═══════════════════════════════════════════════════════════\n');
}

if (require.main === module) {
  main();
}

module.exports = {
  generateAvisoCobranca,
  generateFacturaRecibo,
  generateFactura,
  generateNotaCredito,
  generateNotaDebito,
  generateReciboNumerario
};
