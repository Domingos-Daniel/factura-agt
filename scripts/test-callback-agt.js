/**
 * Script para testar o endpoint de callback da AGT
 */

const baseURL = 'http://localhost:3000'

// Obter um requestID válido do JSON
const fs = require('fs')
const path = require('path')

const jsonPath = path.join(__dirname, '..', 'data', 'facturas.json')

if (!fs.existsSync(jsonPath)) {
  console.error('❌ Arquivo facturas.json não encontrado')
  process.exit(1)
}

const facturas = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))

if (facturas.length === 0) {
  console.error('❌ Nenhuma factura encontrada no JSON')
  process.exit(1)
}

// Pegar primeira factura com requestID
const factura = facturas.find(f => f.requestID)

if (!factura) {
  console.error('❌ Nenhuma factura com requestID encontrada')
  process.exit(1)
}

console.log(`\n📋 Factura selecionada:`)
console.log(`   ID: ${factura.id}`)
console.log(`   RequestID: ${factura.requestID}`)
console.log(`   Documento: ${factura.documents[0]?.documentNo || 'N/A'}`)
console.log(`   Status atual: ${factura.validationStatus || 'N/A'}`)

// Testar os 3 tipos de callback
const tests = [
  {
    name: '✅ Factura Validada',
    payload: {
      requestID: factura.requestID,
      status: 'V',
      documentNo: factura.documents[0]?.documentNo || 'FT TEST/001',
      validationDate: new Date().toISOString(),
      details: {
        qrCode: 'https://agt.minfin.gov.ao/validar/qrcode/ABC123XYZ',
        hash: '3a5c8f9e2b1d4a7c6f8e9b2a1c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d',
        certificateNumber: 'CERT-2026-001234'
      }
    }
  },
  {
    name: '❌ Factura Rejeitada',
    payload: {
      requestID: factura.requestID,
      status: 'R',
      documentNo: factura.documents[0]?.documentNo || 'FT TEST/001',
      validationDate: new Date().toISOString(),
      errors: [
        {
          code: 'E001',
          message: 'NIF do cliente inválido',
          field: 'customerTaxID'
        },
        {
          code: 'E002',
          message: 'Data da factura posterior à data atual',
          field: 'documentDate'
        }
      ]
    }
  },
  {
    name: '⚠️ Factura com Erros',
    payload: {
      requestID: factura.requestID,
      status: 'E',
      documentNo: factura.documents[0]?.documentNo || 'FT TEST/001',
      validationDate: new Date().toISOString(),
      errors: [
        {
          code: 'W001',
          message: 'Valor total não confere com soma das linhas',
          field: 'documentTotals.grossTotal'
        }
      ]
    }
  }
]

async function testCallback(test) {
  console.log(`\n🧪 Testando: ${test.name}`)
  console.log(`📤 Enviando payload:`)
  console.log(JSON.stringify(test.payload, null, 2))
  
  try {
    const response = await fetch(`${baseURL}/api/agt/callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(test.payload)
    })
    
    const result = await response.json()
    
    console.log(`\n📥 Resposta (${response.status}):`)
    console.log(JSON.stringify(result, null, 2))
    
    if (response.ok) {
      console.log(`✅ Teste passou!`)
    } else {
      console.log(`❌ Teste falhou!`)
    }
    
    return response.ok
  } catch (error) {
    console.error(`❌ Erro ao executar teste:`, error.message)
    return false
  }
}

async function runTests() {
  console.log('\n╔════════════════════════════════════════════╗')
  console.log('║   TESTE DO ENDPOINT DE CALLBACK AGT       ║')
  console.log('╚════════════════════════════════════════════╝')
  
  // Verificar se o endpoint está acessível
  console.log(`\n🔍 Verificando endpoint: ${baseURL}/api/agt/callback`)
  
  try {
    const response = await fetch(`${baseURL}/api/agt/callback`)
    if (response.ok) {
      console.log(`✅ Endpoint acessível`)
    } else {
      console.log(`⚠️ Endpoint retornou status ${response.status}`)
    }
  } catch (error) {
    console.error(`❌ Erro ao acessar endpoint:`, error.message)
    console.log(`\n💡 Certifique-se de que o servidor está rodando em ${baseURL}`)
    process.exit(1)
  }
  
  // Executar testes
  let passed = 0
  let failed = 0
  
  for (const test of tests) {
    const result = await testCallback(test)
    if (result) {
      passed++
    } else {
      failed++
    }
    
    // Aguardar um pouco entre os testes
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  // Verificar o arquivo JSON atualizado
  console.log('\n\n📊 Verificando factura atualizada no JSON...')
  const updatedFacturas = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))
  const updatedFactura = updatedFacturas.find(f => f.id === factura.id)
  
  if (updatedFactura) {
    console.log(`\n📄 Estado final da factura:`)
    console.log(`   Status: ${updatedFactura.validationStatus}`)
    console.log(`   Data validação: ${updatedFactura.validationDate || 'N/A'}`)
    if (updatedFactura.validationResult) {
      console.log(`   Resultado:`)
      console.log(JSON.stringify(updatedFactura.validationResult, null, 4))
    }
  }
  
  // Resumo
  console.log('\n\n╔════════════════════════════════════════════╗')
  console.log('║              RESUMO DOS TESTES             ║')
  console.log('╚════════════════════════════════════════════╝')
  console.log(`\n✅ Testes aprovados: ${passed}`)
  console.log(`❌ Testes falhados: ${failed}`)
  console.log(`📊 Total: ${passed + failed}`)
  
  if (failed === 0) {
    console.log(`\n🎉 Todos os testes passaram!`)
  } else {
    console.log(`\n⚠️ Alguns testes falharam. Verifique os logs acima.`)
  }
}

// Executar testes
runTests().catch(console.error)
