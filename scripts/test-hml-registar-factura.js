/**
 * Script de teste para Registar Factura no ambiente HML da AGT
 * Usa NIF de teste: 5000413178
 */

const https = require('https')

const HML_CONFIG = {
  baseURL: 'https://sifphml.minfin.gov.ao/sigt/fe/v1',
  username: 'ws.hml.addonsaftb1',
  password: 'mfn+3534+2025',
  nifTest: '5000413178',
  timeout: 30000
}

console.log('\n╔════════════════════════════════════════════════════════╗')
console.log('║   TESTE REGISTAR FACTURA - AGT HML                    ║')
console.log('╚════════════════════════════════════════════════════════╝\n')

console.log('📋 Configuração:')
console.log(`   Base URL: ${HML_CONFIG.baseURL}`)
console.log(`   Username: ${HML_CONFIG.username}`)
console.log(`   NIF Teste: ${HML_CONFIG.nifTest}`)
console.log('')

// Gerar UUID simples
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// Gerar JWS Dummy (para teste)
function generateDummyJWS(document) {
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  }
  
  const payload = {
    documentNo: document.documentNo,
    documentType: document.documentType,
    documentDate: document.documentDate,
    grossTotal: document.documentTotals?.grossTotal || 0,
    timestamp: new Date().toISOString()
  }
  
  // Base64url encode (simplificado para teste)
  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  const dummySignature = 'TEST-SIGNATURE-' + generateUUID().substring(0, 8)
  
  return `${base64Header}.${base64Payload}.${dummySignature}`
}

// Transformar payload para formato AGT
function transformToAGTFormat(payload) {
  const transformed = {
    ...payload,
    submissionUUID: payload.submissionGUID, // Renomear campo
    documents: payload.documents?.map(doc => ({
      ...doc,
      jwsDocumentSignature: generateDummyJWS(doc) // Adicionar assinatura
    }))
  }
  
  // Remover campo antigo
  delete transformed.submissionGUID
  
  return transformed
}

// Criar factura de teste
function createTestFactura() {
  const today = new Date()
  const docNo = `FT HML${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}-001`
  
  return {
    schemaVersion: '1.0',
    submissionGUID: generateUUID(),
    taxRegistrationNumber: HML_CONFIG.nifTest,
    submissionTimeStamp: today.toISOString(),
    softwareInfo: {
      softwareInfoDetail: {
        productId: 'SafeFacturas',
        productVersion: '1.0.0',
        softwareValidationNumber: 'HML-TEST-001'
      },
      jwsSoftwareSignature: 'TEST-SIGNATURE-HML'
    },
    numberOfEntries: 1,
    documents: [
      {
        documentNo: docNo,
        documentStatus: 'N',
        documentType: 'FT',
        documentDate: today.toISOString().split('T')[0],
        systemEntryDate: today.toISOString(),
        customerCountry: 'AO',
        customerTaxID: HML_CONFIG.nifTest,
        companyName: 'Cliente Teste HML',
        lines: [
          {
            lineNumber: 1,
            productCode: 'PROD-TEST-001',
            productDescription: 'Produto de Teste HML',
            quantity: 1,
            unitOfMeasure: 'UN',
            unitPrice: 10000,
            unitPriceBase: 10000,
            debitAmount: 10000,
            taxes: [
              {
                taxType: 'IVA',
                taxCountryRegion: 'AO',
                taxCode: 'NOR',
                taxPercentage: 14,
                taxAmount: 1400
              }
            ],
            settlementAmount: 0
          }
        ],
        documentTotals: {
          netTotal: 10000,
          taxPayable: 1400,
          grossTotal: 11400
        }
      }
    ]
  }
}

async function testRegistarFactura() {
  const factura = createTestFactura()
  
  console.log('📄 Factura Original:')
  console.log(JSON.stringify(factura, null, 2))
  console.log('')
  
  // Aplicar transformação para formato AGT
  const facturaTransformada = transformToAGTFormat(factura)
  
  console.log('🔄 Factura Transformada (AGT):')
  console.log(JSON.stringify(facturaTransformada, null, 2))
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
        'User-Agent': 'SafeFacturas/1.0'
      },
      timeout: HML_CONFIG.timeout
    }
    
    console.log(`🌐 Request:`)
    console.log(`   URL: ${url.href}`)
    console.log(`   Method: ${options.method}`)
    console.log(`   Authorization: Basic ***`)
    console.log('')
    
    const req = https.request(options, (res) => {
      let data = ''
      
      console.log(`📥 Response:`)
      console.log(`   Status: ${res.statusCode} ${res.statusMessage}`)
      console.log(`   Headers:`, JSON.stringify(res.headers, null, 2))
      console.log('')
      
      res.on('data', (chunk) => {
        data += chunk
      })
      
      res.on('end', () => {
        console.log(`📄 Response Body:`)
        try {
          const parsed = JSON.parse(data)
          console.log(JSON.stringify(parsed, null, 2))
          
          if (res.statusCode === 200 || res.statusCode === 201) {
            if (parsed.requestID && parsed.requestID !== '') {
              console.log('\n✅ FACTURA REGISTADA COM SUCESSO!')
              console.log(`   RequestID: ${parsed.requestID}`)
              if (parsed.validationStatus) {
                console.log(`   Status: ${parsed.validationStatus}`)
              }
            } else if (parsed.errorList && parsed.errorList.length > 0) {
              console.log('\n⚠️  ERRO NO REGISTO:')
              parsed.errorList.forEach((error, idx) => {
                console.log(`   ${idx + 1}. [${error.idError}] ${error.descriptionError}`)
                if (error.documentNo && error.documentNo !== '#') {
                  console.log(`      Documento: ${error.documentNo}`)
                }
              })
            } else {
              console.log('\n✅ REQUEST PROCESSADO')
            }
            resolve(parsed)
          } else if (res.statusCode === 401) {
            console.log('\n❌ ERRO DE AUTENTICAÇÃO')
            reject(new Error('Autenticação falhou'))
          } else if (res.statusCode === 400) {
            console.log('\n❌ ERRO DE VALIDAÇÃO')
            console.log('   Verifique os dados da factura')
            reject(new Error('Dados inválidos'))
          } else {
            console.log(`\n⚠️ RESPOSTA INESPERADA: ${res.statusCode}`)
            resolve(parsed)
          }
        } catch (error) {
          console.log(data)
          
          if (res.statusCode === 200 || res.statusCode === 201) {
            console.log('\n✅ FACTURA REGISTADA (resposta não-JSON)')
            resolve({ statusCode: res.statusCode, data })
          } else {
            console.log('\n❌ ERRO AO PROCESSAR RESPOSTA')
            reject(error)
          }
        }
      })
    })
    
    req.on('error', (error) => {
      console.error('\n❌ ERRO DE CONEXÃO:', error.message)
      reject(error)
    })
    
    req.on('timeout', () => {
      console.error('\n⏱️ TIMEOUT: Servidor não respondeu em 30 segundos')
      req.destroy()
      reject(new Error('Timeout'))
    })
    
    // Enviar factura transformada
    req.write(JSON.stringify(facturaTransformada))
    req.end()
  })
}

// Executar teste
testRegistarFactura()
  .then((result) => {
    console.log('\n╔════════════════════════════════════════════════════════╗')
    console.log('║              TESTE CONCLUÍDO COM SUCESSO              ║')
    console.log('╚════════════════════════════════════════════════════════╝')
    process.exit(0)
  })
  .catch((error) => {
    console.log('\n╔════════════════════════════════════════════════════════╗')
    console.log('║                  TESTE FALHOU                          ║')
    console.log('╚════════════════════════════════════════════════════════╝')
    console.error('\n❌ Erro:', error.message)
    process.exit(1)
  })
