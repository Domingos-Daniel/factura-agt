/**
 * =============================================================================
 * TESTES COMPLETOS - TODOS OS 7 SERVIÇOS AGT + REPOSITÓRIO
 * =============================================================================
 * 
 * Script que testa:
 * 1. registarFactura
 * 2. obterEstado
 * 3. listarFacturas
 * 4. consultarFactura
 * 5. solicitarSerie
 * 6. listarSeries
 * 7. validarDocumento
 * + Repository (persistência e consultas)
 */

import { AGTMockService } from './agtMockService';
import { FacturaRepository } from './facturaRepository';
import { formatISO, addDays } from 'date-fns';

// =============================================================================
// CONFIGURAÇÃO E DADOS DE TESTE
// =============================================================================

const NIF = '123456789';
const CUSTOMER_NIF = '987654321';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`❌ FALHA: ${message}`);
    process.exitCode = 1;
    throw new Error(message);
  }
  console.log(`✓ ${message}`);
}

function assertEquals(actual: any, expected: any, message: string): void {
  if (actual !== expected) {
    console.error(
      `❌ FALHA: ${message}\n  Esperado: ${expected}\n  Obtido: ${actual}`,
    );
    process.exitCode = 1;
    throw new Error(message);
  }
  console.log(`✓ ${message}`);
}

// =============================================================================
// TESTES
// =============================================================================

async function runTests(): Promise<void> {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 INICIANDO TESTES DOS 7 SERVIÇOS AGT + REPOSITÓRIO');
  console.log('='.repeat(80) + '\n');

  // Limpar tudo no início
  FacturaRepository.clearAll();
  AGTMockService.clearStorage();

  // ===========================================================================
  // TESTE 1: REGISTAR FACTURA
  // ===========================================================================

  console.log('\n📝 TESTE 1: REGISTAR FACTURA');
  console.log('-'.repeat(80));

  const now = new Date();
  const registarFacturaRequest = {
    schemaVersion: '1.0',
    submissionGUID: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    taxRegistrationNumber: NIF,
    submissionTimeStamp: formatISO(now),
    softwareInfo: {
      productId: 'TEST_SOFT',
      productVersion: '1.0',
      softwareValidationNumber: 'VAL-TEST',
      jwsSoftwareSignature: 'X'.repeat(256),
    },
    numberOfEntries: 2,
    documents: [
      {
        documentNo: 'FT2025-001',
        documentStatus: 'N',
        documentDate: now.toISOString().split('T')[0],
        documentType: 'FT',
        eacCode: 'CAE001',
        systemEntryDate: now.toISOString(),
        customerCountry: 'AO',
        customerTaxID: CUSTOMER_NIF,
        companyName: 'Cliente Teste 1',
        documentTotals: {
          netTotal: 100,
          taxPayable: 20,
          grossTotal: 120,
        },
        lines: [
          {
            lineNo: 1,
            productDescription: 'Serviço A',
            quantity: 1,
            unitOfMeasure: 'UN',
            unitPrice: 100,
            taxPointDate: now.toISOString().split('T')[0],
            lineExtensionAmount: 100,
            tax: {
              taxType: 'VAT',
              taxCountryRegion: 'AO',
              taxCode: 'NOR',
              taxPercentage: 20,
              taxAmount: 20,
              taxExemptionReason: '',
              taxExemptionCode: '',
            },
          },
        ],
      },
      {
        documentNo: 'FT2025-002',
        documentStatus: 'N',
        documentDate: now.toISOString().split('T')[0],
        documentType: 'FT',
        eacCode: 'CAE001',
        systemEntryDate: now.toISOString(),
        customerCountry: 'AO',
        customerTaxID: CUSTOMER_NIF,
        companyName: 'Cliente Teste 2',
        documentTotals: {
          netTotal: 200,
          taxPayable: 40,
          grossTotal: 240,
        },
        lines: [
          {
            lineNo: 1,
            productDescription: 'Serviço B',
            quantity: 2,
            unitOfMeasure: 'UN',
            unitPrice: 100,
            taxPointDate: now.toISOString().split('T')[0],
            lineExtensionAmount: 200,
            tax: {
              taxType: 'VAT',
              taxCountryRegion: 'AO',
              taxCode: 'NOR',
              taxPercentage: 20,
              taxAmount: 40,
              taxExemptionReason: '',
              taxExemptionCode: '',
            },
          },
        ],
      },
    ],
  };

  const { response: registarResponse, httpStatus: registarStatus } =
    await AGTMockService.registarFactura(registarFacturaRequest);

  assertEquals(registarStatus, 200, 'Status HTTP 200 para registarFactura');
  assert(
    registarResponse.requestID,
    'registarFactura retorna requestID',
  );

  const requestID1 = (registarResponse as any).requestID;
  console.log(`  RequestID 1: ${requestID1}`);

  // Verificar se foi salvo no repositório
  await new Promise(resolve => setTimeout(resolve, 100));
  let facturas = FacturaRepository.listAllFacturas();
  assertEquals(
    facturas.length,
    1,
    'Uma factura salva no repositório após registarFactura',
  );
  assertEquals(
    facturas[0].requestID,
    requestID1,
    'RequestID correto no repositório',
  );

  // ===========================================================================
  // TESTE 2: REGISTAR SEGUNDA FACTURA (PARA TESTAR LISTAR)
  // ===========================================================================

  console.log('\n📝 TESTE 2: REGISTAR SEGUNDA FACTURA');
  console.log('-'.repeat(80));

  const registarFacturaRequest2 = {
    ...registarFacturaRequest,
    submissionGUID: 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff',
    numberOfEntries: 1,
    documents: [
      {
        documentNo: 'FT2025-003',
        documentStatus: 'N',
        documentDate: now.toISOString().split('T')[0],
        documentType: 'FT',
        eacCode: 'CAE001',
        systemEntryDate: now.toISOString(),
        customerCountry: 'AO',
        customerTaxID: CUSTOMER_NIF,
        companyName: 'Cliente Teste 3',
        documentTotals: {
          netTotal: 150,
          taxPayable: 30,
          grossTotal: 180,
        },
        lines: [
          {
            lineNo: 1,
            productDescription: 'Serviço C',
            quantity: 1,
            unitOfMeasure: 'UN',
            unitPrice: 150,
            taxPointDate: now.toISOString().split('T')[0],
            lineExtensionAmount: 150,
            tax: {
              taxType: 'VAT',
              taxCountryRegion: 'AO',
              taxCode: 'NOR',
              taxPercentage: 20,
              taxAmount: 30,
              taxExemptionReason: '',
              taxExemptionCode: '',
            },
          },
        ],
      },
    ],
  };

  const { response: registarResponse2, httpStatus: registarStatus2 } =
    await AGTMockService.registarFactura(registarFacturaRequest2);

  assertEquals(registarStatus2, 200, 'Status HTTP 200 para segunda registarFactura');
  const requestID2 = (registarResponse2 as any).requestID;
  console.log(`  RequestID 2: ${requestID2}`);

  // ===========================================================================
  // TESTE 3: OBTER ESTADO
  // ===========================================================================

  console.log('\n🔍 TESTE 3: OBTER ESTADO');
  console.log('-'.repeat(80));

  // Esperar um pouco para processamento simulado
  await new Promise(resolve => setTimeout(resolve, 2500));

  const obterEstadoRequest = {
    schemaVersion: '1.0',
    taxRegistrationNumber: NIF,
    submissionTimeStamp: formatISO(now),
    softwareInfo: {
      productId: 'TEST_SOFT',
      productVersion: '1.0',
      softwareValidationNumber: 'VAL-TEST',
      jwsSoftwareSignature: 'X'.repeat(256),
    },
    requestID: requestID1,
  };

  const { response: obterEstadoResponse, httpStatus: obterEstadoStatus } =
    await AGTMockService.obterEstado(obterEstadoRequest);

  assertEquals(
    obterEstadoStatus,
    200,
    'Status HTTP 200 para obterEstado',
  );
  assert(
    (obterEstadoResponse as any).statusResult?.resultCode !== undefined,
    'obterEstado retorna resultCode',
  );

  // Verificar se foi salvo no repositório
  let consultations = FacturaRepository.listAllConsultations();
  assert(
    consultations.length > 0,
    'Consulta de obterEstado salva no repositório',
  );

  // ===========================================================================
  // TESTE 4: LISTAR FACTURAS
  // ===========================================================================

  console.log('\n📋 TESTE 4: LISTAR FACTURAS');
  console.log('-'.repeat(80));

  const listarFacturasRequest = {
    schemaVersion: '1.0',
    taxRegistrationNumber: NIF,
    submissionTimeStamp: formatISO(now),
    softwareInfo: {
      productId: 'TEST_SOFT',
      productVersion: '1.0',
      softwareValidationNumber: 'VAL-TEST',
      jwsSoftwareSignature: 'X'.repeat(256),
    },
    periodStart: now.toISOString().split('T')[0],
    periodEnd: addDays(now, 10).toISOString().split('T')[0],
  };

  const { response: listarResponse, httpStatus: listarStatus } =
    await AGTMockService.listarFacturas(listarFacturasRequest);

  assertEquals(
    listarStatus,
    200,
    'Status HTTP 200 para listarFacturas',
  );
  assert(
    (listarResponse as any).documentResultCount === 3,
    'listarFacturas retorna 3 documentos',
  );

  // ===========================================================================
  // TESTE 5: CONSULTAR FACTURA
  // ===========================================================================

  console.log('\n🔎 TESTE 5: CONSULTAR FACTURA');
  console.log('-'.repeat(80));

  const consultarFacturaRequest = {
    schemaVersion: '1.0',
    taxRegistrationNumber: NIF,
    submissionTimeStamp: formatISO(now),
    softwareInfo: {
      productId: 'TEST_SOFT',
      productVersion: '1.0',
      softwareValidationNumber: 'VAL-TEST',
      jwsSoftwareSignature: 'X'.repeat(256),
    },
    documentNo: 'FT2025-001',
  };

  const { response: consultarResponse, httpStatus: consultarStatus } =
    await AGTMockService.consultarFactura(consultarFacturaRequest);

  assertEquals(
    consultarStatus,
    200,
    'Status HTTP 200 para consultarFactura',
  );
  assert(
    (consultarResponse as any).documentNo === 'FT2025-001',
    'consultarFactura retorna documento correto',
  );

  // ===========================================================================
  // TESTE 6: SOLICITAR SÉRIE
  // ===========================================================================

  console.log('\n✨ TESTE 6: SOLICITAR SÉRIE');
  console.log('-'.repeat(80));

  const solicitarSerieRequest = {
    schemaVersion: '1.0',
    taxRegistrationNumber: NIF,
    submissionTimeStamp: formatISO(now),
    softwareInfo: {
      productId: 'TEST_SOFT',
      productVersion: '1.0',
      softwareValidationNumber: 'VAL-TEST',
      jwsSoftwareSignature: 'X'.repeat(256),
    },
    seriesCode: 'SERIE001',
    seriesYear: now.getFullYear(),
    documentType: 'FT',
    firstDocumentNumber: 1,
  };

  const { response: solicitarResponse, httpStatus: solicitarStatus } =
    await AGTMockService.solicitarSerie(solicitarSerieRequest);

  assertEquals(
    solicitarStatus,
    200,
    'Status HTTP 200 para solicitarSerie',
  );
  assertEquals(
    (solicitarResponse as any).resultCode,
    1,
    'solicitarSerie retorna resultCode 1',
  );

  // Verificar se foi salva no repositório
  let series = FacturaRepository.listAllSeries();
  assertEquals(
    series.length,
    1,
    'Uma série salva no repositório após solicitarSerie',
  );

  // ===========================================================================
  // TESTE 7: LISTAR SÉRIES
  // ===========================================================================

  console.log('\n📚 TESTE 7: LISTAR SÉRIES');
  console.log('-'.repeat(80));

  const listarSeriesRequest = {
    schemaVersion: '1.0',
    taxRegistrationNumber: NIF,
    submissionTimeStamp: formatISO(now),
    softwareInfo: {
      productId: 'TEST_SOFT',
      productVersion: '1.0',
      softwareValidationNumber: 'VAL-TEST',
      jwsSoftwareSignature: 'X'.repeat(256),
    },
  };

  const { response: listarSeriesResponse, httpStatus: listarSeriesStatus } =
    await AGTMockService.listarSeries(listarSeriesRequest);

  assertEquals(
    listarSeriesStatus,
    200,
    'Status HTTP 200 para listarSeries',
  );
  assert(
    (listarSeriesResponse as any).seriesResultCount >= 1,
    'listarSeries retorna pelo menos 1 série',
  );

  // ===========================================================================
  // TESTE 8: VALIDAR DOCUMENTO
  // ===========================================================================

  console.log('\n✅ TESTE 8: VALIDAR DOCUMENTO');
  console.log('-'.repeat(80));

  const validarDocumentoRequest = {
    schemaVersion: '1.0',
    taxRegistrationNumber: CUSTOMER_NIF, // Adquirente confirmando a factura
    submissionTimeStamp: formatISO(now),
    softwareInfo: {
      productId: 'TEST_SOFT',
      productVersion: '1.0',
      softwareValidationNumber: 'VAL-TEST',
      jwsSoftwareSignature: 'X'.repeat(256),
    },
    documentNo: 'FT2025-001',
    action: 'C', // Confirmar
  };

  const { response: validarResponse, httpStatus: validarStatus } =
    await AGTMockService.validarDocumento(validarDocumentoRequest);

  assertEquals(
    validarStatus,
    200,
    'Status HTTP 200 para validarDocumento',
  );
  assert(
    (validarResponse as any).actionResultCode?.includes('OK'),
    'validarDocumento retorna actionResultCode com OK',
  );

  // Verificar se foi salva no repositório
  let validations = FacturaRepository.listAllValidations();
  assertEquals(
    validations.length,
    1,
    'Uma validação salva no repositório após validarDocumento',
  );

  // ===========================================================================
  // TESTES DO REPOSITÓRIO
  // ===========================================================================

  console.log('\n🗄️  TESTES DO REPOSITÓRIO');
  console.log('-'.repeat(80));

  // Verificar estatísticas
  const stats = FacturaRepository.getStatistics();
  console.log(`\n  📊 Estatísticas:
    - Total de Facturas: ${stats.totalFacturas}
    - Total de Séries: ${stats.totalSeries}
    - Total de Validações: ${stats.totalValidations}
    - Total de Consultas: ${stats.totalConsultations}
    - Por Status: ${JSON.stringify(stats.byStatus)}
    - Por Serviço: ${JSON.stringify(stats.byService)}
  `);

  assertEquals(stats.totalFacturas, 2, '2 facturas registadas');
  assertEquals(stats.totalSeries, 1, '1 série criada');
  assertEquals(stats.totalValidations, 1, '1 validação realizada');
  assert(stats.totalConsultations > 0, 'Pelo menos 1 consulta realizada');

  // Testar filtros
  const facturasRegistadas = FacturaRepository.getFacturasByStatus('registered');
  assertEquals(
    facturasRegistadas.length,
    2,
    'Filtro por status registadas retorna 2',
  );

  const facturasNIF = FacturaRepository.getFacturasByNif(NIF);
  assertEquals(facturasNIF.length, 2, 'Filtro por NIF retorna 2 facturas');

  const facturasService = FacturaRepository.getFacturasByService('mock');
  assertEquals(
    facturasService.length,
    2,
    'Filtro por serviço mock retorna 2 facturas',
  );

  // Teste de intervalo de datas
  const startDate = addDays(now, -1);
  const endDate = addDays(now, 1);
  const facturasData = FacturaRepository.getFacturasByDateRange(startDate, endDate);
  assertEquals(
    facturasData.length,
    2,
    'Filtro por data retorna 2 facturas no intervalo',
  );

  // Testar busca específica
  const factura = FacturaRepository.getFacturaById(facturas[0].id);
  assert(factura !== null, 'Busca por ID retorna factura');

  // Exportar todos os dados
  const allData = FacturaRepository.exportAll();
  assertEquals(
    allData.facturas.length,
    2,
    'Exportação contém 2 facturas',
  );
  assertEquals(allData.series.length, 1, 'Exportação contém 1 série');

  // Verificar arquivo JSON foi criado
  const storagePath = FacturaRepository.getStoragePath();
  console.log(`\n  💾 Arquivo de armazenamento criado em: ${storagePath}`);

  // ===========================================================================
  // RESUMO FINAL
  // ===========================================================================

  console.log('\n' + '='.repeat(80));
  console.log('✅ TODOS OS TESTES PASSARAM COM SUCESSO!');
  console.log('='.repeat(80));

  console.log('\n📊 RESUMO:');
  console.log(`  ✓ 7 Serviços AGT testados com sucesso`);
  console.log(`  ✓ ${stats.totalFacturas} Facturas registadas e persistidas`);
  console.log(`  ✓ ${stats.totalSeries} Série criada e persistida`);
  console.log(`  ✓ ${stats.totalValidations} Validação realizada e persistida`);
  console.log(`  ✓ ${stats.totalConsultations} Consultas realizadas e persistidas`);
  console.log(`  ✓ Arquivo JSON em: ${storagePath}`);
  console.log(`  ✓ Repositório funcional com filtros e busca\n`);
}

// Executar testes
runTests().catch(error => {
  console.error('\n❌ ERRO NOS TESTES:', error);
  process.exitCode = 1;
});
