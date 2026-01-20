/**
 * Teste HML - consultarFactura v4
 * Usa formato correto da documentação AGT
 * 
 * Uso: node scripts/test-hml-consultar-factura-v4.js [invoiceNo]
 * Exemplo: node scripts/test-hml-consultar-factura-v4.js "FT FT7826S1502N/197"
 */

require('dotenv').config({ path: '.env.local' });
const https = require('https');
const crypto = require('crypto');

// Credenciais HML
const HML_URL = 'https://sifphml.minfin.gov.ao/sigt/fe/v1/consultarFactura';
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
console.log('║   TESTE HML - consultarFactura (v4 - Formato Oficial)  ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('🔧 Configuração:');
console.log(`   URL: ${HML_URL}`);
console.log(`   NIF: ${NIF}`);
console.log(`   Username: ${USERNAME}`);
console.log(`   Product ID: ${SOFTWARE_INFO_DETAIL.productId}`);
console.log(`   Validation Number: ${SOFTWARE_INFO_DETAIL.softwareValidationNumber}`);
console.log(`   Chave Privada: ${PRIVATE_KEY ? '✅ Configurada' : '❌ Não configurada'}`);
console.log('');

// Gerar UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Gerar assinatura JWS real
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

async function consultarFactura(invoiceNo) {
  // Campos para assinatura principal (invoiceNo incluso)
  const signatureFields = {
    taxRegistrationNumber: NIF,
    invoiceNo: invoiceNo
  };
  
  // Payload com formato da documentação oficial
  const requestBody = {
    schemaVersion: '1.2',
    submissionUUID: generateUUID(),
    taxRegistrationNumber: NIF,
    submissionTimeStamp: new Date().toISOString(),
    invoiceNo: invoiceNo, // Campo correto: invoiceNo, não documentNo
    softwareInfo: {
      softwareInfoDetail: SOFTWARE_INFO_DETAIL,
      jwsSoftwareSignature: generateJWS(SOFTWARE_INFO_DETAIL)
    },
    jwsSignature: generateJWS(signatureFields)
  };

  console.log(`🔍 Consultando factura: ${invoiceNo}\n`);
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
          
          // Mostrar detalhes se houver documento
          if (json.document) {
            console.log('\n📋 Detalhes da Factura:');
            console.log(`   Número: ${json.document.documentNo || 'N/A'}`);
            console.log(`   Tipo: ${json.document.documentType || 'N/A'}`);
            console.log(`   Data: ${json.document.documentDate || 'N/A'}`);
            console.log(`   Status: ${json.document.documentStatus || 'N/A'}`);
            console.log(`   Cliente: ${json.document.costumerName || 'N/A'}`);
            console.log(`   NIF Cliente: ${json.document.customerTaxID || 'N/A'}`);
            console.log(`   Empresa: ${json.document.companyName || 'N/A'}`);
            
            if (json.document.documentTotals) {
              console.log(`\n   💰 Totais:`);
              console.log(`      Líquido: ${json.document.documentTotals.netTotal || 'N/A'}`);
              console.log(`      Imposto: ${json.document.documentTotals.taxPayable || 'N/A'}`);
              console.log(`      Bruto: ${json.document.documentTotals.grossTotal || 'N/A'}`);
            }
            
            if (json.document.lines && json.document.lines.length > 0) {
              console.log(`\n   📝 Linhas (${json.document.lines.length}):`);
              json.document.lines.slice(0, 5).forEach((line, idx) => {
                console.log(`      ${idx + 1}. ${line.productDescription || 'N/A'} - Qtd: ${line.quantity || 'N/A'} x ${line.unitPrice || 'N/A'}`);
              });
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
// Formato do invoiceNo: "FT FT7826S1502N/197" (como retornado no listarFacturas)
const invoiceNo = process.argv[2] || 'FT FT7826S1502N/197';

consultarFactura(invoiceNo)
  .then(() => {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║              TESTE CONCLUÍDO                          ║');
    console.log('╚════════════════════════════════════════════════════════╝');
  })
  .catch(console.error);
