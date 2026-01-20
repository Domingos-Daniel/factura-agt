/**
 * Teste HML - listarFacturas v3
 * Usa credenciais reais do parceiro certificado via .env.local
 * 
 * Uso: node scripts/test-hml-listar-facturas-v3.js [invoiceTypeCode]
 */

require('dotenv').config({ path: '.env.local' });
const https = require('https');
const crypto = require('crypto');

// Credenciais HML
const HML_URL = 'https://sifphml.minfin.gov.ao/sigt/fe/v1/listarFacturas';
const USERNAME = 'ws.hml.addonsaftb1';
const PASSWORD = 'mfn+3534+2025';
const NIF = '5000413178';

// Software Info do parceiro certificado (do .env.local)
const SOFTWARE_INFO = {
  productId: process.env.AGT_SOFTWARE_PRODUCT_ID || 'ADDON SAFT B1 E-INVOICE',
  productVersion: process.env.AGT_SOFTWARE_VERSION || '1.0',
  softwareValidationNumber: process.env.AGT_SOFTWARE_VALIDATION_NUMBER || 'FE/81/AGT/2025'
};

// Chave privada real do .env.local
const PRIVATE_KEY = process.env.AGT_PRIVATE_KEY;

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║   TESTE HML - listarFacturas (v3 - Credenciais Reais)    ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('🔧 Configuração:');
console.log(`   URL: ${HML_URL}`);
console.log(`   NIF: ${NIF}`);
console.log(`   Username: ${USERNAME}`);
console.log(`   Product ID: ${SOFTWARE_INFO.productId}`);
console.log(`   Validation Number: ${SOFTWARE_INFO.softwareValidationNumber}`);
console.log(`   Chave Privada: ${PRIVATE_KEY ? '✅ Configurada' : '❌ Não configurada'}`);
console.log('');

// Gerar UUID v4
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Gerar assinatura JWS real
function generateRealJWS(payload, privateKey) {
  try {
    // Header JWS
    const header = {
      alg: 'RS256',
      typ: 'JWT'
    };
    
    // Codificar em Base64URL
    const base64UrlEncode = (obj) => {
      const json = typeof obj === 'string' ? obj : JSON.stringify(obj);
      return Buffer.from(json)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    };
    
    const headerB64 = base64UrlEncode(header);
    const payloadB64 = base64UrlEncode(payload);
    const signingInput = `${headerB64}.${payloadB64}`;
    
    // Assinar com a chave privada
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signingInput);
    const signature = sign.sign(privateKey, 'base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    return `${signingInput}.${signature}`;
  } catch (error) {
    console.error('❌ Erro ao gerar JWS:', error.message);
    return 'SIGNATURE_ERROR';
  }
}

async function listarFacturas(invoiceTypeCode = 'FT') {
  const submissionUUID = generateUUID();
  
  // Payload para assinatura do software
  const softwarePayload = {
    softwareInfo: SOFTWARE_INFO,
    timestamp: new Date().toISOString()
  };
  
  // Gerar assinatura real
  const jwsSoftwareSignature = generateRealJWS(softwarePayload, PRIVATE_KEY);
  
  // Período: último mês
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 1);
  
  const requestBody = {
    taxRegistrationNumber: NIF,
    softwareInfo: SOFTWARE_INFO,
    jwsSoftwareSignature,
    submissionUUID,
    schemaVersion: '1.2',
    invoiceTypeCode,
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    page: 1,
    pageSize: 50
  };

  console.log('📤 Request Body:');
  console.log(JSON.stringify(requestBody, null, 2));
  console.log('\n📡 Enviando requisição...\n');

  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64');
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      rejectUnauthorized: false
    };

    const req = https.request(HML_URL, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`📥 Status: ${res.statusCode}`);
        console.log('📥 Response:');
        try {
          const json = JSON.parse(data);
          
          // Mostrar resumo se houver facturas
          if (json.invoiceList && Array.isArray(json.invoiceList)) {
            console.log(`\n📋 Encontradas ${json.invoiceList.length} facturas:`);
            json.invoiceList.slice(0, 10).forEach((inv, idx) => {
              console.log(`   ${idx + 1}. ${inv.documentNo || inv.invoiceNo || 'N/A'}`);
              console.log(`      Tipo: ${inv.invoiceTypeCode || 'N/A'} | Data: ${inv.invoiceDate || 'N/A'} | Total: ${inv.grossTotal || 'N/A'}`);
            });
            if (json.invoiceList.length > 10) {
              console.log(`   ... e mais ${json.invoiceList.length - 10} facturas`);
            }
          } else {
            console.log(JSON.stringify(json, null, 2));
          }
          
          resolve(json);
        } catch (e) {
          console.log(data);
          resolve(data);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Erro:', error.message);
      reject(error);
    });

    req.write(JSON.stringify(requestBody));
    req.end();
  });
}

// Executar teste
const invoiceTypeCode = process.argv[2] || 'FT';
console.log(`🔍 Listando facturas do tipo: ${invoiceTypeCode}\n`);

listarFacturas(invoiceTypeCode)
  .then(() => {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║              TESTE CONCLUÍDO                          ║');
    console.log('╚════════════════════════════════════════════════════════╝');
  })
  .catch(console.error);
