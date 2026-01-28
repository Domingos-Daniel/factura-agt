import { NextResponse } from 'next/server'
import { getAllFacturasJson } from '@/lib/server/facturasJson'
import { getAGTClient } from '@/lib/server/agtClient'

export const runtime = 'nodejs'
export const revalidate = 0

interface DashboardStats {
  totalFacturas: number
  totalSeries: number
  facturasThisMonth: number
  totalRevenue: number
  chartData: Array<{ month: string; count: number; revenue: number }>
  source: 'agt' | 'backup'
  lastUpdated: string
}

export async function GET() {
  const now = new Date()
  const thisMonth = now.getMonth()
  const thisYear = now.getFullYear()
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

  let facturas: Array<{
    documentNo: string
    documentDate: string
    grossTotal: number
  }> = []
  let source: 'agt' | 'backup' = 'backup'

  // Tentar buscar da AGT primeiro
  try {
    const client = getAGTClient()
    const agtResponse = await client.listarFacturas({
      queryStartDate: '2020-01-01',
      queryEndDate: now.toISOString().substring(0, 10),
    })

    if (agtResponse.success && agtResponse.data?.statusResult?.resultEntryList) {
      const list = agtResponse.data.statusResult.resultEntryList
      if (Array.isArray(list) && list.length > 0) {
        facturas = list.map((item: any) => {
          const doc = item.documentEntryResult || item
          return {
            documentNo: doc.documentNo || '',
            documentDate: doc.documentDate || '',
            grossTotal: parseFloat(doc.grossTotal || doc.documentTotals?.grossTotal || '0') || 0
          }
        })
        source = 'agt'
        console.log(`📊 Dashboard stats: ${facturas.length} facturas da AGT`)
      }
    }
  } catch (error) {
    console.error('⚠️ Falha ao buscar da AGT, usando backup:', error)
  }

  // Se não conseguiu da AGT, usar backup local
  if (facturas.length === 0) {
    try {
      const backupFacturas = await getAllFacturasJson()
      facturas = backupFacturas.flatMap((f: any) => 
        (f.documents || []).map((d: any) => ({
          documentNo: d.documentNo || '',
          documentDate: f.submissionTimeStamp || d.documentDate || '',
          grossTotal: d.documentTotals?.grossTotal || d.grossTotal || 0
        }))
      )
      source = 'backup'
      console.log(`📊 Dashboard stats: ${facturas.length} facturas do backup JSON`)
    } catch (error) {
      console.error('❌ Falha ao ler backup:', error)
    }
  }

  // Calcular métricas
  const facturasThisMonth = facturas.filter((f) => {
    const date = new Date(f.documentDate)
    return date.getMonth() === thisMonth && date.getFullYear() === thisYear
  })

  const totalRevenue = facturas.reduce((acc, f) => acc + (f.grossTotal || 0), 0)

  // Preparar dados do gráfico (últimos 6 meses)
  const chartData = Array.from({ length: 6 }, (_, i) => {
    const offset = thisMonth - 5 + i
    const monthIndex = (offset + 12) % 12
    const yearForMonth = thisYear + Math.floor(offset / 12)

    const monthlyDocs = facturas.filter((f) => {
      const date = new Date(f.documentDate)
      return date.getMonth() === monthIndex && date.getFullYear() === yearForMonth
    })

    return {
      month: months[monthIndex],
      count: monthlyDocs.length,
      revenue: monthlyDocs.reduce((acc, f) => acc + (f.grossTotal || 0), 0)
    }
  })

  const stats: DashboardStats = {
    totalFacturas: facturas.length,
    totalSeries: 0, // Séries são geridas separadamente
    facturasThisMonth: facturasThisMonth.length,
    totalRevenue,
    chartData,
    source,
    lastUpdated: now.toISOString()
  }

  return NextResponse.json(stats, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  })
}
