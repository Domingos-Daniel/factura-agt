import { NextResponse } from 'next/server'
import { createAgtClient } from '@/lib/server/agtClient'
import { makeListarSeriesSignature } from '@/lib/server/jws'
import { listarSeriesRequest, zodToErrorList, normalizeSoftwareInfo } from '@/lib/schemas'
import { ZodError } from 'zod'

export const dynamic = 'force-dynamic'

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
    const privKey = process.env.AGT_PRIVATE_KEY
    if (privKey && payload?.taxRegistrationNumber && payload?.documentNo) {
      try {
        payload.jwsSignature = makeListarSeriesSignature(
          payload.taxRegistrationNumber,
          payload.documentNo,
          privKey
        )
      } catch {}
    }
    const client = createAgtClient()
    try {
      const res = await client.listarSeries(payload)
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
