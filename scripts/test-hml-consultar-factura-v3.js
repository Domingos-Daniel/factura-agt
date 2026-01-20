/**
 * Teste HML - consultarFactura v3
 * Usa credenciais reais do parceiro certificado via .env.local
 * 
 * Uso: node scripts/test-hml-consultar-factura-v3.js <documentNo>
 * Exemplo: node scripts/test-hml-consultar-factura-v3.js FT FT7826S1675C/1
 */

require('dotenv').config({ path: '.env.local' });
const https = require('https');
const crypto = require('crypto');

// Credenciais HML
const HML_URL = 'https://sifphml.minfin.gov.ao/sigt/fe/v1/consultarFactura';
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
console.log('║   TESTE HML - consultarFactura (v3 - Credenciais Reais)  ║');
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

async function consultarFactura(invoiceTypeCode, documentNo) {
  const submissionUUID = generateUUID();
  
  // Payload para assinatura do software
  const softwarePayload = {
    softwareInfo: SOFTWARE_INFO,
    timestamp: new Date().toISOString()
  };
  
  // Payload para assinatura do documento
  const documentPayload = {
    invoiceTypeCode,
    documentNo,
    timestamp: new Date().toISOString()
  };
  
  // Gerar assinaturas reais
  const jwsSoftwareSignature = generateRealJWS(softwarePayload, PRIVATE_KEY);
  const jwsDocumentSignature = generateRealJWS(documentPayload, PRIVATE_KEY);
  
  const requestBody = {
    taxRegistrationNumber: NIF,
    softwareInfo: SOFTWARE_INFO,
    jwsSoftwareSignature,
    submissionUUID,
    schemaVersion: '1.2',
    invoiceTypeCode,
    documentNo,
    jwsDocumentSignature
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
          console.log(JSON.stringify(json, null, 2));
          
          // Mostrar detalhes da factura se existir
          if (json.invoiceInfo) {
            console.log('\n📋 Detalhes da Factura:');
            console.log(`   Tipo: ${json.invoiceInfo.invoiceTypeCode || 'N/A'}`);
            console.log(`   Número: ${json.invoiceInfo.documentNo || 'N/A'}`);
            console.log(`   Data: ${json.invoiceInfo.invoiceDate || 'N/A'}`);
            console.log(`   Total: ${json.invoiceInfo.grossTotal || 'N/A'}`);
            console.log(`   Estado: ${json.invoiceInfo.documentState || 'N/A'}`);
            console.log(`   Hash: ${json.invoiceInfo.hash?.substring(0, 50) || 'N/A'}...`);
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
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('⚠️  Uso: node scripts/test-hml-consultar-factura-v3.js <invoiceTypeCode> <documentNo>');
  console.log('   Exemplo: node scripts/test-hml-consultar-factura-v3.js FT FT7826S1675C/1');
  console.log('\n📝 Usando valores de teste padrão...\n');
  // Usar uma série conhecida do listarSeries
  consultarFactura('FT', 'FT7826S1675C/1')
    .then(() => {
      console.log('\n╔════════════════════════════════════════════════════════╗');
      console.log('║              TESTE CONCLUÍDO                          ║');
      console.log('╚════════════════════════════════════════════════════════╝');
    })
    .catch(console.error);
} else {
  const [invoiceTypeCode, documentNo] = args;
  consultarFactura(invoiceTypeCode, documentNo)
    .then(() => {
      console.log('\n╔════════════════════════════════════════════════════════╗');
      console.log('║              TESTE CONCLUÍDO                          ║');
      console.log('╚════════════════════════════════════════════════════════╝');
    })
    .catch(console.error);
}
