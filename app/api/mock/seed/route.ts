import { NextResponse } from 'next/server'
import { AGTMockService } from '@/lib/server/agtMockService'
import { formatISO } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  return seedHandler(req)
}

export async function GET(req: Request) {
  // Allow simple browser access: pass query params to seedHandler
  return seedHandler(req)
}

async function seedHandler(req: Request) {
  // Only allow in mock mode
  if (process.env.AGT_USE_MOCK !== 'true' && process.env.USE_MOCK !== 'true') {
    return NextResponse.json({ error: 'Mock endpoints are disabled' }, { status: 403 })
  }

  try {
    const body = req.method === 'GET' ? Object.fromEntries(new URL(req.url).searchParams) : await req.json().catch(() => ({}))
    const now = new Date()
    const taxRegistrationNumber = body.taxRegistrationNumber || '123456789'
    const submissionGUID = body.submissionGUID || `seed-${Date.now()}`

    const payload: any = {
      schemaVersion: '1.0',
      submissionGUID,
      taxRegistrationNumber,
      submissionTimeStamp: body.submissionTimeStamp || formatISO(now),
      softwareInfo: body.softwareInfo || { productId: 'SEED_SOFT', productVersion: '1.0', softwareValidationNumber: 'SEED', jwsSoftwareSignature: 'X'.repeat(256) },
      numberOfEntries: 1,
      documents: body.documents || [
        {
          documentNo: body.documentNo || `FT-SEED-${Date.now()}`,
          documentStatus: 'N',
          documentDate: now.toISOString().split('T')[0],
          documentType: 'FT',
          eacCode: 'CAE001',
          systemEntryDate: formatISO(now),
          customerCountry: 'AO',
          customerTaxID: body.customerTaxID || '987654321',
          companyName: body.companyName || 'Cliente Seed Lda',
          lines: [
            {
              lineNo: 1,
              productDescription: 'Seed product',
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

    const res = await AGTMockService.registarFactura(payload)
    return NextResponse.json({ requestID: res.response.requestID, httpStatus: res.httpStatus })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'error' }, { status: 500 })
  }
}
