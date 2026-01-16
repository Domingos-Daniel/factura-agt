/**
 * Transformador de payload para compatibilidade com AGT HML
 * Ajusta campos e adiciona assinaturas necessárias
 */

/**
 * Transforma o payload para o formato esperado pela AGT HML
 */
export function transformToAGTFormat(payload: any): any {
  const transformed = {
    ...payload,
    // AGT HML usa 'submissionUUID' em vez de 'submissionGUID'
    submissionUUID: payload.submissionGUID || payload.submissionUUID,
    documents: payload.documents?.map((doc: any) => ({
      ...doc,
      // Adicionar jwsDocumentSignature se não existir
      jwsDocumentSignature: doc.jwsDocumentSignature || generateDummyJWS(doc)
    }))
  }
  
  // Remover submissionGUID se submissionUUID foi adicionado
  if (transformed.submissionUUID && transformed.submissionGUID) {
    delete transformed.submissionGUID
  }
  
  return transformed
}

/**
 * Gera uma assinatura JWS dummy para testes
 * Em produção, isso deve ser substituído por assinatura real
 */
function generateDummyJWS(document: any): string {
  // JWS tem 3 partes separadas por ponto: header.payload.signature
  // Para testes, usamos uma assinatura dummy
  const header = Buffer.from(JSON.stringify({
    alg: 'RS256',
    typ: 'JWT'
  })).toString('base64url')
  
  const payload = Buffer.from(JSON.stringify({
    documentNo: document.documentNo,
    documentType: document.documentType,
    timestamp: new Date().toISOString()
  })).toString('base64url')
  
  const signature = Buffer.from('DUMMY-SIGNATURE-FOR-TESTING').toString('base64url')
  
  return `${header}.${payload}.${signature}`
}

/**
 * Valida se o payload tem todos os campos obrigatórios para AGT
 */
export function validateAGTPayload(payload: any): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!payload.schemaVersion) {
    errors.push('schemaVersion é obrigatório')
  }
  
  if (!payload.submissionGUID && !payload.submissionUUID) {
    errors.push('submissionGUID/submissionUUID é obrigatório')
  }
  
  if (!payload.taxRegistrationNumber) {
    errors.push('taxRegistrationNumber é obrigatório')
  }
  
  if (!payload.submissionTimeStamp) {
    errors.push('submissionTimeStamp é obrigatório')
  }
  
  if (!payload.softwareInfo) {
    errors.push('softwareInfo é obrigatório')
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
  })
  
  return {
    valid: errors.length === 0,
    errors
  }
}
