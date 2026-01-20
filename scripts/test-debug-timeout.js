/**
 * Teste de diagnóstico - Verificar timeout e resposta AGT
 */
require('dotenv').config({ path: '.env.local' });
const https = require('https');
const crypto = require('crypto');
const { URL: URLParser } = require('url');

const API_URL = 'https://sifphml.minfin.gov.ao/sigt/fe/v1/listarFacturas';
const USERNAME = process.env.AGT_HML_USERNAME || 'ws.hml.addonsaftb1';
const PASSWORD = process.env.AGT_HML_PASSWORD || 'mfn+3534+2025';
const NIF = process.env.AGT_HML_NIF_TEST || '5000413178';
const TIMEOUT = parseInt(process.env.AGT_TIMEOUT_MS || '180000', 10);

console.log('\n╔══════════════════════════════════════════╗');
console.log('║  DIAGNÓSTICO - Timeout e Resposta AGT    ║');
console.log('╚══════════════════════════════════════════╝\n');

console.log(`⏱️  Timeout configurado: ${TIMEOUT}ms (${(TIMEOUT/1000).toFixed(0)}s)`);
console.log(`🔐 Username: ${USERNAME}`);
console.log(`📍 NIF: ${NIF}`);
console.log(`🌐 URL: ${API_URL}\n`);

function generateGUID() {
  return crypto.randomUUID();
}

function generateJWS(payload) {
  const header = { typ: 'JOSE', alg: 'RS256' };
  const base64urlEncode = (obj) => Buffer.from(JSON.stringify(obj))
    .toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  
  const headerB64 = base64urlEncode(header);
  const payloadB64 = base64urlEncode(payload);
  const signingInput = `${headerB64}.${payloadB64}`;
  
  const privateKey = process.env.AGT_PRIVATE_KEY;
  if (privateKey && privateKey.includes('PRIVATE KEY')) {
    try {
      const sign = crypto.createSign('RSA-SHA256');
      sign.update(signingInput);
      const signature = sign.sign(privateKey, 'base64')
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      return `${headerB64}.${payloadB64}.${signature}`;
    } catch (error) {
      console.error('❌ Erro ao assinar:', error.message);
    }
  }
  return 'SIGNATURE_ERROR';
}

async function test() {
  const start = Date.now();
  
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);
  const formatDate = (d) => d.toISOString().split('T')[0];
  
  const requestBody = {
    schemaVersion: '1.2',
    submissionGUID: generateGUID(),
    submissionTimeStamp: new Date().toISOString(),
    softwareInfo: {
      softwareInfoDetail: {
        productId: process.env.AGT_SOFTWARE_PRODUCT_ID || 'ADDON SAFT B1 E-INVOICE',
        productVersion: process.env.AGT_SOFTWARE_VERSION || '1.0',
        softwareValidationNumber: process.env.AGT_SOFTWARE_VALIDATION_NUMBER || 'FE/81/AGT/2025'
      },
      jwsSoftwareSignature: generateJWS({
        productId: process.env.AGT_SOFTWARE_PRODUCT_ID || 'ADDON SAFT B1 E-INVOICE',
        productVersion: process.env.AGT_SOFTWARE_VERSION || '1.0',
        softwareValidationNumber: process.env.AGT_SOFTWARE_VALIDATION_NUMBER || 'FE/81/AGT/2025'
      })
    },
    jwsSignature: generateJWS({ taxRegistrationNumber: NIF }),
    taxRegistrationNumber: NIF,
    queryStartDate: formatDate(startDate),
    queryEndDate: formatDate(endDate)
  };

  console.log('📤 Enviando requisição...');
  console.log(`   Período: ${formatDate(startDate)} a ${formatDate(endDate)}`);
  console.log(`   GUID: ${requestBody.submissionGUID}\n`);

  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64');
    const url = new URLParser(API_URL);
    const payload = JSON.stringify(requestBody);
    
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'Authorization': `Basic ${auth}`
      },
      timeout: TIMEOUT
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', chunk => {
        data += chunk;
        const elapsed = ((Date.now() - start) / 1000).toFixed(1);
        process.stdout.write(`\r⏳ Recebendo dados... ${elapsed}s`);
      });
      
      res.on('end', () => {
        const duration = ((Date.now() - start) / 1000).toFixed(1);
        console.log(`\n\n✅ Resposta recebida em ${duration}s`);
        console.log(`📊 Status: ${res.statusCode}`);
        console.log(`📦 Tamanho: ${(data.length / 1024).toFixed(2)} KB`);
        
        if (res.statusCode === 200) {
          try {
            const json = JSON.parse(data);
            const count = json?.statusResult?.documentResultCount || 0;
            console.log(`📋 Facturas encontradas: ${count}\n`);
            resolve({ status: res.statusCode, count, duration });
          } catch (e) {
            console.log('⚠️  Erro ao parsear JSON:', e.message);
            console.log('   Primeiros 500 chars:', data.substring(0, 500));
            reject(e);
          }
        } else {
          console.log('❌ Erro HTTP:', data.substring(0, 500));
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });

    req.on('error', (e) => {
      const duration = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`\n\n❌ Erro após ${duration}s: ${e.message}`);
      console.log(`   Code: ${e.code}`);
      console.log(`   Stack: ${e.stack}\n`);
      reject(e);
    });

    req.on('timeout', () => {
      const duration = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`\n\n⏰ TIMEOUT após ${duration}s\n`);
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.write(payload);
    req.end();
  });
}

test()
  .then(result => {
    console.log('╔══════════════════════════════════════════╗');
    console.log('║            ✅ TESTE CONCLUÍDO            ║');
    console.log('╚══════════════════════════════════════════╝');
    process.exit(0);
  })
  .catch(error => {
    console.error('⚠️  ERRO CAPTURADO:');
    console.error('   Message:', error.message);
    console.error('   Code:', error.code);
    console.error('   Stack:', error.stack);
    console.log('\n╔══════════════════════════════════════════╗');
    console.log('║            ❌ TESTE FALHOU               ║');
    console.log('╚══════════════════════════════════════════╝');
    process.exit(1);
  });
