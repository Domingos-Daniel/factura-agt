import { NextResponse } from 'next/server'
import { createAgtClient } from '@/lib/server/agtClient'
import { makeObterEstadoSignature } from '@/lib/server/jws'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const payload = await req.json()
    const privKey = process.env.AGT_PRIVATE_KEY
    if (privKey && payload?.taxRegistrationNumber && payload?.requestID) {
      try {
        payload.jwsSignature = makeObterEstadoSignature(
          payload.taxRegistrationNumber,
          payload.requestID,
          privKey
        )
      } catch {}
    }
    const client = createAgtClient()
    try {
      const res = await client.obterEstado(payload)
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
        return NextResponse.json({ error: 'E95: NIF emissor diferente.' }, { status: 401 })
      }
      if (msg.includes('422')) {
        return NextResponse.json({ error: 'E96: Solicitação ainda em processamento ou prematura.' }, { status: 422 })
      }
      return NextResponse.json({ error: 'E94: Erro inesperado na integração AGT.' }, { status: 502 })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Erro na chamada ao serviço AGT' }, { status: 400 })
  }
}
