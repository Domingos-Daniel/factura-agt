/**
 * Transformador de payload para compatibilidade com AGT HML
 * Ajusta campos e adiciona assinaturas necessárias
 * 
 * Conforme documentação oficial AGT:
 * - schemaVersion: "1.2"
 * - Todos os payloads precisam de: submissionUUID, softwareInfo, jwsSignature
 */

// Configurações de software (ajustar para valores certificados)
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
 * Adiciona todos os campos obrigatórios
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
    documents: documents.map((doc: any) => ({
      ...doc,
      jwsDocumentSignature: doc.jwsDocumentSignature || generateJWS({
        taxRegistrationNumber,
        documentNo: doc.documentNo,
        documentType: doc.documentType,
        documentDate: doc.documentDate
      })
    }))
  }
  
  // Remover submissionGUID se existia
  if (payload.submissionGUID) {
    delete (transformed as any).submissionGUID
  }
  
  return transformed
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
