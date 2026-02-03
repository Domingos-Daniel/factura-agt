/**
 * TESTADOR HTTP PARA API AGT
 * Script Node.js para enviar payloads e capturar erros detalhados
 * 
 * USO:
 *   node scripts/test-agt-api.js C1    // Testar payload C1
 *   node scripts/test-agt-api.js all   // Testar todos
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// =============================================================================
// CONFIGURAÇÃO
// =============================================================================

const CONFIG = {
  // HOMOLOGAÇÃO (HML)
  baseUrl: 'https://sifphml.minfin.gov.ao',
  endpoints: {
    registar: '/sigt/fe/v1/registarFactura',
    validar: '/sigt/fe/v1/validarDocumento',
    obterEstado: '/sigt/fe/v1/obterEstado'
  },
  
  // TOKEN DE AUTENTICAÇÃO (substituir pelo real)
  authToken: 'YOUR_TOKEN_HERE',
  
  // Timeout em ms
  timeout: 30000
};

// =============================================================================
// FUNÇÕES HTTP
// =============================================================================

function makeRequest(endpoint, method, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(CONFIG.baseUrl + endpoint);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'AGT-Test-Client/1.0'
      },
      timeout: CONFIG.timeout,
      rejectUnauthorized: false // Para HML com cert self-signed
    };

    // Adicionar token se disponível
    if (CONFIG.authToken && CONFIG.authToken !== 'YOUR_TOKEN_HERE') {
      options.headers['Authorization'] = `Bearer ${CONFIG.authToken}`;
    }

    const req = https.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        try {
          const response = {
            statusCode: res.statusCode,
            statusMessage: res.statusMessage,
            headers: res.headers,
            body: body,
            json: null
          };

          // Tentar parsear JSON
          if (body && body.trim().startsWith('{')) {
            try {
              response.json = JSON.parse(body);
            } catch (e) {
              // Não é JSON válido
            }
          }

          resolve(response);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    // Enviar dados
    if (data) {
      const jsonData = JSON.stringify(data);
      req.write(jsonData);
    }

    req.end();
  });
}

// =============================================================================
// VALIDAÇÃO DE PAYLOAD
// =============================================================================

function validatePayload(payload) {
  const errors = [];

  // Validações básicas
  if (!payload.schemaVersion) errors.push('❌ schemaVersion ausente');
  if (!payload.submissionGUID) errors.push('❌ submissionGUID ausente');
  if (!payload.taxRegistrationNumber) errors.push('❌ taxRegistrationNumber ausente');
  if (!payload.submissionTimeStamp) errors.push('❌ submissionTimeStamp ausente');
  if (!payload.softwareInfo) errors.push('❌ softwareInfo ausente');
  if (!payload.documents || payload.documents.length === 0) {
    errors.push('❌ documents array vazio');
  }

  // Validar UUID formato
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (payload.submissionGUID && !uuidRegex.test(payload.submissionGUID)) {
    errors.push('❌ submissionGUID não é UUID v4 válido');
  }

  // Validar NIF
  if (payload.taxRegistrationNumber && !/^\d{9}$/.test(payload.taxRegistrationNumber)) {
    errors.push('❌ taxRegistrationNumber deve ter 9 dígitos');
  }

  // Validar cada documento
  payload.documents?.forEach((doc, idx) => {
    if (!doc.documentNo) errors.push(`❌ Documento ${idx + 1}: documentNo ausente`);
    if (!doc.documentType) errors.push(`❌ Documento ${idx + 1}: documentType ausente`);
    if (!doc.documentDate) errors.push(`❌ Documento ${idx + 1}: documentDate ausente`);
    if (!doc.jwsDocumentSignature) errors.push(`❌ Documento ${idx + 1}: assinatura ausente`);
    if (!doc.eacCode) errors.push(`❌ Documento ${idx + 1}: eacCode ausente`);
    if (!doc.customerTaxID) errors.push(`❌ Documento ${idx + 1}: customerTaxID ausente`);
    if (!doc.lines || doc.lines.length === 0) {
      errors.push(`❌ Documento ${idx + 1}: sem linhas`);
    }
    if (!doc.documentTotals) errors.push(`❌ Documento ${idx + 1}: documentTotals ausente`);

    // Validar linhas
    doc.lines?.forEach((line, lineIdx) => {
      if (!line.taxes || line.taxes.length === 0) {
        errors.push(`❌ Documento ${idx + 1}, Linha ${lineIdx + 1}: sem impostos`);
      }
    });

    // Validar totais
    if (doc.documentTotals) {
      const netTotal = parseFloat(doc.documentTotals.netTotal || '0');
      const taxPayable = parseFloat(doc.documentTotals.taxPayable || '0');
      const grossTotal = parseFloat(doc.documentTotals.grossTotal || '0');
      
      const calculatedGross = netTotal + taxPayable;
      const diff = Math.abs(calculatedGross - grossTotal);
      
      if (diff > 0.01) {
        errors.push(`❌ Documento ${idx + 1}: Total inconsistente (netTotal + taxPayable ≠ grossTotal)`);
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

// =============================================================================
// TESTAR PAYLOAD
// =============================================================================

async function testPayload(scenarioCode) {
  console.log('\n' + '═'.repeat(70));
  console.log(`🧪 TESTANDO ${scenarioCode}`);
  console.log('═'.repeat(70) + '\n');

  const payloadDir = path.join(__dirname, '..', 'data', 'test-payloads');
  const files = fs.readdirSync(payloadDir);
  const file = files.find(f => f.startsWith(scenarioCode + '_') && f.endsWith('.json'));

  if (!file) {
    console.error(`❌ Payload ${scenarioCode} não encontrado`);
    return { success: false, error: 'File not found' };
  }

  const filePath = path.join(payloadDir, file);
  const payload = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  console.log(`📄 Arquivo: ${file}`);
  console.log(`📋 Documento: ${payload.documents[0].documentType} ${payload.documents[0].documentNo}`);
  console.log(`🏢 Cliente: ${payload.documents[0].companyName}`);
  console.log(`💰 Total: ${payload.documents[0].documentTotals.grossTotal} AOA\n`);

  // Validação local
  console.log('🔍 Validando estrutura localmente...');
  const validation = validatePayload(payload);
  
  if (!validation.valid) {
    console.error('❌ ERROS DE VALIDAÇÃO:\n');
    validation.errors.forEach(err => console.error('  ' + err));
    return { success: false, error: 'Validation failed', details: validation.errors };
  }
  
  console.log('✅ Validação local: PASSOU\n');

  // Enviar para AGT
  console.log('📤 Enviando para AGT HML...');
  console.log(`   Endpoint: ${CONFIG.baseUrl}${CONFIG.endpoints.registar}\n`);

  try {
    const response = await makeRequest(CONFIG.endpoints.registar, 'POST', payload);

    console.log(`📥 Resposta HTTP: ${response.statusCode} ${response.statusMessage}`);
    console.log('');

    if (response.statusCode >= 200 && response.statusCode < 300) {
      console.log('✅ SUCESSO!\n');
      
      if (response.json) {
        console.log('📋 Resposta JSON:');
        console.log(JSON.stringify(response.json, null, 2));
        
        if (response.json.requestID) {
          console.log(`\n🆔 Request ID: ${response.json.requestID}`);
          console.log(`   Use para consultar estado: GET /obterEstado?requestID=${response.json.requestID}`);
        }
      } else {
        console.log('📋 Resposta (texto):');
        console.log(response.body);
      }

      return { success: true, response: response.json || response.body };

    } else {
      console.error('❌ ERRO NA RESPOSTA\n');
      console.error(`Status: ${response.statusCode} ${response.statusMessage}`);
      console.error('');

      if (response.json) {
        console.error('📋 Erro JSON:');
        console.error(JSON.stringify(response.json, null, 2));

        if (response.json.errorList) {
          console.error('\n🚨 LISTA DE ERROS:');
          response.json.errorList.forEach((err, idx) => {
            console.error(`\n${idx + 1}. Erro: ${err.idError || 'N/A'}`);
            console.error(`   Documento: ${err.documentNo || 'N/A'}`);
            console.error(`   Descrição: ${err.descriptionError || 'N/A'}`);
          });
        }
      } else {
        console.error('📋 Resposta (HTML/texto):');
        console.error(response.body.substring(0, 500));
      }

      return { success: false, error: response.body, statusCode: response.statusCode };
    }

  } catch (error) {
    console.error('❌ ERRO DE REDE:\n');
    console.error(`   ${error.message}`);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Servidor não acessível. Verifique:');
      console.error('   1. URL correta');
      console.error('   2. Conexão com internet');
      console.error('   3. Firewall/VPN');
    } else if (error.code === 'ETIMEDOUT' || error.message === 'Request timeout') {
      console.error('\n💡 Timeout. Possíveis causas:');
      console.error('   1. Servidor sobrecarregado');
      console.error('   2. Payload muito grande');
      console.error('   3. Processamento demorado');
    }

    return { success: false, error: error.message };
  }
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const scenario = args[0] || 'C1';

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║     TESTADOR HTTP - API AGT FACTURAÇÃO ELECTRÓNICA         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  if (scenario.toLowerCase() === 'all') {
    console.log('\n🔄 Testando TODOS os cenários...\n');
    
    const scenarios = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'];
    const results = [];

    for (const code of scenarios) {
      const result = await testPayload(code);
      results.push({ code, ...result });
      
      // Aguardar 2s entre requests
      if (scenarios.indexOf(code) < scenarios.length - 1) {
        console.log('\n⏳ Aguardando 2 segundos...\n');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Resumo
    console.log('\n' + '═'.repeat(70));
    console.log('📊 RESUMO DOS TESTES');
    console.log('═'.repeat(70) + '\n');

    results.forEach(r => {
      const icon = r.success ? '✅' : '❌';
      console.log(`${icon} ${r.code}: ${r.success ? 'SUCESSO' : 'FALHOU'}`);
      if (!r.success && r.error) {
        console.log(`   Erro: ${r.error.substring(0, 60)}...`);
      }
    });

  } else {
    await testPayload(scenario.toUpperCase());
  }

  console.log('\n' + '═'.repeat(70));
  console.log('✓ Teste concluído');
  console.log('═'.repeat(70) + '\n');
}

if (require.main === module) {
  main().catch(error => {
    console.error('\n💥 ERRO FATAL:', error);
    process.exit(1);
  });
}

module.exports = { testPayload, validatePayload };
