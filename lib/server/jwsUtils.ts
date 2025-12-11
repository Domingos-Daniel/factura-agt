/**
 * =============================================================================
 * UTILITÁRIOS JWS - ASSINATURA DIGITAL PARA AGT
 * =============================================================================
 * 
 * Implementação de assinaturas JWS (JSON Web Signature) conforme
 * especificações técnicas da AGT Angola.
 * 
 * Referências:
 * - RFC 7515 (JSON Web Signature)
 * - RFC 7517 (JSON Web Key)
 * - RFC 7518 (JSON Web Algorithms)
 * 
 * Algoritmo recomendado: RS256 (RSA Signature with SHA-256)
 */

import { AGTDocument, AGTDocumentTotals } from '../types/agt-official';

// =============================================================================
// TIPOS
// =============================================================================

export interface JWSHeader {
  alg: 'RS256' | 'ES256' | 'HS256';
  typ: 'JWT';
  kid?: string;
}

export interface DocumentSignaturePayload {
  documentNo: string;
  taxRegistrationNumber: string;
  documentType: string;
  documentDate: string;
  customerTaxID: string;
  customerCountry: string;
  companyName: string;
  documentTotals: {
    taxPayable: number;
    netTotal: number;
    grossTotal: number;
  };
}

export interface SoftwareSignaturePayload {
  productId: string;
  productVersion: string;
  softwareValidationNumber: string;
}

export interface QuerySignaturePayload {
  taxRegistrationNumber: string;
  [key: string]: string | number | undefined;
}

export interface KeyPair {
  privateKey: string;
  publicKey: string;
  keyId?: string;
}

// =============================================================================
// CONFIGURAÇÃO DE CHAVES (MOCK/DESENVOLVIMENTO)
// =============================================================================

/**
 * Chaves de desenvolvimento (NÃO USAR EM PRODUÇÃO)
 * Em produção, as chaves devem ser geradas e geridas de forma segura
 */
const MOCK_KEYS: KeyPair = {
  privateKey: `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7dZm3h8vSO7xL
9VpJVnPm8/n5N3FxSXKJ3FpqX7F5qN1qKzR3FxsR8V1FqK8mJzN3F5pN8VqKmJzF
1FxqN5K3F8VpJmN3K5F1FqJpN8V3K5FxqJpN8V1K3F5qJmN3K5FxqJpN8V1K3F5q
JmN3K5FxqJpN8V1K3F5qJmN3K5FxqJpN8V1K3F5qJmN3K5FxqJpN8V1K3F5qJmN3
K5FxqJpN8V1K3F5qJmN3K5FxqJpN8V1K3F5qJmN3K5FxqJpN8V1K3F5qJmN3K5Fx
qJpN8V1K3F5qJmN3K5FxqJpN8V1K3F5qJmN3K5FxqJpN8V1K3F5qJmN3K5FxqJpN
8V1K3F5qJmN3K5FxqJpN8V1K3F5qJmN3AgMBAAECggEABZ3x...
-----END PRIVATE KEY-----`,
  publicKey: `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu3WZt4fL0ju8S/VaSVZz
5vP5+TdxcUlyidxaal+xeajdais0dxcbEfFdRaivJiczd3eaTfFaipiexdRcajeS
txfFaSZjdyuRdRaiaT3FdyuRcaiaT3FdStxeaiaT3dyuRcaiaT3FdStxeaiaT3dy
uRcaiaT3FdStxeaiaT3dyuRcaiaT3FdStxeaiaT3dyuRcaiaT3FdStxeaiaT3dyu
RcaiaT3FdStxeaiaT3dyuRcaiaT3FdStxeaiaT3dyuRcaiaT3FdStxeaiaT3dyuR
caiaT3FdStxeaiaT3dyuRcaiaT3FdStxeaiaT3dyuRcaiaT3FdStxeaiaT3dwIDAQ
AB
-----END PUBLIC KEY-----`,
  keyId: 'dev-key-001',
};

// =============================================================================
// FUNÇÕES DE ASSINATURA
// =============================================================================

/**
 * Codifica string para Base64URL (RFC 4648 §5)
 */
export function base64UrlEncode(str: string): string {
  // Em Node.js/browser, converter para base64 e depois para base64url
  let base64: string;
  
  if (typeof Buffer !== 'undefined') {
    // Node.js
    base64 = Buffer.from(str, 'utf-8').toString('base64');
  } else {
    // Browser
    base64 = btoa(unescape(encodeURIComponent(str)));
  }
  
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Descodifica Base64URL para string
 */
export function base64UrlDecode(str: string): string {
  // Adicionar padding se necessário
  let base64 = str
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const padding = 4 - (base64.length % 4);
  if (padding !== 4) {
    base64 += '='.repeat(padding);
  }
  
  if (typeof Buffer !== 'undefined') {
    // Node.js
    return Buffer.from(base64, 'base64').toString('utf-8');
  } else {
    // Browser
    return decodeURIComponent(escape(atob(base64)));
  }
}

/**
 * Cria o header JWS
 */
function createJWSHeader(keyId?: string): JWSHeader {
  return {
    alg: 'RS256',
    typ: 'JWT',
    ...(keyId && { kid: keyId }),
  };
}

/**
 * Gera hash SHA-256 (simplificado para mock)
 * Em produção, usar crypto.subtle ou biblioteca criptográfica
 */
async function sha256(message: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  // Fallback: hash simples para desenvolvimento
  let hash = 0;
  for (let i = 0; i < message.length; i++) {
    const char = message.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}

/**
 * Assina payload com chave privada (MOCK)
 * Em produção, usar RSA com chave privada real
 */
async function signWithPrivateKey(
  payload: string,
  _privateKey: string
): Promise<string> {
  // MOCK: Em produção, usar crypto.subtle.sign ou biblioteca RSA
  const hash = await sha256(payload);
  return base64UrlEncode(hash);
}

/**
 * Cria assinatura JWS completa
 */
async function createJWS(
  payload: object,
  privateKey: string,
  keyId?: string
): Promise<string> {
  const header = createJWSHeader(keyId);
  
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = await signWithPrivateKey(signingInput, privateKey);
  
  return `${signingInput}.${signature}`;
}

// =============================================================================
// ASSINATURAS ESPECÍFICAS AGT
// =============================================================================

/**
 * Gera assinatura do software de facturação
 * 
 * Campos assinados:
 * - productId
 * - productVersion
 * - softwareValidationNumber
 */
export async function signSoftwareInfo(
  productId: string,
  productVersion: string,
  softwareValidationNumber: string,
  privateKey: string = MOCK_KEYS.privateKey
): Promise<string> {
  const payload: SoftwareSignaturePayload = {
    productId,
    productVersion,
    softwareValidationNumber,
  };
  
  const jws = await createJWS(payload, privateKey, MOCK_KEYS.keyId);
  
  // Retornar apenas a assinatura (256 caracteres conforme spec)
  // Em produção, a assinatura deve ter exatamente 256 caracteres
  return jws.split('.')[2].substring(0, 256).padEnd(256, '0');
}

/**
 * Gera assinatura do documento de facturação
 * 
 * Campos assinados (conforme Anexo I):
 * - documentNo
 * - taxRegistrationNumber
 * - documentType
 * - documentDate
 * - customerTaxID
 * - customerCountry
 * - companyName
 * - documentTotals
 */
export async function signDocument(
  document: Pick<AGTDocument, 
    'documentNo' | 'documentType' | 'documentDate' | 
    'customerTaxID' | 'customerCountry' | 'companyName' | 'documentTotals'
  >,
  taxRegistrationNumber: string,
  privateKey: string = MOCK_KEYS.privateKey
): Promise<string> {
  const payload: DocumentSignaturePayload = {
    documentNo: document.documentNo,
    taxRegistrationNumber,
    documentType: document.documentType,
    documentDate: document.documentDate,
    customerTaxID: document.customerTaxID,
    customerCountry: document.customerCountry,
    companyName: document.companyName,
    documentTotals: {
      taxPayable: document.documentTotals.taxPayable,
      netTotal: document.documentTotals.netTotal,
      grossTotal: document.documentTotals.grossTotal,
    },
  };
  
  const jws = await createJWS(payload, privateKey, MOCK_KEYS.keyId);
  
  // Retornar assinatura com 256 caracteres
  return jws.split('.')[2].substring(0, 256).padEnd(256, '0');
}

/**
 * Gera assinatura para consultas
 * 
 * Usada em:
 * - obterEstado: taxRegistrationNumber + requestID
 * - listarFacturas: taxRegistrationNumber + queryStartDate + queryEndDate
 * - consultarFactura: taxRegistrationNumber + documentNo
 * - solicitarSerie: taxRegistrationNumber + seriesCode + seriesYear + documentType + firstDocumentNumber
 * - listarSeries: taxRegistrationNumber + documentNo
 * - validarDocumento: taxRegistrationNumber + documentNo
 */
export async function signQuery(
  fields: Record<string, string | number>,
  privateKey: string = MOCK_KEYS.privateKey
): Promise<string> {
  const jws = await createJWS(fields, privateKey, MOCK_KEYS.keyId);
  
  // Retornar assinatura com 256 caracteres
  return jws.split('.')[2].substring(0, 256).padEnd(256, '0');
}

// =============================================================================
// VERIFICAÇÃO DE ASSINATURAS
// =============================================================================

/**
 * Verifica se uma assinatura JWS é válida (MOCK)
 * Em produção, verificar com chave pública real
 */
export async function verifyJWS(
  jws: string,
  _publicKey: string = MOCK_KEYS.publicKey
): Promise<boolean> {
  const parts = jws.split('.');
  if (parts.length !== 3) {
    return false;
  }
  
  // MOCK: Sempre retorna true em desenvolvimento
  // Em produção, verificar assinatura com chave pública
  return true;
}

/**
 * Extrai payload de um JWS
 */
export function extractJWSPayload<T>(jws: string): T | null {
  try {
    const parts = jws.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    const payloadJson = base64UrlDecode(parts[1]);
    return JSON.parse(payloadJson) as T;
  } catch {
    return null;
  }
}

// =============================================================================
// UTILIDADES DE HASH
// =============================================================================

/**
 * Gera hash para controlo de integridade do documento
 * Usado no campo hashControl
 */
export async function generateDocumentHash(
  previousHash: string | null,
  documentDate: string,
  systemEntryDate: string,
  documentNo: string,
  grossTotal: number,
  privateKey: string = MOCK_KEYS.privateKey
): Promise<string> {
  const dataToHash = [
    previousHash || '0',
    documentDate,
    systemEntryDate,
    documentNo,
    grossTotal.toFixed(2),
  ].join(';');
  
  const hash = await sha256(dataToHash);
  
  // Assinar o hash
  const signature = await signWithPrivateKey(hash, privateKey);
  
  return signature;
}

/**
 * Gera código de controlo abreviado (4 caracteres)
 * Usado para verificação visual em documentos impressos
 */
export function generateHashControl(fullHash: string): string {
  // Retornar primeiros 4 caracteres em maiúsculas
  return fullHash.substring(0, 4).toUpperCase();
}

// =============================================================================
// GESTÃO DE CHAVES (INTERFACE)
// =============================================================================

/**
 * Interface para gestão de chaves
 * Implementar conforme necessidades de segurança
 */
export interface KeyManager {
  getPrivateKey(): Promise<string>;
  getPublicKey(): Promise<string>;
  rotateKeys(): Promise<void>;
  validateKeyPair(): Promise<boolean>;
}

/**
 * Implementação mock do KeyManager
 */
export class MockKeyManager implements KeyManager {
  async getPrivateKey(): Promise<string> {
    return MOCK_KEYS.privateKey;
  }
  
  async getPublicKey(): Promise<string> {
    return MOCK_KEYS.publicKey;
  }
  
  async rotateKeys(): Promise<void> {
    console.warn('MockKeyManager: Rotação de chaves não implementada');
  }
  
  async validateKeyPair(): Promise<boolean> {
    return true;
  }
}

// =============================================================================
// EXPORTAÇÕES
// =============================================================================

export const JWSUtils = {
  base64UrlEncode,
  base64UrlDecode,
  signSoftwareInfo,
  signDocument,
  signQuery,
  verifyJWS,
  extractJWSPayload,
  generateDocumentHash,
  generateHashControl,
};

export default JWSUtils;
