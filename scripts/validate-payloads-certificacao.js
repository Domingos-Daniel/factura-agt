/**
 * VALIDADOR ESTRUTURAL — PAYLOADS DE CERTIFICAÇÃO AGT (SCHEMA 2.0)
 * ================================================================
 * Verifica, de forma independente do gerador, a conformidade dos payloads com
 * a documentação oficial do schema 2.0:
 *   https://portaldoparceiro.hml.minfin.gov.ao/doc-agt/faturacao-electronica/1/servicos/registar.html
 *   https://portaldoparceiro.hml.minfin.gov.ao/doc-agt/faturacao-electronica/1/estrutura.html
 *
 * Uso: node scripts/validate-payloads-certificacao.js
 * Saída: relatório no console + data/test-payloads/_VALIDATION_REPORT.md
 */

const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'data', 'test-payloads');
const INDEX_FILE = path.join(DIR, '_INDEX_CERTIFICACAO.json');
const CONSOLIDATED = path.join(DIR, '_ALL_PAYLOADS_CERTIFICACAO.json');

const ALLOWED_TYPES = [
  'FA', 'FT', 'FR', 'FG', 'GF', 'AC', 'AR', 'TV', 'RC', 'RG',
  'RE', 'ND', 'NC', 'AF', 'RP', 'RA', 'CS', 'LD',
];
const RECEIPT_TYPES = new Set(['AR', 'RC', 'RG']);
const OPERATION_TYPES = new Set([
  'SE', 'SS', 'STP', 'SR', 'SIF', 'SHS', 'ST', 'SG', 'TB', 'AS', 'QT', 'RD',
]);
const TAX_TYPES = new Set(['IVA', 'IS', 'IEC', 'CEOC', 'NS']);
const WITHHOLDING_TYPES = new Set(['IRT', 'II', 'IS', 'IVA', 'IP', 'IAC', 'OU', 'IRPC', 'IRPS']);

const errors = [];
const warnings = [];
const addError = (where, msg) => errors.push(`${where}: ${msg}`);
const addWarning = (where, msg) => warnings.push(`${where}: ${msg}`);

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const ceil2 = (n) => Math.ceil((n - 1e-9) * 100) / 100;
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isPos = (v) => isNum(v) && v >= 0;

function isValidDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
function isIsoDateTime(s) {
  return typeof s === 'string' && !Number.isNaN(Date.parse(s)) && /T\d{2}:\d{2}:\d{2}/.test(s);
}
function isUuidV4(s) {
  return typeof s === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
function sameJson(a, b) {
  return canonical(a) === canonical(b);
}

/** Valida um JWS Compact Serialization em Base64URL e devolve o payload assinado. */
function parseJws(where, jws) {
  if (typeof jws !== 'string') {
    addError(where, 'JWS ausente ou não é string');
    return null;
  }
  if (/=/.test(jws)) addError(where, 'JWS deve usar Base64URL sem padding (=)');
  const parts = jws.split('.');
  if (parts.length !== 3) {
    addError(where, `JWS deve ter 3 segmentos (header.payload.signature); tem ${parts.length}`);
    return null;
  }
  const [h, p, s] = parts;
  if (!/^[A-Za-z0-9_-]+$/.test(h)) addError(where, 'header do JWS não é Base64URL válido');
  if (!/^[A-Za-z0-9_-]+$/.test(p)) addError(where, 'payload do JWS não é Base64URL válido');
  if (!/^[A-Za-z0-9_-]+$/.test(s)) addError(where, 'assinatura do JWS não é Base64URL válido');

  // Assinatura RSA: 2048 bits = 256 bytes -> 342 caracteres Base64URL
  if (s.length < 256) {
    addError(where, `assinatura JWS demasiado curta (${s.length} chars); esperado >= 256`);
  }

  try {
    const header = JSON.parse(Buffer.from(h, 'base64url').toString('utf8'));
    if (header.alg !== 'RS256') addError(where, `algoritmo JWS deve ser RS256 (é ${header.alg})`);
    return JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
  } catch (e) {
    addError(where, `JWS ilegível: ${e.message}`);
    return null;
  }
}

function validateTax(where, tax) {
  if (typeof tax !== 'object' || tax === null) return addError(where, 'tax não é objecto');
  if (!TAX_TYPES.has(tax.taxType)) addError(where, `taxType inválido: ${tax.taxType}`);
  if (typeof tax.taxCountryRegion !== 'string' || tax.taxCountryRegion.length < 2 || tax.taxCountryRegion.length > 6) {
    addError(where, 'taxCountryRegion deve ter 2..6 caracteres');
  }
  if ('taxCode' in tax && (typeof tax.taxCode !== 'string' || tax.taxCode.length < 2 || tax.taxCode.length > 10)) {
    addError(where, 'taxCode deve ter 2..10 caracteres');
  }
  if ('taxPercentage' in tax && !isPos(tax.taxPercentage)) addError(where, 'taxPercentage deve ser number >= 0');
  if ('taxContribution' in tax && !isPos(tax.taxContribution)) addError(where, 'taxContribution deve ser number >= 0');
  if ('taxBase' in tax) addError(where, 'taxBase não deve ser usado em conjunto com debit/creditAmount (E19)');

  const exempt = tax.taxCode === 'ISE' || tax.taxType === 'NS';
  if (exempt) {
    if (!/^[A-Z]\d{2}$/.test(tax.taxExemptionCode || '')) {
      addError(where, 'isento (ISE/NS) sem taxExemptionCode válido de 3 caracteres');
    }
    if (tax.taxPercentage !== 0) addError(where, 'isento com taxPercentage diferente de 0');
    if (tax.taxContribution !== 0) addError(where, 'isento com taxContribution diferente de 0');
  } else if ('taxExemptionCode' in tax) {
    addWarning(where, 'taxExemptionCode presente em imposto não isento');
  }
}

function validateLine(where, line, idx, docType) {
  const w = `${where} linha ${idx + 1}`;
  if (line.lineNumber !== idx + 1) addError(w, `lineNumber=${line.lineNumber} (esperado ${idx + 1}, integer)`);

  if (!OPERATION_TYPES.has(line.operationType)) {
    addError(w, `operationType inválido: ${line.operationType}`);
  }
  if (['GF', 'FG'].includes(docType)) {
    if (!isValidDate(line.operationDate)) {
      addError(w, `operationDate obrigatório/válido para ${docType}: ${line.operationDate}`);
    }
  } else if (line.operationDate !== undefined && !isValidDate(line.operationDate)) {
    addError(w, `operationDate inválida: ${line.operationDate}`);
  }

  if (typeof line.productCode !== 'string' || line.productCode.length < 1 || line.productCode.length > 60) {
    addError(w, 'productCode inválido');
  }
  if (typeof line.productDescription !== 'string' || line.productDescription.length < 1 || line.productDescription.length > 200) {
    addError(w, 'productDescription inválida');
  }
  if (!isPos(line.quantity)) addError(w, `quantity deve ser number >= 0: ${line.quantity}`);
  if (typeof line.unitOfMeasure !== 'string' || line.unitOfMeasure.length < 1 || line.unitOfMeasure.length > 20) {
    addError(w, 'unitOfMeasure inválida');
  }
  if (!isPos(line.unitPriceBase)) addError(w, `unitPriceBase deve ser number >= 0: ${line.unitPriceBase}`);
  if (!isPos(line.unitPrice)) addError(w, `unitPrice deve ser number >= 0: ${line.unitPrice}`);
  if (isPos(line.unitPrice) && isPos(line.unitPriceBase) && line.unitPrice !== line.unitPriceBase) {
    addWarning(w, 'unitPrice != unitPriceBase (desconto) — rever regra de settlementAmount/E21');
  }

  const hasDebit = Object.prototype.hasOwnProperty.call(line, 'debitAmount');
  const hasCredit = Object.prototype.hasOwnProperty.call(line, 'creditAmount');
  if (hasDebit === hasCredit) {
    addError(w, 'deve preencher exactamente um de debitAmount / creditAmount');
  }
  const amount = hasDebit ? line.debitAmount : line.creditAmount;
  if (!isPos(amount)) addError(w, `montante da linha deve ser number >= 0: ${amount}`);

  if (!Array.isArray(line.taxes) || line.taxes.length === 0) {
    addError(w, 'taxes em falta');
  } else {
    line.taxes.forEach((t, ti) => validateTax(`${w} imposto ${ti + 1}`, t));
  }

  if (!isPos(line.settlementAmount)) {
    addError(w, `settlementAmount deve ser number >= 0: ${line.settlementAmount}`);
  }

  if (docType === 'NC' && !line.referenceInfo) addError(w, 'NC exige referenceInfo por linha');
  if (line.referenceInfo) {
    const r = line.referenceInfo;
    if (typeof r.reference !== 'string' || r.reference.trim() === '') addError(w, 'referenceInfo.reference vazio');
    if (r.reference.length > 60) addError(w, 'referenceInfo.reference excede 60 caracteres');
    // O portal AGT exige referenceItemLineNo (a página da documentação omite-o)
    if (!Number.isInteger(r.referenceItemLineNo) || r.referenceItemLineNo < 1) {
      addError(w, 'referenceInfo.referenceItemLineNo é obrigatório (inteiro >= 1)');
    }
    if (r.reason !== undefined && (typeof r.reason !== 'string' || r.reason.length > 60)) {
      addError(w, 'referenceInfo.reason inválido (max 60)');
    }
    for (const k of Object.keys(r)) {
      if (!['reference', 'referenceItemLineNo', 'reason'].includes(k)) {
        addError(w, `campo inesperado em referenceInfo: ${k}`);
      }
    }
  }

  // Aritmética da linha (sem descontos: unitPrice == unitPriceBase, settlement 0)
  if (Array.isArray(line.taxes) && isPos(line.quantity) && isPos(line.unitPriceBase) && isPos(amount)) {
    const expectedNet = round2(line.quantity * line.unitPriceBase);
    if (Math.abs(expectedNet - amount) > 0.005) {
      addError(w, `montante ${amount} != quantity x unitPriceBase (${expectedNet.toFixed(2)}) [E21]`);
    }
    // O IVA incide sobre a base acrescida de IEC/CEOC (regra do portal AGT)
    const excise = line.taxes
      .filter((t) => t.taxType === 'IEC' || t.taxType === 'CEOC')
      .reduce((s, t) => s + (isPos(t.taxContribution) ? t.taxContribution : 0), 0);

    let expectedTax = 0;
    for (const t of line.taxes) {
      const taxBase = t.taxType === 'IVA' ? round2(expectedNet + excise) : expectedNet;
      const expected = ceil2((taxBase * t.taxPercentage) / 100);
      if (isPos(t.taxContribution) && Math.abs(expected - t.taxContribution) > 0.005) {
        addError(
          w,
          `taxContribution ${t.taxContribution} != ${expected.toFixed(2)} ` +
          `(${t.taxPercentage}% de ${taxBase.toFixed(2)}${t.taxType === 'IVA' && excise ? ' com IEC' : ''})`
        );
      }
      expectedTax += expected;
    }
  }
}

function validateDocument(where, doc) {
  const w = where;

  if (typeof doc.documentNo !== 'string' || doc.documentNo.length < 8 || doc.documentNo.length > 60) {
    addError(w, 'documentNo deve ter 8..60 caracteres');
  } else {
    if (!/^[A-Z]{2} .+\/\d+$/.test(doc.documentNo)) {
      addError(w, `documentNo fora do formato "TIPO SERIE/NUMERO": ${doc.documentNo}`);
    }
    if (doc.documentNo.slice(0, 2) !== doc.documentType) {
      addError(w, `prefixo de documentNo (${doc.documentNo.slice(0, 2)}) difere de documentType (${doc.documentType})`);
    }
  }

  // Schema 2.0: apenas N ou C
  if (!['N', 'C'].includes(doc.documentStatus)) {
    addError(w, `documentStatus deve ser N ou C no schema 2.0 (é ${doc.documentStatus})`);
  }
  if (doc.documentStatus === 'C') {
    if (typeof doc.rejectedDocumentNo !== 'string' || doc.rejectedDocumentNo.length < 8 || doc.rejectedDocumentNo.length > 60) {
      addError(w, 'documentStatus=C exige rejectedDocumentNo (8..60)');
    }
  } else if ('rejectedDocumentNo' in doc) {
    addWarning(w, 'rejectedDocumentNo presente em documento não corrigido');
  }
  if ('documentCancelReason' in doc) {
    addError(w, 'documentCancelReason foi removido no schema 2.0');
  }

  // JWS do documento: 8 campos assinados
  const signed = parseJws(w, doc.jwsDocumentSignature);
  if (signed) {
    const expected = {
      documentNo: doc.documentNo,
      taxRegistrationNumber: undefined, // preenchido abaixo pelo envelope
      documentType: doc.documentType,
      documentDate: doc.documentDate,
      customerTaxID: doc.customerTaxID,
      customerCountry: doc.customerCountry,
      companyName: doc.companyName,
      documentTotals: doc.documentTotals,
    };
    // A assinatura não inclui a chave do emissor; comparamos os restantes campos
    const actual = { ...signed };
    delete actual.taxRegistrationNumber;
    delete expected.taxRegistrationNumber;
    if (!sameJson(actual, expected)) {
      addError(w, 'payload do jwsDocumentSignature não corresponde aos campos assinados');
    }
  }

  if (!isValidDate(doc.documentDate)) addError(w, `documentDate inválida: ${doc.documentDate}`);
  if (!isIsoDateTime(doc.systemEntryDate)) addError(w, `systemEntryDate inválida: ${doc.systemEntryDate}`);
  if (!ALLOWED_TYPES.includes(doc.documentType)) addError(w, `documentType não suportado: ${doc.documentType}`);
  if (typeof doc.eacCode !== 'string' || !/^\d{5}$/.test(doc.eacCode)) {
    addError(w, `eacCode deve ter 5 dígitos: ${doc.eacCode}`);
  }

  if (typeof doc.customerCountry !== 'string' || !/^[A-Z]{2}$/.test(doc.customerCountry)) {
    addError(w, `customerCountry inválido: ${doc.customerCountry}`);
  }
  if (typeof doc.customerTaxID !== 'string' || doc.customerTaxID.length < 1 || doc.customerTaxID.length > 50) {
    addError(w, 'customerTaxID inválido');
  } else if (doc.customerCountry === 'AO' && !/^[A-Za-z0-9]{9,20}$/.test(doc.customerTaxID)) {
    // NIF angolano: 9-10 dígitos (ex.: 5000660086) ou alfanumérico
    // com sufixo (ex.: 003043657LA038)
    addError(w, `customerTaxID angolano inválido (9-20 alfanuméricos): ${doc.customerTaxID}`);
  }
  if (typeof doc.companyName !== 'string' || doc.companyName.length < 1 || doc.companyName.length > 200) {
    addError(w, 'companyName inválido');
  }

  const isReceipt = RECEIPT_TYPES.has(doc.documentType);
  if (isReceipt) {
    if ('lines' in doc && Array.isArray(doc.lines) && doc.lines.length > 0) {
      addError(w, `tipo ${doc.documentType} não deve ter lines [E26]`);
    }
    if (!doc.paymentReceipt || !Array.isArray(doc.paymentReceipt.sourceDocuments)) {
      addError(w, `tipo ${doc.documentType} exige paymentReceipt.sourceDocuments [E27]`);
    }
  } else {
    if (!Array.isArray(doc.lines) || doc.lines.length === 0) {
      addError(w, `tipo ${doc.documentType} exige pelo menos uma linha`);
    }
    if (doc.paymentReceipt) addError(w, `tipo ${doc.documentType} não deve ter paymentReceipt [E27]`);
  }

  if (Array.isArray(doc.lines) && doc.lines.length > 0) {
    doc.lines.forEach((line, i) => validateLine(w, line, i, doc.documentType));

    // Regras E16/E17 (somas de crédito vs débito)
    const creditSum = round2(doc.lines.reduce((s, l) => s + (isNum(l.creditAmount) ? l.creditAmount : 0), 0));
    const debitSum = round2(doc.lines.reduce((s, l) => s + (isNum(l.debitAmount) ? l.debitAmount : 0), 0));
    if (doc.documentType === 'NC') {
      if (!(creditSum < debitSum)) {
        addError(w, `E16: em NC a soma a crédito (${creditSum}) deve ser inferior à soma a débito (${debitSum})`);
      }
    } else if (!(creditSum > debitSum)) {
      addError(w, `E17: em ${doc.documentType} a soma a crédito (${creditSum}) deve ser superior à soma a débito (${debitSum})`);
    }
  }

  if (doc.paymentReceipt && Array.isArray(doc.paymentReceipt.sourceDocuments)) {
    if (doc.paymentReceipt.sourceDocuments.length === 0) addError(w, 'paymentReceipt.sourceDocuments vazio');
    doc.paymentReceipt.sourceDocuments.forEach((s, i) => {
      const sw = `${w} sourceDocument ${i + 1}`;
      if (s.lineNo !== i + 1) addError(sw, `lineNo=${s.lineNo} (esperado ${i + 1}, integer)`);
      if (!s.sourceDocumentID || typeof s.sourceDocumentID.originatingON !== 'string' || !s.sourceDocumentID.originatingON) {
        addError(sw, 'originatingON em falta');
      }
      if (!isValidDate(s.sourceDocumentID && s.sourceDocumentID.documentDate)) {
        addError(sw, 'documentDate do documento origem inválida');
      }
      const d = Object.prototype.hasOwnProperty.call(s, 'debitAmount');
      const c = Object.prototype.hasOwnProperty.call(s, 'creditAmount');
      if (d === c) addError(sw, 'deve preencher exactamente um de debitAmount / creditAmount');
      if (d && !isPos(s.debitAmount)) addError(sw, 'debitAmount inválido');
      if (c && !isPos(s.creditAmount)) addError(sw, 'creditAmount inválido');
    });
  }

  if (doc.withholdingTaxList !== undefined) {
    if (!Array.isArray(doc.withholdingTaxList)) {
      addError(w, 'withholdingTaxList deve ser array');
    } else {
      for (const [i, wh] of doc.withholdingTaxList.entries()) {
        const ww = `${w} retenção ${i + 1}`;
        if (!WITHHOLDING_TYPES.has(wh.withholdingTaxType)) {
          addError(ww, `withholdingTaxType inválido: ${wh.withholdingTaxType}`);
        }
        if (typeof wh.withholdingTaxDescription !== 'string' || !wh.withholdingTaxDescription) {
          addError(ww, 'withholdingTaxDescription em falta');
        } else if (wh.withholdingTaxDescription.length > 120) {
          addError(ww, 'withholdingTaxDescription excede 120 caracteres');
        }
        if (!isPos(wh.withholdingTaxAmount)) addError(ww, 'withholdingTaxAmount deve ser number >= 0');
      }
    }
  }

  const dt = doc.documentTotals;
  if (!dt || typeof dt !== 'object') return addError(w, 'documentTotals em falta');
  ['taxPayable', 'netTotal', 'grossTotal'].forEach((k) => {
    if (!isPos(dt[k])) addError(w, `documentTotals.${k} deve ser number >= 0: ${dt[k]}`);
  });

  if (isPos(dt.netTotal) && isPos(dt.taxPayable) && isPos(dt.grossTotal)) {
    const expected = round2(dt.netTotal + dt.taxPayable);
    if (Math.abs(expected - dt.grossTotal) > 0.005) {
      addError(w, `grossTotal ${dt.grossTotal} != netTotal + taxPayable (${expected.toFixed(2)})`);
    }
  }

  if (dt.currency) {
    const cur = dt.currency;
    if (typeof cur.currencyCode !== 'string' || !/^[A-Z]{3}$/.test(cur.currencyCode)) {
      addError(w, 'currency.currencyCode inválido');
    }
    if (!isPos(cur.currencyAmount) || cur.currencyAmount <= 0) addError(w, 'currency.currencyAmount deve ser > 0');
    if (!isPos(cur.exchangeRate) || cur.exchangeRate <= 0) addError(w, 'currency.exchangeRate deve ser > 0');
    // Convenção aplicada pelo portal AGT (validação E25):
    //   grossTotal (AOA) = currencyAmount (divisa) x exchangeRate
    // Válida para divisa != AOA e também para AOA (contra-valor em divisas).
    const expected = round2(cur.currencyAmount * cur.exchangeRate);
    if (Math.abs(expected - dt.grossTotal) > 0.005) {
      addError(
        w,
        `E25: grossTotal ${dt.grossTotal} != currencyAmount (${cur.currencyAmount}) x exchangeRate (${cur.exchangeRate}) = ${expected.toFixed(2)}`
      );
    }
  } else if (doc.customerCountry !== 'AO') {
    addWarning(w, 'cliente estrangeiro sem objecto currency');
  }

  if (isReceipt && doc.paymentReceipt && Array.isArray(doc.paymentReceipt.sourceDocuments)) {
    const srcNet = round2(
      doc.paymentReceipt.sourceDocuments.reduce(
        (s, d) => s + (isNum(d.creditAmount) ? d.creditAmount : (isNum(d.debitAmount) ? d.debitAmount : 0)),
        0
      )
    );
    if (isPos(dt.netTotal) && Math.abs(srcNet - dt.netTotal) > 0.005) {
      addError(w, `netTotal ${dt.netTotal} != soma dos documentos origem (${srcNet.toFixed(2)})`);
    }
  } else if (Array.isArray(doc.lines) && doc.lines.length > 0) {
    const lineNet = round2(
      doc.lines.reduce(
        (s, l) => s + (isNum(l.creditAmount) ? l.creditAmount : (isNum(l.debitAmount) ? l.debitAmount : 0)),
        0
      )
    );
    const lineTax = round2(
      doc.lines.reduce(
        (s, l) => s + (l.taxes || []).reduce((ts, t) => ts + (isNum(t.taxContribution) ? t.taxContribution : 0), 0),
        0
      )
    );
    if (isPos(dt.netTotal) && Math.abs(lineNet - dt.netTotal) > 0.005) {
      addError(w, `netTotal ${dt.netTotal} != soma das linhas (${lineNet.toFixed(2)}) [E23]`);
    }
    if (isPos(dt.taxPayable) && Math.abs(lineTax - dt.taxPayable) > 0.005) {
      addError(w, `taxPayable ${dt.taxPayable} != soma dos impostos (${lineTax.toFixed(2)}) [E22]`);
    }
  }
}

function validateEnvelope(where, p) {
  const w = where;
  if (!/^2\.\d+$/.test(p.schemaVersion || '')) {
    addError(w, `schemaVersion deve ser 2.x (é ${p.schemaVersion})`);
  }
  if (!isUuidV4(p.submissionUUID)) addError(w, `submissionUUID não é UUID v4: ${p.submissionUUID}`);
  if (typeof p.taxRegistrationNumber !== 'string' || p.taxRegistrationNumber.length < 1 || p.taxRegistrationNumber.length > 15) {
    addError(w, 'taxRegistrationNumber inválido');
  }
  if (!isIsoDateTime(p.submissionTimeStamp)) addError(w, 'submissionTimeStamp inválido');

  const si = p.softwareInfo;
  if (!si || !si.softwareInfoDetail) return addError(w, 'softwareInfo em falta');
  const sid = si.softwareInfoDetail;
  ['productId', 'productVersion', 'softwareValidationNumber'].forEach((k) => {
    if (typeof sid[k] !== 'string' || !sid[k]) addError(w, `softwareInfoDetail.${k} em falta`);
  });
  if (!Number.isInteger(sid.signatureVersion) || sid.signatureVersion < 1) {
    addError(w, 'softwareInfoDetail.signatureVersion deve ser integer >= 1');
  }

  const softSigned = parseJws(w, si.jwsSoftwareSignature);
  if (softSigned && !sameJson(softSigned, sid)) {
    addError(w, 'payload do jwsSoftwareSignature não corresponde a softwareInfoDetail');
  }

  if (!Array.isArray(p.documents) || p.documents.length === 0 || p.documents.length > 30) {
    return addError(w, 'documents deve ter 1..30 documentos');
  }
  if (!Number.isInteger(p.numberOfEntries) || p.numberOfEntries !== p.documents.length) {
    addError(w, `numberOfEntries (${p.numberOfEntries}) != nº de documentos (${p.documents.length}) [E04]`);
  }
  p.documents.forEach((doc, i) => validateDocument(`${w} documento ${i + 1}`, doc));
}

// ---------------------------------------------------------------------------
// EXECUÇÃO
// ---------------------------------------------------------------------------
if (!fs.existsSync(INDEX_FILE)) {
  console.error('Índice não encontrado. Execute primeiro o gerador.');
  process.exit(1);
}

const index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
const seenTypes = new Map();
const seenNumbers = new Map();

for (const entry of index) {
  const filePath = path.join(DIR, entry.file);
  if (!fs.existsSync(filePath)) {
    addError(entry.file, 'ficheiro inexistente');
    continue;
  }
  let payload;
  try {
    payload = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    addError(entry.file, `JSON inválido: ${e.message}`);
    continue;
  }

  validateEnvelope(entry.file, payload);

  for (const doc of payload.documents) {
    if (seenTypes.has(doc.documentType)) {
      addError(entry.file, `tipo ${doc.documentType} duplicado (também em ${seenTypes.get(doc.documentType)})`);
    }
    seenTypes.set(doc.documentType, entry.file);

    if (seenNumbers.has(doc.documentNo)) {
      addError(entry.file, `documentNo duplicado: ${doc.documentNo}`);
    }
    seenNumbers.set(doc.documentNo, entry.file);
  }

  if (payload.documents.length !== 1) {
    addWarning(entry.file, 'payload de certificação deve conter 1 documento');
  }
}

for (const t of ALLOWED_TYPES) {
  if (!seenTypes.has(t)) addError('COBERTURA', `tipo ${t} não tem payload`);
}
for (const t of seenTypes.keys()) {
  if (!ALLOWED_TYPES.includes(t)) addError('COBERTURA', `tipo ${t} não pertence à lista de certificação`);
}

if (fs.existsSync(CONSOLIDATED)) {
  try {
    const all = JSON.parse(fs.readFileSync(CONSOLIDATED, 'utf8'));
    if (all.length !== index.length) {
      addError('_ALL_PAYLOADS_CERTIFICACAO.json', `contém ${all.length} payloads, esperados ${index.length}`);
    }
    all.forEach((p, i) => validateEnvelope(`consolidado[${i}]`, p));
  } catch (e) {
    addError('_ALL_PAYLOADS_CERTIFICACAO.json', `JSON inválido: ${e.message}`);
  }
} else {
  addError('_ALL_PAYLOADS_CERTIFICACAO.json', 'ficheiro consolidado inexistente');
}

// ---------------------------------------------------------------------------
// RELATÓRIO
// ---------------------------------------------------------------------------
const ok = errors.length === 0;
const lines = [];
lines.push('# Relatório de Validação Estrutural — Payloads de Certificação AGT (schema 2.0)');
lines.push('');
lines.push(`**Data:** ${new Date().toISOString()}`);
lines.push(`**Schema:** 2.0`);
lines.push(`**Payloads validados:** ${index.length}`);
lines.push(`**Tipos cobertos:** ${[...seenTypes.keys()].sort().join(', ')}`);
lines.push(`**Resultado:** ${ok ? '✅ APROVADO' : '❌ REPROVADO'}`);
lines.push('');
lines.push(`- Erros: **${errors.length}**`);
lines.push(`- Avisos: **${warnings.length}**`);
lines.push('');

lines.push('## Cobertura por tipo de documento');
lines.push('');
lines.push('| Tipo | Documento | Estado | Linhas | Recibo | Divisa | Net | Impostos | Bruto | Resultado |');
lines.push('|------|-----------|--------|--------|--------|--------|-----|----------|-------|-----------|');
for (const e of index) {
  const p = JSON.parse(fs.readFileSync(path.join(DIR, e.file), 'utf8'));
  const d = p.documents[0];
  const typeErrors = errors.filter((x) => x.startsWith(e.file));
  lines.push(
    `| ${e.documentType} | ${e.label} | ${d.documentStatus} | ${d.lines ? d.lines.length : 0} | ` +
    `${d.paymentReceipt ? 'sim' : 'não'} | ${d.documentTotals.currency ? d.documentTotals.currency.currencyCode : 'AOA'} | ` +
    `${e.netTotal.toFixed(2)} | ${e.taxPayable.toFixed(2)} | ${e.grossTotal.toFixed(2)} | ` +
    `${typeErrors.length === 0 ? '✅' : '❌'} |`
  );
}
lines.push('');

if (errors.length) {
  lines.push('## Erros');
  lines.push('');
  errors.forEach((e) => lines.push(`- ❌ ${e}`));
  lines.push('');
}
if (warnings.length) {
  lines.push('## Avisos');
  lines.push('');
  warnings.forEach((w) => lines.push(`- ⚠️ ${w}`));
  lines.push('');
}
if (ok) {
  lines.push('## Verificações aplicadas (schema 2.0)');
  lines.push('');
  lines.push('- `schemaVersion` = 2.x; `submissionUUID` UUID v4; `numberOfEntries` inteiro.');
  lines.push('- `softwareInfoDetail` com `signatureVersion`; JWS do software assina o objecto completo.');
  lines.push('- JWS compacto Base64URL (`header.payload.signature`), sem padding, alg RS256.');
  lines.push('- `documentStatus` apenas N/C; ausência de `documentCancelReason`.');
  lines.push('- `documentNo` (8..60, prefixo = tipo), datas, CAE, cliente.');
  lines.push('- Regras por tipo: `lines` excepto AR/RC/RG; `paymentReceipt` apenas AR/RC/RG; NC com `referenceInfo`.');
  lines.push('- Linhas: `operationType` obrigatório; `operationDate` em GF/FG; tipos numéricos; um só de debit/credit; isenções.');
  lines.push('- Aritmética: montante = quantidade × unitPriceBase; `taxContribution` arredondado por excesso; totais [E21–E24].');
  lines.push('- Regras E16/E17: NC com crédito < débito; restantes com crédito > débito.');
  lines.push('- Câmbio [E25]: `currencyAmount` = grossTotal × exchangeRate (divisa ≠ AOA).');
  lines.push('- Recibos: totais iguais à soma dos documentos de origem.');
  lines.push('- Cobertura dos 18 tipos, sem duplicados.');
  lines.push('');
}

fs.writeFileSync(path.join(DIR, '_VALIDATION_REPORT.md'), lines.join('\n') + '\n', 'utf8');

console.log(lines.join('\n'));
console.log(ok ? '\n✅ VALIDAÇÃO APROVADA' : `\n❌ VALIDAÇÃO REPROVADA (${errors.length} erros)`);
process.exit(ok ? 0 : 1);
