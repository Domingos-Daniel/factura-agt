/**
 * Script de teste para Listar Séries - AGT HML
 * Usa dados certificados do parceiro via .env.local
 */

require('dotenv').config({ path: '.env.local' })
const https = require('https')
const crypto = require('crypto')

const HML_CONFIG = {
  baseURL: process.env.AGT_HML_BASE_URL || 'https://sifphml.minfin.gov.ao/sigt/fe/v1',
  username: process.env.AGT_HML_USERNAME,
  password: process.env.AGT_HML_PASSWORD,
  nifTest: process.env.AGT_HML_NIF_TEST || '5000413178',
  timeout: 30000
}

const SOFTWARE_INFO = {
  productId: process.env.AGT_SOFTWARE_PRODUCT_ID,
  productVersion: process.env.AGT_SOFTWARE_VERSION,
  softwareValidationNumber: process.env.AGT_SOFTWARE_VALIDATION_NUMBER
}

const PRIVATE_KEY = process.env.AGT_PRIVATE_KEY

console.log('\n╔════════════════════════════════════════════════════════╗')
console.log('║   TESTE LISTAR SÉRIES (v3) - AGT HML                  ║')
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
      console.warn('⚠️  Erro ao assinar:', error.message)
    }
  }
  
  const signature = Buffer.from('DUMMY-SIG-' + Date.now()).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  return `${headerB64}.${payloadB64}.${signature}`
}

function createListarSeriesPayload() {
  const signatureFields = {
    taxRegistrationNumber: HML_CONFIG.nifTest
  }
  
  return {
    schemaVersion: '1.2',
    submissionUUID: generateUUID(),
    taxRegistrationNumber: HML_CONFIG.nifTest,
    submissionTimeStamp: new Date().toISOString(),
    softwareInfo: {
      softwareInfoDetail: SOFTWARE_INFO,
      jwsSoftwareSignature: generateJWS(SOFTWARE_INFO)
    },
    jwsSignature: generateJWS(signatureFields)
  }
}

async function testListarSeries() {
  const payload = createListarSeriesPayload()
  
  console.log('📋 Configuração:')
  console.log(`   Base URL: ${HML_CONFIG.baseURL}`)
  console.log(`   NIF Teste: ${HML_CONFIG.nifTest}`)
  console.log('')
  
  console.log('🔑 Software Info:')
  console.log(`   Product ID: ${SOFTWARE_INFO.productId}`)
  console.log(`   Version: ${SOFTWARE_INFO.productVersion}`)
  console.log(`   Validation Number: ${SOFTWARE_INFO.softwareValidationNumber}`)
  console.log(`   Chave Privada: ${PRIVATE_KEY ? '✅ Configurada' : '❌ Não encontrada'}`)
  console.log('')
  
  const authHeader = 'Basic ' + Buffer.from(`${HML_CONFIG.username}:${HML_CONFIG.password}`).toString('base64')
  
  return new Promise((resolve, reject) => {
    const url = new URL('/sigt/fe/v1/listarSeries', 'https://sifphml.minfin.gov.ao')
    
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
    
    console.log(`🌐 Request: POST ${url.href}\n`)
    
    const req = https.request(options, (res) => {
      let data = ''
      
      console.log(`📥 Response: ${res.statusCode} ${res.statusMessage}\n`)
      
      res.on('data', (chunk) => { data += chunk })
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          console.log('📄 Response Body:')
          console.log(JSON.stringify(parsed, null, 2))
          
          if (res.statusCode === 200) {
            console.log('\n✅ LISTAR SÉRIES - SUCESSO!')
            console.log(`   Result Code: ${parsed.resultCode}`)
            console.log(`   Séries encontradas: ${parsed.seriesResultCount || 0}`)
            
            if (parsed.seriesInfo && parsed.seriesInfo.length > 0) {
              console.log('\n📋 Séries:')
              parsed.seriesInfo.forEach((serie, idx) => {
                if (serie && serie.seriesCode) {
                  console.log(`   ${idx + 1}. ${serie.seriesCode} (${serie.seriesYear})`)
                  console.log(`      Tipo: ${serie.documentType} | Status: ${serie.seriesStatus}`)
                }
              })
            }
            
            if (parsed.errorList && parsed.errorList.length > 0) {
              console.log('\n⚠️  Erros/Avisos:')
              parsed.errorList.forEach((err, idx) => {
                if (err && err.idError) {
                  console.log(`   ${idx + 1}. [${err.idError}] ${err.descriptionError}`)
                }
              })
            }
          }
          resolve(parsed)
        } catch (error) {
          console.log(data)
          reject(error)
        }
      })
    })
    
    req.on('error', (error) => {
      console.error('\n❌ ERRO:', error.message)
      reject(error)
    })
    
    req.write(JSON.stringify(payload))
    req.end()
  })
}

testListarSeries()
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
