#!/usr/bin/env node

/**
 * EXEMPLO VISUAL: Como as Duas Chaves são Usadas
 * Demonstra o fluxo de assinatura com Produtor + Emissor
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') })

const crypto = require('crypto')

console.log('\n╔════════════════════════════════════════════════════════════════╗')
console.log('║   EXEMPLO: FLUXO COMPLETO DE ASSINATURA                       ║')
console.log('║   Produtor (Software) + Emissor (Contribuinte)                ║')
console.log('╚════════════════════════════════════════════════════════════════╝\n')

// Dados para demonstração
const exampleData = {
  software: {
    productId: 'SafeFacturas',
    productVersion: '1.0.1',
    softwareValidationNumber: 'FE/164/AGT/2026'
  },
  document: {
    documentNo: 'FT A/000001',
    documentType: 'FT',
    documentDate: '2026-02-26',
    taxRegistrationNumber: '5417062030',
    customerTaxID: '999999999',
    customerCountry: 'AO',
    companyName: 'CONSUMIDOR FINAL',
    documentTotals: {
      taxPayable: '14000.00',
      netTotal: '100000.00',
      grossTotal: '114000.00'
    }
  }
}

// Step 1: Verificar chaves
console.log('📋 STEP 1: VERIFICAR CONFIGURAÇÃO DE CHAVES\n')

const producerKey = process.env.AGT_PRODUCER_PRIVATE_KEY
const issuerKey = process.env.AGT_PRIVATE_KEY

console.log(`Chave do Produtor: ${producerKey ? '✅ Configurada' : '❌ Faltando'}`)
console.log(`Chave do Emissor:  ${issuerKey ? '✅ Configurada' : '❌ Faltando'}\n`)

// Step 2: Software Signature (Produtor)
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('📝 STEP 2: ASSINAR SOFTWARE COM CHAVE DO PRODUTOR\n')

console.log('Dados de entrada (softwareInfoDetail):')
console.log(JSON.stringify(exampleData.software, null, 2))

if (producerKey) {
  try {
    // Simular assinatura
    const sign = crypto.createSign('RSA-SHA256')
    sign.update(JSON.stringify(exampleData.software))
    sign.end()
    const signature = sign.sign(producerKey, 'base64')
    const finalSig = signature.length >= 256 ? signature.substring(0, 256) : signature.padEnd(256, '=')
    
    console.log(`\nAssinatura JWS criada (com CHAVE DO PRODUTOR):`)
    console.log(`Primeiros 50 chars: ${finalSig.substring(0, 50)}...`)
    console.log(`Total: ${finalSig.length} caracteres ✅\n`)
    console.log('✅ jwsSoftwareSignature criada com sucesso!')
  } catch (e) {
    console.log(`❌ ERRO ao assinar: ${e.message}`)
  }
} else {
  console.log('❌ ERRO: Chave do produtor não configurada')
  console.log('   Adicione AGT_PRODUCER_PRIVATE_KEY ao .env.local\n')
}

// Step 3: Document Signature (Emissor)
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('📝 STEP 3: ASSINAR DOCUMENTO COM CHAVE DO EMISSOR\n')

console.log('Dados de entrada (campos do documento):')
const docPayload = {
  documentNo: exampleData.document.documentNo,
  taxRegistrationNumber: exampleData.document.taxRegistrationNumber,
  documentType: exampleData.document.documentType,
  documentDate: exampleData.document.documentDate,
  customerTaxID: exampleData.document.customerTaxID,
  customerCountry: exampleData.document.customerCountry,
  companyName: exampleData.document.companyName,
  documentTotals: exampleData.document.documentTotals
}
console.log(JSON.stringify(docPayload, null, 2))

if (issuerKey) {
  try {
    // Simular assinatura
    const sign = crypto.createSign('RSA-SHA256')
    sign.update(JSON.stringify(docPayload))
    sign.end()
    const signature = sign.sign(issuerKey, 'base64')
    const finalSig = signature.length >= 256 ? signature.substring(0, 256) : signature.padEnd(256, '=')
    
    console.log(`\nAssinatura JWS criada (com CHAVE DO EMISSOR):`)
    console.log(`Primeiros 50 chars: ${finalSig.substring(0, 50)}...`)
    console.log(`Total: ${finalSig.length} caracteres ✅\n`)
    console.log('✅ jwsDocumentSignature criada com sucesso!')
  } catch (e) {
    console.log(`❌ ERRO ao assinar: ${e.message}`)
  }
} else {
  console.log('❌ ERRO: Chave do emissor não configurada')
  console.log('   Adicione AGT_PRIVATE_KEY ao .env.local\n')
}

// Step 4: Payload Final
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('📦 STEP 4: PAYLOAD FINAL PARA SUBMISSÃO\n')

console.log('Estrutura do payload:')
console.log(`
{
  "schemaVersion": "1.0",
  "submissionUUID": "550e8400-e29b-41d4-a716-446655440000",
  "taxRegistrationNumber": "5417062030",
  "submissionTimeStamp": "2026-02-26T10:41:30Z",
  "softwareInfo": {
    "softwareInfoDetail": {
      "productId": "${exampleData.software.productId}",
      "productVersion": "${exampleData.software.productVersion}",
      "softwareValidationNumber": "${exampleData.software.softwareValidationNumber}"
    },
    "jwsSoftwareSignature": "${producerKey ? '[256-CHAR-JWS-SIGNATURE]' : '[ERRO: CHAVE FALTANDO]'}"
    // ↑ Assinado com CHAVE DO PRODUTOR ✅
  },
  "documents": [
    {
      "documentNo": "${exampleData.document.documentNo}",
      "documentType": "${exampleData.document.documentType}",
      "documentDate": "${exampleData.document.documentDate}",
      "taxRegistrationNumber": "${exampleData.document.taxRegistrationNumber}",
      "customerTaxID": "${exampleData.document.customerTaxID}",
      "customerCountry": "${exampleData.document.customerCountry}",
      "companyName": "${exampleData.document.companyName}",
      "documentTotals": {...},
      "jwsDocumentSignature": "${issuerKey ? '[256-CHAR-JWS-SIGNATURE]' : '[ERRO: CHAVE FALTANDO]'}"
      // ↑ Assinado com CHAVE DO EMISSOR ✅
    }
  ]
}
`)

// Step 5: Resumo
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('\n✅ RESUMO DO FLUXO\n')

if (producerKey && issuerKey) {
  console.log('Status: ✅ PRONTO PARA SUBMISSÃO\n')
  console.log('Ambas as assinaturas foram criadas corretamente:')
  console.log('  1. jwsSoftwareSignature ← CHAVE DO PRODUTOR')
  console.log('  2. jwsDocumentSignature ← CHAVE DO EMISSOR')
  console.log('\nPróxima etapa: Enviar payload para AGT /registarFactura')
}  else {
  console.log('Status: ❌ INCOMPLETO\n')
  console.log('Chaves faltando:')
  if (!producerKey) console.log('  ❌ AGT_PRODUCER_PRIVATE_KEY')
  if (!issuerKey) console.log('  ❌ AGT_PRIVATE_KEY')
  console.log('\nAção: Configure ambas as chaves em .env.local')
}

console.log('\n' + '═'.repeat(66) + '\n')
