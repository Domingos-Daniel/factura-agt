import { NextResponse } from 'next/server'
import { createAgtClient } from '@/lib/server/agtClient'
import { makeListarSeriesSignature, makeSoftwareInfoSignature } from '@/lib/server/jws'
import { listarSeriesRequest, zodToErrorList, normalizeSoftwareInfo } from '@/lib/schemas'
import { ZodError } from 'zod'

export const dynamic = 'force-dynamic'

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

export async function POST(req: Request) {
  try {
    const payload = await req.json()
    try {
      try { normalizeSoftwareInfo(payload) } catch (err) {}
      listarSeriesRequest.parse(payload)
    } catch (e: any) {
      if (e instanceof ZodError) {
        return NextResponse.json({ errorList: zodToErrorList(e) }, { status: 400 })
      }
      return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
    }
    
    // Preparar payload AGT com campos obrigatórios
    const taxRegistrationNumber = payload.taxRegistrationNumber || process.env.AGT_HML_NIF_TEST || ''
    const privKey = process.env.AGT_PRIVATE_KEY
    
    const SOFTWARE_INFO = {
      productId: process.env.AGT_SOFTWARE_PRODUCT_ID || 'ADDON SAFT B1 E-INVOICE',
      productVersion: process.env.AGT_SOFTWARE_VERSION || 'v1.0',
      softwareValidationNumber: process.env.AGT_SOFTWARE_VALIDATION_NUMBER || 'FE/81/AGT/2025'
    }
    
    const agtPayload: any = {
      schemaVersion: '1.2',
      submissionUUID: payload.submissionUUID || generateUUID(),
      taxRegistrationNumber,
      submissionTimeStamp: payload.submissionTimeStamp || new Date().toISOString(),
      softwareInfo: {
        softwareInfoDetail: SOFTWARE_INFO,
        jwsSoftwareSignature: privKey ? makeSoftwareInfoSignature(SOFTWARE_INFO, privKey) : ''
      },
      jwsSignature: privKey ? makeListarSeriesSignature(taxRegistrationNumber, privKey) : ''
    }
    
    console.log('[AGT Series] Enviando payload:', JSON.stringify({
      schemaVersion: agtPayload.schemaVersion,
      taxRegistrationNumber: agtPayload.taxRegistrationNumber
    }, null, 2))
    const client = createAgtClient()
    try {
      const res = await client.listarSeries(agtPayload)
      console.log('[AGT Series] Response completa:', JSON.stringify(res, null, 2))
      return NextResponse.json(res, { status: 200 })
    } catch (e: any) {
      const msg: string = e?.message || ''
      if (msg.includes('429')) {
        return NextResponse.json({ error: 'E98: Muitas solicitações. Aguarde e tente novamente.' }, { status: 429 })
      }
      if (msg.toLowerCase().includes('timeout') || msg.toLowerCase().includes('abort')) {
        return NextResponse.json({ error: 'E97: Timeout na comunicação com AGT.' }, { status: 504 })
      }
      if (msg.includes('400')) {
        return NextResponse.json({ error: 'E96: Pedido inválido.' }, { status: 400 })
      }
      if (msg.includes('401') || msg.includes('403')) {
        return NextResponse.json({ error: 'E94: NIF diferente.' }, { status: 401 })
      }
      return NextResponse.json({ error: 'Erro inesperado na integração AGT.' }, { status: 502 })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Erro na chamada ao serviço AGT' }, { status: 400 })
  }
}
