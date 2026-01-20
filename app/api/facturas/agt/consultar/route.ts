import { NextRequest, NextResponse } from 'next/server'

import { createAgtClient } from '@/lib/server/agtClient'
import type { Factura, Document, ProductLine } from '@/lib/types'
import { getFacturaJsonById, upsertFacturaJson } from '@/lib/server/facturasJson'
import { FacturaRepository } from '@/lib/server/facturaRepository'

export const dynamic = 'force-dynamic'
export const maxDuration = 180

const runningSyncs = new Map<string, Promise<void>>()
const lastSyncErrors = new Map<string, string>()

function mapAgtDocumentToDocument(agtDoc: any, fallback: Document): Document {
  const documentTotals = agtDoc?.documentTotals || fallback.documentTotals
  const agtLines = Array.isArray(agtDoc?.lines) ? agtDoc.lines : []

  const lines: ProductLine[] = agtLines.map((l: any, idx: number) => {
    const lineNo = Number(l.lineNo ?? l.lineNumber ?? l.line ?? idx + 1)
    const quantity = Number(l.quantity ?? 1)
    const unitPrice = Number(l.unitPrice ?? 0)
    return {
      lineNo,
      productCode: l.productCode,
      productDescription: l.productDescription || l.description || `Linha ${lineNo}`,
      quantity,
      unitOfMeasure: l.unitOfMeasure || l.uom || 'UN',
      unitPrice,
      taxes: Array.isArray(l.taxes) ? l.taxes : [],
      settlementAmount: l.settlementAmount != null ? Number(l.settlementAmount) : undefined,
      referenceInfo: l.referenceInfo,
    }
  })

  return {
    ...fallback,
    documentNo: agtDoc?.documentNo || fallback.documentNo,
    documentType: agtDoc?.documentType || fallback.documentType,
    documentDate: agtDoc?.documentDate || fallback.documentDate,
    documentStatus: agtDoc?.documentStatus || fallback.documentStatus,
    eacCode: agtDoc?.eacCode || fallback.eacCode,
    systemEntryDate: agtDoc?.systemEntryDate || fallback.systemEntryDate,
    customerCountry: agtDoc?.customerCountry || fallback.customerCountry,
    customerTaxID: agtDoc?.customerTaxID || fallback.customerTaxID,
    companyName: agtDoc?.costumerName || agtDoc?.customerName || agtDoc?.companyName || fallback.companyName,
    companyAddress: agtDoc?.companyAddress || fallback.companyAddress,
    lines: lines.length > 0 ? lines : fallback.lines,
    documentTotals: {
      ...fallback.documentTotals,
      netTotal: Number(documentTotals?.netTotal ?? fallback.documentTotals.netTotal ?? 0),
      taxPayable: Number(documentTotals?.taxPayable ?? fallback.documentTotals.taxPayable ?? 0),
      grossTotal: Number(documentTotals?.grossTotal ?? fallback.documentTotals.grossTotal ?? 0),
      currency: documentTotals?.currency || fallback.documentTotals.currency,
    },
  }
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

  const fallbackDoc = backupFactura.documents?.[0]
  const documentNo = fallbackDoc?.documentNo
  const taxRegistrationNumber = backupFactura.taxRegistrationNumber

  if (!documentNo || !taxRegistrationNumber) {
    return NextResponse.json(
      {
        success: true,
        source: 'backup',
        factura: backupFactura,
        warning: 'Factura sem documentNo/taxRegistrationNumber; não é possível consultar na AGT.',
      },
      { status: 200 },
    )
  }

  const payload = {
    taxRegistrationNumber,
    documentNo,
  }

  async function doSyncInBackground(): Promise<void> {
    try {
      const client = createAgtClient()
      const res: any = await (typeof client.consultarFacturaWithTimeout === 'function'
        ? client.consultarFacturaWithTimeout(payload, timeoutMs)
        : client.consultarFactura(payload))

      // Guardar operação de consulta (auditoria)
      try {
        FacturaRepository.saveConsultationOperation('api', payload, res, 'consultarFactura')
      } catch {
        // non-blocking
      }

      const agtDoc = res?.document
      if (!agtDoc) return

      const merged: Factura = {
        ...(backupFactura as any),
        documents: [mapAgtDocumentToDocument(agtDoc, fallbackDoc)],
        agtLastSyncAt: new Date().toISOString(),
        agtConsultarFactura: {
          returnCode: res?.returnCode,
          returnMessage: res?.returnMessage,
        },
      } as any

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
        factura: backupFactura,
        sync: runningSyncs.has(id) ? 'in-progress' : 'started',
        lastError: lastSyncErrors.get(id) || null,
      },
      { status: 200 },
    )
  }

  try {
    const client = createAgtClient()
    const res: any = await (typeof (client as any).consultarFacturaWithTimeout === 'function'
      ? (client as any).consultarFacturaWithTimeout(payload, timeoutMs)
      : client.consultarFactura(payload))

    // Guardar operação de consulta (auditoria)
    try {
      FacturaRepository.saveConsultationOperation('api', payload, res, 'consultarFactura')
    } catch {
      // non-blocking
    }

    const agtDoc = res?.document
    if (!agtDoc) {
      return NextResponse.json(
        {
          success: true,
          source: 'agt-empty',
          factura: backupFactura,
          agt: res,
          warning: 'AGT respondeu mas não retornou document.',
        },
        { status: 200 },
      )
    }

    const merged: Factura = {
      ...(backupFactura as any),
      documents: [mapAgtDocumentToDocument(agtDoc, fallbackDoc)],
      // Guardar um rasto do sync
      agtLastSyncAt: new Date().toISOString(),
      agtConsultarFactura: {
        returnCode: res?.returnCode,
        returnMessage: res?.returnMessage,
      },
    } as any

    await upsertFacturaJson(merged)

    return NextResponse.json(
      {
        success: true,
        source: 'agt',
        factura: merged,
        agt: res,
      },
      { status: 200 },
    )
  } catch (e: any) {
    const msg = e?.message || String(e)

    return NextResponse.json(
      {
        success: true,
        source: 'backup',
        factura: backupFactura,
        error: msg,
      },
      { status: 200 },
    )
  }
}
