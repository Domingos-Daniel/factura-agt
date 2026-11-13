/**
 * Script de teste para Autenticação no ambiente HML da AGT
 * Testa as credenciais: ws.hml.addonsaftb1
 */

const https = require('https')
const crypto = require('crypto')
// helper that already knows about AGT key formats
const { createSoftwareSignature, createJWSSignature, createDocumentSignature, createIssuerSignature } = require('../lib/jws-signer')
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') })

// we no longer need the custom signJwsRS256 helper

// derive public key from private for verification
let publicKeyPem
try {
  const priv = process.env.AGT_PRIVATE_KEY
  if (priv) {
    // attempt to convert using createPrivateKey
    try {
      publicKeyPem = crypto.createPrivateKey(priv).export({ type: 'spki', format: 'pem' })
    } catch {
      console.warn('⚠️ createPrivateKey export falhou, unable to derive public key automatically')
    }
    if (publicKeyPem) {
      console.log('🔑 derived public key (first lines):')
      console.log(publicKeyPem.split('\n').slice(0,3).join('\n') + '\n...')
      console.log('   SHA256 fingerprint:', crypto.createHash('sha256').update(publicKeyPem).digest('hex'))
    }
  }
} catch (e) {
  console.warn('⚠️ não foi possível derivar chave pública:', e.message)
}

const HML_CONFIG = {
  baseURL: process.env.AGT_HML_BASE_URL || 'https://sifphml.minfin.gov.ao/sigt/fe/v1',
  username: process.env.AGT_HML_USERNAME || 'ws.hml.safefacturas',
  password: process.env.AGT_HML_PASSWORD || 'mfn+38470+2026',
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

// interpret returned AGT error codes and give user hints
function interpretErrors(list) {
  if (!Array.isArray(list)) return
  list.forEach(e => {
    switch (e.idError || e.id) {
      case 'E08':
        console.log('   → erro E08: assinatura de software inválida. Veja o campo jwsSoftwareSignature.')
        break
      case 'E40':
        console.log('   → erro E40: assinatura da chamada (jwsSignature) inválida.')
        break
      case 'E60':
        console.log('   → erro E60: NIF suspenso ou inativo no sistema de homologação.')
        break
      case 'E30':
        console.log('   → erro E30: NIF não possui actividade registada.')
        break
      case 'E99':
        console.log('   → erro E99: problema genérico com chave pública, confira AGT_PRIVATE_KEY.')
        break
      default:
        // no-op
        break
    }
  })
}

// fallback helper using PowerShell for environments where Node cannot establish TLS
function powershellPost(path, bodyObj, authHeader) {
  const { execFileSync } = require('child_process')
  const localTimeout = HML_CONFIG.timeout
  const bodyBase64 = Buffer.from(JSON.stringify(bodyObj)).toString('base64')
  const ps = `
$body = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('${bodyBase64}'))
$h=@{ 'Content-Type'='application/json' }
${authHeader ? `$h.Authorization='${authHeader}'` : ''}
try {
  $r = Invoke-RestMethod -Uri '${HML_CONFIG.baseURL}${path}' -Method Post -Body $body -Headers $h -TimeoutSec ${localTimeout/1000}
  $r | ConvertTo-Json -Compress
} catch { Write-Error $_; exit 1 }
`
  console.log('\n🪟 Usando fallback PowerShell para a chamada')
  const result = execFileSync('powershell', ['-NoProfile', '-Command', ps], { encoding: 'utf8' })
  try { return JSON.parse(result) } catch { return { __agtRaw: result } }
}

// Testar endpoint de teste (ping ou similar)
async function testConnection() {
  console.log('🔌 Testando conexão com AGT HML...\n')

// Executar teste

  // choose NIF from environment (HML test NIF) or generic placeholder
  let nif = process.env.AGT_HML_NIF_TEST || process.env.AGT_NIF_TEST || '5000660086'
  console.log(`📌 Usando NIF de teste: ${nif}`)

  const softwareInfoDetail = {
    productId: process.env.AGT_SOFTWARE_PRODUCT_ID || 'SafeFacturas',
    productVersion: process.env.AGT_SOFTWARE_VERSION || '1.0.1',
    softwareValidationNumber: process.env.AGT_SOFTWARE_VALIDATION_NUMBER || 'FE/308/AGT/2026'
  }

  // generate signatures using the safe helper which produces the 256‑char base64 string expected by AGT
  const jwsSoftwareSignature = createSoftwareSignature(softwareInfoDetail)
  console.log('→ jwsSoftwareSignature (len', jwsSoftwareSignature.length, '):', jwsSoftwareSignature.substring(0,50)+'...')

  // listarSeries only signs taxRegistrationNumber
  const jwsSignature = createIssuerSignature({ taxRegistrationNumber: nif })
  console.log('→ jwsSignature (len', jwsSignature.length, '):', jwsSignature.substring(0,50)+'...')

  // note: if AGT continues returning E08/E40 it means the key/cert pair
  // being used does not match what AGT has registered; verify that the
  // PRIVATE KEY in .env corresponds to the certificate uploaded to them
  // and that it is RSA-SHA256, 2048 bits (expect 256-byte base64 output). 

  const testData = {
    // for debugging purposes we also echo what we're signing
    softwareInfoDetail,
    schemaVersion: '1.2',
    submissionGUID: '00000000-0000-0000-0000-000000000000',
    submissionTimeStamp: new Date().toISOString(),
    taxRegistrationNumber: nif,
    seriesYear: 2026,
    softwareInfo: { softwareInfoDetail, jwsSoftwareSignature },
    jwsSignature
  }

  console.log('📤 Tentativa inicial via Node HTTPS')

  return new Promise((resolve, reject) => {
    const url = new URL('/listarSeries', HML_CONFIG.baseURL)
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(`${HML_CONFIG.username}:${HML_CONFIG.password}`).toString('base64'),
        'User-Agent': 'SafeFacturas/1.0'
      },
      timeout: HML_CONFIG.timeout
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => data += chunk)
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          console.log('\n📄 Resposta:')
          console.log(JSON.stringify(parsed, null, 2))
          if (parsed.errorList) {
            showErrors(parsed.errorList)
            interpretErrors(parsed.errorList)
          }
          return resolve(parsed)
        } catch {
          return resolve({ raw: data })
        }
      })
    })

    req.on('error', async (error) => {
      console.error('\n❌ Erro de conexão via Node HTTPS:', error.message)
      try {
        const authHeader = 'Basic ' + Buffer.from(`${HML_CONFIG.username}:${HML_CONFIG.password}`).toString('base64')
        const resp = powershellPost('/listarSeries', testData, authHeader)
        console.log('\n📄 Resposta (PowerShell):')
        console.log(JSON.stringify(resp, null, 2))
        // parse inner agt raw if available
        if (resp.__agtRaw) {
          try {
            // try to isolate the JSON object inside the raw text
            let raw = resp.__agtRaw.replace(/[\r\n]+/g, '').trim()
            const first = raw.indexOf('{')
            const last = raw.lastIndexOf('}')
            if (first !== -1 && last !== -1 && last > first) {
              raw = raw.substring(first, last + 1)
            }
            // if the string is itself a quoted JSON, unwrap it
            if (raw.startsWith('"') && raw.endsWith('"')) {
              raw = JSON.parse(raw)
            }
            // fix missing escapes around quoted field names generated by PowerShell
            raw = raw.replace(/"jwsSoftwareSignature"/g, '\\"jwsSoftwareSignature\\"')
                     .replace(/"jwsSignature"/g, '\\"jwsSignature\\"')
            const inner = JSON.parse(raw)
            console.log('\n🔍 parsed inner:')
            console.log(JSON.stringify(inner, null, 2))
            if (inner.errorList) {
              showErrors(inner.errorList)
              interpretErrors(inner.errorList)
            }
          } catch (pe) {
            console.error('⚠️ falha a parsear __agtRaw:', pe.message)
          }
        }
        return resolve(resp)
      } catch (psErr) {
        console.error('🚫 Fallback PowerShell também falhou:', psErr.message || psErr)
        return reject(psErr)
      }
    })

    req.on('timeout', () => {
      console.error('\n⏱️ TIMEOUT no Node HTTPS, tentando fallback...')
      req.destroy()
    })

    req.write(JSON.stringify(testData))
    req.end()
  })
}


function showErrors(list) {
  if (!Array.isArray(list) || list.length === 0) return
  console.log('\n⚠️ AGT retornou a seguinte(s) falha(s):')
  list.forEach(e => {
    console.log(`   - [${e.idError || e.id || '?'}] ${e.descriptionError || e.description || JSON.stringify(e)}`)
  })
}

// new helper for listarFacturas
async function testListarFacturas(nif) {
  // return the raw response so callers can reuse data
  console.log('\n🔎 Testando listarFacturas...')
  const url = new URL('/listarFacturas', HML_CONFIG.baseURL)
  const softwareInfoDetail = {
    productId: process.env.AGT_SOFTWARE_PRODUCT_ID || 'SafeFacturas',
    productVersion: process.env.AGT_SOFTWARE_VERSION || '1.0.1',
    softwareValidationNumber: process.env.AGT_SOFTWARE_VALIDATION_NUMBER || 'FE/308/AGT/2026'
  }
  const jwsSoftwareSignature = createSoftwareSignature(softwareInfoDetail)
  const jwsSignature = createIssuerSignature({ taxRegistrationNumber: nif, queryStartDate: '2026-01-01', queryEndDate: '2026-12-31' })

  const payload = {
    schemaVersion: '1.2',
    submissionGUID: '00000000-0000-0000-0000-000000000000',
    submissionTimeStamp: new Date().toISOString(),
    softwareInfo: { softwareInfoDetail, jwsSoftwareSignature },
    jwsSignature,
    taxRegistrationNumber: nif,
    queryStartDate: '2026-01-01',
    queryEndDate: '2026-12-31'
  }

  console.log('📤 Enviando listarFacturas payload:')
  console.log(JSON.stringify(payload, null, 2))

  // reuse powershellPost for simplicity
  const authHeader = 'Basic ' + Buffer.from(`${HML_CONFIG.username}:${HML_CONFIG.password}`).toString('base64')
  const resp = powershellPost('/listarFacturas', payload, authHeader)
  console.log('📄 Resposta listarFacturas:')
  console.log(JSON.stringify(resp, null, 2))
  if (resp.__agtRaw) {
    try {
      let raw = resp.__agtRaw.replace(/[\r\n]+/g, '').trim()
      const first = raw.indexOf('{')
      const last = raw.lastIndexOf('}')
      if (first !== -1 && last !== -1 && last > first) raw = raw.substring(first, last+1)
      if (raw.startsWith('"') && raw.endsWith('"')) raw = JSON.parse(raw)
      const inner = JSON.parse(raw)
      if (inner.errorList) {
        showErrors(inner.errorList)
        interpretErrors(inner.errorList)
      }
    } catch {}
  }
  return resp
}

// helper to generate simple UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

async function testRegistarFactura(nif) {
  console.log('\n➕ Testando registarFactura...')
  const softwareInfoDetail = {
    productId: process.env.AGT_SOFTWARE_PRODUCT_ID || 'SafeFacturas',
    productVersion: process.env.AGT_SOFTWARE_VERSION || '1.0.1',
    softwareValidationNumber: process.env.AGT_SOFTWARE_VALIDATION_NUMBER || 'FE/308/AGT/2026'
  }
  const jwsSoftwareSignature = createSoftwareSignature(softwareInfoDetail)

  const today = new Date()
  const docNo = `FT-TST/${today.getFullYear()}/${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}-${Math.floor(Math.random()*1000)}`
  const document = {
    documentNo: docNo,
    documentType: 'FT',
    documentDate: today.toISOString().split('T')[0],
    customerTaxID: '999999999',
    customerCountry: 'AO',
    companyName: 'Cliente de Teste',
    documentTotals: { netTotal: 100, taxPayable: 14, grossTotal: 114 }
  }
  const jwsDocumentSignature = createDocumentSignature(document, nif)
  const payload = {
    schemaVersion: '1.2',
    submissionUUID: generateUUID(), // AGT expects UUID field
    submissionTimeStamp: today.toISOString(),
    softwareInfo: { softwareInfoDetail, jwsSoftwareSignature },
    taxRegistrationNumber: nif,
    numberOfEntries: 1,
    documents: [ { 
      ...document,
      documentStatus: 'N',
      systemEntryDate: today.toISOString(),
      jwsDocumentSignature 
    } ]
  }
  console.log('📤 Payload registarFactura:')
  console.log(JSON.stringify(payload, null, 2))
  const authHeader = 'Basic ' + Buffer.from(`${HML_CONFIG.username}:${HML_CONFIG.password}`).toString('base64')
  const resp = powershellPost('/registarFactura', payload, authHeader)
  console.log('📄 Resposta registarFactura:')
  console.log(JSON.stringify(resp, null, 2))
  if (resp.__agtRaw) {
    try {
      let raw = resp.__agtRaw.replace(/[\r\n]+/g, '').trim()
      const first = raw.indexOf('{')
      const last = raw.lastIndexOf('}')
      if (first !== -1 && last !== -1 && last > first) raw = raw.substring(first, last+1)
      if (raw.startsWith('"') && raw.endsWith('"')) raw = JSON.parse(raw)
      const inner = JSON.parse(raw)
      if (inner.errorList) {
        showErrors(inner.errorList)
        interpretErrors(inner.errorList)
      }
    } catch {}
  }
  return { resp, docNo }
}

async function testSolicitarSerie(nif) {
  console.log('\n📦 Testando solicitarSerie...')
  const softwareInfoDetail = {
    productId: process.env.AGT_SOFTWARE_PRODUCT_ID || 'SafeFacturas',
    productVersion: process.env.AGT_SOFTWARE_VERSION || '1.0.1',
    softwareValidationNumber: process.env.AGT_SOFTWARE_VALIDATION_NUMBER || 'FE/308/AGT/2026'
  }
  const jwsSoftwareSignature = createSoftwareSignature(softwareInfoDetail)
  // payload fields for series request
  // create signature payload using the same fields AGT expects
  const seriesCode = 'FT2026'  // example series code; adjust as needed
  const firstDocumentNumber = 1
  const seriesPayload = {
    taxRegistrationNumber: nif,
    seriesCode,
    seriesYear: '2026',
    documentType: 'FT',
    firstDocumentNumber
  }
  const jwsSignature = createIssuerSignature(seriesPayload)

  const payload = {
    schemaVersion: '1.2',
    submissionUUID: generateUUID(),
    taxRegistrationNumber: nif,
    submissionTimeStamp: new Date().toISOString(),
    seriesCode,
    seriesYear: '2026',
    documentType: 'FT',
    firstDocumentNumber,
    invoicingMethod: 'FESF',
    establishmentNumber: 'SEDE',
    seriesContingencyIndicator: 'N',
    softwareInfo: {
      softwareInfoDetail,
      jwsSoftwareSignature
    },
    jwsSignature
  }

  console.log('📤 Payload solicitarSerie:')
  console.log(JSON.stringify(payload, null, 2))
  const authHeader = 'Basic ' + Buffer.from(`${HML_CONFIG.username}:${HML_CONFIG.password}`).toString('base64')
  const resp = powershellPost('/solicitarSerie', payload, authHeader)
  console.log('📄 Resposta solicitarSerie:')
  console.log(JSON.stringify(resp, null, 2))
  if (resp.__agtRaw) {
    try {
      let raw = resp.__agtRaw.replace(/[\r\n]+/g, '').trim()
      const first = raw.indexOf('{')
      const last = raw.lastIndexOf('}')
      if (first !== -1 && last !== -1 && last > first) raw = raw.substring(first, last+1)
      if (raw.startsWith('"') && raw.endsWith('"')) raw = JSON.parse(raw)
      const inner = JSON.parse(raw)
      if (inner.errorList) {
        showErrors(inner.errorList)
        interpretErrors(inner.errorList)
      }
    } catch {}
  }
  return resp
}

async function testConsultarFactura(nif, documentNo) {
  console.log('\n🔍 Testando consultarFactura para', documentNo)
  const softwareInfoDetail = {
    productId: process.env.AGT_SOFTWARE_PRODUCT_ID || 'SafeFacturas',
    productVersion: process.env.AGT_SOFTWARE_VERSION || '1.0.1',
    softwareValidationNumber: process.env.AGT_SOFTWARE_VALIDATION_NUMBER || 'FE/308/AGT/2026'
  }
  const timestamp = new Date().toISOString()
  const jwsSoftwareSignature = createSoftwareSignature({
    productId: softwareInfoDetail.productId,
    productVersion: softwareInfoDetail.productVersion,
    softwareValidationNumber: softwareInfoDetail.softwareValidationNumber
  })
  const payload = {
    schemaVersion: '1.2',
    submissionGUID: generateUUID(),
    submissionTimeStamp: timestamp,
    taxRegistrationNumber: nif,
    documentNo,
    documentType: documentNo.split('/')[0] || documentNo,
    softwareInfo: { softwareInfoDetail, jwsSoftwareSignature }
  }
  console.log('📤 Payload consultarFactura:')
  console.log(JSON.stringify(payload, null, 2))
  const authHeader = 'Basic ' + Buffer.from(`${HML_CONFIG.username}:${HML_CONFIG.password}`).toString('base64')
  const resp = powershellPost('/consultarFactura', payload, authHeader)
  console.log('📄 Resposta consultarFactura:')
  console.log(JSON.stringify(resp, null, 2))
  if (resp.__agtRaw) {
    try {
      let raw = resp.__agtRaw.replace(/[\r\n]+/g, '').trim()
      const first = raw.indexOf('{')
      const last = raw.lastIndexOf('}')
      if (first !== -1 && last !== -1 && last > first) raw = raw.substring(first, last+1)
      if (raw.startsWith('"') && raw.endsWith('"')) raw = JSON.parse(raw)
      const inner = JSON.parse(raw)
      if (inner.errorList) {
        showErrors(inner.errorList)
        interpretErrors(inner.errorList)
      }
    } catch {}
  }
  return resp
}

// Executar teste
testConnection()
  .then(async (result) => {
    // use provided NIF for series test
    let nif = '5417062030'
    console.log('\n➡️ etapa 0: solicitar série para NIF', nif)
    await testSolicitarSerie(nif)
    console.log('\n➡️ etapa 1: listar facturas antes de criar')
    let list1 = await testListarFacturas(nif)

    console.log('\n➡️ etapa 2: registar uma factura de teste')
    const { resp: addResp, docNo } = await testRegistarFactura(nif)

    console.log('\n➡️ etapa 3: listar facturas depois de criar')
    let list2 = await testListarFacturas(nif)

    // tentar extrair um número de factura para consulta
    let toConsult = docNo
    if (!toConsult && list2 && list2.statusResult && Array.isArray(list2.statusResult.resultEntryList) && list2.statusResult.resultEntryList.length) {
      toConsult = list2.statusResult.resultEntryList[0].documentEntryResult?.documentNo
    }
    if (toConsult) {
      console.log(`\n➡️ etapa 4: consultar factura ${toConsult}`)
      await testConsultarFactura(nif, toConsult)
    } else {
      console.log('\n⚠️ não consegui determinar número de factura para consulta')
    }

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
