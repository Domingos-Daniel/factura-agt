/**
 * Script de teste para Consultar Factura no ambiente HML da AGT
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
console.log('║   TESTE CONSULTAR FACTURA - AGT HML                   ║')
console.log('╚════════════════════════════════════════════════════════╝\n')

console.log('📋 Configuração:')
console.log(`   Base URL: ${HML_CONFIG.baseURL}`)
console.log(`   Username: ${HML_CONFIG.username}`)
console.log(`   NIF Teste: ${HML_CONFIG.nifTest}`)
console.log('')

// Criar payload para consultar factura
function createConsultarFacturaPayload(documentNo) {
  return {
    schemaVersion: '1.0',
    taxRegistrationNumber: HML_CONFIG.nifTest,
    documentNo: documentNo,
    submissionTimeStamp: new Date().toISOString(),
    jwsSignature: 'TEST-JWS-SIGNATURE-HML',
    softwareInfo: {
      softwareInfoDetail: {
        productId: 'SafeFacturas',
        productVersion: '1.0.0',
        softwareValidationNumber: 'HML-TEST-001'
      },
      jwsSoftwareSignature: 'TEST-SIGNATURE-HML'
    }
  }
}

async function testConsultarFactura(documentNo) {
  const payload = createConsultarFacturaPayload(documentNo)
  
  console.log('📄 Payload Consultar Factura:')
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
            console.log('\n✅ FACTURA CONSULTADA COM SUCESSO!')
            
            if (parsed.document) {
              console.log('\n📊 Detalhes da Factura:')
              console.log(`   - Documento: ${parsed.document.documentNo}`)
              console.log(`   - Tipo: ${parsed.document.documentType}`)
              console.log(`   - Data: ${parsed.document.documentDate}`)
              console.log(`   - Status: ${parsed.document.validationStatus || 'N/A'}`)
              if (parsed.document.qrCode) {
                console.log(`   - QR Code: ${parsed.document.qrCode.substring(0, 50)}...`)
              }
              if (parsed.document.hashCode) {
                console.log(`   - Hash: ${parsed.document.hashCode}`)
              }
              if (parsed.document.certificateNo) {
                console.log(`   - Certificado: ${parsed.document.certificateNo}`)
              }
            }
            
            resolve(parsed)
          } else if (res.statusCode === 401) {
            console.log('\n❌ ERRO DE AUTENTICAÇÃO')
            reject(new Error('Autenticação falhou'))
          } else if (res.statusCode === 404) {
            console.log('\n❌ FACTURA NÃO ENCONTRADA')
            reject(new Error('Factura não existe'))
          } else {
            console.log(`\n⚠️ RESPOSTA INESPERADA: ${res.statusCode}`)
            resolve(parsed)
          }
        } catch (error) {
          console.log(data)
          console.log('\n❌ ERRO AO PROCESSAR RESPOSTA')
          reject(error)
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

// Obter número do documento do argumento ou usar número de teste
const documentNo = process.argv[2] || 'FT HML2026/0116-001'

console.log(`🔍 Consultando Documento: ${documentNo}\n`)

// Executar teste
testConsultarFactura(documentNo)
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
