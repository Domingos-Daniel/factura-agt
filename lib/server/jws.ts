// Server-side JWS signing helpers (placeholder wiring)
// In production, load keys from a secure store (KMS/HSM) and sign with RS256/ECDSA.

import 'server-only'
import crypto from 'crypto'

export type JwsHeader = {
  alg: 'RS256'
  typ: 'JWT'
}

function base64url(input: Buffer | string): string {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input)
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

export function signJwsRS256(payload: Record<string, any>, privateKeyPem: string, header?: Partial<JwsHeader>): string {
  const fullHeader: JwsHeader = { alg: 'RS256', typ: 'JWT', ...header }
  const signingInput = `${base64url(JSON.stringify(fullHeader))}.${base64url(JSON.stringify(payload))}`
  const signer = crypto.createSign('RSA-SHA256')
  signer.update(signingInput)
  const signature = signer.sign(privateKeyPem)
  return `${signingInput}.${base64url(signature)}`
}

export function makeSoftwareInfoSignature(softwareInfo: any, privateKeyPem: string): string {
  return signJwsRS256(softwareInfo, privateKeyPem)
}

export function makeDocumentSignature(document: {
  documentNo: string
  taxRegistrationNumber: string
  documentType: string
  documentDate: string
  customerTaxID: string
  customerCountry: string
  companyName: string
  documentTotals: any
}, privateKeyPem: string): string {
  const payload = {
    documentNo: document.documentNo,
    taxRegistrationNumber: document.taxRegistrationNumber,
    documentType: document.documentType,
    documentDate: document.documentDate,
    customerTaxID: document.customerTaxID,
    customerCountry: document.customerCountry,
    companyName: document.companyName,
    documentTotals: document.documentTotals,
  }
  return signJwsRS256(payload, privateKeyPem)
}

// Assinatura para obterEstado
export function makeObterEstadoSignature(taxRegistrationNumber: string, requestID: string, privateKeyPem: string): string {
  return signJwsRS256({ taxRegistrationNumber, requestID }, privateKeyPem)
}

// Assinatura para listarFacturas
export function makeListarFacturasSignature(taxRegistrationNumber: string, queryStartDate: string, queryEndDate: string, privateKeyPem: string): string {
  return signJwsRS256({ taxRegistrationNumber, queryStartDate, queryEndDate }, privateKeyPem)
}

// Assinatura para consultarFactura
export function makeConsultarFacturaSignature(taxRegistrationNumber: string, documentNo: string, privateKeyPem: string): string {
  return signJwsRS256({ taxRegistrationNumber, documentNo }, privateKeyPem)
}

// Assinatura para solicitarSerie
export function makeSolicitarSerieSignature(payload: {
  taxRegistrationNumber: string
  seriesCode: string
  seriesYear: number
  documentType: string
  firstDocumentNumber: number
}, privateKeyPem: string): string {
  return signJwsRS256(payload, privateKeyPem)
}

// Assinatura para listarSeries
export function makeListarSeriesSignature(taxRegistrationNumber: string, privateKeyPem: string): string {
  return signJwsRS256({ taxRegistrationNumber }, privateKeyPem)
}

// Assinatura para validarDocumento
export function makeValidarDocumentoSignature(taxRegistrationNumber: string, documentNo: string, privateKeyPem: string): string {
  return signJwsRS256({ taxRegistrationNumber, documentNo }, privateKeyPem)
}
