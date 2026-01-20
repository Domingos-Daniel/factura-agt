import { NextResponse } from 'next/server'
import { createAgtClient } from '@/lib/server/agtClient'
import { upsertSerieJson } from '@/lib/server/seriesJson'
import { signJwsRS256, makeSolicitarSerieSignature } from '@/lib/server/jws'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))

  const seriesCode = String(body?.seriesCode ?? '').trim()
  const seriesYear = Number(body?.seriesYear)
  const documentType = String(body?.documentType ?? '').trim()
  const firstDocumentNumber = Number(body?.firstDocumentNumber ?? 1)

  if (!seriesCode || !seriesYear || !documentType || !Number.isFinite(firstDocumentNumber)) {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  const taxRegistrationNumber =
    String(body?.taxRegistrationNumber ?? '') ||
    process.env.AGT_HML_NIF_TEST ||
    process.env.AGT_NIF_TEST ||
    '5000413178'

  const timeoutMs = Number(body?.timeoutMs || 45000)

  // Obter chave privada
  const privateKey = process.env.AGT_PRIVATE_KEY
  if (!privateKey) {
    return NextResponse.json({ error: 'AGT_PRIVATE_KEY não configurada' }, { status: 500 })
  }

  // Software info
  const softwareInfoDetail = {
    productId: process.env.AGT_SOFTWARE_PRODUCT_ID || 'ADDON SAFT B1 E-INVOICE',
    productVersion: process.env.AGT_SOFTWARE_VERSION || '1.0',
    softwareValidationNumber: process.env.AGT_SOFTWARE_VALIDATION_NUMBER || 'FE/81/AGT/2025'
  }

  // Gerar assinaturas JWS
  const jwsSoftwareSignature = signJwsRS256(softwareInfoDetail, privateKey)
  const jwsSignature = makeSolicitarSerieSignature({
    taxRegistrationNumber,
    seriesCode,
    seriesYear,
    documentType,
    firstDocumentNumber
  }, privateKey)

  const payload = {
    schemaVersion: '1.2',
    submissionUUID: crypto.randomUUID(),
    taxRegistrationNumber,
    submissionTimeStamp: new Date().toISOString(),
    seriesCode,
    seriesYear,
    documentType,
    firstDocumentNumber,
    invoicingMethod: body?.invoicingMethod || 'FESF',
    softwareInfo: {
      softwareInfoDetail,
      jwsSoftwareSignature
    },
    jwsSignature
  }

  try {
    const client = createAgtClient()

    const res = await (client.solicitarSerieWithTimeout
      ? client.solicitarSerieWithTimeout(payload, timeoutMs)
      : client.solicitarSerie(payload))

    // Persistir no backup quando a AGT confirma sucesso
    const ok = res?.resultCode === 1 || res?.resultCode === '1'
    if (ok) {
      await upsertSerieJson({
        id: `${seriesCode}-${seriesYear}-${documentType}`,
        seriesCode,
        seriesYear,
        documentType: documentType as any,
        firstDocumentNumber,
        currentSequence: firstDocumentNumber,
        status: 'A',
        invoicingMethod: body?.invoicingMethod,
        requestDate: new Date().toISOString(),
        agtSolicitarLastSyncAt: new Date().toISOString(),
      } as any)
    }

    return NextResponse.json({ ...res, persisted: ok }, { status: 200 })
  } catch (e: any) {
    // Fallback: guardar pedido como pendente no backup para não perder o registo
    try {
      await upsertSerieJson({
        id: `${seriesCode}-${seriesYear}-${documentType}`,
        seriesCode,
        seriesYear,
        documentType: documentType as any,
        firstDocumentNumber,
        currentSequence: firstDocumentNumber,
        status: 'A',
        requestDate: new Date().toISOString(),
        agtSolicitarPending: true,
        agtSolicitarLastError: e?.message || 'Falha ao solicitar série na AGT',
        agtSolicitarLastAttemptAt: new Date().toISOString(),
      } as any)
    } catch {
      // ignore
    }

    const msg: string = e?.message || ''
    if (msg.toLowerCase().includes('timeout') || msg.toLowerCase().includes('abort')) {
      return NextResponse.json({ error: 'E97: Timeout na comunicação com AGT.' }, { status: 504 })
    }
    return NextResponse.json({ error: e?.message || 'Erro inesperado na integração AGT.' }, { status: 502 })
  }
}
