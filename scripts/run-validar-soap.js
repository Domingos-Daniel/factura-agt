(async () => {
  const fs = require('fs');
  const base = 'http://localhost:3000';

  try {
    // Seed a deterministic invoice for validarDocumento
    const seedRes = await fetch(`${base}/api/mock/seed/validar?documentNo=FT2025-VALIDAR-001&acquirerTaxRegistrationNumber=987654321&emitterTaxRegistrationNumber=123456789`);
    const seedJson = await seedRes.json();
    console.log('seed status=', seedRes.status, 'body=', JSON.stringify(seedJson));
    const requestID = seedJson.requestID;

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="https://factura-agt.vercel.app/facturacao/v1">
  <soapenv:Header/>
  <soapenv:Body>
    <tns:ValidarDocumentoRequest>
      <schemaVersion>1.0</schemaVersion>
      <submissionId>${requestID}</submissionId>
      <taxRegistrationNumber>987654321</taxRegistrationNumber>
      <emitterTaxRegistrationNumber>123456789</emitterTaxRegistrationNumber>
      <submissionTimeStamp>${new Date().toISOString()}</submissionTimeStamp>
      <softwareInfo>
        <softwareInfoDetail>
          <productId>TEST_SOFT</productId>
          <productVersion>1.0</productVersion>
          <softwareValidationNumber>VAL-TEST</softwareValidationNumber>
        </softwareInfoDetail>
        <jwsSoftwareSignature>...</jwsSoftwareSignature>
      </softwareInfo>
      <jwsSignature>PLACEHOLDER_JWS</jwsSignature>
      <documentNo>FT2025-VALIDAR-001</documentNo>
      <action>C</action>
    </tns:ValidarDocumentoRequest>
  </soapenv:Body>
</soapenv:Envelope>`;

    fs.writeFileSync('scripts/test-validarDocumento.xml', xml, 'utf8');
    console.log('Wrote scripts/test-validarDocumento.xml');

    // Send SOAP request
    const soapRes = await fetch(`${base}/api/soap`, { method: 'POST', headers: { 'Content-Type': 'text/xml', 'SOAPAction': 'https://factura-agt.vercel.app/facturacao/v1/validarDocumento' }, body: xml });

    const text = await soapRes.text();
    console.log('soap status=', soapRes.status);
    console.log('--- body start ---');
    console.log(text.slice(0,1000));
    console.log('--- body end ---');

    fs.writeFileSync('response-validar-soap.xml', text, 'utf8');
    console.log('Wrote response-validar-soap.xml');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
