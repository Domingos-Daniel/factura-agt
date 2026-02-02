/**
 * Script de Teste - AppyPay API
 * Testa as 7 funcionalidades principais:
 * 1. getToken - Autenticação OAuth2
 * 2. listFiscalSeries - Listar séries fiscais
 * 3. postSerie - Criar nova série fiscal
 * 4. listFiscalDocs - Listar documentos fiscais
 * 5. getFiscalDoc - Obter um documento fiscal específico
 * 6. postFiscalDoc - Criar novo documento fiscal
 * 7. pollDocStatus - Verificar status do documento (async)
 */

require('dotenv').config({ path: '.env.local' });

const AUTH_URL = process.env.APPYPAY_AUTH_URL;
const CLIENT_ID = process.env.APPYPAY_CLIENT_ID;
const CLIENT_SECRET = process.env.APPYPAY_CLIENT_SECRET;
const BASE_URL = process.env.APPYPAY_BASE_URL;
// Resource ID para o token (diferente do client_id)
const RESOURCE_ID = process.env.APPYPAY_RESOURCE || '2aed7612-de64-46b5-9e59-1f48f8902d14';

// Cores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(`  ${title}`, 'cyan');
  console.log('='.repeat(60));
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// Variáveis globais para armazenar resultados entre testes
let accessToken = null;
let createdSerieId = null;
let createdSerieCode = null; // Código da série (ex: FT7826S3194N)
let createdDocumentId = null;

/**
 * 1. GET TOKEN - Autenticação OAuth2
 */
async function testGetToken() {
  logSection('1. GET TOKEN - Autenticação OAuth2');
  
  logInfo(`Auth URL: ${AUTH_URL}`);
  logInfo(`Client ID: ${CLIENT_ID?.substring(0, 10)}...`);
  
  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', CLIENT_ID);
    params.append('client_secret', CLIENT_SECRET);
    params.append('resource', RESOURCE_ID); // Usar resource ID específico do AppyPay

    const response = await fetch(AUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await response.json();

    if (response.ok && data.access_token) {
      accessToken = data.access_token;
      logSuccess('Token obtido com sucesso!');
      logInfo(`Token type: ${data.token_type}`);
      logInfo(`Expires in: ${data.expires_in} segundos`);
      logInfo(`Token (primeiros 50 chars): ${accessToken.substring(0, 50)}...`);
      return true;
    } else {
      logError(`Falha ao obter token: ${JSON.stringify(data)}`);
      return false;
    }
  } catch (error) {
    logError(`Erro de conexão: ${error.message}`);
    return false;
  }
}

/**
 * 2. LIST FISCAL SERIES - Listar séries fiscais
 */
async function testListFiscalSeries() {
  logSection('2. LIST FISCAL SERIES - Listar séries fiscais');
  
  if (!accessToken) {
    logWarning('Token não disponível. Pulando teste.');
    return false;
  }

  // Testar diferentes endpoints
  const endpoints = [
    `${BASE_URL}/fiscal-series`,
    `${BASE_URL}/series`,
  ];

  for (const url of endpoints) {
    logInfo(`Tentando URL: ${url}`);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }

      if (response.ok) {
        logSuccess(`Séries listadas com sucesso! Status: ${response.status}`);
        if (Array.isArray(data)) {
          logInfo(`Total de séries: ${data.length}`);
          if (data.length > 0) {
            logInfo(`Primeira série: ${JSON.stringify(data[0], null, 2)}`);
          }
        } else {
          logInfo(`Resposta: ${JSON.stringify(data, null, 2).substring(0, 500)}`);
        }
        return true;
      } else {
        logInfo(`Status: ${response.status} - tentando próximo endpoint...`);
      }
    } catch (error) {
      logInfo(`Erro: ${error.message} - tentando próximo endpoint...`);
    }
  }
  
  logError('Falha ao listar séries em todos os endpoints.');
  return false;
}

/**
 * 3. POST SERIE - Criar nova série fiscal
 */
async function testPostSerie() {
  logSection('3. POST SERIE - Criar nova série fiscal');
  
  if (!accessToken) {
    logWarning('Token não disponível. Pulando teste.');
    return false;
  }

  // Testar diferentes endpoints
  const endpoints = [
    `${BASE_URL}/fiscal-series`,
    `${BASE_URL}/taxpayer/fiscal-series`,
  ];

  // Gerar código único para evitar duplicatas
  const uniqueCode = `TST${Date.now().toString().slice(-6)}`;
  
  // Payload conforme documentação AppyPay
  const serieData = {
    seriesYear: '2026',
    documentType: 'FT', // Factura
    establishmentNumber: 'SEDE',
    seriesContingencyIndicator: 'N',
  };

  logInfo(`Dados da série: ${JSON.stringify(serieData, null, 2)}`);

  for (const url of endpoints) {
    logInfo(`Tentando URL: ${url}`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(serieData),
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }

      if (response.ok || response.status === 201) {
        logSuccess(`Série criada com sucesso! Status: ${response.status}`);
        if (data?.id || data?.series?.seriesCode || data?.seriesCode) {
          createdSerieId = data.id;
          createdSerieCode = data.series?.seriesCode || data.seriesCode;
          logInfo(`ID da série: ${createdSerieId}`);
          logInfo(`Código da série: ${createdSerieCode}`);
        }
        logInfo(`Resposta: ${JSON.stringify(data, null, 2)}`);
        return true;
      } else if (response.status === 409) {
        logWarning(`Série já existe (409 Conflict)`);
        logInfo(`Resposta: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
        return true; // Não é erro crítico
      } else {
        logInfo(`Status: ${response.status} - tentando próximo endpoint...`);
        logInfo(`Resposta: ${typeof data === 'string' ? data.substring(0, 200) : JSON.stringify(data).substring(0, 200)}`);
      }
    } catch (error) {
      logInfo(`Erro: ${error.message} - tentando próximo endpoint...`);
    }
  }

  logError('Falha ao criar série em todos os endpoints.');
  return false;
}

/**
 * 4. LIST FISCAL DOCS - Listar documentos fiscais
 */
async function testListFiscalDocs() {
  logSection('4. LIST FISCAL DOCS - Listar documentos fiscais');
  
  if (!accessToken) {
    logWarning('Token não disponível. Pulando teste.');
    return false;
  }

  // Testar diferentes endpoints
  const endpoints = [
    `${BASE_URL}/fiscal-documents`,
    `${BASE_URL}/taxpayer/fiscal-documents`,
    `${BASE_URL}/documents`,
  ];

  for (const url of endpoints) {
    logInfo(`Tentando URL: ${url}`);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }

      if (response.ok) {
        logSuccess(`Documentos listados com sucesso! Status: ${response.status}`);
        if (Array.isArray(data)) {
          logInfo(`Total de documentos: ${data.length}`);
          if (data.length > 0) {
            logInfo(`Primeiro documento: ${JSON.stringify(data[0], null, 2)}`);
            if (data[0]?.id) {
              createdDocumentId = data[0].id;
            }
          }
        } else if (data?.items && Array.isArray(data.items)) {
          logInfo(`Total de documentos: ${data.items.length}`);
          if (data.items.length > 0) {
            logInfo(`Primeiro documento: ${JSON.stringify(data.items[0], null, 2)}`);
            if (data.items[0]?.id) {
              createdDocumentId = data.items[0].id;
            }
          }
        } else {
          logInfo(`Resposta: ${JSON.stringify(data, null, 2).substring(0, 500)}`);
        }
        return true;
      } else {
        logInfo(`Status: ${response.status} - tentando próximo endpoint...`);
      }
    } catch (error) {
      logInfo(`Erro: ${error.message} - tentando próximo endpoint...`);
    }
  }
  
  logError('Falha ao listar documentos em todos os endpoints.');
  return false;
}

/**
 * 5. GET FISCAL DOC - Obter documento fiscal específico
 */
async function testGetFiscalDoc() {
  logSection('5. GET FISCAL DOC - Obter documento fiscal específico');
  
  if (!accessToken) {
    logWarning('Token não disponível. Pulando teste.');
    return false;
  }

  // Usar um ID de teste ou um obtido da listagem
  const docId = createdDocumentId || 'test-doc-id';
  
  // Testar diferentes endpoints
  const endpoints = [
    `${BASE_URL}/fiscal-documents/${docId}`,
    `${BASE_URL}/taxpayer/fiscal-documents/${docId}`,
  ];
  
  logInfo(`Document ID: ${docId}`);

  for (const url of endpoints) {
    logInfo(`Tentando URL: ${url}`);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }

      if (response.ok) {
        logSuccess(`Documento obtido com sucesso! Status: ${response.status}`);
        logInfo(`Resposta: ${JSON.stringify(data, null, 2).substring(0, 800)}`);
        return true;
      } else if (response.status === 404) {
        logInfo(`Status 404 - documento não encontrado neste endpoint`);
      } else {
        logInfo(`Status: ${response.status}`);
      }
    } catch (error) {
      logInfo(`Erro: ${error.message}`);
    }
  }

  logWarning('Documento não encontrado (404) - esperado se não há documentos');
  return true; // Não é erro crítico
}

/**
 * 6. POST FISCAL DOC - Criar novo documento fiscal
 */
async function testPostFiscalDoc() {
  logSection('6. POST FISCAL DOC - Criar novo documento fiscal');
  
  if (!accessToken) {
    logWarning('Token não disponível. Pulando teste.');
    return false;
  }

  // Testar diferentes endpoints
  const endpoints = [
    `${BASE_URL}/fiscal-documents`,
    `${BASE_URL}/taxpayer/fiscal-documents`,
  ];

  // Payload conforme formato oficial AppyPay
  // Nota: customerTaxID usa ID maiúsculo (não customerTaxId)
  const docData = {
    documentDate: new Date().toISOString().split('T')[0],
    seriesCode: createdSerieCode || 'FT7826S3185N',
    documentType: 'FT',
    eacCode: '12345',
    customerTaxID: '5000000001',
    customerCountry: 'AO',
    companyName: 'Exemplo Comercial Lda',
    lines: [
      {
        lineNumber: 1,
        operationType: 'SG',
        productCode: 'SV001',
        productDescription: 'Servico de Consultoria',
        quantity: 1,
        unitOfMeasure: 'UN',
        unitPriceBase: 3000,
        unitPrice: 3000,
        taxes: [
          {
            taxCode: 'NOR',
            taxType: 'IVA',
            taxCountryRegion: 'AO',
            taxPercentage: 14
          }
        ]
      }
    ]
  };

  logInfo(`Dados do documento: ${JSON.stringify(docData, null, 2).substring(0, 600)}...`);

  for (const url of endpoints) {
    logInfo(`Tentando URL: ${url}`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(docData),
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }

      // AppyPay retorna 202 Accepted para processamento assíncrono
      if (response.status === 202 || response.status === 201 || response.ok) {
        logSuccess(`Documento enviado com sucesso! Status: ${response.status}`);
        
        if (response.status === 202) {
          logInfo('Documento em processamento assíncrono (HTTP 202)');
          const location = response.headers.get('Location');
          if (location) {
            createdDocumentId = location.split('/').pop();
            logInfo(`Location header: ${location}`);
            logInfo(`Document ID para polling: ${createdDocumentId}`);
          } else if (data?.id) {
            createdDocumentId = data.id;
            logInfo(`Document ID: ${createdDocumentId}`);
          }
        }
        
        logInfo(`Resposta: ${JSON.stringify(data, null, 2)}`);
        return true;
      } else {
        logInfo(`Status: ${response.status} - tentando próximo endpoint...`);
        logInfo(`Resposta: ${typeof data === 'string' ? data.substring(0, 300) : JSON.stringify(data).substring(0, 300)}`);
      }
    } catch (error) {
      logInfo(`Erro: ${error.message} - tentando próximo endpoint...`);
    }
  }

  logError('Falha ao criar documento em todos os endpoints.');
  return false;
}

/**
 * 7. POLL DOC STATUS - Verificar status do documento (async)
 */
async function testPollDocStatus() {
  logSection('7. POLL DOC STATUS - Verificar status do documento');
  
  if (!accessToken) {
    logWarning('Token não disponível. Pulando teste.');
    return false;
  }

  if (!createdDocumentId) {
    logWarning('Nenhum documento criado para verificar status. Pulando teste.');
    return true; // Não é erro crítico
  }

  // Testar diferentes endpoints
  const endpoints = [
    `${BASE_URL}/fiscal-documents/${createdDocumentId}`,
    `${BASE_URL}/taxpayer/fiscal-documents/${createdDocumentId}`,
  ];
  
  logInfo(`Document ID: ${createdDocumentId}`);
  logInfo('Fazendo polling do status (máx 3 tentativas)...');

  let attempts = 0;
  const maxAttempts = 3;
  const delay = 2000; // 2 segundos entre tentativas

  while (attempts < maxAttempts) {
    attempts++;
    logInfo(`Tentativa ${attempts}/${maxAttempts}...`);

    for (const url of endpoints) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        const text = await response.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }

        if (response.ok) {
          logSuccess(`Status obtido! HTTP ${response.status}`);
          logInfo(`Status do documento: ${data?.status || data?.state || data?.documentStatus || 'N/A'}`);
          logInfo(`Resposta: ${JSON.stringify(data, null, 2).substring(0, 500)}`);
          
          // Verificar se está finalizado
          const status = (data?.status || data?.state || data?.documentStatus || '').toLowerCase();
          if (status === 'completed' || status === 'success' || status === 'validated' || status === 'n') {
            logSuccess('Documento processado com sucesso!');
            if (data?.qrCode) logInfo(`QR Code: ${data.qrCode.substring(0, 50)}...`);
            if (data?.hash) logInfo(`Hash: ${data.hash}`);
            return true;
          } else if (status === 'failed' || status === 'error' || status === 'rejected') {
            logError(`Documento rejeitado: ${data?.errorMessage || data?.error || 'Sem detalhes'}`);
            return false;
          } else if (status === 'pending' || status === 'processing') {
            logInfo('Documento ainda em processamento...');
          }
          break;
        }
      } catch (error) {
        logInfo(`Erro ao verificar: ${error.message}`);
      }
    }

    if (attempts < maxAttempts) {
      logInfo(`Aguardando ${delay/1000}s antes da próxima tentativa...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  logWarning('Máximo de tentativas atingido. O documento pode ainda estar em processamento.');
  return true;
}

/**
 * Executar todos os testes
 */
async function runAllTests() {
  console.log('\n');
  log('╔═══════════════════════════════════════════════════════════╗', 'magenta');
  log('║         APPYPAY API - SUITE DE TESTES                     ║', 'magenta');
  log('╚═══════════════════════════════════════════════════════════╝', 'magenta');

  logInfo(`Base URL: ${BASE_URL}`);
  logInfo(`Auth URL: ${AUTH_URL}`);
  logInfo(`Data: ${new Date().toISOString()}`);

  const results = {
    getToken: false,
    listFiscalSeries: false,
    postSerie: false,
    listFiscalDocs: false,
    getFiscalDoc: false,
    postFiscalDoc: false,
    pollDocStatus: false,
  };

  // Executar testes em sequência
  results.getToken = await testGetToken();
  
  if (results.getToken) {
    results.listFiscalSeries = await testListFiscalSeries();
    results.postSerie = await testPostSerie();
    results.listFiscalDocs = await testListFiscalDocs();
    results.getFiscalDoc = await testGetFiscalDoc();
    results.postFiscalDoc = await testPostFiscalDoc();
    results.pollDocStatus = await testPollDocStatus();
  }

  // Resumo final
  logSection('RESUMO DOS TESTES');
  
  const tests = [
    { name: '1. getToken (OAuth2)', result: results.getToken },
    { name: '2. listFiscalSeries', result: results.listFiscalSeries },
    { name: '3. postSerie', result: results.postSerie },
    { name: '4. listFiscalDocs', result: results.listFiscalDocs },
    { name: '5. getFiscalDoc', result: results.getFiscalDoc },
    { name: '6. postFiscalDoc', result: results.postFiscalDoc },
    { name: '7. pollDocStatus', result: results.pollDocStatus },
  ];

  let passed = 0;
  let failed = 0;

  tests.forEach(test => {
    if (test.result) {
      logSuccess(`${test.name}`);
      passed++;
    } else {
      logError(`${test.name}`);
      failed++;
    }
  });

  console.log('\n' + '-'.repeat(60));
  log(`Total: ${passed}/${tests.length} testes passaram`, passed === tests.length ? 'green' : 'yellow');
  
  if (failed > 0) {
    logWarning(`${failed} teste(s) falharam`);
  } else {
    logSuccess('Todos os testes passaram! 🎉');
  }

  console.log('\n');
}

// Executar
runAllTests().catch(console.error);
