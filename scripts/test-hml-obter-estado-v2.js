/**
 * Script de teste para Obter Estado (Consultar Estado da Fatura) - AGT HML
 * Seguindo documentação oficial: https://portaldoparceiro.minfin.gov.ao/doc-agt/faturacao-electronica/1/servicos/consultar.html
 * 
 * Endpoint: POST https://sifphml.minfin.gov.ao/sigt/fe/v1/obterEstado
 * 
 * Campos obrigatórios na assinatura (jwsSignature):
 * - taxRegistrationNumber
 * - requestID
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
console.log('║   TESTE OBTER ESTADO (v2) - AGT HML                   ║')
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
  
  console.log('📄 Payload (conforme documentação AGT):')
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
            if (parsed.resultCode !== undefined) {
              console.log('\n✅ ESTADO OBTIDO COM SUCESSO!')
              console.log(`   Result Code: ${parsed.resultCode}`)
              
              // Interpretar resultCode conforme documentação
              const resultCodes = {
                '0': 'Processamento concluído, sem facturas inválidas',
                '1': 'Processamento concluído, com facturas válidas e inválidas',
                '2': 'Processamento concluído, sem facturas válidas',
                '7': 'Solicitação prematura, aguarde para repetir',
                '8': 'Processamento em curso',
                '9': 'Processamento cancelado'
              }
              console.log(`   Significado: ${resultCodes[parsed.resultCode] || 'Desconhecido'}`)
              
              if (parsed.documentStatusList && parsed.documentStatusList.length > 0) {
                console.log('\n   Documentos:')
                parsed.documentStatusList.forEach((doc, idx) => {
                  console.log(`   ${idx + 1}. ${doc.documentNo} - Status: ${doc.documentStatus}`)
                  if (doc.errorList && doc.errorList.length > 0) {
                    doc.errorList.forEach(err => {
                      console.log(`      Erro: [${err.errorCode}] ${err.errorDescription}`)
                    })
                  }
                })
              }
            } else if (parsed.errorList && parsed.errorList.length > 0) {
              console.log('\n⚠️  ERROS RETORNADOS:')
              parsed.errorList.forEach((err, idx) => {
                console.log(`   ${idx + 1}. [${err.idError || err.errorCode}] ${err.descriptionError || err.errorDescription}`)
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

// Obter RequestID do argumento
const requestID = process.argv[2] || '202600000184406'

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
