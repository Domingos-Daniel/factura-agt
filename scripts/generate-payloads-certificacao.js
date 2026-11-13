/**
 * GERADOR DE PAYLOADS PARA CERTIFICAÇÃO AGT — SCHEMA 2.0
 * =====================================================
 * Cobre os 18 tipos de documento de facturação electrónica exigidos na
 * certificação ("Conformidade Estrutural e Cobertura de Regras de Facturação").
 *
 *   AC  Aviso de Cobrança
 *   AF  Factura/Recibo de Autofacturação
 *   AR  Aviso de Cobrança/Recibo
 *   CS  Imputação a Co-seguradoras
 *   FA  Factura de Adiantamento
 *   FG  Factura Global
 *   FR  Factura/Recibo
 *   FT  Factura
 *   GF  Factura Genérica
 *   LD  Imputação a Co-seguradora Líder
 *   NC  Nota de Crédito
 *   ND  Nota de Débito
 *   RA  Resseguro Aceite
 *   RC  Recibo em Numerário (cash)
 *   RE  Estorno ou Recibo de Estorno
 *   RG  Outros Recibos
 *   RP  Prémio ou Recibo de Prémio
 *   TV  Talão de Venda
 *
 * MUDANÇAS DO SCHEMA 2.0 (face a 1.0) — confirmadas na documentação oficial:
 *  https://portaldoparceiro.hml.minfin.gov.ao/doc-agt/faturacao-electronica/1/servicos/registar.html
 *  https://portaldoparceiro.hml.minfin.gov.ao/doc-agt/faturacao-electronica/1/estrutura.html
 *
 *  1. schemaVersion = "2.0".
 *  2. softwareInfoDetail exige "signatureVersion" (integer).
 *  3. Valores numéricos são NUMBER (não string com 2 decimais).
 *  4. Novo campo obrigatório por linha: "operationType" (SE, SS, STP, SR, SIF,
 *     SHS, ST, SG, TB, AS, QT, RD).
 *  5. "operationDate" obrigatório nas linhas de GF e FG.
 *  6. "unitPriceBase" = preço base SEM descontos; "unitPrice" = preço JÁ com
 *     descontos deduzidos; "settlementAmount" = total de descontos (0 se nenhum).
 *  7. "documentStatus" apenas N ou C. O estado S (Autofacturação) desapareceu;
 *     a autofacturação é identificada pelo documentType "AF".
 *  8. "documentCancelReason" deixou de existir.
 *  9. "referenceInfo" com "reference", "referenceItemLineNo" e "reason"
 *     (o portal exige referenceItemLineNo, apesar de a página o omitir).
 * 10. JWS em Base64URL (header.payload.signature), sem padding, tamanho variável.
 * 11. Moeda: com currencyCode != AOA, os totais estão NA DIVISA e
 *     currencyAmount = grossTotal x exchangeRate (contra-valor em Kwanzas).
 * 12. Regras E16/E17: NC tem de ter crédito < débito; qualquer outro documento
 *     tem de ter crédito > débito. Logo: NC usa debitAmount; os restantes usam
 *     creditAmount.
 *
 * Uso:  node scripts/generate-payloads-certificacao.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ---------------------------------------------------------------------------
// CONFIGURAÇÃO DO EMISSOR / SOFTWARE
// ---------------------------------------------------------------------------
const EMITTER_NIF = '5000660086';
// NIF real do adquirente, registado na AGT (evita o erro E11 - NIF desconhecido)
const CUSTOMER_NIF = '003043657LA038';
const SOFTWARE = {
  productId: 'SafeFacturas',
  productVersion: '1.0.1',
  softwareValidationNumber: 'FE/BB/AGT/2026',
  signatureVersion: 1,
};
const SCHEMA_VERSION = '2.0';

// Data de referência dos documentos de teste
const DOC_DATE = '2026-03-02';
const ENTRY_TS = '2026-03-02T09:15:30Z';
const SUBMISSION_TS = '2026-03-02T09:15:35Z';

const OUT_DIR = path.join(__dirname, '..', 'data', 'test-payloads');

const ALLOWED_TYPES = [
  'FA', 'FT', 'FR', 'FG', 'GF', 'AC', 'AR', 'TV', 'RC', 'RG',
  'RE', 'ND', 'NC', 'AF', 'RP', 'RA', 'CS', 'LD',
];
const RECEIPT_TYPES = ['AR', 'RC', 'RG']; // sem lines, com paymentReceipt
const OPERATION_TYPES = [
  'SE', 'SS', 'STP', 'SR', 'SIF', 'SHS', 'ST', 'SG', 'TB', 'AS', 'QT', 'RD',
];

// ---------------------------------------------------------------------------
// HELPERS NUMÉRICOS
// ---------------------------------------------------------------------------
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
/** Arredondamento POR EXCESSO ao cêntimo, conforme regra do taxContribution. */
const ceil2 = (n) => Math.ceil((n - 1e-9) * 100) / 100;

// ---------------------------------------------------------------------------
// ASSINATURAS JWS (mock estrutural em Base64URL, sem padding)
// Em produção usar RSA-SHA256 com a chave privada real:
//   - jwsSoftwareSignature -> chave do PRODUTOR
//   - jwsDocumentSignature -> chave do EMISSOR
// ---------------------------------------------------------------------------
const b64url = (buf) =>
  Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/**
 * Constrói um JWS Compact Serialization (header.payload.signature) em Base64URL.
 * A assinatura é um mock determinístico de 2048 bits (256 bytes) — NÃO valida
 * criptograficamente; serve apenas para a estrutura do payload.
 */
function mockJws(payload) {
  const header = { alg: 'RS256', typ: 'JWT' };
  const encodedHeader = b64url(JSON.stringify(header));
  const encodedPayload = b64url(JSON.stringify(payload));

  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const chunks = [];
  for (let i = 0; i < 8; i++) {
    chunks.push(crypto.createHash('sha256').update(`${signingInput}#${i}`).digest());
  }
  const signature = b64url(Buffer.concat(chunks)); // 256 bytes -> 342 chars base64url
  return `${signingInput}.${signature}`;
}

// ---------------------------------------------------------------------------
// CONSTRUÇÃO DE LINHAS E IMPOSTOS
// ---------------------------------------------------------------------------
/**
 * taxes: [{ type, code, pct, exemption? }]
 *   type -> IVA | IS | IEC | CEOC | NS
 */
function buildLine(n, spec) {
  const qty = spec.qty;
  const base = spec.unitPriceBase !== undefined ? spec.unitPriceBase : spec.unitPrice;
  const net = round2(qty * base);

  // O IVA incide sobre a base JÁ ACRESCIDA do IEC/CEOC (imposto sobre imposto),
  // regra aplicada pelo portal AGT na certificação. O IS não entra nesta base.
  const amounts = new Array(spec.taxes.length).fill(null);
  let exciseSum = 0;

  spec.taxes.forEach((t, i) => {
    if (t.type === 'IVA') return; // calculado na 2.ª passagem
    amounts[i] = t.fixed !== undefined ? ceil2(t.fixed * qty) : ceil2((net * t.pct) / 100);
    if (t.type === 'IEC' || t.type === 'CEOC') exciseSum += amounts[i];
  });

  spec.taxes.forEach((t, i) => {
    if (t.type !== 'IVA') return;
    const taxableBase = round2(net + exciseSum);
    amounts[i] = t.fixed !== undefined ? ceil2(t.fixed * qty) : ceil2((taxableBase * t.pct) / 100);
  });

  const taxes = spec.taxes.map((t, i) => {
    const tax = {
      taxType: t.type,
      taxCountryRegion: 'AO',
      taxCode: t.code,
      taxPercentage: t.pct !== undefined ? t.pct : 0,
      taxContribution: amounts[i],
    };
    if (t.exemption) tax.taxExemptionCode = t.exemption;
    return tax;
  });

  const line = {
    lineNumber: n,
    operationType: spec.operationType,
    ...(spec.operationDate && { operationDate: spec.operationDate }),
    productCode: spec.code,
    productDescription: spec.desc,
    quantity: qty,
    unitOfMeasure: spec.unit,
    unitPriceBase: base,
    unitPrice: base,
  };

  if (spec.reference) {
    // O portal AGT exige referenceItemLineNo (a página da documentação omite-o)
    line.referenceInfo = {
      reference: spec.reference.reference,
      referenceItemLineNo: spec.reference.lineNo !== undefined ? spec.reference.lineNo : 1,
      ...(spec.reference.reason && { reason: spec.reference.reason }),
    };
  }

  // Só um de debitAmount / creditAmount (regra da especificação)
  const amountField = spec.amountField || 'creditAmount';
  line[amountField] = net;
  line.taxes = taxes;
  line.settlementAmount = spec.settlementAmount || 0;

  return { line, net, taxSum: taxes.reduce((s, t) => s + t.taxContribution, 0) };
}

function signDocument(doc) {
  return mockJws({
    documentNo: doc.documentNo,
    taxRegistrationNumber: EMITTER_NIF,
    documentType: doc.documentType,
    documentDate: doc.documentDate,
    customerTaxID: doc.customerTaxID,
    customerCountry: doc.customerCountry,
    companyName: doc.companyName,
    documentTotals: doc.documentTotals,
  });
}

function buildDocument(def) {
  const built = def.lines.map((spec, i) => buildLine(i + 1, spec));
  const lines = built.map((b) => b.line);
  const netTotal = round2(built.reduce((s, b) => s + b.net, 0));
  const taxPayable = round2(built.reduce((s, b) => s + b.taxSum, 0));
  const grossTotal = round2(netTotal + taxPayable);

  const document = {
    documentNo: def.documentNo,
    documentStatus: def.status || 'N',
    ...(def.rejectedDocumentNo && { rejectedDocumentNo: def.rejectedDocumentNo }),
    jwsDocumentSignature: '',
    documentDate: def.documentDate || DOC_DATE,
    documentType: def.type,
    eacCode: def.eacCode,
    systemEntryDate: def.systemEntryDate || ENTRY_TS,
    customerCountry: def.customer.country,
    customerTaxID: def.customer.nif,
    companyName: def.customer.name,
    lines,
    documentTotals: {
      taxPayable,
      netTotal,
      grossTotal,
      ...(def.currency && {
        currency: {
          currencyCode: def.currency.code,
          // Validado pelo portal AGT (E25): grossTotal em AOA = currencyAmount x exchangeRate
          currencyAmount: round2(grossTotal / def.currency.rate),
          exchangeRate: def.currency.rate,
        },
      }),
    },
    ...(def.withholding && { withholdingTaxList: def.withholding }),
  };

  document.jwsDocumentSignature = signDocument(document);
  return { document, netTotal, taxPayable, grossTotal };
}

/** Recibo: sem linhas, totais apurados a partir dos documentos de origem. */
function buildReceiptDocument(def) {
  const sources = def.sourceDocuments.map((s, i) => ({
    lineNo: i + 1,
    sourceDocumentID: {
      originatingON: s.originatingON,
      documentDate: s.documentDate,
    },
    [s.amountField || 'creditAmount']: s.net,
  }));

  const netTotal = round2(def.sourceDocuments.reduce((sum, s) => sum + s.net, 0));
  const taxPayable = round2(def.sourceDocuments.reduce((sum, s) => sum + s.tax, 0));
  const grossTotal = round2(netTotal + taxPayable);

  const document = {
    documentNo: def.documentNo,
    documentStatus: def.status || 'N',
    jwsDocumentSignature: '',
    documentDate: def.documentDate || DOC_DATE,
    documentType: def.type,
    eacCode: def.eacCode,
    systemEntryDate: def.systemEntryDate || ENTRY_TS,
    customerCountry: def.customer.country,
    customerTaxID: def.customer.nif,
    companyName: def.customer.name,
    paymentReceipt: { sourceDocuments: sources },
    documentTotals: { taxPayable, netTotal, grossTotal },
  };

  document.jwsDocumentSignature = signDocument(document);
  return { document, netTotal, taxPayable, grossTotal };
}

function wrap(document) {
  return {
    schemaVersion: SCHEMA_VERSION,
    submissionUUID: crypto.randomUUID(), // UUID v4
    taxRegistrationNumber: EMITTER_NIF,
    submissionTimeStamp: SUBMISSION_TS,
    softwareInfo: {
      softwareInfoDetail: { ...SOFTWARE },
      jwsSoftwareSignature: mockJws({ ...SOFTWARE }),
    },
    numberOfEntries: 1,
    documents: [document],
  };
}

// ---------------------------------------------------------------------------
// CLIENTES
// ---------------------------------------------------------------------------
// Todos os adquirentes usam o NIF real registado na AGT (CUSTOMER_NIF).
// Mantêm-se nomes distintos para dar realismo aos cenários de certificação.
const C = {
  construtora: { name: 'CONSTRUTORA NOVA LUANDA, LDA', nif: CUSTOMER_NIF, country: 'AO' },
  adquirenteAutofact: { name: 'EMPRESA ADQUIRENTE - AUTOFACTURAÇÃO, LDA', nif: CUSTOMER_NIF, country: 'AO' },
  seguradoraCo: { name: 'SEGURADORA CO-SEGURADORA ANGOLA, S.A.', nif: CUSTOMER_NIF, country: 'AO' },
  industrial: { name: 'INDUSTRIAL KILAMBA, S.A.', nif: CUSTOMER_NIF, country: 'AO' },
  consumidor: { name: 'CONSUMIDOR FINAL', nif: CUSTOMER_NIF, country: 'AO' },
  distribuidora: { name: 'DISTRIBUIDORA CENTRAL DO HUAMBO, LDA', nif: CUSTOMER_NIF, country: 'AO' },
  corporativo: { name: 'CLIENTE CORPORATIVO LUANDA, S.A.', nif: CUSTOMER_NIF, country: 'AO' },
  seguradoraLider: { name: 'SEGURADORA LÍDER DE ANGOLA, S.A.', nif: CUSTOMER_NIF, country: 'AO' },
  resseguradora: { name: 'RESSEGURADORA ATLÂNTICO, S.A.', nif: CUSTOMER_NIF, country: 'AO' },
  associacao: { name: 'ASSOCIAÇÃO DE MORADORES DO TALATONA', nif: CUSTOMER_NIF, country: 'AO' },
  particular: { name: 'JOSÉ MANUEL DOS SANTOS', nif: CUSTOMER_NIF, country: 'AO' },
};

// ---------------------------------------------------------------------------
// DEFINIÇÃO DOS 18 DOCUMENTOS
// ---------------------------------------------------------------------------
const DEFS = [
  // ---------------------------------------------------------------- AC ----
  {
    file: 'CERT_AC_Aviso_Cobranca.json',
    label: 'Aviso de Cobrança',
    type: 'AC',
    documentNo: 'AC 2026A/000201',
    eacCode: '70220',
    customer: C.construtora,
    lines: [
      {
        op: 'SG',
        code: 'SERV-MAN-001',
        desc: 'Manutenção preventiva de equipamentos industriais - contrato mensal',
        qty: 2, unit: 'Serviço', unitPrice: 75000,
        taxes: [{ type: 'IVA', code: 'NOR', pct: 14 }],
      },
      {
        op: 'TB',
        code: 'PROD-PEC-014',
        desc: 'Peças de substituição - kit de vedantes e rolamentos',
        qty: 1, unit: 'Kit', unitPrice: 45000,
        taxes: [{ type: 'IVA', code: 'NOR', pct: 14 }],
      },
    ],
  },

  // ---------------------------------------------------------------- AF ----
  {
    file: 'CERT_AF_Autofacturacao.json',
    label: 'Factura/Recibo de Autofacturação',
    type: 'AF',
    documentNo: 'AF 2026A/000012',
    eacCode: '70220',
    customer: C.adquirenteAutofact,
    lines: [
      {
        op: 'SG',
        code: 'SERV-CONS-220',
        desc: 'Prestação de serviços de consultoria - autofacturação pelo adquirente',
        qty: 1, unit: 'Serviço', unitPrice: 480000,
        taxes: [{ type: 'IVA', code: 'NOR', pct: 14 }],
      },
    ],
    withholding: [
      {
        withholdingTaxType: 'IVA',
        withholdingTaxDescription: 'Retenção de IVA na fonte - 6,5% do imposto (art. 26.º do CIVA)',
        withholdingTaxAmount: 4368,
      },
    ],
  },

  // ---------------------------------------------------------------- AR ----
  {
    file: 'CERT_AR_Aviso_Cobranca_Recibo.json',
    label: 'Aviso de Cobrança/Recibo',
    type: 'AR',
    documentNo: 'AR 2026A/000045',
    eacCode: '70220',
    customer: C.construtora,
    receipt: true,
    sourceDocuments: [
      { originatingON: 'AC 2026A/000180', documentDate: '2026-02-10', net: 195000, tax: 27300 },
      { originatingON: 'AC 2026A/000181', documentDate: '2026-02-18', net: 120000, tax: 16800 },
    ],
  },

  // ---------------------------------------------------------------- CS ----
  {
    file: 'CERT_CS_Imputacao_Co_Seguradoras.json',
    label: 'Imputação a Co-seguradoras',
    type: 'CS',
    documentNo: 'CS 2026A/000007',
    eacCode: '65120',
    customer: C.seguradoraCo,
    lines: [
      {
        op: 'SIF',
        code: 'APOL-INC-2026-0042',
        desc: 'Prémio de seguro multirriscos - apólice INC-2026-0042 - quota-parte 40%',
        qty: 1, unit: 'Apólice', unitPrice: 1200000,
        taxes: [{ type: 'IS', code: '22.1.5', pct: 0.3 }],
      },
      {
        op: 'SG',
        code: 'ENC-GEST-001',
        desc: 'Encargos de gestão de co-seguro',
        qty: 1, unit: 'Serviço', unitPrice: 25000,
        taxes: [{ type: 'IVA', code: 'NOR', pct: 14 }],
      },
    ],
  },

  // ---------------------------------------------------------------- FA ----
  {
    file: 'CERT_FA_Factura_Adiantamento.json',
    label: 'Factura de Adiantamento',
    type: 'FA',
    documentNo: 'FA 2026A/000033',
    eacCode: '46630',
    customer: C.industrial,
    lines: [
      {
        op: 'SG',
        code: 'ADIANT-ENC-118',
        desc: 'Adiantamento de 30% sobre a encomenda ENC-2026-118 - fornecimento de equipamentos',
        qty: 1, unit: 'Serviço', unitPrice: 900000,
        taxes: [{ type: 'IVA', code: 'NOR', pct: 14 }],
      },
    ],
  },

  // ---------------------------------------------------------------- FG ----
  {
    file: 'CERT_FG_Factura_Global.json',
    label: 'Factura Global',
    type: 'FG',
    documentNo: 'FG 2026A/000128',
    eacCode: '47190',
    customer: C.consumidor,
    lines: [
      {
        op: 'TB',
        code: 'VEN-DIA-0228',
        desc: 'Vendas a dinheiro consolidadas - 28/02/2026',
        qty: 1, unit: 'Serviço', unitPrice: 320000,
        operationDate: '2026-02-28',
        taxes: [{ type: 'IVA', code: 'NOR', pct: 14 }],
      },
      {
        op: 'TB',
        code: 'VEN-DIA-0301',
        desc: 'Vendas a dinheiro consolidadas - 01/03/2026',
        qty: 1, unit: 'Serviço', unitPrice: 285000,
        operationDate: '2026-03-01',
        taxes: [{ type: 'IVA', code: 'NOR', pct: 14 }],
      },
      {
        op: 'TB',
        code: 'VEN-ALIM-0301',
        desc: 'Vendas de bens alimentares isentos - 01/03/2026',
        qty: 1, unit: 'Serviço', unitPrice: 40000,
        operationDate: '2026-03-01',
        taxes: [{ type: 'IVA', code: 'ISE', pct: 0, exemption: 'M10' }],
      },
    ],
  },

  // ---------------------------------------------------------------- FR ----
  {
    file: 'CERT_FR_Factura_Recibo.json',
    label: 'Factura/Recibo',
    type: 'FR',
    documentNo: 'FR 2026B/000042',
    eacCode: '47190',
    customer: C.distribuidora,
    lines: [
      {
        op: 'TB',
        code: 'PROD-MON-001',
        desc: 'Monitor LED 27" Full HD',
        qty: 4, unit: 'Unidade', unitPrice: 42000,
        taxes: [{ type: 'IVA', code: 'NOR', pct: 14 }],
      },
      {
        op: 'TB',
        code: 'PROD-IMP-002',
        desc: 'Impressora multifunções laser monocromática',
        qty: 1, unit: 'Unidade', unitPrice: 180000,
        taxes: [{ type: 'IVA', code: 'NOR', pct: 14 }],
      },
    ],
  },

  // ---------------------------------------------------------------- FT ----
  // Factura em divisa (EUR). Totais SEMPRE em AOA (convenção SAF-T/AO):
  //   grossTotal (AOA) = currencyAmount (EUR) x exchangeRate
  // Taxa escolhida para a divisão ser exacta: 1.539.000 / 900 = 1.710,00 EUR.
  {
    file: 'CERT_FT_Factura.json',
    label: 'Factura',
    type: 'FT',
    documentNo: 'FT 2026A/000125',
    eacCode: '70220',
    customer: C.corporativo,
    currency: { code: 'EUR', rate: 900 },
    lines: [
      {
        op: 'SG',
        code: 'SERV-AUD-001',
        desc: 'Auditoria financeira e revisão de contas - exercício 2025',
        qty: 40, unit: 'Hora', unitPrice: 25000,
        taxes: [{ type: 'IVA', code: 'NOR', pct: 14 }],
      },
      {
        op: 'SG',
        code: 'SERV-REL-001',
        desc: 'Relatório executivo de auditoria e recomendações',
        qty: 1, unit: 'Unidade', unitPrice: 350000,
        taxes: [{ type: 'IVA', code: 'NOR', pct: 14 }],
      },
    ],
    withholding: [
      {
        withholdingTaxType: 'IVA',
        withholdingTaxDescription: 'Retenção de IVA na fonte - 6,5% do imposto (art. 26.º do CIVA)',
        withholdingTaxAmount: 12285,
      },
    ],
  },

  // ---------------------------------------------------------------- GF ----
  {
    file: 'CERT_GF_Factura_Generica.json',
    label: 'Factura Genérica',
    type: 'GF',
    documentNo: 'GF 2026A/000501',
    eacCode: '47190',
    customer: C.consumidor,
    lines: [
      {
        op: 'TB',
        code: 'GEN-001',
        desc: 'Venda de mercadoria diversa - documento genérico',
        qty: 1, unit: 'Serviço', unitPrice: 75000,
        operationDate: '2026-03-02',
        taxes: [{ type: 'IVA', code: 'NOR', pct: 14 }],
      },
    ],
  },

  // ---------------------------------------------------------------- LD ----
  {
    file: 'CERT_LD_Imputacao_Co_Seguradora_Lider.json',
    label: 'Imputação a Co-seguradora Líder',
    type: 'LD',
    documentNo: 'LD 2026A/000003',
    eacCode: '65120',
    customer: C.seguradoraLider,
    lines: [
      {
        op: 'SIF',
        code: 'APOL-INC-2026-0042-LID',
        desc: 'Prémio de seguro multirriscos - apólice INC-2026-0042 - quota-parte líder 100%',
        qty: 1, unit: 'Apólice', unitPrice: 3000000,
        taxes: [{ type: 'IS', code: '22.1.5', pct: 0.3 }],
      },
      {
        op: 'SIF',
        code: 'COM-MED-001',
        desc: 'Comissão de mediação de seguros',
        qty: 1, unit: 'Serviço', unitPrice: 150000,
        taxes: [{ type: 'IVA', code: 'NOR', pct: 14 }],
      },
    ],
  },

  // ---------------------------------------------------------------- NC ----
  // Regra E16: NC tem de ter crédito < débito -> usa debitAmount.
  {
    file: 'CERT_NC_Nota_Credito.json',
    label: 'Nota de Crédito',
    type: 'NC',
    documentNo: 'NC 2026A/000015',
    eacCode: '47190',
    customer: C.distribuidora,
    lines: [
      {
        op: 'TB',
        code: 'PROD-NB-001',
        desc: 'Notebook Dell Latitude 5520 - devolução por defeito de fabrico',
        qty: 1, unit: 'Unidade', unitPrice: 185000,
        amountField: 'debitAmount',
        reference: {
          reference: 'FT 2026A/000100',
          lineNo: 1,
          reason: 'Devolução de mercadoria por defeito',
        },
        taxes: [{ type: 'IVA', code: 'NOR', pct: 14 }],
      },
    ],
  },

  // ---------------------------------------------------------------- ND ----
  {
    file: 'CERT_ND_Nota_Debito.json',
    label: 'Nota de Débito',
    type: 'ND',
    documentNo: 'ND 2026A/000008',
    eacCode: '70220',
    customer: C.construtora,
    lines: [
      {
        op: 'SG',
        code: 'JUROS-MORA',
        desc: 'Juros de mora por atraso de pagamento - 50 dias após vencimento',
        qty: 1, unit: 'Serviço', unitPrice: 45000,
        reference: { reference: 'FT 2026A/000095', lineNo: 1, reason: 'Juros de mora' },
        taxes: [{ type: 'IVA', code: 'ISE', pct: 0, exemption: 'M10' }],
      },
      {
        op: 'RD',
        code: 'DESP-COB',
        desc: 'Despesas administrativas de cobrança',
        qty: 1, unit: 'Serviço', unitPrice: 8000,
        reference: { reference: 'FT 2026A/000095', lineNo: 2, reason: 'Despesas de cobrança' },
        taxes: [{ type: 'IVA', code: 'ISE', pct: 0, exemption: 'M10' }],
      },
    ],
  },

  // ---------------------------------------------------------------- RA ----
  {
    file: 'CERT_RA_Resseguro_Aceite.json',
    label: 'Resseguro Aceite',
    type: 'RA',
    documentNo: 'RA 2026A/000019',
    eacCode: '65200',
    customer: C.resseguradora,
    lines: [
      {
        op: 'SIF',
        code: 'RES-CED-001',
        desc: 'Prémio de resseguro aceite - tratado proporcional 2026',
        qty: 1, unit: 'Tratado', unitPrice: 2400000,
        taxes: [{ type: 'IS', code: '22.1.5', pct: 0.3 }],
      },
      {
        op: 'SIF',
        code: 'RES-COM-001',
        desc: 'Comissão de resseguro',
        qty: 1, unit: 'Serviço', unitPrice: 60000,
        taxes: [{ type: 'IVA', code: 'NOR', pct: 14 }],
      },
    ],
  },

  // ---------------------------------------------------------------- RC ----
  {
    file: 'CERT_RC_Recibo_Numerario.json',
    label: 'Recibo em numerário (cash)',
    type: 'RC',
    documentNo: 'RC 2026C/000256',
    eacCode: '47190',
    customer: C.consumidor,
    receipt: true,
    sourceDocuments: [
      { originatingON: 'FT 2026A/000080', documentDate: '2026-01-20', net: 250000, tax: 35000 },
      { originatingON: 'FT 2026A/000081', documentDate: '2026-01-22', net: 180000, tax: 25200 },
    ],
  },

  // ---------------------------------------------------------------- RE ----
  // Documento que não é NC -> regra E17 obriga a crédito > débito.
  {
    file: 'CERT_RE_Estorno.json',
    label: 'Estorno ou Recibo de Estorno',
    type: 'RE',
    documentNo: 'RE 2026C/000257',
    eacCode: '47190',
    customer: C.consumidor,
    lines: [
      {
        op: 'SG',
        code: 'EST-RC-256',
        desc: 'Estorno integral do recibo RC 2026C/000256 - anulação de recebimento em numerário',
        qty: 1, unit: 'Serviço', unitPrice: 430000,
        reference: { reference: 'RC 2026C/000256', lineNo: 1, reason: 'Estorno integral do recibo' },
        taxes: [{ type: 'IVA', code: 'NOR', pct: 14 }],
      },
    ],
  },

  // ---------------------------------------------------------------- RG ----
  {
    file: 'CERT_RG_Outros_Recibos.json',
    label: 'Outros recibos',
    type: 'RG',
    documentNo: 'RG 2026C/000311',
    eacCode: '47190',
    customer: C.associacao,
    receipt: true,
    sourceDocuments: [
      { originatingON: 'FT 2026A/000101', documentDate: '2026-02-26', net: 150000, tax: 21000 },
      { originatingON: 'FT 2026A/000102', documentDate: '2026-02-27', net: 90000, tax: 12600 },
    ],
  },

  // ---------------------------------------------------------------- RP ----
  {
    file: 'CERT_RP_Premio_Recibo_Premio.json',
    label: 'Prémio ou Recibo de Prémio',
    type: 'RP',
    documentNo: 'RP 2026A/000074',
    eacCode: '65120',
    customer: C.particular,
    lines: [
      {
        op: 'SIF',
        code: 'APOL-AUTO-2026-7781',
        desc: 'Prémio de seguro automóvel - apólice AUTO-2026-7781',
        qty: 1, unit: 'Apólice', unitPrice: 480000,
        taxes: [{ type: 'IS', code: '22.1.5', pct: 0.3 }],
      },
      {
        op: 'SIF',
        code: 'ENC-APOL-001',
        desc: 'Custo da apólice e taxas administrativas',
        qty: 1, unit: 'Serviço', unitPrice: 12000,
        taxes: [{ type: 'IS', code: '22.1.5', pct: 0.3 }],
      },
    ],
  },

  // ---------------------------------------------------------------- TV ----
  {
    file: 'CERT_TV_Talao_Venda.json',
    label: 'Talão de Venda',
    type: 'TV',
    documentNo: 'TV 2026A/001842',
    eacCode: '47190',
    customer: C.consumidor,
    lines: [
      {
        op: 'TB',
        code: 'TAL-001',
        desc: 'Arroz agulha 5kg - bem alimentar isento',
        qty: 3, unit: 'Unidade', unitPrice: 4500,
        taxes: [{ type: 'IVA', code: 'ISE', pct: 0, exemption: 'M10' }],
      },
      {
        op: 'TB',
        code: 'TAL-002',
        desc: 'Bebida não alcoólica 1,5L',
        qty: 6, unit: 'Unidade', unitPrice: 1200,
        taxes: [{ type: 'IVA', code: 'NOR', pct: 14 }],
      },
      {
        op: 'TB',
        code: 'TAL-003',
        desc: 'Cerveja nacional - garrafa 0,33L',
        qty: 24, unit: 'Unidade', unitPrice: 800,
        taxes: [
          { type: 'IVA', code: 'NOR', pct: 14 },
          { type: 'IEC', code: '2203', pct: 30 },
        ],
      },
    ],
  },
];

// Mapeia `op` para `operationType` (clareza na definição acima)
for (const def of DEFS) {
  if (def.lines) {
    for (const l of def.lines) {
      l.operationType = l.op;
      delete l.op;
    }
  }
}

// ---------------------------------------------------------------------------
// GERAÇÃO
// ---------------------------------------------------------------------------
function build() {
  const outputs = [];

  for (const def of DEFS) {
    const result = def.receipt ? buildReceiptDocument(def) : buildDocument(def);
    outputs.push({ def, payload: wrap(result.document), ...result });
  }

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const out of outputs) {
    fs.writeFileSync(
      path.join(OUT_DIR, out.def.file),
      JSON.stringify(out.payload, null, 2) + '\n',
      'utf8'
    );
  }

  fs.writeFileSync(
    path.join(OUT_DIR, '_ALL_PAYLOADS_CERTIFICACAO.json'),
    JSON.stringify(outputs.map((o) => o.payload), null, 2) + '\n',
    'utf8'
  );

  const index = outputs.map((o) => ({
    file: o.def.file,
    documentType: o.def.type,
    documentStatus: o.payload.documents[0].documentStatus,
    documentNo: o.def.documentNo,
    label: o.def.label,
    hasLines: !o.def.receipt,
    hasPaymentReceipt: !!o.def.receipt,
    netTotal: o.netTotal,
    taxPayable: o.taxPayable,
    grossTotal: o.grossTotal,
    currency: o.def.currency ? o.def.currency.code : 'AOA',
  }));

  fs.writeFileSync(
    path.join(OUT_DIR, '_INDEX_CERTIFICACAO.json'),
    JSON.stringify(index, null, 2) + '\n',
    'utf8'
  );

  return outputs;
}

module.exports = {
  build, DEFS, ALLOWED_TYPES, RECEIPT_TYPES, OPERATION_TYPES, OUT_DIR, SCHEMA_VERSION,
};

if (require.main === module) {
  const outputs = build();
  console.log('\nPayloads (schema 2.0) gerados em:', OUT_DIR, '\n');
  console.log('TIPO  DOCUMENTO                        STATUS  LINES  RECIBO  NET         IMPOSTOS     BRUTO');
  console.log('-'.repeat(104));
  for (const o of outputs) {
    const d = o.payload.documents[0];
    console.log(
      [
        o.def.type.padEnd(5),
        (o.def.documentNo || '').padEnd(32),
        d.documentStatus.padEnd(7),
        String(d.lines ? d.lines.length : 0).padEnd(6),
        (d.paymentReceipt ? 'sim' : 'nao').padEnd(7),
        o.netTotal.toFixed(2).padStart(11),
        o.taxPayable.toFixed(2).padStart(11),
        o.grossTotal.toFixed(2).padStart(11),
      ].join(' ')
    );
  }
  console.log('\nTotal de payloads:', outputs.length);
}
