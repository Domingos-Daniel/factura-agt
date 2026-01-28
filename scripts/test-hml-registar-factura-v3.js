/**
 * Script de teste para Registar Factura no ambiente HML da AGT
 * Versão 3 - Com linhas bem preenchidas e todos os campos
 */

require('dotenv').config({ path: '.env.local' })
const https = require('https')

const HML_CONFIG = {
  baseURL: process.env.AGT_HML_BASE_URL || 'https://sifphml.minfin.gov.ao/sigt/fe/v1',
  username: process.env.AGT_HML_USERNAME || 'ws.hml.addonsaftb1',
  password: process.env.AGT_HML_PASSWORD || 'mfn+3534+2025',
  nifTest: process.env.AGT_HML_NIF_TEST || '5000413178',
  timeout: 60000
}

// Software certificado do parceiro
const SOFTWARE_INFO = {
  productId: process.env.AGT_SOFTWARE_PRODUCT_ID || 'ADDON SAFT B1 E-INVOICE',
  productVersion: process.env.AGT_SOFTWARE_VERSION || '1.0',
  softwareValidationNumber: process.env.AGT_SOFTWARE_VALIDATION_NUMBER || 'FE/81/AGT/2025'
}

console.log('\n╔═══════════════════════════════════════════════════════════════╗')
console.log('║   TESTE REGISTAR FACTURA - AGT HML (v3)                       ║')
console.log('║   Com linhas bem preenchidas e todos os campos                ║')
console.log('╚═══════════════════════════════════════════════════════════════╝\n')

console.log('📋 Configuração:')
console.log(`   Base URL: ${HML_CONFIG.baseURL}`)
console.log(`   Username: ${HML_CONFIG.username}`)
console.log(`   NIF Empresa: ${HML_CONFIG.nifTest}`)
console.log('')

console.log('🔑 Software Certificado:')
console.log(`   Product ID: ${SOFTWARE_INFO.productId}`)
console.log(`   Version: ${SOFTWARE_INFO.productVersion}`)
console.log(`   Validation Number: ${SOFTWARE_INFO.softwareValidationNumber}`)
console.log('')

// Gerar UUID v4
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// Gerar JWS (estrutura válida, assinatura dummy para HML)
function generateJWS(payload) {
  const header = { typ: 'JOSE', alg: 'RS256' }
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  // Em HML podemos usar assinatura dummy
  const signature = Buffer.from('HML-SIGNATURE-' + Date.now().toString(36)).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  return `${headerB64}.${payloadB64}.${signature}`
}

// Gerar número de documento único
function generateDocumentNo(type) {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `${type} TESTE-${timestamp}/${random}`
}

// Criar payload de factura com linhas bem preenchidas
function createFacturaPayload() {
  const submissionUUID = generateUUID()
  const now = new Date()
  const documentDate = now.toISOString().substring(0, 10) // YYYY-MM-DD
  const documentNo = generateDocumentNo('FT')
  
  // Calcular valores
  const linha1Qty = 2
  const linha1Price = 15000.00  // 15.000 AOA
  const linha1Net = linha1Qty * linha1Price // 30.000 AOA
  const linha1IVA = linha1Net * 0.14 // 4.200 AOA
  
  const linha2Qty = 1
  const linha2Price = 25000.00  // 25.000 AOA
  const linha2Net = linha2Qty * linha2Price // 25.000 AOA
  const linha2IVA = linha2Net * 0.14 // 3.500 AOA
  
  const linha3Qty = 5
  const linha3Price = 2500.00   // 2.500 AOA
  const linha3Net = linha3Qty * linha3Price // 12.500 AOA
  const linha3IVA = linha3Net * 0.14 // 1.750 AOA
  
  const netTotal = linha1Net + linha2Net + linha3Net // 67.500 AOA
  const taxPayable = linha1IVA + linha2IVA + linha3IVA // 9.450 AOA
  const grossTotal = netTotal + taxPayable // 76.950 AOA
  
  const payload = {
    schemaVersion: '1.2',
    submissionUUID: submissionUUID,
    taxRegistrationNumber: HML_CONFIG.nifTest,
    submissionTimeStamp: now.toISOString(),
    softwareInfo: {
      softwareInfoDetail: SOFTWARE_INFO,
      jwsSoftwareSignature: generateJWS(SOFTWARE_INFO)
    },
    numberOfEntries: 1,
    documents: [{
      documentNo: documentNo,
      documentStatus: 'N',  // N=Normal
      documentType: 'FT',   // FT=Factura
      documentDate: documentDate,
      systemEntryDate: now.toISOString(),
      eacCode: '47410',  // Código de actividade económica (Comércio por grosso de computadores)
      customerCountry: 'AO',
      customerTaxID: '5417064306', // NIF cliente fictício válido
      companyName: 'CLIENTE TESTE LTDA',
      companyAddress: 'Rua dos Testes, 123, Luanda',
      lines: [
        {
          lineNumber: 1,
          productCode: 'LAPTOP-HP-15',
          productDescription: 'Laptop HP ProBook 15.6" i5 16GB RAM 512GB SSD',
          quantity: linha1Qty,
          unitOfMeasure: 'UN',
          unitPrice: linha1Price,
          unitPriceBase: linha1Price,
          debitAmount: linha1Net,
          creditAmount: 0,
          taxes: [{
            taxType: 'IVA',
            taxCountryRegion: 'AO',
            taxCode: 'NOR',
            taxPercentage: 14,
            taxAmount: linha1IVA
          }],
          settlementAmount: 0
          // referenceInfo: não incluir para FT, só obrigatório para NC
        },
        {
          lineNumber: 2,
          productCode: 'MONITOR-DELL-24',
          productDescription: 'Monitor Dell 24" Full HD LED IPS',
          quantity: linha2Qty,
          unitOfMeasure: 'UN',
          unitPrice: linha2Price,
          unitPriceBase: linha2Price,
          debitAmount: linha2Net,
          creditAmount: 0,
          taxes: [{
            taxType: 'IVA',
            taxCountryRegion: 'AO',
            taxCode: 'NOR',
            taxPercentage: 14,
            taxAmount: linha2IVA
          }],
          settlementAmount: 0
          // referenceInfo: não incluir para FT, só obrigatório para NC
        },
        {
          lineNumber: 3,
          productCode: 'TECLADO-LOGI-K120',
          productDescription: 'Teclado Logitech K120 USB ABNT2',
          quantity: linha3Qty,
          unitOfMeasure: 'UN',
          unitPrice: linha3Price,
          unitPriceBase: linha3Price,
          debitAmount: linha3Net,
          creditAmount: 0,
          taxes: [{
            taxType: 'IVA',
            taxCountryRegion: 'AO',
            taxCode: 'NOR',
            taxPercentage: 14,
            taxAmount: linha3IVA
          }],
          settlementAmount: 0
          // referenceInfo: não incluir para FT, só obrigatório para NC
        }
      ],
      documentTotals: {
        netTotal: netTotal,
        taxPayable: taxPayable,
        grossTotal: grossTotal,
        currency: {
          currencyCode: 'AOA',
          currencyAmount: grossTotal,
          exchangeRate: 1.0  // Taxa de câmbio (1.0 para AOA)
        }
      },
      // Assinatura do documento
      jwsDocumentSignature: generateJWS({
        documentNo: documentNo,
        documentType: 'FT',
        documentDate: documentDate,
        grossTotal: grossTotal,
        taxRegistrationNumber: HML_CONFIG.nifTest,
        timestamp: now.toISOString()
      })
    }]
  }
  
  return payload
}

async function testRegistarFactura() {
  const payload = createFacturaPayload()
  const doc = payload.documents[0]
  
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('📄 FACTURA A REGISTAR:')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`   Número: ${doc.documentNo}`)
  console.log(`   Tipo: ${doc.documentType}`)
  console.log(`   Data: ${doc.documentDate}`)
  console.log(`   Cliente: ${doc.companyName}`)
  console.log(`   NIF Cliente: ${doc.customerTaxID}`)
  console.log('')
  console.log('📦 LINHAS:')
  doc.lines.forEach((line, idx) => {
    console.log(`   ${idx + 1}. ${line.productDescription}`)
    console.log(`      Código: ${line.productCode}`)
    console.log(`      Qtd: ${line.quantity} ${line.unitOfMeasure} x ${line.unitPrice.toLocaleString('pt-AO')} AOA`)
    console.log(`      Subtotal: ${line.debitAmount.toLocaleString('pt-AO')} AOA`)
    console.log(`      IVA (${line.taxes[0].taxPercentage}%): ${line.taxes[0].taxAmount.toLocaleString('pt-AO')} AOA`)
    console.log('')
  })
  console.log('💰 TOTAIS:')
  console.log(`   Subtotal (sem IVA): ${doc.documentTotals.netTotal.toLocaleString('pt-AO')} AOA`)
  console.log(`   IVA (14%): ${doc.documentTotals.taxPayable.toLocaleString('pt-AO')} AOA`)
  console.log(`   TOTAL: ${doc.documentTotals.grossTotal.toLocaleString('pt-AO')} AOA`)
  console.log('═══════════════════════════════════════════════════════════════\n')
  
  const authHeader = 'Basic ' + Buffer.from(`${HML_CONFIG.username}:${HML_CONFIG.password}`).toString('base64')
  
  return new Promise((resolve, reject) => {
    const url = new URL('/sigt/fe/v1/registarFactura', 'https://sifphml.minfin.gov.ao')
    
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        'User-Agent': `${SOFTWARE_INFO.productId}/${SOFTWARE_INFO.productVersion}`
      },
      timeout: HML_CONFIG.timeout
    }
    
    console.log(`🌐 Enviando para AGT HML...`)
    console.log(`   URL: ${url.href}`)
    console.log(`   Timeout: ${HML_CONFIG.timeout / 1000}s`)
    console.log('')
    
    const startTime = Date.now()
    
    const req = https.request(options, (res) => {
      let data = ''
      
      res.on('data', (chunk) => {
        data += chunk
      })
      
      res.on('end', () => {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2)
        
        console.log(`📥 Resposta recebida em ${duration}s`)
        console.log(`   Status: ${res.statusCode} ${res.statusMessage}`)
        console.log('')
        
        try {
          const parsed = JSON.parse(data)
          
          console.log('📄 Resposta AGT:')
          console.log(JSON.stringify(parsed, null, 2))
          console.log('')
          
          if (res.statusCode === 200) {
            if (parsed.requestID) {
              console.log('╔═══════════════════════════════════════════════════════════════╗')
              console.log('║   ✅ FACTURA REGISTADA COM SUCESSO!                           ║')
              console.log('╚═══════════════════════════════════════════════════════════════╝')
              console.log(`   RequestID: ${parsed.requestID}`)
              console.log(`   Documento: ${doc.documentNo}`)
              console.log(`   Total: ${doc.documentTotals.grossTotal.toLocaleString('pt-AO')} AOA`)
              console.log(`   Linhas: ${doc.lines.length}`)
              
              if (parsed.errorList && parsed.errorList.length > 0) {
                console.log('\n⚠️  Avisos/Erros:')
                parsed.errorList.forEach((err, idx) => {
                  if (err && err.idError) {
                    console.log(`   ${idx + 1}. [${err.idError}] ${err.descriptionError || ''}`)
                  }
                })
              }
            } else if (parsed.errorList && parsed.errorList.length > 0) {
              console.log('╔═══════════════════════════════════════════════════════════════╗')
              console.log('║   ⚠️  RESPOSTA COM ERROS                                      ║')
              console.log('╚═══════════════════════════════════════════════════════════════╝')
              parsed.errorList.forEach((err, idx) => {
                console.log(`   ${idx + 1}. [${err.idError || 'N/A'}] ${err.descriptionError || ''}`)
              })
            }
            resolve(parsed)
          } else {
            console.log(`\n⚠️ Status HTTP inesperado: ${res.statusCode}`)
            resolve(parsed)
          }
        } catch (error) {
          console.log('Resposta raw:', data)
          reject(error)
        }
      })
    })
    
    req.on('error', (error) => {
      console.error('\n❌ ERRO DE CONEXÃO:', error.message)
      reject(error)
    })
    
    req.on('timeout', () => {
      console.error('\n⏱️ TIMEOUT após', HML_CONFIG.timeout / 1000, 'segundos')
      req.destroy()
      reject(new Error('Timeout'))
    })
    
    req.write(JSON.stringify(payload))
    req.end()
  })
}

// Executar teste
testRegistarFactura()
  .then((result) => {
    console.log('\n═══════════════════════════════════════════════════════════════')
    console.log('   TESTE CONCLUÍDO')
    console.log('═══════════════════════════════════════════════════════════════')
    process.exit(0)
  })
  .catch((error) => {
    console.log('\n═══════════════════════════════════════════════════════════════')
    console.log('   TESTE FALHOU:', error.message)
    console.log('═══════════════════════════════════════════════════════════════')
    process.exit(1)
  })
