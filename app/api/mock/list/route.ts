import { NextResponse } from 'next/server'
import { AGTMockService } from '@/lib/server/agtMockService'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (process.env.AGT_USE_MOCK !== 'true' && process.env.USE_MOCK !== 'true') {
    return NextResponse.json({ error: 'Mock endpoints are disabled' }, { status: 403 })
  }

  try {
    const list: any[] = []
    AGTMockService.storage.facturas.forEach((value, key) => {
      list.push({ requestID: key, taxRegistrationNumber: value.request.taxRegistrationNumber, createdAt: value.createdAt, status: value.status })
    })

    return NextResponse.json({ count: list.length, list })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'error' }, { status: 500 })
  }
}
