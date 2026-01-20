/**
 * Teste HML - listarFacturas v4
 * Usa formato correto com softwareInfoDetail (como listarSeries)
 * 
 * Uso: node scripts/test-hml-listar-facturas-v4.js [invoiceTypeCode]
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
console.log('║   TESTE HML - listarFacturas (v4 - Formato Correto)    ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('🔧 Configuração:');
console.log(`   URL: ${HML_URL}`);
console.log(`   NIF: ${NIF}`);
console.log(`   Username: ${USERNAME}`);
console.log(`   Product ID: ${SOFTWARE_INFO_DETAIL.productId}`);
console.log(`   Validation Number: ${SOFTWARE_INFO_DETAIL.softwareValidationNumber}`);
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

async function listarFacturas(invoiceTypeCode = 'FT') {
  // Período: último mês
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 1);
  
  // Campos para assinatura principal
  const signatureFields = {
    taxRegistrationNumber: NIF
  };
  
  // Payload com formato correto (como listarSeries)
  const requestBody = {
    schemaVersion: '1.2',
    submissionUUID: generateUUID(),
    taxRegistrationNumber: NIF,
    submissionTimeStamp: new Date().toISOString(),
    softwareInfo: {
      softwareInfoDetail: SOFTWARE_INFO_DETAIL,
      jwsSoftwareSignature: generateJWS(SOFTWARE_INFO_DETAIL)
    },
    jwsSignature: generateJWS(signatureFields),
    // Campos específicos de listarFacturas
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
          if (json.invoiceList && Array.isArray(json.invoiceList)) {
            console.log(`\n📋 Encontradas ${json.invoiceList.length} facturas:`);
            json.invoiceList.slice(0, 10).forEach((inv, idx) => {
              console.log(`   ${idx + 1}. ${inv.documentNo || inv.invoiceNo || 'N/A'}`);
              console.log(`      Tipo: ${inv.invoiceTypeCode || 'N/A'} | Data: ${inv.invoiceDate || 'N/A'} | Total: ${inv.grossTotal || 'N/A'}`);
            });
            if (json.invoiceList.length > 10) {
              console.log(`   ... e mais ${json.invoiceList.length - 10} facturas`);
            }
          } else if (json.retorno) {
            console.log(JSON.stringify(json, null, 2));
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
