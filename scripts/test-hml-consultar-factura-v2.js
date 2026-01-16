/**
 * Script de teste para Consultar Factura - AGT HML
 * Seguindo documentação oficial: https://portaldoparceiro.minfin.gov.ao/doc-agt/faturacao-electronica/1/servicos/consultar_fatura.html
 * 
 * Endpoint: POST https://sifphml.minfin.gov.ao/sigt/fe/v1/consultarFactura
 * 
 * Campos obrigatórios na assinatura (jwsSignature):
 * - taxRegistrationNumber
 * - documentNo
 */

const https = require('https')

const HML_CONFIG = {
  baseURL: 'https://sifphml.minfin.gov.ao/sigt/fe/v1',
  username: 'ws.hml.addonsaftb1',
  password: 'mfn+3534+2025',
  nifTest: '5000413178',
  timeout: 30000
}

const SOFTWARE_INFO = {
  productId: 'SafeFacturas',
  productVersion: '1.0.0',
  softwareValidationNumber: 'HML-TEST-001'
}

console.log('\n╔════════════════════════════════════════════════════════╗')
console.log('║   TESTE CONSULTAR FACTURA (v2) - AGT HML              ║')
console.log('║   Conforme documentação oficial AGT                    ║')
console.log('╚════════════════════════════════════════════════════════╝\n')

// Gerar UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// Gerar JWS dummy
function generateJWS(payload) {
  const header = { typ: 'JOSE', alg: 'RS256' }
  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  const signature = Buffer.from('DUMMY-SIG-' + Date.now()).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  return `${base64Header}.${base64Payload}.${signature}`
}

// Criar payload conforme documentação oficial
// NOTA: Há inconsistência na documentação AGT:
// - Exemplo do Pedido usa: "invoiceNo"
// - Parâmetros de entrada mostra: "documentNo"
// Vamos testar com ambos para determinar qual é correto
function createConsultarFacturaPayload(docNo, useDocumentNo = true) {
  const softwareInfoDetail = SOFTWARE_INFO
  
  // Campos para assinatura do serviço (conforme doc)
  // "Payload assinatura": { taxRegistrationNumber, documentNo }
  const signatureFields = {
    taxRegistrationNumber: HML_CONFIG.nifTest,
    documentNo: docNo  // Na assinatura sempre documentNo
  }
  
  const basePayload = {
    schemaVersion: '1.2',
    submissionUUID: generateUUID(),
    taxRegistrationNumber: HML_CONFIG.nifTest,
    submissionTimeStamp: new Date().toISOString(),
    softwareInfo: {
      softwareInfoDetail: softwareInfoDetail,
      jwsSoftwareSignature: generateJWS(softwareInfoDetail)
    },
    jwsSignature: generateJWS(signatureFields)
  }
  
  // Testar com ambos nomes de campo
  if (useDocumentNo) {
    return { ...basePayload, documentNo: docNo }
  } else {
    return { ...basePayload, invoiceNo: docNo }
  }
}

async function testConsultarFactura(documentNo) {
  // Primeiro tenta com documentNo (parâmetros oficiais)
  const payload = createConsultarFacturaPayload(documentNo, true)
  
  console.log('📋 Configuração:')
  console.log(`   Base URL: ${HML_CONFIG.baseURL}`)
  console.log(`   Username: ${HML_CONFIG.username}`)
  console.log(`   NIF Teste: ${HML_CONFIG.nifTest}`)
  console.log(`   Documento: ${documentNo}`)
  console.log('')
  
  console.log('📄 Payload (conforme documentação AGT):')
  console.log(JSON.stringify(payload, null, 2))
  console.log('')
  
  const authHeader = 'Basic ' + Buffer.from(`${HML_CONFIG.username}:${HML_CONFIG.password}`).toString('base64')
  
  return new Promise((resolve, reject) => {
    const url = new URL('/sigt/fe/v1/consultarFactura', 'https://sifphml.minfin.gov.ao')
    
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
            if (parsed.validationStatus) {
              console.log('\n✅ FACTURA ENCONTRADA!')
              console.log(`   Status: ${parsed.validationStatus}`)
              const statusMeaning = {
                'V': 'Factura válida',
                'P': 'Factura válida com penalização (atraso > 24h)'
              }
              console.log(`   Significado: ${statusMeaning[parsed.validationStatus] || 'Desconhecido'}`)
            } else if (parsed.errorList && parsed.errorList.length > 0) {
              console.log('\n⚠️  ERROS/AVISOS:')
              parsed.errorList.forEach((err, idx) => {
                console.log(`   ${idx + 1}. [${err.idError}] ${err.descriptionError}`)
              })
            }
            resolve(parsed)
          } else {
            console.log(`\n⚠️ Status ${res.statusCode}`)
            resolve(parsed)
          }
        } catch (error) {
          console.log(data)
          if (data.includes('xml')) {
            console.log('\n⚠️  Resposta XML (possível erro no servidor AGT)')
          }
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

// Obter número do documento do argumento
const documentNo = process.argv[2] || 'FT HML2026/0116-001'

console.log(`🔍 Consultando Documento: ${documentNo}\n`)

testConsultarFactura(documentNo)
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
