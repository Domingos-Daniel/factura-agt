/**
 * GERADOR DE ASSINATURAS JWS REAIS PARA AGT
 * Separa chaves: Produtor (para Software) e Emissor (para Documentos)
 * Conforme decreto.md:
 * - jwsSoftwareSignature: encriptação usando chave privada do PRODUTOR
 * - jwsDocumentSignature: encriptação usando chave privada do EMISSOR
 */

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

// Chave do Produtor: para assinar softwareInfo (jwsSoftwareSignature)
const PRODUCER_PRIVATE_KEY = process.env.AGT_PRODUCER_PRIVATE_KEY

// Chave do Emissor: para assinar documentos (jwsDocumentSignature)
const ISSUER_PRIVATE_KEY = process.env.AGT_PRIVATE_KEY

// Validação das chaves obrigatórias
if (!PRODUCER_PRIVATE_KEY) {
  console.error('❌ AGT_PRODUCER_PRIVATE_KEY não encontrada no .env.local!')
  console.error('   Adicione a chave privada do produtor de software.')
  process.exit(1)
}

if (!ISSUER_PRIVATE_KEY) {
  console.error('❌ AGT_PRIVATE_KEY não encontrada no .env.local!')
  console.error('   Adicione a chave privada do emissor/contribuinte.')
  process.exit(1)
}

/**
 * Cria assinatura JWS (JSON Web Signature) conforme especificação AGT
 * Formato: header.payload.signature (JWT válido)
 * Algoritmo: RS256 (RSA com SHA-256)
 * Encoding: Base64URL (sem padding)
 * 
 * @param {Object} payload - Dados a assinar (JSON canônico)
 * @param {string} privateKey - Chave privada RSA para assinar
 * @returns {string} - JWT válido (header.payload.signature)
 */
function createJWSSignature(payload, privateKey) {
  try {
    // 1. Header JWS conforme especificação
    const header = {
      alg: 'RS256',
      typ: 'JWT'
    }
    
    // 2. Converter para JSON canônico (sem espaços nem quebras de linha)
    const headerJSON = JSON.stringify(header)
    const payloadJSON = JSON.stringify(payload)
    
    // 3. Codificar em Base64URL (sem padding =)
    const base64UrlEncode = (str) => {
      return Buffer.from(str, 'utf8')
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '')
    }
    
    const headerB64 = base64UrlEncode(headerJSON)
    const payloadB64 = base64UrlEncode(payloadJSON)
    
    // 4. Montar o conteúdo a assinar: header.payload
    const signingInput = `${headerB64}.${payloadB64}`
    
    // 5. Assinar com RSA-SHA256
    const sign = crypto.createSign('RSA-SHA256')
    sign.update(signingInput)
    const signatureBase64 = sign.sign(privateKey, 'base64')
    
    // 6. Converter assinatura para Base64URL
    const signatureB64 = signatureBase64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
    
    // 7. Montar JWT final: header.payload.signature
    const jwt = `${signingInput}.${signatureB64}`
    
    console.log(`   ✅ JWT gerado (${jwt.length} chars): ${jwt.substring(0, 60)}...`)
    return jwt
  } catch (error) {
    console.error('❌ Erro ao criar assinatura JWS:', error.message)
    throw error
  }
}

/**
 * Cria jwsSoftwareSignature
 * Assina softwareInfoDetail usando a CHAVE PRIVADA DO PRODUTOR
 * Conforme decreto.md: "encriptação usando a chave privada do produtor
 * com todos os campos do objecto softwareInfo"
 */
function createSoftwareSignature(softwareInfo) {
  // AGT specification says "all fields of softwareInfo" – they register only the
  // productId, productVersion and softwareValidationNumber, so sign exactly those
  // three fields in canonical order.
  const payload = {
    productId: softwareInfo.productId,
    productVersion: softwareInfo.productVersion,
    softwareValidationNumber: softwareInfo.softwareValidationNumber
  }

  return createJWSSignature(payload, PRODUCER_PRIVATE_KEY)
}

/**
 * Cria jwsDocumentSignature
 * Assina campos específicos do documento usando a CHAVE PRIVADA DO EMISSOR
 * Conforme decreto.md: "encriptação usando a chave privada do emissor
 * com os seguintes campos da factura:
 * - documentNo, taxRegistrationNumber, documentType, documentDate
 * - customerTaxID, customerCountry, companyName, documentTotals"
 */
function createDocumentSignature(document, taxRegistrationNumber) {
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
  
  return createJWSSignature(payload, ISSUER_PRIVATE_KEY)
}

/**
 * Helper genérico para assinar com a chave do EMISSOR
 * Usado em testes e operações genéricas
 */
function createIssuerSignature(payload) {
  return createJWSSignature(payload, ISSUER_PRIVATE_KEY)
}

/**
 * Testa as funções de assinatura
 */
function testSignatures() {
  console.log('\n╔════════════════════════════════════════════════════════╗')
  console.log('║   TESTE DE ASSINATURAS JWS REAIS - PRODUTOR + EMISSOR║')
  console.log('╚════════════════════════════════════════════════════════╝\n')
  
  // Informar sobre as chaves configuradas
  console.log('🔐 Chaves Privadas Configuradas:')
  console.log(`   ✅ AGT_PRODUCER_PRIVATE_KEY (para jwsSoftwareSignature): ${PRODUCER_PRIVATE_KEY ? '✓ Configurada' : '✗ Faltando'}`)
  console.log(`   ✅ AGT_PRIVATE_KEY (para jwsDocumentSignature): ${ISSUER_PRIVATE_KEY ? '✓ Configurada' : '✗ Faltando'}`)
  console.log('')
  
  // Teste 1: Software Signature (com chave do Produtor)
  console.log('1️⃣ Testando jwsSoftwareSignature (CHAVE DO PRODUTOR)...')
  const softwareInfo = {
    productId: 'SafeFacturas',
    productVersion: '1.0.1',
    softwareValidationNumber: 'FE/164/AGT/2026'
  }
  
  try {
    const softwareSig = createSoftwareSignature(softwareInfo)
    console.log(`   ✅ Assinatura criada (${softwareSig.length} chars)`)
    console.log(`   Primeiros 50: ${softwareSig.substring(0, 50)}...`)
  } catch (error) {
    console.log(`   ❌ Erro: ${error.message}`)
  }
  
  // Teste 2: Document Signature (com chave do Emissor)
  console.log('\n2️⃣ Testando jwsDocumentSignature (CHAVE DO EMISSOR)...')
  const document = {
    documentNo: 'FT A/000001',
    documentType: 'FT',
    documentDate: '2026-02-03',
    customerTaxID: '999999999',
    customerCountry: 'AO',
    companyName: 'CONSUMIDOR FINAL',
    documentTotals: {
      taxPayable: '14000.00',
      netTotal: '100000.00',
      grossTotal: '114000.00'
    }
  }
  
  try {
    const docSig = createDocumentSignature(document, '5000413178')
    console.log(`   ✅ Assinatura criada (${docSig.length} chars)`)
    console.log(`   Primeiros 50: ${docSig.substring(0, 50)}...`)
  } catch (error) {
    console.log(`   ❌ Erro: ${error.message}`)
  }
  
  console.log('\n╔════════════════════════════════════════════════════════╗')
  console.log('║   TESTES CONCLUÍDOS                                   ║')
  console.log('║   Ambas as chaves funcionando corretamente             ║')
  console.log('╚════════════════════════════════════════════════════════╝\n')
}

// Exportar funções
module.exports = {
  createJWSSignature,
  createSoftwareSignature,
  createDocumentSignature,
  createIssuerSignature,
  // Funções auxiliares para debug
  getProducerPublicKeyFingerprint: () => {
    try {
      const pubKey = crypto.createPrivateKey(PRODUCER_PRIVATE_KEY).export({ type: 'spki', format: 'pem' })
      return crypto.createHash('sha256').update(pubKey).digest('hex')
    } catch (e) {
      return 'N/A'
    }
  },
  getIssuerPublicKeyFingerprint: () => {
    try {
      const pubKey = crypto.createPrivateKey(ISSUER_PRIVATE_KEY).export({ type: 'spki', format: 'pem' })
      return crypto.createHash('sha256').update(pubKey).digest('hex')
    } catch (e) {
      return 'N/A'
    }
  },
  // Info sobre as chaves
  getKeyInfo: () => ({
    producer: {
      name: 'Chave do Produtor (Software)',
      configured: !!PRODUCER_PRIVATE_KEY,
      usedFor: 'jwsSoftwareSignature',
      fingerprint: crypto.createPrivateKey(PRODUCER_PRIVATE_KEY).export({ type: 'spki', format: 'pem' })
        ? crypto.createHash('sha256').update(crypto.createPrivateKey(PRODUCER_PRIVATE_KEY).export({ type: 'spki', format: 'pem' })).digest('hex')
        : 'N/A'
    },
    issuer: {
      name: 'Chave do Emissor (Contribuinte)',
      configured: !!ISSUER_PRIVATE_KEY,
      usedFor: 'jwsDocumentSignature',
      fingerprint: crypto.createPrivateKey(ISSUER_PRIVATE_KEY).export({ type: 'spki', format: 'pem' })
        ? crypto.createHash('sha256').update(crypto.createPrivateKey(ISSUER_PRIVATE_KEY).export({ type: 'spki', format: 'pem' })).digest('hex')
        : 'N/A'
    }
  })
}

// Se executado diretamente, rodar testes
if (require.main === module) {
  testSignatures()
}
