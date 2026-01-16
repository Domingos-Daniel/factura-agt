/**
 * Script de teste para Listar Séries - AGT HML
 * Seguindo documentação oficial: https://portaldoparceiro.minfin.gov.ao/doc-agt/faturacao-electronica/1/servicos/listar.html
 * 
 * Endpoint: POST https://sifphml.minfin.gov.ao/sigt/fe/v1/listarSeries
 * 
 * Campos obrigatórios na assinatura (jwsSignature):
 * - taxRegistrationNumber
 * 
 * Campos opcionais de filtro:
 * - seriesCode, seriesYear, seriesStatus, documentType, establishmentNumber
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
console.log('║   TESTE LISTAR SÉRIES (v2) - AGT HML                  ║')
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
function createListarSeriesPayload(options = {}) {
  const softwareInfoDetail = SOFTWARE_INFO
  
  // Campos para assinatura do serviço (conforme doc)
  // Payload assinatura: { taxRegistrationNumber }
  const signatureFields = {
    taxRegistrationNumber: HML_CONFIG.nifTest
  }
  
  const basePayload = {
    schemaVersion: '1.2',
    // Nota: O exemplo na doc não mostra submissionUUID, mas outros serviços exigem
    // Vamos incluir por consistência
    submissionUUID: generateUUID(),
    taxRegistrationNumber: HML_CONFIG.nifTest,
    submissionTimeStamp: new Date().toISOString(),
    softwareInfo: {
      softwareInfoDetail: softwareInfoDetail,
      jwsSoftwareSignature: generateJWS(softwareInfoDetail)
    },
    jwsSignature: generateJWS(signatureFields)
  }
  
  // Adicionar filtros opcionais se fornecidos
  if (options.seriesCode) basePayload.seriesCode = options.seriesCode
  if (options.seriesYear) basePayload.seriesYear = options.seriesYear
  if (options.seriesStatus) basePayload.seriesStatus = options.seriesStatus
  if (options.documentType) basePayload.documentType = options.documentType
  if (options.establishmentNumber) basePayload.establishmentNumber = options.establishmentNumber
  
  return basePayload
}

async function testListarSeries(options = {}) {
  const payload = createListarSeriesPayload(options)
  
  console.log('📋 Configuração:')
  console.log(`   Base URL: ${HML_CONFIG.baseURL}`)
  console.log(`   Username: ${HML_CONFIG.username}`)
  console.log(`   NIF Teste: ${HML_CONFIG.nifTest}`)
  if (options.seriesYear) console.log(`   Ano: ${options.seriesYear}`)
  if (options.documentType) console.log(`   Tipo Doc: ${options.documentType}`)
  console.log('')
  
  console.log('📄 Payload (conforme documentação AGT):')
  console.log(JSON.stringify(payload, null, 2))
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
            if (parsed.seriesResultCount !== undefined) {
              console.log('\n✅ SÉRIES LISTADAS COM SUCESSO!')
              console.log(`   Total encontradas: ${parsed.seriesResultCount}`)
              
              if (parsed.seriesInfo && parsed.seriesInfo.length > 0) {
                console.log('\n📋 Séries:')
                parsed.seriesInfo.forEach((serie, idx) => {
                  console.log(`   ${idx + 1}. ${serie.seriesCode} (${serie.seriesYear}) - Status: ${serie.seriesStatus}`)
                  console.log(`      Tipo: ${serie.documentType} | Método: ${serie.invoicingMethod}`)
                  console.log(`      Docs: ${serie.firstDocumentApproved} - ${serie.lastDocumentApproved}`)
                })
              }
            }
            
            // Verificar erros de negócio mesmo com 200
            if (parsed.requestErrorList && parsed.requestErrorList.length > 0) {
              console.log('\n⚠️  AVISOS/ERROS:')
              parsed.requestErrorList.forEach((err, idx) => {
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

// Argumentos opcionais: seriesYear, documentType
const args = process.argv.slice(2)
const filterOptions = {}

args.forEach(arg => {
  if (/^\d{4}$/.test(arg)) {
    filterOptions.seriesYear = arg
  } else if (/^[A-Z]{2}$/.test(arg)) {
    filterOptions.documentType = arg
  }
})

console.log(`🔍 Listando séries${Object.keys(filterOptions).length > 0 ? ' com filtros' : ' (todas)'}...\n`)

testListarSeries(filterOptions)
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
