import { AGTMockService } from '@/lib/server/agtMockService';
import { formatISO } from 'date-fns';

async function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error('✖ Test failed:', message);
    process.exitCode = 1;
    throw new Error(message);
  }
}

async function run() {
  console.log('Running AGT mock service tests...');
  AGTMockService.clearStorage();

  const nif = '123456789';
  const submissionGUID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  const now = new Date();

  // 1) RegistarFactura
  const regReq = {
    schemaVersion: '1.0',
    submissionGUID,
    taxRegistrationNumber: nif,
    submissionTimeStamp: formatISO(now),
    softwareInfo: {
      productId: 'TEST_SOFT',
      productVersion: '1.0',
      softwareValidationNumber: 'VAL-TEST',
      jwsSoftwareSignature: 'X'.repeat(256),
    },
    numberOfEntries: 1,
    documents: [
      {
        documentNo: 'FT2025-TEST-001',
        documentStatus: 'N',
        documentDate: now.toISOString().split('T')[0],
        documentType: 'FT',
        eacCode: 'CAE001',
        systemEntryDate: now.toISOString(),
        customerCountry: 'AO',
        customerTaxID: '987654321',
        companyName: 'Cliente Teste Lda',
        lines: [
          {
            lineNo: 1,
            productDescription: 'Serviço de Teste',
            quantity: 1,
            unitOfMeasure: 'UN',
            unitPrice: 100,
            unitPriceBase: 100,
            taxes: [
              {
                taxType: 'IVA',
                taxCountryRegion: 'AO',
                taxCode: 'NOR',
                taxPercentage: 14,
                taxBase: 100,
                taxAmount: 14,
              },
            ],
            settlementAmount: 0,
          },
        ],
        documentTotals: { taxPayable: 14, netTotal: 100, grossTotal: 114, currency: { currencyCode: 'AOA', currencyAmount: 114, exchangeRate: 1 } },
        jwsDocumentSignature: 'Y'.repeat(256),
      },
    ],
  } as any;

  const regRes = await AGTMockService.registarFactura(regReq);
  console.log('registarFactura ->', regRes.httpStatus, JSON.stringify(regRes.response).slice(0,400));
  await assert(regRes.httpStatus === 200 && (regRes.response as any).requestID, 'registarFactura should return requestID');
  const requestID = (regRes.response as any).requestID;

  // 2) ObterEstado (imediato: pending)
  const obterRes1 = await AGTMockService.obterEstado({ schemaVersion: '1.0', taxRegistrationNumber: nif, requestID, submissionTimeStamp: formatISO(now), jwsSignature: '' });
  console.log('obterEstado (immediate) ->', obterRes1.httpStatus, JSON.stringify(obterRes1.response).slice(0,400));
  await assert(obterRes1.httpStatus === 200 && obterRes1.response.statusResult?.requestID === requestID, 'obterEstado must include requestID');

  // Wait to allow mock processing to mark as processed
  await new Promise((r) => setTimeout(r, 2200));

  const obterRes2 = await AGTMockService.obterEstado({ schemaVersion: '1.0', taxRegistrationNumber: nif, requestID, submissionTimeStamp: formatISO(now), jwsSignature: '' });
  console.log('obterEstado (after processing) ->', obterRes2.httpStatus, JSON.stringify(obterRes2.response).slice(0,500));
  await assert(obterRes2.httpStatus === 200 && obterRes2.response.statusResult?.documentStatusList, 'obterEstado after processing must include documentStatusList');

  // 3) ListarFacturas
  const start = new Date(now.getTime() - 24 * 3600 * 1000).toISOString().split('T')[0];
  const end = new Date(now.getTime() + 24 * 3600 * 1000).toISOString().split('T')[0];
  const listarRes = await AGTMockService.listarFacturas({ schemaVersion: '1.0', taxRegistrationNumber: nif, queryStartDate: start, queryEndDate: end });
  console.log('listarFacturas ->', listarRes.httpStatus, JSON.stringify(listarRes.response));
  await assert(listarRes.httpStatus === 200 && (listarRes.response.documentResultCount || 0) >= 1, 'listarFacturas should return at least one document');

  // 4) ConsultarFactura
  const consultarRes = await AGTMockService.consultarFactura({ schemaVersion: '1.0', taxRegistrationNumber: nif, documentNo: 'FT2025-TEST-001' });
  console.log('consultarFactura ->', consultarRes.httpStatus, JSON.stringify(consultarRes.response).slice(0,400));
  await assert(consultarRes.httpStatus === 200 && (consultarRes.response as any).documents?.length === 1, 'consultarFactura should return the document');

  // 5) SolicitarSerie
  const year = new Date().getFullYear();
  const solicRes = await AGTMockService.solicitarSerie({ schemaVersion: '1.0', taxRegistrationNumber: nif, seriesCode: `S${year}01`, seriesYear: year, documentType: 'FT', firstDocumentNumber: 1 });
  console.log('solicitarSerie ->', solicRes.httpStatus, JSON.stringify(solicRes.response));
  await assert(solicRes.httpStatus === 200 && (solicRes.response as any).resultCode === 1, 'solicitarSerie should succeed');

  // 6) ListarSeries
  const listarSeriesRes = await AGTMockService.listarSeries({ schemaVersion: '1.0', taxRegistrationNumber: nif });
  console.log('listarSeries ->', listarSeriesRes.httpStatus, JSON.stringify(listarSeriesRes.response));
  await assert(listarSeriesRes.httpStatus === 200 && (listarSeriesRes.response.seriesResultCount || 0) >= 1, 'listarSeries should list the created series');

  // 7) ValidarDocumento (confirm)
  const validarRes = await AGTMockService.validarDocumento({ schemaVersion: '1.0', taxRegistrationNumber: '987654321', documentNo: 'FT2025-TEST-001', emitterTaxRegistrationNumber: nif, action: 'C' });
  console.log('validarDocumento ->', validarRes.httpStatus, JSON.stringify(validarRes.response));
  await assert(validarRes.httpStatus === 200 && (validarRes.response as any).actionResultCode === 'C_OK', 'validarDocumento should return C_OK on first confirmation');

  // 8) ValidarDocumento (confirm again -> should be NOK)
  const validarRes2 = await AGTMockService.validarDocumento({ schemaVersion: '1.0', taxRegistrationNumber: '987654321', documentNo: 'FT2025-TEST-001', emitterTaxRegistrationNumber: nif, action: 'C' });
  console.log('validarDocumento (again) ->', validarRes2.httpStatus, JSON.stringify(validarRes2.response));
  await assert(validarRes2.httpStatus === 200 && (validarRes2.response as any).actionResultCode !== 'C_OK', 'second validation should not be C_OK');

  console.log('\nAll tests passed ✅');
}

run().catch((err) => {
  console.error('Test run failed:', err?.message || err);
  process.exit(1);
});
