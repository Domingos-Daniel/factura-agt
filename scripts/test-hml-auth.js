/**
 * Script de teste para Autenticação no ambiente HML da AGT
 * Testa as credenciais: ws.hml.addonsaftb1
 */

const https = require('https')

const HML_CONFIG = {
  baseURL: 'https://sifphml.minfin.gov.ao/sigt/fe/v1',
  username: 'ws.hml.addonsaftb1',
  password: 'mfn+3534+2025',
  timeout: 30000
}

console.log('\n╔════════════════════════════════════════════════════════╗')
console.log('║   TESTE DE AUTENTICAÇÃO - AGT HML                     ║')
console.log('╚════════════════════════════════════════════════════════╝\n')

console.log('📋 Configuração:')
console.log(`   Base URL: ${HML_CONFIG.baseURL}`)
console.log(`   Username: ${HML_CONFIG.username}`)
console.log(`   Password: ${'*'.repeat(HML_CONFIG.password.length)}`)
console.log('')

// Testar endpoint de teste (ping ou similar)
async function testConnection() {
  console.log('🔌 Testando conexão com AGT HML...\n')
  
  const authHeader = 'Basic ' + Buffer.from(`${HML_CONFIG.username}:${HML_CONFIG.password}`).toString('base64')
  
  // Tentar endpoint de listar séries (é o mais simples para testar auth)
  const testData = {
    taxRegistrationNumber: '5000413178', // NIF de teste
    seriesYear: 2026
  }
  
  console.log('📤 Tentando listar séries com NIF de teste: 5000413178')
  
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
    
    console.log(`\n🌐 Request:`)
    console.log(`   URL: ${url.href}`)
    console.log(`   Method: ${options.method}`)
    console.log(`   Headers:`)
    console.log(`      Content-Type: ${options.headers['Content-Type']}`)
    console.log(`      Authorization: Basic ***`)
    console.log(`   Body:`, JSON.stringify(testData, null, 2))
    
    const req = https.request(options, (res) => {
      let data = ''
      
      console.log(`\n📥 Response:`)
      console.log(`   Status: ${res.statusCode} ${res.statusMessage}`)
      console.log(`   Headers:`, res.headers)
      
      res.on('data', (chunk) => {
        data += chunk
      })
      
      res.on('end', () => {
        console.log(`\n📄 Response Body:`)
        try {
          const parsed = JSON.parse(data)
          console.log(JSON.stringify(parsed, null, 2))
          
          if (res.statusCode === 200) {
            console.log('\n✅ AUTENTICAÇÃO BEM-SUCEDIDA!')
            console.log('   Credenciais válidas e conexão estabelecida.')
            resolve(parsed)
          } else if (res.statusCode === 401) {
            console.log('\n❌ FALHA DE AUTENTICAÇÃO')
            console.log('   Credenciais inválidas ou expiradas.')
            reject(new Error('Autenticação falhou'))
          } else if (res.statusCode === 404) {
            console.log('\n⚠️ AUTENTICAÇÃO OK, MAS ENDPOINT NÃO ENCONTRADO')
            console.log('   Credenciais válidas, mas endpoint pode estar incorreto.')
            resolve({ auth: 'ok', endpoint: 'not_found' })
          } else {
            console.log(`\n⚠️ RESPOSTA INESPERADA: ${res.statusCode}`)
            resolve(parsed)
          }
        } catch (error) {
          console.log(data)
          
          if (res.statusCode === 200 || res.statusCode === 401) {
            if (res.statusCode === 200) {
              console.log('\n✅ AUTENTICAÇÃO BEM-SUCEDIDA!')
              resolve({ auth: 'ok' })
            } else {
              console.log('\n❌ FALHA DE AUTENTICAÇÃO')
              reject(new Error('Autenticação falhou'))
            }
          } else {
            resolve({ statusCode: res.statusCode, data })
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
    
    req.write(JSON.stringify(testData))
    req.end()
  })
}

// Executar teste
testConnection()
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
