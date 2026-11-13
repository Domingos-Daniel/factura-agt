/**
 * TESTE COMPLETO DE TODOS OS SERVIÇOS AGT HML
 * 
 * Serviços testados:
 * 1. Solicitar Registo de Factura (registarFactura)
 * 2. Obter Estado de Validação (obterEstado)
 * 3. Listar Facturas (listarFacturas)
 * 4. Consultar Factura (consultarFactura)
 * 5. Solicitar Série (solicitarSerie)
 * 6. Listar Séries (listarSeries)
 * 7. Validar Documento (validarDocumento)
 */

const https = require('https')
const fs = require('fs')
const path = require('path')

// ============================================================================
// CONFIGURAÇÃO - Ler do .env.local
// ============================================================================

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local')
  
  if (!fs.existsSync(envPath)) {
    console.error('❌ Arquivo .env.local não encontrado!')
    process.exit(1)
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8')
  const env = {}
  
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=')
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '')
      }
    }
  })
  
  return env
}

const ENV = loadEnv()

const HML_CONFIG = {
  baseURL: ENV.AGT_HML_BASE_URL || 'https://sifphml.minfin.gov.ao/sigt/fe/v1',
  username: ENV.AGT_HML_USERNAME || 'ws.hml.safe',
  password: ENV.AGT_HML_PASSWORD || 'mfn492026',
  nifTest: ENV.AGT_HML_NIF_TEST || '5000413178',
  timeout: parseInt(ENV.AGT_TIMEOUT_MS) || 180000,
  softwareProductId: ENV.AGT_SOFTWARE_PRODUCT_ID || 'SafeFacturas',
  softwareVersion: ENV.AGT_SOFTWARE_VERSION || '1.0.1',
  softwareValidationNumber: ENV.AGT_SOFTWARE_VALIDATION_NUMBER || 'FE/164/AGT/2026'
}

// ============================================================================
// UTILITÁRIOS
// ============================================================================

// small helper: ensure schemaVersion/submissionTimeStamp/softwareInfo when missing
function ensureRequiredFields(obj) {
  if (!obj.schemaVersion) obj.schemaVersion = '1.0'
  if (!obj.submissionTimeStamp) obj.submissionTimeStamp = new Date().toISOString()
  if (!obj.softwareInfo) {
    obj.softwareInfo = {
      softwareInfoDetail: {
        productId: HML_CONFIG.softwareProductId,
        productVersion: HML_CONFIG.softwareVersion,
        softwareValidationNumber: HML_CONFIG.softwareValidationNumber
      },
      // placeholder JWS (HML accepts dummy in most tests)
      jwsSoftwareSignature: (Array(257).join('A'))
    }
  }
  return obj
}

function makeRequest(endpoint, payload, serviceName) {
  payload = ensureRequiredFields(payload || {})

  return new Promise((resolve, reject) => {
    const authHeader = 'Basic ' + Buffer.from(`${HML_CONFIG.username}:${HML_CONFIG.password}`).toString('base64')
    
    // Construir path completo: /sigt/fe/v1 + endpoint
    const fullPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
    
    const options = {
      hostname: 'sifphml.minfin.gov.ao',
      port: 443,
      path: `/sigt/fe/v1${fullPath}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        'User-Agent': 'SafeFacturas/1.0',
        'Accept': 'application/json',
        'Connection': 'keep-alive'
      },
      timeout: HML_CONFIG.timeout,
      rejectUnauthorized: false, // Permitir certificados autoassinados (HML)
      keepAlive: true
    }
    
    console.log(`\n${'='.repeat(80)}`)
    console.log(`🔵 ${serviceName}`)
    console.log(`${'='.repeat(80)}`)
    console.log(`📍 URL: https://${options.hostname}${options.path}`)
    console.log(`📤 Request Payload:`)
    const payloadStr = JSON.stringify(payload, null, 2)
    console.log(payloadStr.length > 500 ? payloadStr.substring(0, 500) + '...' : payloadStr)
    
    const req = https.request(options, (res) => {
      let data = ''
      
      res.on('data', (chunk) => {
        data += chunk
      })
      
      res.on('end', () => {
        console.log(`\n📥 Response Status: ${res.statusCode} ${res.statusMessage}`)
        
        try {
          const parsed = JSON.parse(data)
          console.log(`📄 Response Body:`)
          const responseStr = JSON.stringify(parsed, null, 2)
          console.log(responseStr.length > 1000 ? responseStr.substring(0, 1000) + '...' : responseStr)
          
          if (res.statusCode === 200 || res.statusCode === 201) {
            console.log(`✅ ${serviceName} - SUCESSO`)
            resolve({ statusCode: res.statusCode, data: parsed, service: serviceName })
          } else if (res.statusCode === 401) {
            console.log(`❌ ${serviceName} - FALHA DE AUTENTICAÇÃO`)
            reject({ statusCode: res.statusCode, error: 'Autenticação falhou', service: serviceName })
          } else if (res.statusCode === 422) {
            console.log(`⚠️ ${serviceName} - ERRO DE VALIDAÇÃO`)
            resolve({ statusCode: res.statusCode, data: parsed, service: serviceName, validation: true })
          } else {
            console.log(`⚠️ ${serviceName} - Status ${res.statusCode}`)
            resolve({ statusCode: res.statusCode, data: parsed, service: serviceName })
          }
        } catch (error) {
          console.log(`📄 Response (raw):`)
          console.log(data.length > 500 ? data.substring(0, 500) + '...' : data)
          resolve({ statusCode: res.statusCode, data: data, service: serviceName, raw: true })
        }
      })
    })
    
    req.on('error', (error) => {
      console.error(`\n❌ ERRO DE CONEXÃO: ${error.message}`)
      reject({ error: error.message, service: serviceName })
    })
    
    req.on('timeout', () => {
      console.error(`\n⏱️ TIMEOUT: Servidor não respondeu`)
      req.destroy()
      reject({ error: 'Timeout', service: serviceName })
    })
    
    req.write(JSON.stringify(payload))
    req.end()
  })
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ============================================================================
// PAYLOADS DE TESTE
// ============================================================================

function loadTestPayload(filename) {
  const payloadPath = path.join(__dirname, '..', 'data', 'test-payloads', filename)
  if (fs.existsSync(payloadPath)) {
    return JSON.parse(fs.readFileSync(payloadPath, 'utf8'))
  }
  return null
}

// ============================================================================
// TESTES DOS SERVIÇOS
// ============================================================================

async function uuidv4() {
  // simple UUIDv4 generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

async function test1_RegistarFactura() {
  let payload = loadTestPayload('C1_AC_AC_A_000001.json')
  
  if (!payload) {
    console.log('⚠️ Payload C1 não encontrado, pulando teste...')
    return null
  }

  // ensure unique submissionUUID / fresh timestamp
  payload.submissionUUID = await uuidv4()
  payload.submissionTimeStamp = new Date().toISOString()
  payload = ensureRequiredFields(payload)

  return makeRequest('/registarFactura', payload, 'SERVIÇO 1: Registar Factura')
}

async function test2_ObterEstado(submissionUUID) {
  const payload = {
    schemaVersion: '1.0',
    submissionTimeStamp: new Date().toISOString(),
    taxRegistrationNumber: HML_CONFIG.nifTest,
    requestID: submissionUUID || 'test-uuid-12345'
  }
  
  return makeRequest('/obterEstado', payload, 'SERVIÇO 2: Obter Estado')
}

async function test3_ListarFacturas() {
  const payload = {
    schemaVersion: '1.0',
    submissionTimeStamp: new Date().toISOString(),
    taxRegistrationNumber: HML_CONFIG.nifTest,
    startDate: '2025-01-01',
    endDate: new Date().toISOString().slice(0,10),
    documentType: 'AC',
    pageNumber: 1,
    pageSize: 10
  }
  
  return makeRequest('/listarFacturas', payload, 'SERVIÇO 3: Listar Facturas')
}

async function test4_ConsultarFactura(documentNo) {
  const payload = {
    schemaVersion: '1.0',
    submissionTimeStamp: new Date().toISOString(),
    taxRegistrationNumber: HML_CONFIG.nifTest,
    documentNo: documentNo || 'AC A/000001',
    documentType: 'AC'
  }
  
  return makeRequest('/consultarFactura', payload, 'SERVIÇO 4: Consultar Factura')
}

async function test5_SolicitarSerie() {
  const payload = {
    schemaVersion: '1.0',
    submissionUUID: await uuidv4(),
    submissionTimeStamp: new Date().toISOString(),
    taxRegistrationNumber: HML_CONFIG.nifTest,
    softwareInfo: {
      softwareInfoDetail: {
        productId: HML_CONFIG.softwareProductId,
        productVersion: HML_CONFIG.softwareVersion,
        softwareValidationNumber: HML_CONFIG.softwareValidationNumber
      },
      jwsSoftwareSignature: (Array(257).join('A'))
    },
    series: 'TEST',
    seriesYear: 2026,
    documentType: 'FT',
    eacCode: '62010',
    firstDocumentNumber: 1,
    establishmentNumber: 1,
    seriesContingencyIndicator: 'N'
  }
  
  return makeRequest('/solicitarSerie', payload, 'SERVIÇO 5: Solicitar Série')
}

async function test6_ListarSeries() {
  const payload = {
    schemaVersion: '1.0',
    submissionTimeStamp: new Date().toISOString(),
    taxRegistrationNumber: HML_CONFIG.nifTest,
    seriesYear: 2026
  }
  
  return makeRequest('/listarSeries', payload, 'SERVIÇO 6: Listar Séries')
}

async function test7_ValidarDocumento() {
  const payload = loadTestPayload('C2_FR_FR_B_000042.json')
  
  if (!payload) {
    console.log('⚠️ Payload C2 não encontrado, pulando teste...')
    return null
  }
  
  // Para validar documento, adicionar action=V
  const validationPayload = {
    ...payload,
    action: 'V' // V = Validar apenas (não submeter)
  }
  
  return makeRequest('/validarDocumento', validationPayload, 'SERVIÇO 7: Validar Documento')
}

// ============================================================================
// EXECUTOR PRINCIPAL
// ============================================================================

async function runAllTests() {
  console.log('\n╔════════════════════════════════════════════════════════════════════════════╗')
  console.log('║          TESTE COMPLETO DE TODOS OS SERVIÇOS AGT HML                      ║')
  console.log('╚════════════════════════════════════════════════════════════════════════════╝\n')
  
  console.log('📋 Configuração:')
  console.log(`   Base URL: ${HML_CONFIG.baseURL}`)
  console.log(`   Username: ${HML_CONFIG.username}`)
  console.log(`   Password: ${'*'.repeat(HML_CONFIG.password.length)}`)
  console.log(`   NIF Teste: ${HML_CONFIG.nifTest}`)
  console.log(`   Timeout: ${HML_CONFIG.timeout}ms`)
  console.log('')
  
  const results = []
  let submissionUUID = null
  let documentNo = null
  
  try {
    // Teste 1: Registar Factura (C1 - Aviso de Cobrança)
    try {
      const result1 = await test1_RegistarFactura()
      results.push(result1)
      if (result1 && result1.data && result1.data.submissionUUID) {
        submissionUUID = result1.data.submissionUUID
      }
      if (result1 && result1.data && result1.data.documents && result1.data.documents[0]) {
        documentNo = result1.data.documents[0].documentNo
      }
      await sleep(5000)
    } catch (error) {
      results.push({ service: 'SERVIÇO 1', error: error })
    }
    
    // Teste 2: Obter Estado
    try {
      const result2 = await test2_ObterEstado(submissionUUID)
      results.push(result2)
      await sleep(5000)
    } catch (error) {
      results.push({ service: 'SERVIÇO 2', error: error })
    }
    
    // Teste 3: Listar Facturas
    try {
      const result3 = await test3_ListarFacturas()
      results.push(result3)
      await sleep(5000)
    } catch (error) {
      results.push({ service: 'SERVIÇO 3', error: error })
    }
    
    // Teste 4: Consultar Factura
    try {
      const result4 = await test4_ConsultarFactura(documentNo)
      results.push(result4)
      await sleep(5000)
    } catch (error) {
      results.push({ service: 'SERVIÇO 4', error: error })
    }
    
    // Teste 5: Solicitar Série
    try {
      const result5 = await test5_SolicitarSerie()
      results.push(result5)
      await sleep(5000)
    } catch (error) {
      results.push({ service: 'SERVIÇO 5', error: error })
    }
    
    // Teste 6: Listar Séries
    try {
      const result6 = await test6_ListarSeries()
      results.push(result6)
      await sleep(5000)
    } catch (error) {
      results.push({ service: 'SERVIÇO 6', error: error })
    }
    
    // Teste 7: Validar Documento
    try {
      const result7 = await test7_ValidarDocumento()
      results.push(result7)
      await sleep(2000)
    } catch (error) {
      results.push({ service: 'SERVIÇO 7', error: error })
    }
    
  } catch (error) {
    console.error('\n❌ ERRO GERAL:', error)
  }
  
  // Resumo Final
  console.log('\n\n╔════════════════════════════════════════════════════════════════════════════╗')
  console.log('║                          RESUMO DOS TESTES                                 ║')
  console.log('╚════════════════════════════════════════════════════════════════════════════╝\n')
  
  let successCount = 0
  let failCount = 0
  let validationErrorCount = 0
  
  results.forEach((result, index) => {
    const serviceNum = index + 1
    const serviceName = result?.service || `SERVIÇO ${serviceNum}`
    
    if (result?.error) {
      console.log(`❌ ${serviceName}: ERRO - ${result.error.error || result.error}`)
      failCount++
    } else if (result?.statusCode === 200 || result?.statusCode === 201) {
      console.log(`✅ ${serviceName}: SUCESSO (${result.statusCode})`)
      successCount++
    } else if (result?.statusCode === 422 || result?.validation) {
      console.log(`⚠️ ${serviceName}: ERRO DE VALIDAÇÃO (${result.statusCode})`)
      validationErrorCount++
    } else if (result?.statusCode) {
      console.log(`⚠️ ${serviceName}: Status ${result.statusCode}`)
      failCount++
    } else {
      console.log(`⚠️ ${serviceName}: Sem resultado`)
      failCount++
    }
  })
  
  console.log(`\n📊 Estatísticas:`)
  console.log(`   ✅ Sucessos: ${successCount}`)
  console.log(`   ⚠️ Erros de Validação: ${validationErrorCount}`)
  console.log(`   ❌ Falhas: ${failCount}`)
  console.log(`   📝 Total de Testes: ${results.length}`)
  
  // Salvar resultados em arquivo
  const resultsPath = path.join(__dirname, '..', 'data', 'hml-test-results.json')
  fs.writeFileSync(resultsPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    config: {
      baseURL: HML_CONFIG.baseURL,
      username: HML_CONFIG.username,
      nifTest: HML_CONFIG.nifTest
    },
    summary: {
      success: successCount,
      validationErrors: validationErrorCount,
      failures: failCount,
      total: results.length
    },
    results: results
  }, null, 2), 'utf8')
  
  console.log(`\n💾 Resultados salvos em: ${resultsPath}`)
  
  console.log('\n╔════════════════════════════════════════════════════════════════════════════╗')
  console.log('║                      TESTES CONCLUÍDOS                                     ║')
  console.log('╚════════════════════════════════════════════════════════════════════════════╝\n')
  
  return results
}

// Executar
runAllTests()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Erro fatal:', error)
    process.exit(1)
  })
