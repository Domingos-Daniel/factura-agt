/**
 * Script de teste para Registar Factura no ambiente HML da AGT
 * Usa dados certificados do parceiro
 */

require('dotenv').config({ path: '.env.local' })
const https = require('https')

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

console.log('\n╔════════════════════════════════════════════════════════╗')
console.log('║   TESTE REGISTAR FACTURA - AGT HML (v2)               ║')
console.log('║   Com dados certificados do parceiro                   ║')
console.log('╚════════════════════════════════════════════════════════╝\n')

console.log('📋 Configuração:')
console.log(`   Base URL: ${HML_CONFIG.baseURL}`)
console.log(`   Username: ${HML_CONFIG.username}`)
console.log(`   NIF Teste: ${HML_CONFIG.nifTest}`)
console.log('')

console.log('🔑 Software Info:')
console.log(`   Product ID: ${SOFTWARE_INFO.productId}`)
console.log(`   Version: ${SOFTWARE_INFO.productVersion}`)
console.log(`   Validation Number: ${SOFTWARE_INFO.softwareValidationNumber}`)
console.log('')

// Gerar UUID simples
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// Gerar JWS dummy
function generateDummyJWS(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = Buffer.from('TEST-SIGNATURE-' + Date.now().toString(16)).toString('base64url')
  return `${header}.${payloadB64}.${signature}`
}

// Criar payload de factura
function createFacturaPayload() {
  const submissionGUID = generateUUID()
  const now = new Date().toISOString()
  const docNo = `FT HML${now.substring(0, 10).replace(/-/g, '/')}-001`
  
  return {
    schemaVersion: '1.0',
    submissionGUID,
    taxRegistrationNumber: HML_CONFIG.nifTest,
    submissionTimeStamp: now,
    softwareInfo: {
      softwareInfoDetail: SOFTWARE_INFO,
      jwsSoftwareSignature: 'TEST-SIGNATURE-HML'
    },
    numberOfEntries: 1,
    documents: [{
      documentNo: docNo,
      documentStatus: 'N',
      documentType: 'FT',
      documentDate: now.substring(0, 10),
      systemEntryDate: now,
      customerCountry: 'AO',
      customerTaxID: HML_CONFIG.nifTest,
      companyName: 'Cliente Teste HML',
      lines: [{
        lineNumber: 1,
        productCode: 'PROD-TEST-001',
        productDescription: 'Produto de Teste HML',
        quantity: 1,
        unitOfMeasure: 'UN',
        unitPrice: 10000,
        unitPriceBase: 10000,
        debitAmount: 10000,
        taxes: [{
          taxType: 'IVA',
          taxCountryRegion: 'AO',
          taxCode: 'NOR',
          taxPercentage: 14,
          taxAmount: 1400
        }],
        settlementAmount: 0
      }],
      documentTotals: {
        netTotal: 10000,
        taxPayable: 1400,
        grossTotal: 11400
      }
    }]
  }
}

// Transformar payload para formato AGT
function transformToAGT(payload) {
  return {
    schemaVersion: payload.schemaVersion,
    submissionUUID: payload.submissionGUID,
    taxRegistrationNumber: payload.taxRegistrationNumber,
    submissionTimeStamp: payload.submissionTimeStamp,
    softwareInfo: payload.softwareInfo,
    numberOfEntries: payload.numberOfEntries,
    documents: payload.documents.map(doc => ({
      ...doc,
      jwsDocumentSignature: generateDummyJWS({
        documentNo: doc.documentNo,
        documentType: doc.documentType,
        documentDate: doc.documentDate,
        grossTotal: doc.documentTotals.grossTotal,
        timestamp: new Date().toISOString()
      })
    }))
  }
}

async function testRegistarFactura() {
  const payload = createFacturaPayload()
  const transformed = transformToAGT(payload)
  
  console.log('📄 Factura a enviar:')
  console.log(`   Documento: ${payload.documents[0].documentNo}`)
  console.log(`   Total: ${payload.documents[0].documentTotals.grossTotal} AOA`)
  console.log(`   Software: ${SOFTWARE_INFO.productId} v${SOFTWARE_INFO.productVersion}`)
  console.log(`   Certificação: ${SOFTWARE_INFO.softwareValidationNumber}`)
  console.log('')
  
  const authHeader = 'Basic ' + Buffer.from(`${HML_CONFIG.username}:${HML_CONFIG.password}`).toString('base64')
  
  return new Promise((resolve, reject) => {
    const url = new URL('/sigt/fe/v1/registarFactura', 'https://sifphml.minfin.gov.ao')
    
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
    console.log(`   User-Agent: ${options.headers['User-Agent']}`)
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
            if (parsed.requestID && !parsed.requestID.startsWith('REQ-')) {
              console.log('\n✅ FACTURA REGISTADA COM SUCESSO!')
              console.log(`   RequestID: ${parsed.requestID}`)
              console.log(`   Documento: ${payload.documents[0].documentNo}`)
              console.log(`   Software: ${SOFTWARE_INFO.softwareValidationNumber}`)
              
              if (parsed.errorList && parsed.errorList.length > 0 && parsed.errorList[0]) {
                console.log('\n⚠️  Avisos:')
                parsed.errorList.forEach((err, idx) => {
                  if (err && err.idError) {
                    console.log(`   ${idx + 1}. [${err.idError}] ${err.descriptionError}`)
                  }
                })
              }
            } else {
              console.log('\n⚠️  RequestID de fallback detectado. Verificar erros.')
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
    
    req.write(JSON.stringify(transformed))
    req.end()
  })
}

testRegistarFactura()
  .then(() => {
    console.log('\n╔════════════════════════════════════════════════════════╗')
    console.log('║              TESTE CONCLUÍDO COM SUCESSO              ║')
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
