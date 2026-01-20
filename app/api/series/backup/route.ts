import { NextResponse } from 'next/server'
import { patchSerieJson } from '@/lib/server/seriesJson'

export const dynamic = 'force-dynamic'

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => ({}))
  const id = String(body?.id || '').trim()
  const updates = body?.updates || {}

  if (!id || !updates || typeof updates !== 'object') {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  const updated = await patchSerieJson(id, updates)
  if (!updated) {
    return NextResponse.json({ error: 'Série não encontrada' }, { status: 404 })
  }

  return NextResponse.json({ ok: true, serie: updated }, { status: 200 })
}
