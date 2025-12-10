import { NextResponse } from 'next/server'

import {
  getIntegrationStatusReports,
  summarizeIntegrationStatus,
} from '@/lib/server/integrationCatalogue'

export const runtime = 'nodejs'
export const revalidate = 0

function extractTargetIds(url: URL): string[] | undefined {
  const ids = new Set<string>()
  const singleId = url.searchParams.get('id')
  if (singleId) {
    singleId
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
      .forEach((value) => ids.add(value))
  }

  const multi = url.searchParams.getAll('ids')
  multi
    .map((entry) => entry.split(','))
    .flat()
    .map((value) => value.trim())
    .filter(Boolean)
    .forEach((value) => ids.add(value))

  if (ids.size === 0) {
    return undefined
  }

  return Array.from(ids)
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const targetIds = extractTargetIds(url)

  try {
    const reports = await getIntegrationStatusReports(targetIds)
    const summary = summarizeIntegrationStatus(reports)

    return NextResponse.json(
      {
        data: reports,
        summary,
        lastUpdated: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      },
    )
  } catch (error) {
    if (error instanceof Error && error.message === 'INTEGRATION_NOT_FOUND') {
      return NextResponse.json(
        {
          error: 'Integração não encontrada para os identificadores fornecidos.',
        },
        { status: 404 },
      )
    }

    console.error('[api/integrations/status] Falha ao monitorizar integrações', error)
    return NextResponse.json(
      {
        error: 'Falha ao obter o estado das integrações externas.',
      },
      { status: 500 },
    )
  }
}
