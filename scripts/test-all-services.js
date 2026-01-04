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

(async () => {
  const { AGTMockService } = require('../lib/server/agtMockService');
  const { FacturaRepository } = require('../lib/server/facturaRepository');
  const { formatISO, addDays } = require('date-fns');

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  function assert(condition, message) {
    if (!condition) {
      console.error(`❌ FALHA: ${message}`);
      process.exitCode = 1;
      throw new Error(message);
    }
    console.log(`  ✓ ${message}`);
  }

  function assertEquals(actual, expected, message) {
    if (actual !== expected) {
      console.error(
        `❌ FALHA: ${message}\n    Esperado: ${expected}\n    Obtido: ${actual}`,
      );
      process.exitCode = 1;
      throw new Error(message);
    }
    console.log(`  ✓ ${message}`);
  }

  // ==========================================================================
  // DADOS DE TESTE
  // ==========================================================================

  const NIF = '123456789';
  const CUSTOMER_NIF = '987654321';
  const now = new Date();

  function createFacturaRequest(documentNo, quantity, price) {
    return {
      schemaVersion: '1.0',
      submissionGUID: `${documentNo}-${Date.now()}`,
      taxRegistrationNumber: NIF,
      submissionTimeStamp: formatISO(now),
      softwareInfo: {
        softwareInfoDetail: {
          productId: 'TEST_SOFT',
          productVersion: '1.0',
          softwareValidationNumber: 'VAL-TEST',
        },
        jwsSoftwareSignature: 'X'.repeat(256),
      },
      numberOfEntries: 1,
      documents: [
        {
          documentNo: documentNo,
          documentStatus: 'N',
          documentDate: now.toISOString().split('T')[0],
          documentType: 'FT',
          eacCode: 'CAE001',
          systemEntryDate: now.toISOString(),
          customerCountry: 'AO',
          customerTaxID: CUSTOMER_NIF,
          companyName: `Cliente ${documentNo}`,
          documentTotals: {
            netTotal: price,
            taxPayable: price * 0.15,
            grossTotal: price * 1.15,
          },
          lines: [
            {
              lineNo: 1,
              productDescription: `Serviço ${documentNo}`,
              quantity: quantity,
              unitOfMeasure: 'UN',
              unitPrice: price / quantity,
              taxPointDate: now.toISOString().split('T')[0],
              lineExtensionAmount: price,
              tax: {
                taxType: 'VAT',
                taxCountryRegion: 'AO',
                taxCode: 'NOR',
                taxPercentage: 15,
                taxAmount: price * 0.15,
                taxExemptionReason: '',
                taxExemptionCode: '',
              },
            },
          ],
          jwsDocumentSignature: 'Y'.repeat(256),
        },
      ],
    };
  }

  // ==========================================================================
  // TESTES
  // ==========================================================================

  try {
    console.log('\n' + '='.repeat(80));
    console.log('🚀 INICIANDO TESTES DOS 7 SERVIÇOS AGT + REPOSITÓRIO');
    console.log('='.repeat(80) + '\n');

    // Limpar tudo no início
    console.log('🧹 Limpando armazenamento...');
    FacturaRepository.clearAll();
    AGTMockService.clearStorage();
    console.log('  ✓ Armazenamento limpo\n');

    // =========================================================================
    // TESTE 1: REGISTAR FACTURA (1ª)
    // =========================================================================

    console.log('📝 TESTE 1: REGISTAR FACTURA (1ª)');
    console.log('-'.repeat(80));

    const req1 = createFacturaRequest('FT2025-001', 1, 100);
    const { response: res1, httpStatus: status1 } =
      await AGTMockService.registarFactura(req1);

    assertEquals(status1, 200, 'Status HTTP 200');
    assert(res1.requestID, 'RequestID retornado');

    const requestID1 = res1.requestID;
    console.log(`  RequestID 1: ${requestID1}\n`);

    // =========================================================================
    // TESTE 2: REGISTAR FACTURA (2ª)
    // =========================================================================

    console.log('📝 TESTE 2: REGISTAR FACTURA (2ª)');
    console.log('-'.repeat(80));

    const req2 = createFacturaRequest('FT2025-002', 2, 200);
    const { response: res2, httpStatus: status2 } =
      await AGTMockService.registarFactura(req2);

    assertEquals(status2, 200, 'Status HTTP 200');
    assert(res2.requestID, 'RequestID retornado');

    const requestID2 = res2.requestID;
    console.log(`  RequestID 2: ${requestID2}\n`);

    // =========================================================================
    // TESTE 3: REGISTAR FACTURA (3ª)
    // =========================================================================

    console.log('📝 TESTE 3: REGISTAR FACTURA (3ª)');
    console.log('-'.repeat(80));

    const req3 = createFacturaRequest('FT2025-003', 1, 150);
    const { response: res3, httpStatus: status3 } =
      await AGTMockService.registarFactura(req3);

    assertEquals(status3, 200, 'Status HTTP 200');
    assert(res3.requestID, 'RequestID retornado');

    const requestID3 = res3.requestID;
    console.log(`  RequestID 3: ${requestID3}\n`);

    // Verificar repositório
    const facturas = FacturaRepository.listAllFacturas();
    assertEquals(facturas.length, 3, '3 facturas no repositório');
    console.log();

    // =========================================================================
    // TESTE 4: OBTER ESTADO
    // =========================================================================

    console.log('🔍 TESTE 4: OBTER ESTADO');
    console.log('-'.repeat(80));

    // Esperar processamento simulado
    console.log('  ⏳ Aguardando 2.5s para processamento...');
    await new Promise(r => setTimeout(r, 2500));

    const obterReq = {
      schemaVersion: '1.0',
      taxRegistrationNumber: NIF,
      submissionTimeStamp: formatISO(now),
      softwareInfo: {
        softwareInfoDetail: {
          productId: 'TEST_SOFT',
          productVersion: '1.0',
          softwareValidationNumber: 'VAL-TEST',
        },
        jwsSoftwareSignature: 'X'.repeat(256),
      },
      requestID: requestID1,
      submissionId: 'test-id',
      jwsSignature: 'sig',
    };

    const { response: obterRes, httpStatus: obterStatus } =
      await AGTMockService.obterEstado(obterReq);

    assertEquals(obterStatus, 200, 'Status HTTP 200');
    assert(
      obterRes.statusResult?.resultCode !== undefined,
      'resultCode retornado',
    );

    // Verificar se foi salvo no repositório
    const consultations1 = FacturaRepository.listAllConsultations();
    assert(consultations1.length > 0, 'Consulta salva no repositório');
    console.log();

    // =========================================================================
    // TESTE 5: LISTAR FACTURAS
    // =========================================================================

    console.log('📋 TESTE 5: LISTAR FACTURAS');
    console.log('-'.repeat(80));

    const listarReq = {
      schemaVersion: '1.0',
      taxRegistrationNumber: NIF,
      submissionTimeStamp: formatISO(now),
      softwareInfo: {
        softwareInfoDetail: {
          productId: 'TEST_SOFT',
          productVersion: '1.0',
          softwareValidationNumber: 'VAL-TEST',
        },
        jwsSoftwareSignature: 'X'.repeat(256),
      },
      periodStart: now.toISOString().split('T')[0],
      periodEnd: addDays(now, 10).toISOString().split('T')[0],
      queryStartDate: now.toISOString().split('T')[0],
      queryEndDate: addDays(now, 10).toISOString().split('T')[0],
      submissionId: 'test-id',
      jwsSignature: 'sig',
    };

    const { response: listarRes, httpStatus: listarStatus } =
      await AGTMockService.listarFacturas(listarReq);

    assertEquals(listarStatus, 200, 'Status HTTP 200');
    assertEquals(
      listarRes.documentResultCount,
      3,
      '3 documentos retornados',
    );

    // Verificar repositório
    const consultations2 = FacturaRepository.listAllConsultations();
    assert(consultations2.length > 1, 'Consulta adicional salva');
    console.log();

    // =========================================================================
    // TESTE 6: CONSULTAR FACTURA
    // =========================================================================

    console.log('🔎 TESTE 6: CONSULTAR FACTURA');
    console.log('-'.repeat(80));

    const consultarReq = {
      schemaVersion: '1.0',
      taxRegistrationNumber: NIF,
      submissionTimeStamp: formatISO(now),
      softwareInfo: {
        softwareInfoDetail: {
          productId: 'TEST_SOFT',
          productVersion: '1.0',
          softwareValidationNumber: 'VAL-TEST',
        },
        jwsSoftwareSignature: 'X'.repeat(256),
      },
      documentNo: 'FT2025-001',
      submissionId: 'test-id',
      jwsSignature: 'sig',
    };

    const { response: consultarRes, httpStatus: consultarStatus } =
      await AGTMockService.consultarFactura(consultarReq);

    assertEquals(consultarStatus, 200, 'Status HTTP 200');
    assertEquals(
      consultarRes.documentNo,
      'FT2025-001',
      'Documento correto retornado',
    );

    // Verificar repositório
    const consultations3 = FacturaRepository.listAllConsultations();
    assert(consultations3.length > 2, 'Consulta adicional salva');
    console.log();

    // =========================================================================
    // TESTE 7: SOLICITAR SÉRIE
    // =========================================================================

    console.log('✨ TESTE 7: SOLICITAR SÉRIE');
    console.log('-'.repeat(80));

    const serieReq = {
      schemaVersion: '1.0',
      taxRegistrationNumber: NIF,
      submissionTimeStamp: formatISO(now),
      softwareInfo: {
        softwareInfoDetail: {
          productId: 'TEST_SOFT',
          productVersion: '1.0',
          softwareValidationNumber: 'VAL-TEST',
        },
        jwsSoftwareSignature: 'X'.repeat(256),
      },
      seriesCode: 'SERIE001',
      seriesYear: now.getFullYear(),
      documentType: 'FT',
      firstDocumentNumber: 1,
      submissionId: 'test-id',
      jwsSignature: 'sig',
    };

    const { response: serieRes, httpStatus: serieStatus } =
      await AGTMockService.solicitarSerie(serieReq);

    assertEquals(serieStatus, 200, 'Status HTTP 200');
    assertEquals(serieRes.resultCode, 1, 'resultCode 1 retornado');

    // Verificar repositório
    const series = FacturaRepository.listAllSeries();
    assertEquals(series.length, 1, '1 série salva no repositório');
    console.log();

    // =========================================================================
    // TESTE 8: LISTAR SÉRIES
    // =========================================================================

    console.log('📚 TESTE 8: LISTAR SÉRIES');
    console.log('-'.repeat(80));

    const listarSeriesReq = {
      schemaVersion: '1.0',
      taxRegistrationNumber: NIF,
      submissionTimeStamp: formatISO(now),
      softwareInfo: {
        softwareInfoDetail: {
          productId: 'TEST_SOFT',
          productVersion: '1.0',
          softwareValidationNumber: 'VAL-TEST',
        },
        jwsSoftwareSignature: 'X'.repeat(256),
      },
      submissionId: 'test-id',
      jwsSignature: 'sig',
    };

    const { response: listarSeriesRes, httpStatus: listarSeriesStatus } =
      await AGTMockService.listarSeries(listarSeriesReq);

    assertEquals(listarSeriesStatus, 200, 'Status HTTP 200');
    assert(
      listarSeriesRes.seriesResultCount >= 1,
      'Pelo menos 1 série retornada',
    );

    // Verificar repositório
    const consultations4 = FacturaRepository.listAllConsultations();
    assert(consultations4.length > 3, 'Consulta adicional salva');
    console.log();

    // =========================================================================
    // TESTE 9: VALIDAR DOCUMENTO
    // =========================================================================

    console.log('✅ TESTE 9: VALIDAR DOCUMENTO');
    console.log('-'.repeat(80));

    const validarReq = {
      schemaVersion: '1.0',
      taxRegistrationNumber: CUSTOMER_NIF,
      submissionTimeStamp: formatISO(now),
      softwareInfo: {
        softwareInfoDetail: {
          productId: 'TEST_SOFT',
          productVersion: '1.0',
          softwareValidationNumber: 'VAL-TEST',
        },
        jwsSoftwareSignature: 'X'.repeat(256),
      },
      documentNo: 'FT2025-001',
      action: 'C',
      submissionId: 'test-id',
      jwsSignature: 'sig',
    };

    const { response: validarRes, httpStatus: validarStatus } =
      await AGTMockService.validarDocumento(validarReq);

    assertEquals(validarStatus, 200, 'Status HTTP 200');
    assert(
      validarRes.actionResultCode?.includes('OK'),
      'actionResultCode com OK',
    );

    // Verificar repositório
    const validations = FacturaRepository.listAllValidations();
    assertEquals(validations.length, 1, '1 validação salva no repositório');
    console.log();

    // =========================================================================
    // TESTES DO REPOSITÓRIO
    // =========================================================================

    console.log('🗄️  TESTES DO REPOSITÓRIO');
    console.log('-'.repeat(80));

    // Estatísticas
    const stats = FacturaRepository.getStatistics();
    console.log(`\n  📊 Estatísticas Gerais:`);
    console.log(`    • Total de Facturas: ${stats.totalFacturas}`);
    console.log(`    • Total de Séries: ${stats.totalSeries}`);
    console.log(`    • Total de Validações: ${stats.totalValidations}`);
    console.log(`    • Total de Consultas: ${stats.totalConsultations}`);
    console.log(`    • Por Status: ${JSON.stringify(stats.byStatus)}`);
    console.log(`    • Por Serviço: ${JSON.stringify(stats.byService)}\n`);

    assertEquals(stats.totalFacturas, 3, '3 facturas registadas');
    assertEquals(stats.totalSeries, 1, '1 série criada');
    assertEquals(stats.totalValidations, 1, '1 validação realizada');
    assert(stats.totalConsultations > 3, 'Múltiplas consultas realizadas');

    // Filtros
    console.log('  🔍 Testando Filtros:');

    const facturasRegistadas = FacturaRepository.getFacturasByStatus('registered');
    assertEquals(
      facturasRegistadas.length,
      3,
      'Filtro por status retorna 3',
    );

    const facturasNIF = FacturaRepository.getFacturasByNif(NIF);
    assertEquals(facturasNIF.length, 3, 'Filtro por NIF retorna 3');

    const facturasService = FacturaRepository.getFacturasByService('mock');
    assertEquals(facturasService.length, 3, 'Filtro por serviço retorna 3');

    const facturasData = FacturaRepository.getFacturasByDateRange(
      addDays(now, -1),
      addDays(now, 1),
    );
    assertEquals(
      facturasData.length,
      3,
      'Filtro por data retorna 3',
    );

    // Busca específica
    const factura = FacturaRepository.getFacturaById(facturas[0].id);
    assert(factura !== null, 'Busca por ID retorna factura');

    // Exportar dados
    const allData = FacturaRepository.exportAll();
    assertEquals(allData.facturas.length, 3, 'Exportação contém 3 facturas');
    assertEquals(allData.series.length, 1, 'Exportação contém 1 série');
    assertEquals(
      allData.validations.length,
      1,
      'Exportação contém 1 validação',
    );

    console.log('  ✓ Todos os filtros funcionam corretamente\n');

    // Arquivo JSON
    const storagePath = FacturaRepository.getStoragePath();
    console.log(`  💾 Arquivo de storage: ${storagePath}\n`);

    // =========================================================================
    // RESUMO FINAL
    // =========================================================================

    console.log('='.repeat(80));
    console.log('✅ TODOS OS TESTES PASSARAM COM SUCESSO!');
    console.log('='.repeat(80));

    console.log('\n📊 RESUMO FINAL:');
    console.log(`  ✓ 7 Serviços AGT testados com sucesso`);
    console.log(`  ✓ ${stats.totalFacturas} Facturas registadas e persistidas`);
    console.log(`  ✓ ${stats.totalSeries} Série criada e persistida`);
    console.log(`  ✓ ${stats.totalValidations} Validação realizada e persistida`);
    console.log(`  ✓ ${stats.totalConsultations} Consultas realizadas e persistidas`);
    console.log(`  ✓ Filtros de repositório funcionando`);
    console.log(`  ✓ Arquivo JSON armazenado em: ${storagePath}`);
    console.log(`\n🎉 Sistema completo de persistência implementado com sucesso!\n`);
  } catch (error) {
    console.error('\n❌ ERRO NOS TESTES:', error.message);
    console.error(error);
    process.exitCode = 1;
  }
})();
