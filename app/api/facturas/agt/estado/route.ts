import { NextRequest, NextResponse } from 'next/server'

import type { Factura } from '@/lib/types'
import { createAgtClient } from '@/lib/server/agtClient'
import { getFacturaJsonById, upsertFacturaJson } from '@/lib/server/facturasJson'
import { FacturaRepository } from '@/lib/server/facturaRepository'

export const dynamic = 'force-dynamic'
export const maxDuration = 180

const runningSyncs = new Map<string, Promise<void>>()
const lastSyncErrors = new Map<string, string>()

function mapObterEstadoToFactura(backup: Factura, obterEstadoRes: any): Factura {
  const documentNo = backup.documents?.[0]?.documentNo
  const list = Array.isArray(obterEstadoRes?.documentStatusList) ? obterEstadoRes.documentStatusList : []
  const docStatus = documentNo ? list.find((d: any) => d?.documentNo === documentNo) : list[0]

  const validationStatusRaw = String(docStatus?.validationStatus ?? '').toUpperCase()
  const normalizedValidationStatus =
    validationStatusRaw === 'P' ||
    validationStatusRaw === 'V' ||
    validationStatusRaw === 'I' ||
    validationStatusRaw === 'R' ||
    validationStatusRaw === 'E'
      ? (validationStatusRaw as any)
      : undefined

  const resultCode = obterEstadoRes?.resultCode != null ? String(obterEstadoRes.resultCode) : ''

  const messages: string[] = []
  if (resultCode) messages.push(`ResultCode: ${resultCode}`)
  if (docStatus?.documentNo) messages.push(`Documento: ${docStatus.documentNo}`)
  if (docStatus?.validationStatus) messages.push(`ValidationStatus: ${docStatus.validationStatus}`)

  if (Array.isArray(obterEstadoRes?.requestErrorList) && obterEstadoRes.requestErrorList.length > 0) {
    obterEstadoRes.requestErrorList.slice(0, 12).forEach((err: any) => {
      const id = err?.idError ?? 'N/A'
      const desc = err?.descriptionError ?? ''
      messages.push(`[${id}] ${String(desc).trim()}`.trim())
    })
  }

  const nowIso = new Date().toISOString()

  return {
    ...(backup as any),
    validationStatus: normalizedValidationStatus,
    validationDate: nowIso,
    validationMessages: messages.length > 0 ? messages : backup.validationMessages,
    agtEstadoLastSyncAt: nowIso,
    agtObterEstado: {
      resultCode: obterEstadoRes?.resultCode,
      documentStatusListCount: Array.isArray(obterEstadoRes?.documentStatusList) ? obterEstadoRes.documentStatusList.length : 0,
    },
  } as any
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id') || ''
  const asyncMode = ['1', 'true', 'yes'].includes((searchParams.get('async') || '').toLowerCase())
  const timeoutMsParam = Number(searchParams.get('timeoutMs') || '')
  const timeoutMs = Number.isFinite(timeoutMsParam) && timeoutMsParam > 0 ? timeoutMsParam : 45000

  if (!id) {
    return NextResponse.json({ success: false, error: 'Parâmetro id é obrigatório' }, { status: 400 })
  }

  const backupFactura = await getFacturaJsonById(id)
  if (!backupFactura) {
    return NextResponse.json({ success: false, error: 'Factura não encontrada no backup' }, { status: 404 })
  }

  const backup = backupFactura as Factura

  const requestID = (backup as any)?.requestID
  const taxRegistrationNumber = backup.taxRegistrationNumber

  if (!requestID || !taxRegistrationNumber) {
    return NextResponse.json(
      {
        success: true,
        source: 'backup',
        factura: backup,
        warning: 'Factura sem requestID/taxRegistrationNumber; não é possível obter estado na AGT.',
      },
      { status: 200 },
    )
  }

  const payload = { taxRegistrationNumber, requestID }

  async function doSyncInBackground(): Promise<void> {
    try {
      const client = createAgtClient()
      const res: any = await (typeof (client as any).obterEstadoWithTimeout === 'function'
        ? (client as any).obterEstadoWithTimeout(payload, timeoutMs)
        : client.obterEstado(payload))

      try {
        FacturaRepository.saveConsultationOperation('api', payload, res, 'obterEstado')
      } catch {
        // non-blocking
      }

      const merged = mapObterEstadoToFactura(backup, res)
      await upsertFacturaJson(merged)
      lastSyncErrors.delete(id)
    } catch (e: any) {
      lastSyncErrors.set(id, e?.message || String(e))
    }
  }

  if (asyncMode) {
    if (!runningSyncs.has(id)) {
      const job = doSyncInBackground().finally(() => {
        runningSyncs.delete(id)
      })
      runningSyncs.set(id, job)
    }

    return NextResponse.json(
      {
        success: true,
        source: 'backup',
        factura: backup,
        sync: runningSyncs.has(id) ? 'in-progress' : 'started',
        lastError: lastSyncErrors.get(id) || null,
      },
      { status: 200 },
    )
  }

  try {
    const client = createAgtClient()
    const res: any = await (typeof (client as any).obterEstadoWithTimeout === 'function'
      ? (client as any).obterEstadoWithTimeout(payload, timeoutMs)
      : client.obterEstado(payload))

    try {
      FacturaRepository.saveConsultationOperation('api', payload, res, 'obterEstado')
    } catch {
      // non-blocking
    }

    const merged = mapObterEstadoToFactura(backup, res)
    await upsertFacturaJson(merged)

    return NextResponse.json(
      {
        success: true,
        source: 'agt',
        factura: merged,
        estado: res,
      },
      { status: 200 },
    )
  } catch (e: any) {
    return NextResponse.json(
      {
        success: true,
        source: 'backup',
        factura: backup,
        error: e?.message || String(e),
      },
      { status: 200 },
    )
  }
}
