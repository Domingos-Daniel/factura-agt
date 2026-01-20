import 'server-only'

import { promises as fs } from 'fs'
import { join } from 'path'
import type { Factura } from '@/lib/types'

const DATA_DIR = join(process.cwd(), 'data')
const FACTURAS_JSON = join(DATA_DIR, 'facturas.json')

async function readAll(): Promise<Factura[]> {
  try {
    const raw = await fs.readFile(FACTURAS_JSON, 'utf-8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Factura[]) : []
  } catch {
    return []
  }
}

async function writeAll(facturas: Factura[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(FACTURAS_JSON, JSON.stringify(facturas, null, 2), 'utf-8')
}

export async function getFacturaJsonById(id: string): Promise<Factura | null> {
  const all = await readAll()
  return (all.find((f: any) => f?.id === id) as Factura | undefined) ?? null
}

export async function upsertFacturaJson(nextFactura: Factura): Promise<void> {
  const existing = await readAll()

  const nextId = (nextFactura as any)?.id || (nextFactura as any)?.submissionGUID
  const nextDocNo = (nextFactura as any)?.documents?.[0]?.documentNo
  const nextNif = (nextFactura as any)?.taxRegistrationNumber

  const idx = existing.findIndex((f: any) => {
    const fid = f?.id || f?.submissionGUID
    if (fid && nextId && fid === nextId) return true
    const fDocNo = f?.documents?.[0]?.documentNo
    const fNif = f?.taxRegistrationNumber
    return !!nextDocNo && !!nextNif && fDocNo === nextDocNo && fNif === nextNif
  })

  const now = new Date().toISOString()
  const merged: Factura = {
    ...(idx >= 0 ? (existing[idx] as any) : {}),
    ...(nextFactura as any),
    id: nextId,
    createdAt: (idx >= 0 ? (existing[idx] as any)?.createdAt : undefined) || (nextFactura as any)?.createdAt || now,
    updatedAt: now,
  }

  if (idx >= 0) existing[idx] = merged
  else existing.push(merged)

  await writeAll(existing)
}

export async function getAllFacturasJson(): Promise<Factura[]> {
  return await readAll()
}

export async function replaceAllFacturasJson(facturas: Factura[]): Promise<void> {
  await writeAll(facturas)
}

export async function updateFacturaEstadoJson(
  id: string,
  estado: {
    validationStatus?: 'P' | 'V' | 'I'
    validationDate?: string
    validationMessages?: string[]
    agtEstadoLastSyncAt?: string
    requestID?: string
  }
): Promise<void> {
  const existing = await readAll()
  const idx = existing.findIndex((f: any) => f?.id === id)
  
  if (idx < 0) return
  
  existing[idx] = {
    ...existing[idx],
    ...estado,
    updatedAt: new Date().toISOString()
  } as any
  
  await writeAll(existing)
}
