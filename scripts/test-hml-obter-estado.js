/**
 * Script de teste para Obter Estado de Factura no ambiente HML da AGT
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
console.log('║   TESTE OBTER ESTADO - AGT HML                        ║')
console.log('╚════════════════════════════════════════════════════════╝\n')

console.log('📋 Configuração:')
console.log(`   Base URL: ${HML_CONFIG.baseURL}`)
console.log(`   Username: ${HML_CONFIG.username}`)
console.log(`   NIF Teste: ${HML_CONFIG.nifTest}`)
console.log('')

// Criar payload para obter estado
function createObterEstadoPayload(requestID) {
  return {
    taxRegistrationNumber: HML_CONFIG.nifTest,
    requestID: requestID
  }
}

async function testObterEstado(requestID) {
  const payload = createObterEstadoPayload(requestID)
  
  console.log('📄 Payload Obter Estado:')
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
            console.log('\n✅ ESTADO OBTIDO COM SUCESSO!')
            
            if (parsed.resultCode === '0') {
              console.log('\n📊 Status da Factura:')
              parsed.errorList?.forEach((doc) => {
                if (doc.documentNo) {
                  console.log(`\n   Documento: ${doc.documentNo}`)
                  console.log(`   Status: ${doc.validationStatus || 'Pendente'}`)
                  if (doc.qrCode) {
                    console.log(`   QR Code: ${doc.qrCode.substring(0, 50)}...`)
                  }
                  if (doc.hashCode) {
                    console.log(`   Hash: ${doc.hashCode}`)
                  }
                  if (doc.certificateNo) {
                    console.log(`   Certificado: ${doc.certificateNo}`)
                  }
                }
              })
            } else {
              console.log(`\n⚠️  Result Code: ${parsed.resultCode}`)
              if (parsed.resultMessage) {
                console.log(`   Message: ${parsed.resultMessage}`)
              }
            }
            
            resolve(parsed)
          } else if (res.statusCode === 401) {
            console.log('\n❌ ERRO DE AUTENTICAÇÃO')
            reject(new Error('Autenticação falhou'))
          } else if (res.statusCode === 400) {
            console.log('\n❌ ERRO DE VALIDAÇÃO')
            console.log('   Verifique o RequestID')
            reject(new Error('RequestID inválido'))
          } else {
            console.log(`\n⚠️ RESPOSTA INESPERADA: ${res.statusCode}`)
            resolve(parsed)
          }
        } catch (error) {
          console.log(data)
          
          if (res.statusCode === 200 || res.statusCode === 201) {
            console.log('\n✅ ESTADO OBTIDO (resposta não-JSON)')
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
    
    req.write(JSON.stringify(payload))
    req.end()
  })
}

// Obter RequestID do argumento ou usar o do teste anterior
const requestID = process.argv[2] || '202600000184282'

console.log(`🔍 Consultando RequestID: ${requestID}\n`)

// Executar teste
testObterEstado(requestID)
  .then((result) => {
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
