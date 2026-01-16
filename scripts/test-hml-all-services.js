/**
 * Script de teste completo para todos os serviços AGT HML
 * Executa todos os testes proceduralmente
 */

const { spawn } = require('child_process')
const path = require('path')

const TESTS = [
  {
    name: 'Autenticação',
    script: 'test-hml-auth.js',
    description: 'Testa credenciais e conectividade'
  },
  {
    name: 'Listar Séries',
    script: 'test-hml-listar-series.js',
    description: 'Lista séries disponíveis para o NIF'
  },
  {
    name: 'Registar Factura',
    script: 'test-hml-registar-factura.js',
    description: 'Registra nova factura no AGT'
  },
  {
    name: 'Listar Facturas',
    script: 'test-hml-listar-facturas.js',
    description: 'Lista facturas registadas'
  },
  {
    name: 'Consultar Factura',
    script: 'test-hml-consultar-factura.js',
    description: 'Consulta detalhes de factura específica'
  },
  {
    name: 'Obter Estado',
    script: 'test-hml-obter-estado.js',
    description: 'Obtém estado de validação (usar RequestID do teste anterior)',
    args: ['202600000184282']
  }
]

let currentTest = 0
let results = []

console.log('\n╔════════════════════════════════════════════════════════╗')
console.log('║      TESTE COMPLETO DE SERVIÇOS AGT HML               ║')
console.log('╚════════════════════════════════════════════════════════╝\n')

console.log(`📋 Total de Testes: ${TESTS.length}\n`)

function runTest(test) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now()
    
    console.log(`\n${'='.repeat(60)}`)
    console.log(`🧪 TESTE ${currentTest + 1}/${TESTS.length}: ${test.name}`)
    console.log(`   ${test.description}`)
    console.log(`${'='.repeat(60)}\n`)
    
    const scriptPath = path.join(__dirname, test.script)
    const args = test.args || []
    
    const child = spawn('node', [scriptPath, ...args], {
      stdio: 'inherit',
      shell: true
    })
    
    child.on('close', (code) => {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2)
      
      const result = {
        name: test.name,
        success: code === 0,
        duration: duration,
        exitCode: code
      }
      
      results.push(result)
      
      if (code === 0) {
        console.log(`\n✅ ${test.name} - SUCESSO (${duration}s)`)
      } else {
        console.log(`\n❌ ${test.name} - FALHOU (${duration}s) - Exit Code: ${code}`)
      }
      
      resolve(result)
    })
    
    child.on('error', (error) => {
      console.error(`\n❌ Erro ao executar ${test.name}:`, error.message)
      results.push({
        name: test.name,
        success: false,
        duration: 0,
        error: error.message
      })
      resolve()
    })
  })
}

async function runAllTests() {
  for (let i = 0; i < TESTS.length; i++) {
    currentTest = i
    await runTest(TESTS[i])
    
    // Aguardar 2 segundos entre testes
    if (i < TESTS.length - 1) {
      console.log('\n⏳ Aguardando 2 segundos antes do próximo teste...\n')
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }
}

// Executar todos os testes
runAllTests()
  .then(() => {
    console.log('\n\n╔════════════════════════════════════════════════════════╗')
    console.log('║              RESUMO DOS TESTES                        ║')
    console.log('╚════════════════════════════════════════════════════════╝\n')
    
    const totalTests = results.length
    const successTests = results.filter(r => r.success).length
    const failedTests = results.filter(r => !r.success).length
    const totalDuration = results.reduce((sum, r) => sum + parseFloat(r.duration || 0), 0).toFixed(2)
    
    console.log(`📊 Estatísticas:`)
    console.log(`   Total de Testes: ${totalTests}`)
    console.log(`   ✅ Sucessos: ${successTests}`)
    console.log(`   ❌ Falhas: ${failedTests}`)
    console.log(`   ⏱️ Tempo Total: ${totalDuration}s`)
    console.log('')
    
    console.log('📋 Detalhes:')
    results.forEach((result, idx) => {
      const status = result.success ? '✅' : '❌'
      const duration = result.duration ? `${result.duration}s` : 'N/A'
      console.log(`   ${idx + 1}. ${status} ${result.name} - ${duration}`)
      if (result.error) {
        console.log(`      Erro: ${result.error}`)
      }
    })
    
    console.log('\n╔════════════════════════════════════════════════════════╗')
    if (failedTests === 0) {
      console.log('║          ✅ TODOS OS TESTES PASSARAM!                 ║')
    } else {
      console.log('║          ⚠️  ALGUNS TESTES FALHARAM                   ║')
    }
    console.log('╚════════════════════════════════════════════════════════╝\n')
    
    process.exit(failedTests === 0 ? 0 : 1)
  })
  .catch((error) => {
    console.error('\n❌ Erro fatal ao executar testes:', error)
    process.exit(1)
  })
