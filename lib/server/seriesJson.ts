import 'server-only'

import { promises as fs } from 'fs'
import { join } from 'path'
import type { Serie } from '@/lib/types'

const DATA_DIR = join(process.cwd(), 'data')
const SERIES_JSON = join(DATA_DIR, 'series.json')

async function readAll(): Promise<any[]> {
  try {
    const raw = await fs.readFile(SERIES_JSON, 'utf-8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function writeAll(series: any[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(SERIES_JSON, JSON.stringify(series, null, 2), 'utf-8')
}

export async function getAllSeriesJson(): Promise<Serie[]> {
  return (await readAll()) as Serie[]
}

export async function upsertSerieJson(nextSerie: Serie & Record<string, any>): Promise<void> {
  const existing = await readAll()

  const nextId = nextSerie?.id || `${nextSerie.seriesCode}-${nextSerie.seriesYear}-${nextSerie.documentType}`

  const idx = existing.findIndex((s: any) => {
    const sid = s?.id || `${s?.seriesCode}-${s?.seriesYear}-${s?.documentType}`
    if (sid && nextId && sid === nextId) return true
    return (
      !!s?.seriesCode &&
      !!nextSerie?.seriesCode &&
      s.seriesCode === nextSerie.seriesCode &&
      s.seriesYear === nextSerie.seriesYear &&
      s.documentType === nextSerie.documentType
    )
  })

  const now = new Date().toISOString()
  const merged = {
    ...(idx >= 0 ? existing[idx] : {}),
    ...nextSerie,
    id: nextId,
    updatedAt: now,
    createdAt: (idx >= 0 ? existing[idx]?.createdAt : undefined) || nextSerie?.createdAt || now,
  }

  if (idx >= 0) existing[idx] = merged
  else existing.push(merged)

  await writeAll(existing)
}

export async function replaceAllSeriesJson(series: Array<Serie & Record<string, any>>): Promise<void> {
  const now = new Date().toISOString()
  const normalized = series.map((s) => ({
    ...s,
    id: s?.id || `${s.seriesCode}-${s.seriesYear}-${s.documentType}`,
    createdAt: (s as any)?.createdAt || now,
    updatedAt: now,
  }))
  await writeAll(normalized)
}

export async function patchSerieJson(id: string, updates: Partial<Serie> & Record<string, any>): Promise<Serie | null> {
  const existing = await readAll()
  const idx = existing.findIndex((s: any) => (s?.id || '') === id)
  if (idx < 0) return null

  const now = new Date().toISOString()
  existing[idx] = {
    ...existing[idx],
    ...updates,
    id,
    updatedAt: now,
  }

  await writeAll(existing)
  return existing[idx] as Serie
}
