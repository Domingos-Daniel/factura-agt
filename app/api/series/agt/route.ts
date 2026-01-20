import { NextRequest, NextResponse } from 'next/server'
import { createAgtClient } from '@/lib/server/agtClient'
import { getAllSeriesJson, replaceAllSeriesJson } from '@/lib/server/seriesJson'
import { signJwsRS256, makeListarSeriesSignature } from '@/lib/server/jws'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

function getDefaultNif(): string {
  return (
    process.env.AGT_HML_NIF_TEST ||
    process.env.AGT_NIF_TEST ||
    process.env.AGT_PROD_NIF_TEST ||
    '5000413178'
  )
}

function parseLastNumber(value?: string): number {
  if (!value) return 0
  const match = String(value).match(/(\d+)(?!.*\d)/)
  return match ? Number(match[1]) : 0
}

function mapAgtSeriesInfoToSerie(info: any): any {
  const seriesCode = String(info?.seriesCode ?? '').trim()
  const seriesYear = Number(info?.seriesYear ?? new Date().getFullYear())
  const documentType = String(info?.documentType ?? 'FT')
  const status = (String(info?.seriesStatus ?? info?.seriesStatusCode ?? 'A') as any) || 'A'

  const firstCreated = String(info?.firstDocumentCreated ?? '')
  const lastCreated = String(info?.lastDocumentCreated ?? '')

  const firstDocumentNumber = parseLastNumber(firstCreated) || 1
  const currentSequence = parseLastNumber(lastCreated) || firstDocumentNumber

  return {
    id: `${seriesCode}-${seriesYear}-${documentType}`,
    seriesCode,
    seriesYear,
    documentType,
    firstDocumentNumber,
    lastDocumentNumber: parseLastNumber(lastCreated) || undefined,
    currentSequence,
    status,
    invoicingMethod: info?.invoicingMethod,
    requestDate: info?.seriesCreationDate || new Date().toISOString(),
    approvalDate: undefined,
    closureDate: undefined,
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const refresh = url.searchParams.get('refresh') === 'true' || url.searchParams.get('refresh') === '1'
  const timeoutMs = Number(url.searchParams.get('timeoutMs') || '45000')

  const nif = getDefaultNif()

  // 1) Se não pediu refresh, devolve backup se existir
  if (!refresh) {
    const backup = await getAllSeriesJson()
    if (backup.length > 0) {
      return NextResponse.json({ series: backup, source: 'backup' }, { status: 200 })
    }
  }

  // 2) Tenta AGT
  try {
    const client = createAgtClient()
    
    // Software info
    const softwareInfoDetail = {
      productId: process.env.AGT_SOFTWARE_PRODUCT_ID || 'ADDON SAFT B1 E-INVOICE',
      productVersion: process.env.AGT_SOFTWARE_VERSION || '1.0',
      softwareValidationNumber: process.env.AGT_SOFTWARE_VALIDATION_NUMBER || 'FE/81/AGT/2025'
    }
    
    // Obter chave privada
    const privateKey = process.env.AGT_PRIVATE_KEY
    if (!privateKey) {
      throw new Error('AGT_PRIVATE_KEY não configurada')
    }
    
    // Gerar assinaturas JWS
    const jwsSoftwareSignature = signJwsRS256(softwareInfoDetail, privateKey)
    const jwsSignature = makeListarSeriesSignature(nif, privateKey)
    
    // Criar payload completo com todos os campos obrigatórios
    const payload = { 
      schemaVersion: '1.2',
      submissionUUID: crypto.randomUUID(),
      taxRegistrationNumber: nif,
      submissionTimeStamp: new Date().toISOString(),
      softwareInfo: {
        softwareInfoDetail,
        jwsSoftwareSignature
      },
      jwsSignature
    }
    
    const res = await (client.listarSeriesWithTimeout
      ? client.listarSeriesWithTimeout(payload, timeoutMs)
      : client.listarSeries(payload))

    const list = Array.isArray(res?.seriesInfo) ? res.seriesInfo : []
    const mapped = list
      .map(mapAgtSeriesInfoToSerie)
      .filter((s: any) => s?.seriesCode)

    const withMeta = mapped.map((s: any) => ({
      ...s,
      agtLastSyncAt: new Date().toISOString(),
    }))

    await replaceAllSeriesJson(withMeta)

    return NextResponse.json({ series: withMeta, source: 'agt' }, { status: 200 })
  } catch (e: any) {
    // 3) Fallback backup
    const backup = await getAllSeriesJson()
    if (backup.length > 0) {
      return NextResponse.json(
        { series: backup, source: 'backup', warning: e?.message || 'Falha ao consultar AGT' },
        { status: 200 }
      )
    }
    return NextResponse.json(
      { error: e?.message || 'Falha ao consultar AGT e sem backup disponível' },
      { status: 502 }
    )
  }
}
