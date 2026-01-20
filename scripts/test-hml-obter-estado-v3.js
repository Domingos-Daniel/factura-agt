/**
 * Script de teste para Obter Estado - AGT HML
 * Usa dados certificados do parceiro via .env.local
 * 
 * Uso: node scripts/test-hml-obter-estado-v3.js <requestID>
 */

require('dotenv').config({ path: '.env.local' })
const https = require('https')
const crypto = require('crypto')

const HML_CONFIG = {
  baseURL: process.env.AGT_HML_BASE_URL || 'https://sifphml.minfin.gov.ao/sigt/fe/v1',
  username: process.env.AGT_HML_USERNAME || 'ws.hml.addonsaftb1',
  password: process.env.AGT_HML_PASSWORD || 'mfn+3534+2025',
  nifTest: process.env.AGT_HML_NIF_TEST || '5000413178',
  timeout: 30000
}

const SOFTWARE_INFO = {
  productId: process.env.AGT_SOFTWARE_PRODUCT_ID || 'SafeFacturas',
  productVersion: process.env.AGT_SOFTWARE_VERSION || '1.0.0',
  softwareValidationNumber: process.env.AGT_SOFTWARE_VALIDATION_NUMBER || 'HML-TEST-001'
}

const PRIVATE_KEY = process.env.AGT_PRIVATE_KEY

console.log('\n╔════════════════════════════════════════════════════════╗')
console.log('║   TESTE OBTER ESTADO (v3) - AGT HML                   ║')
console.log('║   Com dados certificados + assinatura real             ║')
console.log('╚════════════════════════════════════════════════════════╝\n')

// Gerar UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// Gerar JWS com assinatura real RS256
function generateJWS(payload) {
  const header = { typ: 'JOSE', alg: 'RS256' }
  
  const base64urlEncode = (obj) => {
    return Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
  }
  
  const headerB64 = base64urlEncode(header)
  const payloadB64 = base64urlEncode(payload)
  const signingInput = `${headerB64}.${payloadB64}`
  
  // Se temos chave privada, assinar de verdade
  if (PRIVATE_KEY && PRIVATE_KEY.includes('PRIVATE KEY')) {
    try {
      const sign = crypto.createSign('RSA-SHA256')
      sign.update(signingInput)
      const signature = sign.sign(PRIVATE_KEY, 'base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '')
      return `${headerB64}.${payloadB64}.${signature}`
    } catch (error) {
      console.warn('⚠️  Erro ao assinar com chave real, usando dummy:', error.message)
    }
  }
  
  // Fallback: dummy signature
  const signature = Buffer.from('DUMMY-SIG-' + Date.now()).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  return `${headerB64}.${payloadB64}.${signature}`
}

// Criar payload conforme documentação oficial
function createObterEstadoPayload(requestID) {
  const softwareInfoDetail = SOFTWARE_INFO
  
  // Campos para assinatura do serviço (conforme doc)
  const signatureFields = {
    taxRegistrationNumber: HML_CONFIG.nifTest,
    requestID: requestID
  }
  
  return {
    schemaVersion: '1.2',
    submissionUUID: generateUUID(),
    taxRegistrationNumber: HML_CONFIG.nifTest,
    submissionTimeStamp: new Date().toISOString(),
    softwareInfo: {
      softwareInfoDetail: softwareInfoDetail,
      jwsSoftwareSignature: generateJWS(softwareInfoDetail)
    },
    jwsSignature: generateJWS(signatureFields),
    requestID: requestID
  }
}

async function testObterEstado(requestID) {
  const payload = createObterEstadoPayload(requestID)
  
  console.log('📋 Configuração:')
  console.log(`   Base URL: ${HML_CONFIG.baseURL}`)
  console.log(`   Username: ${HML_CONFIG.username}`)
  console.log(`   NIF Teste: ${HML_CONFIG.nifTest}`)
  console.log(`   RequestID: ${requestID}`)
  console.log('')
  
  console.log('🔑 Software Info:')
  console.log(`   Product ID: ${SOFTWARE_INFO.productId}`)
  console.log(`   Version: ${SOFTWARE_INFO.productVersion}`)
  console.log(`   Validation Number: ${SOFTWARE_INFO.softwareValidationNumber}`)
  console.log(`   Chave Privada: ${PRIVATE_KEY ? '✅ Configurada' : '❌ Não encontrada'}`)
  console.log('')
  
  console.log('📄 Payload:')
  console.log(JSON.stringify(payload, null, 2))
  console.log('')
  
  const authHeader = 'Basic ' + Buffer.from(`${HML_CONFIG.username}:${HML_CONFIG.password}`).toString('base64')
  
  return new Promise((resolve, reject) => {
    const url = new URL('/sigt/fe/v1/obterEstado', 'https://sifphml.minfin.gov.ao')
    
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        'User-Agent': `${SOFTWARE_INFO.productId}/${SOFTWARE_INFO.productVersion}`
      },
      timeout: HML_CONFIG.timeout
    }
    
    console.log(`🌐 Request:`)
    console.log(`   URL: ${url.href}`)
    console.log(`   Method: ${options.method}`)
    console.log('')
    
    const req = https.request(options, (res) => {
      let data = ''
      
      console.log(`📥 Response:`)
      console.log(`   Status: ${res.statusCode} ${res.statusMessage}`)
      console.log('')
      
      res.on('data', (chunk) => {
        data += chunk
      })
      
      res.on('end', () => {
        console.log(`📄 Response Body:`)
        try {
          const parsed = JSON.parse(data)
          console.log(JSON.stringify(parsed, null, 2))
          
          if (res.statusCode === 200) {
            const resultMeaning = {
              '0': 'Processamento a decorrer',
              '1': 'Processamento concluído com sucesso',
              '2': 'Processamento concluído, sem facturas válidas',
              '3': 'Processamento concluído com erros'
            }
            
            console.log('\n✅ ESTADO OBTIDO COM SUCESSO!')
            console.log(`   Result Code: ${parsed.resultCode}`)
            console.log(`   Significado: ${resultMeaning[parsed.resultCode] || 'Desconhecido'}`)
            
            if (parsed.documentStatusList && parsed.documentStatusList.length > 0) {
              console.log('\n   Documentos:')
              parsed.documentStatusList.forEach((doc, idx) => {
                if (doc && doc.documentNo) {
                  console.log(`   ${idx + 1}. ${doc.documentNo} - Status: ${doc.validationStatus}`)
                }
              })
            }
            
            if (parsed.requestErrorList && parsed.requestErrorList.length > 0) {
              console.log('\n⚠️  Erros/Avisos:')
              parsed.requestErrorList.forEach((err, idx) => {
                if (err && err.idError) {
                  console.log(`   ${idx + 1}. [${err.idError}] ${err.descriptionError}`)
                }
              })
            }
            resolve(parsed)
          } else {
            console.log(`\n⚠️ Status ${res.statusCode}`)
            resolve(parsed)
          }
        } catch (error) {
          console.log(data)
          reject(error)
        }
      })
    })
    
    req.on('error', (error) => {
      console.error('\n❌ ERRO DE CONEXÃO:', error.message)
      reject(error)
    })
    
    req.on('timeout', () => {
      console.error('\n⏱️ TIMEOUT')
      req.destroy()
      reject(new Error('Timeout'))
    })
    
    req.write(JSON.stringify(payload))
    req.end()
  })
}

// Obter requestID do argumento
const requestID = process.argv[2]

if (!requestID) {
  console.error('❌ Uso: node scripts/test-hml-obter-estado-v3.js <requestID>')
  console.error('   Exemplo: node scripts/test-hml-obter-estado-v3.js 202600000185627')
  process.exit(1)
}

console.log(`🔍 Consultando RequestID: ${requestID}\n`)

testObterEstado(requestID)
  .then(() => {
    console.log('\n╔════════════════════════════════════════════════════════╗')
    console.log('║              TESTE CONCLUÍDO                          ║')
    console.log('╚════════════════════════════════════════════════════════╝')
    process.exit(0)
  })
  .catch((error) => {
    console.log('\n╔════════════════════════════════════════════════════════╗')
    console.log('║                  TESTE FALHOU                         ║')
    console.log('╚════════════════════════════════════════════════════════╝')
    console.error(`Erro: ${error.message}`)
    process.exit(1)
  })
