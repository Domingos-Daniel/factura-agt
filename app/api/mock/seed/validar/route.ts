import { NextResponse } from 'next/server'
import { AGTMockService } from '@/lib/server/agtMockService'
import { formatISO } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  return seedValidarHandler(req)
}

export async function GET(req: Request) {
  return seedValidarHandler(req)
}

async function seedValidarHandler(req: Request) {
  // Only allow in mock mode
  if (process.env.AGT_USE_MOCK !== 'true' && process.env.USE_MOCK !== 'true') {
    return NextResponse.json({ error: 'Mock endpoints are disabled' }, { status: 403 })
  }

  try {
    const body = req.method === 'GET' ? Object.fromEntries(new URL(req.url).searchParams) : await req.json().catch(() => ({}))
    const now = new Date()

    const documentNo = body.documentNo || `FT-VALIDAR-SEED-${Date.now()}`
    const acquirer = body.acquirerTaxRegistrationNumber || body.customerTaxID || body.taxRegistrationNumber || '987654321'
    const emitter = body.emitterTaxRegistrationNumber || body.emitter || body.requesterTaxRegistrationNumber || body.requestTaxRegistrationNumber || '123456789'

    const payload: any = {
      schemaVersion: '1.0',
      submissionGUID: body.submissionGUID || `seed-validar-${Date.now()}`,
      taxRegistrationNumber: emitter, // the emitter who registers the factura
      submissionTimeStamp: body.submissionTimeStamp || formatISO(now),
      softwareInfo: body.softwareInfo || { productId: 'SEED_SOFT', productVersion: '1.0', softwareValidationNumber: 'SEED', jwsSoftwareSignature: 'X'.repeat(256) },
      numberOfEntries: 1,
      documents: [
        {
          documentNo,
          documentStatus: 'N',
          documentDate: now.toISOString().split('T')[0],
          documentType: 'FT',
          eacCode: 'CAE001',
          systemEntryDate: formatISO(now),
          customerCountry: 'AO',
          customerTaxID: acquirer, // important: this is the "adquirente" used by validarDocumento
          companyName: body.companyName || 'Cliente Seed Lda',
          lines: [
            {
              lineNo: 1,
              productDescription: 'Seed product for validarDocumento',
              quantity: 1,
              unitOfMeasure: 'UN',
              unitPrice: 100,
              unitPriceBase: 100,
              taxes: [ { taxType: 'IVA', taxCountryRegion: 'AO', taxCode: 'NOR', taxPercentage: 14, taxBase: 100, taxAmount: 14 } ],
              settlementAmount: 0,
            }
          ],
          documentTotals: { taxPayable: 14, netTotal: 100, grossTotal: 114, currency: { currencyCode: 'AOA', currencyAmount: 114, exchangeRate: 1 } },
          jwsDocumentSignature: 'Y'.repeat(256)
        }
      ]
    }

    // Directly insert into the mock storage to ensure deterministic behavior for validarDocumento tests
    const requestID = `VS-${Date.now()}-${Math.floor(Math.random()*10000)}`
    const entry: any = { request: payload, requestID, status: 'processed', validationResults: new Map([[documentNo, 'V']]), createdAt: new Date() }
    AGTMockService.storage.facturas.set(requestID, entry as any)

    // Prepare a ready-to-send SOAP envelope the tester can use immediately
    const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>\n<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="https://factura-agt.vercel.app/facturacao/v1">\n  <soapenv:Header/>\n  <soapenv:Body>\n    <tns:ValidarDocumentoRequest>\n      <schemaVersion>1.0</schemaVersion>\n      <submissionId>${requestID}</submissionId>\n      <taxRegistrationNumber>${acquirer}</taxRegistrationNumber>\n      <emitterTaxRegistrationNumber>${emitter}</emitterTaxRegistrationNumber>\n      <submissionTimeStamp>${new Date().toISOString()}</submissionTimeStamp>\n      <softwareInfo>\n        <softwareInfoDetail>\n          <productId>TEST_SOFT</productId>\n          <productVersion>1.0</productVersion>\n          <softwareValidationNumber>VAL-TEST</softwareValidationNumber>\n        </softwareInfoDetail>\n        <jwsSoftwareSignature>...</jwsSoftwareSignature>\n      </softwareInfo>\n      <jwsSignature>PLACEHOLDER_JWS</jwsSignature>\n      <documentNo>${documentNo}</documentNo>\n      <action>C</action>\n    </tns:ValidarDocumentoRequest>\n  </soapenv:Body>\n</soapenv:Envelope>`

    return NextResponse.json({ requestID, documentNo, acquirer, emitter, httpStatus: 200, soapEnvelope })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'error' }, { status: 500 })
  }
}
