(async () => {
  const base = 'http://localhost:3000';
  const now = new Date();
  const nif = '123456789';

  function ok(cond, msg) {
    if (!cond) throw new Error(msg);
  }

  console.log('Running HTTP integration tests against', base);

  // 1) registarFactura (JSON)
  const regPayload = {
    schemaVersion: '1.0',
    submissionGUID: '11111111-2222-3333-4444-555555555555',
    taxRegistrationNumber: nif,
    submissionTimeStamp: now.toISOString(),
    softwareInfo: {
      productId: 'TEST_SOFT',
      productVersion: '1.0',
      softwareValidationNumber: 'VAL-TEST',
      jwsSoftwareSignature: 'X'.repeat(256),
    },
    numberOfEntries: 1,
    documents: [
      {
        documentNo: 'FT2025-HTTP-001',
        documentStatus: 'N',
        documentDate: now.toISOString().split('T')[0],
        documentType: 'FT',
        eacCode: 'CAE001',
        systemEntryDate: now.toISOString(),
        customerCountry: 'AO',
        customerTaxID: '987654321',
        companyName: 'Cliente HTTP Teste',
        lines: [
          {
            lineNo: 1,
            productDescription: 'Serviço HTTP Teste',
            quantity: 1,
            unitOfMeasure: 'UN',
            unitPrice: 50,
            unitPriceBase: 50,
            taxes: [ { taxType: 'IVA', taxCountryRegion: 'AO', taxCode: 'NOR', taxPercentage: 14, taxBase: 50, taxAmount: 7 } ],
            settlementAmount: 0,
          }
        ],
        documentTotals: { taxPayable: 7, netTotal: 50, grossTotal: 57, currency: { currencyCode: 'AOA', currencyAmount: 57, exchangeRate: 1 } },
        jwsDocumentSignature: 'Y'.repeat(256),
      }
    ]
  };

  console.log('- Testing POST /api/agt/registarFactura');
  let res = await fetch(base + '/api/agt/registarFactura', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(regPayload) });
  let json = await res.json();
  console.log('  status=', res.status, 'body=', JSON.stringify(json).slice(0,400));
  ok(res.status === 200 && json.requestID, 'registarFactura failed');
  const requestID = json.requestID;

  // 2) obterEstado (immediate)
  console.log('- Testing POST /api/agt/obterEstado (immediate)');
  res = await fetch(base + '/api/agt/obterEstado', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ schemaVersion: '1.0', taxRegistrationNumber: nif, submissionTimeStamp: now.toISOString(), requestID, jwsSignature: '' }) });
  json = await res.json();
  console.log('  status=', res.status, 'body=', JSON.stringify(json).slice(0,400));
  // The mock client may return either { statusResult: { requestID } } or top-level { requestID }
  const gotRequestID = json?.statusResult?.requestID || json?.requestID;
  ok(res.status === 200 && gotRequestID === requestID, 'obterEstado immediate failed');

  // Wait for processing
  await new Promise(r => setTimeout(r, 2200));

  // 3) listarFacturas
  console.log('- Testing POST /api/agt/listarFacturas');
  const start = new Date(now.getTime()-86400000).toISOString().split('T')[0];
  const end = new Date(now.getTime()+86400000).toISOString().split('T')[0];
  res = await fetch(base + '/api/agt/listarFacturas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ schemaVersion: '1.0', taxRegistrationNumber: nif, startDate: start, endDate: end }) });
  json = await res.json();
  console.log('  status=', res.status, 'body=', JSON.stringify(json));
  ok(res.status === 200 && typeof json.documentResultCount === 'number', 'listarFacturas failed');

  // 4) consultarFactura
  console.log('- Testing POST /api/agt/consultarFactura');
  res = await fetch(base + '/api/agt/consultarFactura', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ schemaVersion: '1.0', taxRegistrationNumber: nif, documentNo: 'FT2025-HTTP-001' }) });
  json = await res.json();
  console.log('  status=', res.status, 'body=', JSON.stringify(json).slice(0,400));
  ok(res.status === 200 && json.documents && json.documents.length === 1, 'consultarFactura failed');

  // 5) solicitarSerie
  console.log('- Testing POST /api/agt/solicitarSerie');
  const year = new Date().getFullYear();
  res = await fetch(base + '/api/agt/solicitarSerie', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ schemaVersion: '1.0', taxRegistrationNumber: nif, seriesCode: `S${year}02`, seriesYear: year, documentType: 'FT', firstDocumentNumber: 1 }) });
  json = await res.json();
  console.log('  status=', res.status, 'body=', JSON.stringify(json));
  ok(res.status === 200 && (json.resultCode === 1 || json.httpStatus === 200), 'solicitarSerie failed');

  // 6) listarSeries
  console.log('- Testing POST /api/agt/listarSeries');
  res = await fetch(base + '/api/agt/listarSeries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ schemaVersion: '1.0', taxRegistrationNumber: nif }) });
  json = await res.json();
  console.log('  status=', res.status, 'body=', JSON.stringify(json));
  ok(res.status === 200 && typeof json.seriesResultCount === 'number', 'listarSeries failed');

  // 7) validarDocumento
  console.log('- Testing POST /api/agt/validarDocumento');
  res = await fetch(base + '/api/agt/validarDocumento', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ schemaVersion: '1.0', taxRegistrationNumber: '987654321', emitterTaxRegistrationNumber: nif, documentNo: 'FT2025-HTTP-001', action: 'C' }) });
  json = await res.json();
  console.log('  status=', res.status, 'body=', JSON.stringify(json));
  ok(res.status === 200 && json.actionResultCode === 'C_OK', 'validarDocumento failed');

  // 8) SOAP registarFactura
  console.log('- Testing SOAP POST /api/soap registarFactura');
  const fs = require('fs');
  const xml = fs.readFileSync('scripts/test-registarFactura.xml', 'utf-8');
  res = await fetch(base + '/api/soap', { method: 'POST', headers: { 'Content-Type': 'text/xml', 'SOAPAction': 'https://factura-agt.vercel.app/facturacao/v1/registarFactura' }, body: xml });
  const soapBody = await res.text();
  console.log('  status=', res.status, 'body start=', soapBody.slice(0,400));
  ok(res.status === 200 && (soapBody.includes('<requestID>') || soapBody.includes('<fact:requestID>')), 'SOAP registarFactura failed');

  console.log('\nAll HTTP integration tests passed ✅');
})();
