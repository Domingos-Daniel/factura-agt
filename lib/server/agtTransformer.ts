/**
 * Transformador de payload para compatibilidade com AGT HML
 * Ajusta campos e adiciona assinaturas necessárias
 * 
 * Conforme documentação oficial AGT:
 * - schemaVersion: "1.2"
 * - Todos os payloads precisam de: submissionUUID, softwareInfo, jwsSignature
 */

// Configurações de software (valores certificados do parceiro)
const SOFTWARE_INFO = {
  productId: process.env.AGT_SOFTWARE_PRODUCT_ID || 'SafeFacturas',
  productVersion: process.env.AGT_SOFTWARE_VERSION || '1.0.0',
  softwareValidationNumber: process.env.AGT_SOFTWARE_VALIDATION_NUMBER || 'HML-TEST-001'
}

const SCHEMA_VERSION = '1.2'

/**
 * Gera UUID v4
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/**
 * Gera JWS dummy para testes
 * Em produção deve usar chave RSA privada real
 */
function generateJWS(payload: any): string {
  const header = { typ: 'JOSE', alg: 'RS256' }
  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  const signature = Buffer.from('DUMMY-SIG-' + Date.now()).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  return `${base64Header}.${base64Payload}.${signature}`
}

/**
 * Cria o objeto softwareInfo conforme documentação AGT
 */
function createSoftwareInfo(): { softwareInfoDetail: typeof SOFTWARE_INFO; jwsSoftwareSignature: string } {
  return {
    softwareInfoDetail: SOFTWARE_INFO,
    jwsSoftwareSignature: generateJWS(SOFTWARE_INFO)
  }
}

/**
 * Transforma o payload para o formato esperado pela AGT HML
 * Adiciona todos os campos obrigatórios e aplica regras de validação
 * 
 * REGRAS OBRIGATÓRIAS DESCOBERTAS:
 * 1. eacCode: obrigatório, mínimo 5 caracteres
 * 2. referenceInfo: NÃO incluir para FT/FS/FR, só obrigatório para NC
 * 3. currency: deve ser objeto com currencyCode, currencyAmount e exchangeRate
 * 4. creditAmount: não incluir se for 0
 */
export function transformToAGTFormat(payload: any): any {
  const taxRegistrationNumber = payload.taxRegistrationNumber || process.env.AGT_NIF_TEST || ''
  const documents = payload.documents || []
  
  const transformed = {
    schemaVersion: SCHEMA_VERSION,
    submissionUUID: payload.submissionGUID || payload.submissionUUID || generateUUID(),
    taxRegistrationNumber,
    submissionTimeStamp: payload.submissionTimeStamp || new Date().toISOString(),
    softwareInfo: payload.softwareInfo || createSoftwareInfo(),
    numberOfEntries: payload.numberOfEntries || documents.length,  // OBRIGATÓRIO
    // jwsSignature para documentos: assina os campos necessários
    documents: documents.map((doc: any) => transformDocument(doc, taxRegistrationNumber))
  }
  
  // Remover submissionGUID se existia
  if (payload.submissionGUID) {
    delete (transformed as any).submissionGUID
  }
  
  return transformed
}

/**
 * Transforma um documento individual para formato AGT
 */
function transformDocument(doc: any, taxRegistrationNumber: string): any {
  const documentType = doc.documentType || 'FT'
  const isNotaCredito = documentType === 'NC'
  const grossTotal = doc.documentTotals?.grossTotal || 0
  
  // Transformar linhas
  const lines = (doc.lines || []).map((line: any, idx: number) => {
    const transformedLine: any = {
      lineNumber: line.lineNumber || line.lineNo || idx + 1,
      productCode: line.productCode || 'GEN001',
      productDescription: line.productDescription || 'Produto/Serviço',
      quantity: line.quantity || 1,
      unitOfMeasure: line.unitOfMeasure || 'UN',
      unitPrice: line.unitPrice || 0,
      unitPriceBase: line.unitPriceBase || line.unitPrice || 0,
      debitAmount: line.debitAmount || 0,
      taxes: (line.taxes || []).map((tax: any) => ({
        taxType: tax.taxType || 'IVA',
        taxCountryRegion: tax.taxCountryRegion || 'AO',
        taxCode: tax.taxCode || 'NOR',
        taxPercentage: tax.taxPercentage || 14,
        taxAmount: tax.taxAmount || 0,
        ...(tax.taxContribution != null ? { taxContribution: tax.taxContribution } : {})
      })),
      settlementAmount: line.settlementAmount || 0,
    }
    
    // creditAmount: só incluir se > 0
    if (line.creditAmount && line.creditAmount > 0) {
      transformedLine.creditAmount = line.creditAmount
    }
    
    // referenceInfo: só incluir para NC (Nota de Crédito)
    if (isNotaCredito && line.referenceInfo && line.referenceInfo.reference) {
      transformedLine.referenceInfo = {
        reference: line.referenceInfo.reference,
        ...(line.referenceInfo.reason ? { reason: line.referenceInfo.reason } : {})
      }
    }
    // NÃO incluir referenceInfo vazio ou null
    
    return transformedLine
  })
  
  // Transformar documentTotals com currency correto
  const documentTotals: any = {
    netTotal: doc.documentTotals?.netTotal || 0,
    taxPayable: doc.documentTotals?.taxPayable || 0,
    grossTotal: grossTotal,
  }
  
  // currency: deve ser objeto com exchangeRate
  if (doc.documentTotals?.currency) {
    if (typeof doc.documentTotals.currency === 'string') {
      // Converter string para objeto
      documentTotals.currency = {
        currencyCode: doc.documentTotals.currency,
        currencyAmount: grossTotal,
        exchangeRate: 1.0
      }
    } else if (typeof doc.documentTotals.currency === 'object') {
      // Garantir que tem todos os campos obrigatórios
      documentTotals.currency = {
        currencyCode: doc.documentTotals.currency.currencyCode || 'AOA',
        currencyAmount: doc.documentTotals.currency.currencyAmount || grossTotal,
        exchangeRate: doc.documentTotals.currency.exchangeRate ?? 1.0
      }
    }
  } else {
    // Adicionar currency padrão
    documentTotals.currency = {
      currencyCode: 'AOA',
      currencyAmount: grossTotal,
      exchangeRate: 1.0
    }
  }
  
  // Construir documento transformado
  const transformedDoc: any = {
    documentNo: doc.documentNo,
    documentStatus: doc.documentStatus || 'N',
    documentType: documentType,
    documentDate: doc.documentDate,
    systemEntryDate: doc.systemEntryDate || new Date().toISOString(),
    // eacCode: obrigatório, mínimo 5 caracteres
    eacCode: (doc.eacCode && doc.eacCode.length >= 5) ? doc.eacCode : '47410',
    customerCountry: doc.customerCountry || 'AO',
    customerTaxID: doc.customerTaxID || '999999999',
    companyName: doc.companyName || 'Cliente',
    lines,
    documentTotals,
    jwsDocumentSignature: doc.jwsDocumentSignature || generateJWS({
      taxRegistrationNumber,
      documentNo: doc.documentNo,
      documentType: documentType,
      documentDate: doc.documentDate,
      grossTotal: grossTotal
    })
  }
  
  // Adicionar companyAddress se existir
  if (doc.companyAddress) {
    transformedDoc.companyAddress = doc.companyAddress
  }
  
  return transformedDoc
}

/**
 * Valida se o payload tem todos os campos obrigatórios para AGT
 */
export function validateAGTPayload(payload: any): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!payload.schemaVersion) {
    errors.push('schemaVersion é obrigatório (deve ser "1.2")')
  }
  
  if (!payload.submissionUUID) {
    errors.push('submissionUUID é obrigatório')
  }
  
  if (!payload.taxRegistrationNumber) {
    errors.push('taxRegistrationNumber é obrigatório')
  }
  
  if (!payload.submissionTimeStamp) {
    errors.push('submissionTimeStamp é obrigatório')
  }
  
  if (!payload.softwareInfo) {
    errors.push('softwareInfo é obrigatório')
  } else {
    if (!payload.softwareInfo.softwareInfoDetail) {
      errors.push('softwareInfo.softwareInfoDetail é obrigatório')
    }
    if (!payload.softwareInfo.jwsSoftwareSignature) {
      errors.push('softwareInfo.jwsSoftwareSignature é obrigatório')
    }
  }
  
  if (!payload.documents || !Array.isArray(payload.documents) || payload.documents.length === 0) {
    errors.push('documents deve ser um array com pelo menos 1 documento')
  }
  
  // Validar cada documento
  payload.documents?.forEach((doc: any, index: number) => {
    if (!doc.documentNo) {
      errors.push(`documents[${index}].documentNo é obrigatório`)
    }
    if (!doc.documentType) {
      errors.push(`documents[${index}].documentType é obrigatório`)
    }
    if (!doc.documentDate) {
      errors.push(`documents[${index}].documentDate é obrigatório`)
    }
    if (!doc.jwsDocumentSignature) {
      errors.push(`documents[${index}].jwsDocumentSignature é obrigatório`)
    }
  })
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Adiciona campos obrigatórios padrão aos payloads AGT para serviços de consulta
 * (schemaVersion, submissionUUID, submissionTimeStamp, softwareInfo, jwsSignature)
 */
export function addRequiredFields(payload: any): any {
  const taxRegistrationNumber = payload.taxRegistrationNumber || process.env.AGT_NIF_TEST || ''
  
  // Determinar campos para jwsSignature baseado no tipo de operação
  let signatureFields: any = { taxRegistrationNumber }
  
  if (payload.requestID) {
    signatureFields.requestID = payload.requestID
  }
  if (payload.documentNo) {
    signatureFields.documentNo = payload.documentNo
  }
  if (payload.invoiceNo) {
    signatureFields.documentNo = payload.invoiceNo
  }
  
  const result = {
    schemaVersion: SCHEMA_VERSION,
    submissionUUID: payload.submissionUUID || generateUUID(),
    taxRegistrationNumber,
    submissionTimeStamp: payload.submissionTimeStamp || new Date().toISOString(),
    softwareInfo: payload.softwareInfo || createSoftwareInfo(),
    jwsSignature: payload.jwsSignature || generateJWS(signatureFields),
    ...payload
  }
  
  // Sobrescrever com versão correta
  result.schemaVersion = SCHEMA_VERSION
  
  return result
}
