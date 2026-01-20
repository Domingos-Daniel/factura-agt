/**
 * Teste HML - listarFacturas v5
 * Usa formato correto da documentação AGT
 * 
 * Uso: node scripts/test-hml-listar-facturas-v5.js
 */

require('dotenv').config({ path: '.env.local' });
const https = require('https');
const crypto = require('crypto');

// Credenciais HML
const HML_URL = 'https://sifphml.minfin.gov.ao/sigt/fe/v1/listarFacturas';
const USERNAME = process.env.AGT_HML_USERNAME || 'ws.hml.addonsaftb1';
const PASSWORD = process.env.AGT_HML_PASSWORD || 'mfn+3534+2025';
const NIF = process.env.AGT_HML_NIF_TEST || '5000413178';

// Software Info do parceiro certificado (do .env.local)
const SOFTWARE_INFO_DETAIL = {
  productId: process.env.AGT_SOFTWARE_PRODUCT_ID || 'ADDON SAFT B1 E-INVOICE',
  productVersion: process.env.AGT_SOFTWARE_VERSION || '1.0',
  softwareValidationNumber: process.env.AGT_SOFTWARE_VALIDATION_NUMBER || 'FE/81/AGT/2025'
};

// Chave privada real do .env.local
const PRIVATE_KEY = process.env.AGT_PRIVATE_KEY;

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║   TESTE HML - listarFacturas (v5 - Formato Oficial)    ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('🔧 Configuração:');
console.log(`   URL: ${HML_URL}`);
console.log(`   NIF: ${NIF}`);
console.log(`   Username: ${USERNAME}`);
console.log(`   Product ID: ${SOFTWARE_INFO_DETAIL.productId}`);
console.log(`   Validation Number: ${SOFTWARE_INFO_DETAIL.softwareValidationNumber}`);
console.log(`   Chave Privada: ${PRIVATE_KEY ? '✅ Configurada' : '❌ Não configurada'}`);
console.log('');

// Gerar GUID
function generateGUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Gerar assinatura JWS real (mesmo formato que listarSeries)
function generateJWS(payload) {
  const header = { typ: 'JOSE', alg: 'RS256' };
  
  const base64urlEncode = (obj) => {
    return Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  };
  
  const headerB64 = base64urlEncode(header);
  const payloadB64 = base64urlEncode(payload);
  const signingInput = `${headerB64}.${payloadB64}`;
  
  if (PRIVATE_KEY && PRIVATE_KEY.includes('PRIVATE KEY')) {
    try {
      const sign = crypto.createSign('RSA-SHA256');
      sign.update(signingInput);
      const signature = sign.sign(PRIVATE_KEY, 'base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
      return `${headerB64}.${payloadB64}.${signature}`;
    } catch (error) {
      console.warn('⚠️  Erro ao assinar:', error.message);
    }
  }
  
  return 'SIGNATURE_ERROR';
}

async function listarFacturas() {
  // Período: última semana (formato YYYY-MM-DD)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);
  
  const formatDate = (d) => d.toISOString().split('T')[0];
  
  // Campos para assinatura principal
  const signatureFields = {
    taxRegistrationNumber: NIF
  };
  
  // Payload com formato da documentação oficial
  const requestBody = {
    schemaVersion: '1.2',
    submissionGUID: generateGUID(), // GUID, não UUID
    submissionTimeStamp: new Date().toISOString(),
    softwareInfo: {
      softwareInfoDetail: SOFTWARE_INFO_DETAIL,
      jwsSoftwareSignature: generateJWS(SOFTWARE_INFO_DETAIL)
    },
    jwsSignature: generateJWS(signatureFields),
    taxRegistrationNumber: NIF,
    queryStartDate: formatDate(startDate), // queryStartDate, não startDate
    queryEndDate: formatDate(endDate)      // queryEndDate, não endDate
  };

  console.log('📤 Request Body:');
  console.log(JSON.stringify(requestBody, null, 2));
  console.log('\n📡 Enviando requisição...\n');

  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64');
    
    const url = new URL(HML_URL);
    
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Basic ${auth}`,
        'User-Agent': `${SOFTWARE_INFO_DETAIL.productId}/${SOFTWARE_INFO_DETAIL.productVersion}`
      },
      timeout: 30000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`📥 Status: ${res.statusCode}`);
        console.log('📥 Response:');
        try {
          const json = JSON.parse(data);
          
          // Mostrar resumo se houver facturas
          if (json.statusResult && json.statusResult.resultEntryList) {
            const entries = json.statusResult.resultEntryList;
            console.log(`\n📋 Encontradas ${json.statusResult.documentResultCount || entries.length} facturas:`);
            
            const list = Array.isArray(entries.documentEntryResult) 
              ? entries.documentEntryResult 
              : [entries.documentEntryResult];
              
            list.slice(0, 10).forEach((inv, idx) => {
              console.log(`   ${idx + 1}. ${inv.documentNo || 'N/A'}`);
              console.log(`      Tipo: ${inv.documentType || 'N/A'} | Data: ${inv.documentDate || 'N/A'} | Total: ${inv.netTotal || 'N/A'}`);
              console.log(`      Status: ${inv.documentStatus || 'N/A'} - ${inv.documentStatusDescription || 'N/A'}`);
            });
            if (list.length > 10) {
              console.log(`   ... e mais ${list.length - 10} facturas`);
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
console.log('🔍 Listando facturas (últimos 7 dias)\n');

listarFacturas()
  .then(() => {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║              TESTE CONCLUÍDO                          ║');
    console.log('╚════════════════════════════════════════════════════════╝');
  })
  .catch(console.error);
