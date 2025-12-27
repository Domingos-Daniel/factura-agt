const fs = require('fs');
const base = 'http://localhost:3000';

async function main() {
  const requestID = process.argv[2];
  if (!requestID) {
    console.error('Usage: node make-validar-xml.js <requestID> [acquirerNIF override]');
    process.exit(2);
  }

  const res = await fetch(`${base}/api/mock/seed?requestID=${encodeURIComponent(requestID)}`);
  if (res.status !== 200) {
    console.error('Failed to fetch seed:', res.status);
    const txt = await res.text();
    console.error(txt);
    process.exit(1);
  }

  const data = await res.json();
  const doc = (data.documents && data.documents[0]) || {};
  const acquirer = process.argv[3] || doc.customerTaxID || data.taxRegistrationNumber;
  const emitter = data.taxRegistrationNumber;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="https://factura-agt.vercel.app/facturacao/v1">
  <soapenv:Header/>
  <soapenv:Body>
    <tns:ValidarDocumentoRequest>
      <schemaVersion>1.0</schemaVersion>
      <submissionId>${data.requestID}</submissionId>
      <taxRegistrationNumber>${acquirer}</taxRegistrationNumber>
      <emitterTaxRegistrationNumber>${emitter}</emitterTaxRegistrationNumber>
      <submissionTimeStamp>${data.submissionTimeStamp}</submissionTimeStamp>
      <softwareInfo>
        <softwareInfoDetail>
          <productId>${data.softwareInfo?.productId || 'TEST_SOFT'}</productId>
          <productVersion>${data.softwareInfo?.productVersion || '1.0'}</productVersion>
          <softwareValidationNumber>${data.softwareInfo?.softwareValidationNumber || 'VAL-TEST'}</softwareValidationNumber>
        </softwareInfoDetail>
        <jwsSoftwareSignature>PLACEHOLDER</jwsSoftwareSignature>
      </softwareInfo>
      <jwsSignature>PLACEHOLDER_JWS</jwsSignature>
      <documentNo>${doc.documentNo}</documentNo>
      <action>C</action>
    </tns:ValidarDocumentoRequest>
  </soapenv:Body>
</soapenv:Envelope>`;

  fs.writeFileSync(`scripts/test-validar-from-${requestID}.xml`, xml, 'utf8');
  console.log('Wrote scripts/test-validar-from-' + requestID + '.xml');
}

main().catch(err => { console.error(err); process.exit(1); });