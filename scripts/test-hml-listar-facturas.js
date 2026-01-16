/**
 * Script de teste para Listar Facturas no ambiente HML da AGT
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
console.log('║   TESTE LISTAR FACTURAS - AGT HML                     ║')
console.log('╚════════════════════════════════════════════════════════╝\n')

console.log('📋 Configuração:')
console.log(`   Base URL: ${HML_CONFIG.baseURL}`)
console.log(`   Username: ${HML_CONFIG.username}`)
console.log(`   NIF Teste: ${HML_CONFIG.nifTest}`)
console.log('')

// Criar payload para listar facturas
function createListarFacturasPayload() {
  const today = new Date()
  const startDate = new Date(today)
  startDate.setDate(today.getDate() - 7) // Últimos 7 dias (reduzido de 30)
  
  return {
    schemaVersion: '1.0',
    taxRegistrationNumber: HML_CONFIG.nifTest,
    startDate: startDate.toISOString().split('T')[0],
    endDate: today.toISOString().split('T')[0],
    submissionTimeStamp: today.toISOString(),
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

async function testListarFacturas() {
  const payload = createListarFacturasPayload()
  
  console.log('📄 Payload Listar Facturas:')
  console.log(JSON.stringify(payload, null, 2))
  console.log('')
  
  const authHeader = 'Basic ' + Buffer.from(`${HML_CONFIG.username}:${HML_CONFIG.password}`).toString('base64')
  
  return new Promise((resolve, reject) => {
    const url = new URL('/sigt/fe/v1/listarFacturas', 'https://sifphml.minfin.gov.ao')
    
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
            console.log('\n✅ FACTURAS LISTADAS COM SUCESSO!')
            
            if (parsed.documents && Array.isArray(parsed.documents)) {
              console.log(`\n📊 Total de Facturas: ${parsed.documents.length}`)
              parsed.documents.slice(0, 5).forEach((doc, idx) => {
                console.log(`\n   Factura ${idx + 1}:`)
                console.log(`   - Documento: ${doc.documentNo}`)
                console.log(`   - Tipo: ${doc.documentType}`)
                console.log(`   - Data: ${doc.documentDate}`)
                console.log(`   - Status: ${doc.validationStatus || 'N/A'}`)
                if (doc.grossTotal) {
                  console.log(`   - Total: ${doc.grossTotal} AOA`)
                }
              })
              if (parsed.documents.length > 5) {
                console.log(`\n   ... e mais ${parsed.documents.length - 5} facturas`)
              }
            }
            
            resolve(parsed)
          } else if (res.statusCode === 401) {
            console.log('\n❌ ERRO DE AUTENTICAÇÃO')
            reject(new Error('Autenticação falhou'))
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

// Executar teste
testListarFacturas()
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
