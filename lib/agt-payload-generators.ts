/**
 * GERADORES DE PAYLOADS PARA CERTIFICAÇÃO AGT
 * 
 * Este arquivo contém funções para gerar payloads JSON completos e válidos
 * para os 6 cenários de certificação de software de facturação electrónica.
 * 
 * Cenários implementados:
 * - C1: Aviso de Cobrança (AC)
 * - C2: Factura/Recibo (FR)
 * - C3: Factura (FT)
 * - C4: Nota de Crédito (NC)
 * - C5: Nota de Débito (ND)
 * - C6: Recibo em numerário (RC)
 */

import {
  RegistarFacturaRequest,
  Document,
  DocumentLine,
  DocumentType,
  DocumentStatus,
  SoftwareInfo,
  WithholdingTax,
  PaymentReceipt,
  SourceDocument,
  IVA_RATES,
  TaxCode
} from './agt-payload-types';

import {
  generateSubmissionGUID,
  generateTimestamp,
  formatDocumentDate,
  formatCurrency,
  calculateLineTotal,
  createIVATax,
  calculateTotals,
  signDocument,
  signSoftware,
  generateDocumentNumber,
  CONSUMIDOR_FINAL_NIF,
  COMMON_CAE_CODES,
  NC_REASONS,
  ND_REASONS,
  calculateIVAWithholding,
  WITHHOLDING_TYPES
} from './agt-payload-helpers';

/**
 * Configuração do Software de Facturação
 * ALTERAR PARA DADOS REAIS DA CERTIFICAÇÃO
 */
const SOFTWARE_CONFIG = {
  productId: 'SOFT-FACT-2025',
  productVersion: '1.0.0',
  validationNumber: 'AGT-CERT-2025-001234',  // Número fornecido pela AGT após certificação
  emitterNIF: '123456789'                    // NIF da empresa emissora (TESTE)
};

/**
 * Cria objeto SoftwareInfo com assinatura
 */
function createSoftwareInfo(): SoftwareInfo {
  const signature = signSoftware(
    SOFTWARE_CONFIG.productId,
    SOFTWARE_CONFIG.productVersion,
    SOFTWARE_CONFIG.validationNumber
  );

  return {
    softwareInfoDetail: {
      productId: SOFTWARE_CONFIG.productId,
      productVersion: SOFTWARE_CONFIG.productVersion,
      softwareValidationNumber: SOFTWARE_CONFIG.validationNumber
    },
    jwsSoftwareSignature: signature
  };
}

/**
 * ========================================
 * C1 - AVISO DE COBRANÇA (AC)
 * ========================================
 * 
 * Documento pré-fatura usado para informar cliente sobre valor a pagar.
 * Não tem valor fiscal, mas deve ser registado.
 * 
 * Características:
 * - Não gera obrigação fiscal imediata
 * - Cliente com e sem NIF
 * - IVA aplicável
 * - Múltiplas linhas
 * 
 * @returns Payload completo para envio
 */
export function generateAvisoCobranca(): RegistarFacturaRequest {
  const documentDate = new Date('2025-02-03');
  const documentNo = generateDocumentNumber('AC', 'A', 1);

  // LINHA 1: Consultoria de TI (com IVA 14%)
  const line1Calc = calculateLineTotal(40, 15000, IVA_RATES.NORMAL); // 40h × 15.000 AOA
  const line1: DocumentLine = {
    lineNumber: '1',
    productCode: 'SERV-001',
    productDescription: 'Consultoria em Tecnologias de Informação - Desenvolvimento de Software',
    quantity: formatCurrency(40),
    unitOfMeasure: 'Hora',
    unitPrice: formatCurrency(15000),
    taxes: [createIVATax(line1Calc.subtotal, IVA_RATES.NORMAL, TaxCode.NORMAL)],
    settlementAmount: formatCurrency(line1Calc.total)
  };

  // LINHA 2: Licença de Software (com IVA 14%)
  const line2Calc = calculateLineTotal(1, 250000, IVA_RATES.NORMAL); // 1 × 250.000 AOA
  const line2: DocumentLine = {
    lineNumber: '2',
    productCode: 'LIC-SOFT-001',
    productDescription: 'Licença Anual de Software de Gestão Empresarial',
    quantity: formatCurrency(1),
    unitOfMeasure: 'Unidade',
    unitPrice: formatCurrency(250000),
    taxes: [createIVATax(line2Calc.subtotal, IVA_RATES.NORMAL, TaxCode.NORMAL)],
    settlementAmount: formatCurrency(line2Calc.total)
  };

  // LINHA 3: Formação (com IVA 14%)
  const line3Calc = calculateLineTotal(5, 8000, IVA_RATES.NORMAL); // 5 dias × 8.000 AOA
  const line3: DocumentLine = {
    lineNumber: '3',
    productCode: 'FORM-001',
    productDescription: 'Formação em Gestão de Projectos - 5 dias',
    quantity: formatCurrency(5),
    unitOfMeasure: 'Dia',
    unitPrice: formatCurrency(8000),
    taxes: [createIVATax(line3Calc.subtotal, IVA_RATES.NORMAL, TaxCode.NORMAL)],
    settlementAmount: formatCurrency(line3Calc.total)
  };

  const lines = [line1, line2, line3];
  const documentTotals = calculateTotals(lines);

  const document: Document = {
    documentNo,
    documentStatus: DocumentStatus.NORMAL,
    jwsDocumentSignature: '', // Será preenchido após
    documentDate: formatDocumentDate(documentDate),
    documentType: DocumentType.AVISO_COBRANCA,
    eacCode: COMMON_CAE_CODES.SERVICOS_TI,
    systemEntryDate: generateTimestamp(documentDate),
    customerCountry: 'AO',
    customerTaxID: '987654321', // Cliente empresarial com NIF
    companyName: 'EMPRESA TECNOLOGIAS AVANÇADAS, LDA',
    lines,
    documentTotals
  };

  // Assinar documento
  document.jwsDocumentSignature = signDocument(document);

  return {
    schemaVersion: '1.0',
    submissionGUID: generateSubmissionGUID(),
    taxRegistrationNumber: SOFTWARE_CONFIG.emitterNIF,
    submissionTimeStamp: generateTimestamp(),
    softwareInfo: createSoftwareInfo(),
    numberOfEntries: 1,
    documents: [document]
  };
}

/**
 * ========================================
 * C2 - FACTURA/RECIBO (FR)
 * ========================================
 * 
 * Factura paga no momento da emissão.
 * Combina emissão e recebimento.
 * 
 * Características:
 * - Cliente consumidor final (sem NIF)
 * - Pagamento imediato
 * - IVA incluído
 * 
 * @returns Payload completo para envio
 */
export function generateFacturaRecibo(): RegistarFacturaRequest {
  const documentDate = new Date('2025-02-03');
  const documentNo = generateDocumentNumber('FR', 'B', 42);

  // LINHA 1: Notebook (com IVA 14%)
  const line1Calc = calculateLineTotal(2, 185000, IVA_RATES.NORMAL); // 2 × 185.000 AOA
  const line1: DocumentLine = {
    lineNumber: '1',
    productCode: 'PROD-NB-001',
    productDescription: 'Notebook Dell Latitude 5520 - Intel i7, 16GB RAM, 512GB SSD',
    quantity: formatCurrency(2),
    unitOfMeasure: 'Unidade',
    unitPrice: formatCurrency(185000),
    taxes: [createIVATax(line1Calc.subtotal, IVA_RATES.NORMAL, TaxCode.NORMAL)],
    settlementAmount: formatCurrency(line1Calc.total)
  };

  // LINHA 2: Mouse Wireless (com IVA 14%)
  const line2Calc = calculateLineTotal(2, 4500, IVA_RATES.NORMAL); // 2 × 4.500 AOA
  const line2: DocumentLine = {
    lineNumber: '2',
    productCode: 'PROD-MS-001',
    productDescription: 'Mouse Wireless Logitech MX Master 3',
    quantity: formatCurrency(2),
    unitOfMeasure: 'Unidade',
    unitPrice: formatCurrency(4500),
    taxes: [createIVATax(line2Calc.subtotal, IVA_RATES.NORMAL, TaxCode.NORMAL)],
    settlementAmount: formatCurrency(line2Calc.total)
  };

  // LINHA 3: Mochila para Notebook (com IVA 14%)
  const line3Calc = calculateLineTotal(2, 12000, IVA_RATES.NORMAL); // 2 × 12.000 AOA
  const line3: DocumentLine = {
    lineNumber: '3',
    productCode: 'PROD-MCH-001',
    productDescription: 'Mochila para Notebook até 15.6" - Impermeável',
    quantity: formatCurrency(2),
    unitOfMeasure: 'Unidade',
    unitPrice: formatCurrency(12000),
    taxes: [createIVATax(line3Calc.subtotal, IVA_RATES.NORMAL, TaxCode.NORMAL)],
    settlementAmount: formatCurrency(line3Calc.total)
  };

  const lines = [line1, line2, line3];
  const documentTotals = calculateTotals(lines);

  const document: Document = {
    documentNo,
    documentStatus: DocumentStatus.NORMAL,
    jwsDocumentSignature: '',
    documentDate: formatDocumentDate(documentDate),
    documentType: DocumentType.FACTURA_RECIBO,
    eacCode: COMMON_CAE_CODES.COMERCIO_GERAL,
    systemEntryDate: generateTimestamp(documentDate),
    customerCountry: 'AO',
    customerTaxID: CONSUMIDOR_FINAL_NIF, // Consumidor final - sem NIF
    companyName: 'CONSUMIDOR FINAL',
    lines,
    documentTotals
  };

  document.jwsDocumentSignature = signDocument(document);

  return {
    schemaVersion: '1.0',
    submissionGUID: generateSubmissionGUID(),
    taxRegistrationNumber: SOFTWARE_CONFIG.emitterNIF,
    submissionTimeStamp: generateTimestamp(),
    softwareInfo: createSoftwareInfo(),
    numberOfEntries: 1,
    documents: [document]
  };
}

/**
 * ========================================
 * C3 - FACTURA (FT)
 * ========================================
 * 
 * Factura normal com pagamento posterior.
 * 
 * Características:
 * - Cliente estrangeiro (Portugal)
 * - Serviços de consultoria
 * - Retenção na fonte de IVA (6,5% sobre 14%)
 * - IVA a 14%
 * 
 * @returns Payload completo para envio
 */
export function generateFactura(): RegistarFacturaRequest {
  const documentDate = new Date('2025-02-03');
  const documentNo = generateDocumentNumber('FT', 'A', 125);

  // LINHA 1: Auditoria Financeira (com IVA 14%)
  const line1Calc = calculateLineTotal(80, 25000, IVA_RATES.NORMAL); // 80h × 25.000 AOA
  const line1: DocumentLine = {
    lineNumber: '1',
    productCode: 'SERV-AUD-001',
    productDescription: 'Auditoria Financeira e Revisão de Contas - Exercício 2024',
    quantity: formatCurrency(80),
    unitOfMeasure: 'Hora',
    unitPrice: formatCurrency(25000),
    taxes: [createIVATax(line1Calc.subtotal, IVA_RATES.NORMAL, TaxCode.NORMAL)],
    settlementAmount: formatCurrency(line1Calc.total)
  };

  // LINHA 2: Consultoria Fiscal (com IVA 14%)
  const line2Calc = calculateLineTotal(60, 22000, IVA_RATES.NORMAL); // 60h × 22.000 AOA
  const line2: DocumentLine = {
    lineNumber: '2',
    productCode: 'SERV-FISC-001',
    productDescription: 'Consultoria Fiscal e Planeamento Tributário',
    quantity: formatCurrency(60),
    unitOfMeasure: 'Hora',
    unitPrice: formatCurrency(22000),
    taxes: [createIVATax(line2Calc.subtotal, IVA_RATES.NORMAL, TaxCode.NORMAL)],
    settlementAmount: formatCurrency(line2Calc.total)
  };

  // LINHA 3: Relatório Executivo (com IVA 14%)
  const line3Calc = calculateLineTotal(1, 150000, IVA_RATES.NORMAL); // 1 × 150.000 AOA
  const line3: DocumentLine = {
    lineNumber: '3',
    productCode: 'SERV-REL-001',
    productDescription: 'Relatório Executivo de Auditoria e Recomendações',
    quantity: formatCurrency(1),
    unitOfMeasure: 'Unidade',
    unitPrice: formatCurrency(150000),
    taxes: [createIVATax(line3Calc.subtotal, IVA_RATES.NORMAL, TaxCode.NORMAL)],
    settlementAmount: formatCurrency(line3Calc.total)
  };

  const lines = [line1, line2, line3];
  const documentTotals = calculateTotals(lines);

  // Retenção na fonte: 6,5% do IVA (cliente estrangeiro)
  const totalIVA = parseFloat(documentTotals.taxPayable);
  const withholdingAmount = calculateIVAWithholding(totalIVA);

  const withholdingTaxList: WithholdingTax[] = [
    {
      withholdingTaxType: WITHHOLDING_TYPES.IVA,
      withholdingTaxDescription: 'Retenção de IVA na fonte - 6,5% sobre IVA (cliente não residente)',
      withholdingTaxAmount: formatCurrency(withholdingAmount)
    }
  ];

  const document: Document = {
    documentNo,
    documentStatus: DocumentStatus.NORMAL,
    jwsDocumentSignature: '',
    documentDate: formatDocumentDate(documentDate),
    documentType: DocumentType.FACTURA,
    eacCode: COMMON_CAE_CODES.CONSULTORIA,
    systemEntryDate: generateTimestamp(documentDate),
    customerCountry: 'PT', // Portugal
    customerTaxID: '501234567', // NIF português (exemplo)
    companyName: 'CONSULTORES INTERNACIONAIS PORTUGAL, SA',
    lines,
    documentTotals,
    withholdingTaxList
  };

  document.jwsDocumentSignature = signDocument(document);

  return {
    schemaVersion: '1.0',
    submissionGUID: generateSubmissionGUID(),
    taxRegistrationNumber: SOFTWARE_CONFIG.emitterNIF,
    submissionTimeStamp: generateTimestamp(),
    softwareInfo: createSoftwareInfo(),
    numberOfEntries: 1,
    documents: [document]
  };
}

/**
 * ========================================
 * C4 - NOTA DE CRÉDITO (NC)
 * ========================================
 * 
 * Documento que anula/corrige factura anterior.
 * Usado para devoluções ou correções.
 * 
 * Características:
 * - Referencia factura original (FT A/100)
 * - Motivo: Devolução de mercadoria
 * - Valores negativos (crédito ao cliente)
 * - IVA proporcional
 * 
 * @returns Payload completo para envio
 */
export function generateNotaCredito(): RegistarFacturaRequest {
  const documentDate = new Date('2025-02-03');
  const documentNo = generateDocumentNumber('NC', 'A', 15);
  const referencedDocNo = 'FT A/000100'; // Factura original
  const referencedDocDate = '2025-01-25';

  // LINHA 1: Devolução de equipamento defeituoso
  const line1Calc = calculateLineTotal(1, 185000, IVA_RATES.NORMAL); // 1 × 185.000 AOA
  const line1: DocumentLine = {
    lineNumber: '1',
    productCode: 'PROD-NB-001',
    productDescription: 'Notebook Dell Latitude 5520 - Devolução por defeito de fábrica',
    quantity: formatCurrency(1),
    unitOfMeasure: 'Unidade',
    unitPrice: formatCurrency(185000),
    referenceInfo: {
      reference: referencedDocNo,
      referenceItemLineNo: 1,
      reason: NC_REASONS.DEVOLUCAO
    },
    creditAmount: formatCurrency(line1Calc.subtotal), // Valor a creditar (sem IVA)
    taxes: [createIVATax(line1Calc.subtotal, IVA_RATES.NORMAL, TaxCode.NORMAL)],
    settlementAmount: formatCurrency(-line1Calc.total) // NEGATIVO (crédito)
  };

  const lines = [line1];
  const documentTotals = calculateTotals(lines);

  // Ajustar totais para valores negativos (NC)
  documentTotals.netTotal = formatCurrency(-parseFloat(documentTotals.netTotal));
  documentTotals.taxPayable = formatCurrency(-parseFloat(documentTotals.taxPayable));
  documentTotals.grossTotal = formatCurrency(-parseFloat(documentTotals.grossTotal));

  const document: Document = {
    documentNo,
    documentStatus: DocumentStatus.NORMAL,
    jwsDocumentSignature: '',
    documentDate: formatDocumentDate(documentDate),
    documentType: DocumentType.NOTA_CREDITO,
    eacCode: COMMON_CAE_CODES.COMERCIO_GERAL,
    systemEntryDate: generateTimestamp(documentDate),
    customerCountry: 'AO',
    customerTaxID: '987654321',
    companyName: 'EMPRESA TECNOLOGIAS AVANÇADAS, LDA',
    lines,
    documentTotals
  };

  document.jwsDocumentSignature = signDocument(document);

  return {
    schemaVersion: '1.0',
    submissionGUID: generateSubmissionGUID(),
    taxRegistrationNumber: SOFTWARE_CONFIG.emitterNIF,
    submissionTimeStamp: generateTimestamp(),
    softwareInfo: createSoftwareInfo(),
    numberOfEntries: 1,
    documents: [document]
  };
}

/**
 * ========================================
 * C5 - NOTA DE DÉBITO (ND)
 * ========================================
 * 
 * Documento que acrescenta valor a factura anterior.
 * Usado para juros, correções de preço, serviços extras.
 * 
 * Características:
 * - Referencia factura original (FT A/095)
 * - Motivo: Juros de mora por atraso no pagamento
 * - Valores positivos (débito adicional)
 * - Sem IVA (juros não têm IVA em Angola)
 * 
 * @returns Payload completo para envio
 */
export function generateNotaDebito(): RegistarFacturaRequest {
  const documentDate = new Date('2025-02-03');
  const documentNo = generateDocumentNumber('ND', 'A', 8);
  const referencedDocNo = 'FT A/000095'; // Factura original
  const referencedDocDate = '2024-12-15';

  // LINHA 1: Juros de mora (SEM IVA)
  const line1Calc = calculateLineTotal(1, 45000, 0); // Juros não têm IVA
  const line1: DocumentLine = {
    lineNumber: '1',
    productCode: 'JUROS-MORA',
    productDescription: 'Juros de mora por atraso de pagamento - 50 dias após vencimento',
    quantity: formatCurrency(1),
    unitOfMeasure: 'Unidade',
    unitPrice: formatCurrency(45000),
    referenceInfo: {
      reference: referencedDocNo,
      reason: ND_REASONS.JUROS_MORA
    },
    debitAmount: formatCurrency(line1Calc.subtotal),
    taxes: [createIVATax(line1Calc.subtotal, 0, TaxCode.ISENTO, 'M10')], // Isento
    settlementAmount: formatCurrency(line1Calc.total)
  };

  // LINHA 2: Despesas de cobrança
  const line2Calc = calculateLineTotal(1, 8000, 0);
  const line2: DocumentLine = {
    lineNumber: '2',
    productCode: 'DESP-COB',
    productDescription: 'Despesas administrativas de cobrança',
    quantity: formatCurrency(1),
    unitOfMeasure: 'Unidade',
    unitPrice: formatCurrency(8000),
    referenceInfo: {
      reference: referencedDocNo,
      reason: ND_REASONS.DESPESAS_EXTRAS
    },
    debitAmount: formatCurrency(line2Calc.subtotal),
    taxes: [createIVATax(line2Calc.subtotal, 0, TaxCode.ISENTO, 'M10')],
    settlementAmount: formatCurrency(line2Calc.total)
  };

  const lines = [line1, line2];
  const documentTotals = calculateTotals(lines);

  const document: Document = {
    documentNo,
    documentStatus: DocumentStatus.NORMAL,
    jwsDocumentSignature: '',
    documentDate: formatDocumentDate(documentDate),
    documentType: DocumentType.NOTA_DEBITO,
    eacCode: COMMON_CAE_CODES.CONSULTORIA,
    systemEntryDate: generateTimestamp(documentDate),
    customerCountry: 'AO',
    customerTaxID: '456789123',
    companyName: 'CONSTRUÇÕES E OBRAS GERAIS, LDA',
    lines,
    documentTotals
  };

  document.jwsDocumentSignature = signDocument(document);

  return {
    schemaVersion: '1.0',
    submissionGUID: generateSubmissionGUID(),
    taxRegistrationNumber: SOFTWARE_CONFIG.emitterNIF,
    submissionTimeStamp: generateTimestamp(),
    softwareInfo: createSoftwareInfo(),
    numberOfEntries: 1,
    documents: [document]
  };
}

/**
 * ========================================
 * C6 - RECIBO EM NUMERÁRIO (RC)
 * ========================================
 * 
 * Recibo de pagamento em dinheiro.
 * Referencia factura(s) paga(s).
 * 
 * Características:
 * - Cliente sem NIF (consumidor final)
 * - Pagamento parcial de múltiplas facturas
 * - sourceDocuments lista as facturas pagas
 * - Sem impostos (já foram facturados)
 * 
 * @returns Payload completo para envio
 */
export function generateReciboNumerario(): RegistarFacturaRequest {
  const documentDate = new Date('2025-02-03');
  const documentNo = generateDocumentNumber('RC', 'C', 256);

  // LINHA 1: Pagamento referente à FT A/080
  const payment1Amount = 250000; // AOA
  const line1: DocumentLine = {
    lineNumber: '1',
    productCode: 'PGTO-CASH',
    productDescription: 'Pagamento em numerário referente à Factura FT A/000080',
    quantity: formatCurrency(1),
    unitOfMeasure: 'Unidade',
    unitPrice: formatCurrency(payment1Amount),
    taxes: [], // Recibo não tem impostos
    settlementAmount: formatCurrency(payment1Amount)
  };

  // LINHA 2: Pagamento referente à FT A/081
  const payment2Amount = 180000; // AOA
  const line2: DocumentLine = {
    lineNumber: '2',
    productCode: 'PGTO-CASH',
    productDescription: 'Pagamento em numerário referente à Factura FT A/000081',
    quantity: formatCurrency(1),
    unitOfMeasure: 'Unidade',
    unitPrice: formatCurrency(payment2Amount),
    taxes: [],
    settlementAmount: formatCurrency(payment2Amount)
  };

  const lines = [line1, line2];

  // PaymentReceipt: lista de facturas pagas
  const paymentReceipt: PaymentReceipt = {
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

  const document: Document = {
    documentNo,
    documentStatus: DocumentStatus.NORMAL,
    jwsDocumentSignature: '',
    documentDate: formatDocumentDate(documentDate),
    documentType: DocumentType.RECIBO,
    eacCode: COMMON_CAE_CODES.COMERCIO_GERAL,
    systemEntryDate: generateTimestamp(documentDate),
    customerCountry: 'AO',
    customerTaxID: CONSUMIDOR_FINAL_NIF, // Consumidor final
    companyName: 'CONSUMIDOR FINAL',
    lines,
    paymentReceipt,
    documentTotals
  };

  document.jwsDocumentSignature = signDocument(document);

  return {
    schemaVersion: '1.0',
    submissionGUID: generateSubmissionGUID(),
    taxRegistrationNumber: SOFTWARE_CONFIG.emitterNIF,
    submissionTimeStamp: generateTimestamp(),
    softwareInfo: createSoftwareInfo(),
    numberOfEntries: 1,
    documents: [document]
  };
}

/**
 * ========================================
 * EXPORTAÇÃO DE TODOS OS CENÁRIOS
 * ========================================
 */

export interface TestScenario {
  code: string;
  name: string;
  description: string;
  generator: () => RegistarFacturaRequest;
}

/**
 * Array com todos os cenários de teste
 * Prontos para iteração em testes automatizados
 */
export const ALL_TEST_SCENARIOS: TestScenario[] = [
  {
    code: 'C1',
    name: 'Aviso de Cobrança',
    description: 'Cliente empresarial com NIF, múltiplas linhas de serviços, IVA 14%',
    generator: generateAvisoCobranca
  },
  {
    code: 'C2',
    name: 'Factura/Recibo',
    description: 'Consumidor final sem NIF, pagamento imediato, produtos com IVA',
    generator: generateFacturaRecibo
  },
  {
    code: 'C3',
    name: 'Factura',
    description: 'Cliente estrangeiro (Portugal), serviços, retenção na fonte de IVA',
    generator: generateFactura
  },
  {
    code: 'C4',
    name: 'Nota de Crédito',
    description: 'Devolução de mercadoria, referencia FT anterior, valores negativos',
    generator: generateNotaCredito
  },
  {
    code: 'C5',
    name: 'Nota de Débito',
    description: 'Juros de mora, referencia FT anterior, sem IVA em juros',
    generator: generateNotaDebito
  },
  {
    code: 'C6',
    name: 'Recibo em Numerário',
    description: 'Pagamento cash de múltiplas facturas, consumidor final',
    generator: generateReciboNumerario
  }
];
