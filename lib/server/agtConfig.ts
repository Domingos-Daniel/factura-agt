/**
 * Configuração do Software de Facturação para AGT
 * Baseado na documentação oficial: https://portaldoparceiro.minfin.gov.ao/doc-agt/
 */

// Informações do Software de Facturação (obtidas na certificação)
export const SOFTWARE_INFO = {
  productId: 'SafeFacturas',
  productVersion: '1.0.0',
  // Este número é atribuído pela AGT após certificação do software
  softwareValidationNumber: process.env.AGT_SOFTWARE_VALIDATION_NUMBER || 'HML-TEST-001',
}

// Versão do schema AGT
export const SCHEMA_VERSION = '1.2'

/**
 * Gera UUID v4 válido para submissões
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/**
 * Gera timestamp ISO 8601 para submissões
 */
export function generateTimestamp(): string {
  return new Date().toISOString()
}

/**
 * Gera assinatura JWS para softwareInfo
 * Em produção, usar chave privada RSA do produtor de software
 */
export function generateJwsSoftwareSignature(softwareInfoDetail: any): string {
  // Header JWT
  const header = {
    typ: 'JOSE',
    alg: 'RS256'
  }
  
  // Payload é o próprio softwareInfoDetail
  const payload = softwareInfoDetail
  
  // Base64URL encode
  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  
  // Em produção: assinar com chave privada RSA
  // Para HML/teste: usar assinatura dummy
  const signature = Buffer.from('DUMMY-SOFTWARE-SIGNATURE-' + Date.now()).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  
  return `${base64Header}.${base64Payload}.${signature}`
}

/**
 * Gera assinatura JWS para documentos (facturas)
 * Campos obrigatórios na assinatura:
 * - documentNo
 * - taxRegistrationNumber
 * - documentType
 * - documentDate
 * - customerTaxID
 * - customerCountry
 * - companyName
 * - documentTotals
 */
export function generateJwsDocumentSignature(document: any, taxRegistrationNumber: string): string {
  const header = {
    typ: 'JOSE',
    alg: 'RS256'
  }
  
  // Payload conforme documentação AGT
  const payload = {
    documentNo: document.documentNo,
    taxRegistrationNumber: taxRegistrationNumber,
    documentType: document.documentType,
    documentDate: document.documentDate,
    customerTaxID: document.customerTaxID,
    customerCountry: document.customerCountry,
    companyName: document.companyName,
    documentTotals: document.documentTotals
  }
  
  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  
  // Em produção: assinar com chave privada RSA do emissor
  const signature = Buffer.from('DUMMY-DOC-SIGNATURE-' + Date.now()).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  
  return `${base64Header}.${base64Payload}.${signature}`
}

/**
 * Gera assinatura JWS para chamadas de serviço
 * Cada serviço tem campos específicos para assinar
 */
export function generateJwsServiceSignature(fieldsToSign: any): string {
  const header = {
    typ: 'JOSE',
    alg: 'RS256'
  }
  
  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  const base64Payload = Buffer.from(JSON.stringify(fieldsToSign)).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  
  // Em produção: assinar com chave privada RSA do emissor
  const signature = Buffer.from('DUMMY-SERVICE-SIGNATURE-' + Date.now()).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  
  return `${base64Header}.${base64Payload}.${signature}`
}

/**
 * Cria objeto softwareInfo completo
 */
export function createSoftwareInfo(): {
  softwareInfoDetail: typeof SOFTWARE_INFO
  jwsSoftwareSignature: string
} {
  return {
    softwareInfoDetail: SOFTWARE_INFO,
    jwsSoftwareSignature: generateJwsSoftwareSignature(SOFTWARE_INFO)
  }
}

/**
 * Cria payload base com campos obrigatórios para todos os serviços AGT
 */
export function createBasePayload(taxRegistrationNumber: string): {
  schemaVersion: string
  submissionUUID: string
  taxRegistrationNumber: string
  submissionTimeStamp: string
  softwareInfo: ReturnType<typeof createSoftwareInfo>
} {
  return {
    schemaVersion: SCHEMA_VERSION,
    submissionUUID: generateUUID(),
    taxRegistrationNumber,
    submissionTimeStamp: generateTimestamp(),
    softwareInfo: createSoftwareInfo()
  }
}
