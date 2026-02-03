import { NextResponse, type NextRequest } from 'next/server'
import { getAllFacturasJson } from '@/lib/server/facturasJson'
import { createAgtClient } from '@/lib/server/agtClient'
import { SettingsRepository } from '@/lib/server/settingsRepository'
import { FacturaRepository } from '@/lib/server/facturaRepository'
import { SessionRepository, UserRepository } from '@/lib/server/userRepository'

export const runtime = 'nodejs'
export const revalidate = 0

interface DashboardStats {
  totalFacturas: number
  totalSeries: number
  facturasThisMonth: number
  totalRevenue: number
  chartData: Array<{ month: string; count: number; revenue: number }>
  source: 'agt' | 'appypay' | 'backup'
  lastUpdated: string
}

export async function GET(request: NextRequest) {
  const now = new Date()
  const thisMonth = now.getMonth()
  const thisYear = now.getFullYear()
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

  let facturas: Array<{
    documentNo: string
    documentDate: string
    grossTotal: number
  }> = []
  let source: 'agt' | 'appypay' | 'backup' = 'backup'

  // Determinar NIF do utilizador (preferencial) -> filtrar resultados por este NIF
  let sellerNIF: string | null = null
  try {
    const cookieToken = request.cookies.get('auth_token')?.value
    if (cookieToken) {
      const session = SessionRepository.findByToken(cookieToken)
      if (session) {
        const user = UserRepository.findById(session.user_id)
        if (user?.nif) sellerNIF = user.nif
      }
    }
  } catch (err) {
    console.warn('⚠️ Dashboard: não foi possível obter NIF do utilizador da sessão', err)
  }

  // Obter provedor ativo da configuração (para fallback de NIF quando não autenticado)
  const providerConfig = SettingsRepository.getProviderConfig()
  const activeProvider = providerConfig?.activeProvider || 'appypay'
  if (!sellerNIF && providerConfig?.nif) sellerNIF = providerConfig.nif || null

  console.log(`📊 Dashboard: Buscando dados do provedor ${activeProvider} (filtro NIF: ${sellerNIF})`)

  // Tentar buscar do provedor ativo
  if (activeProvider === 'appypay') {
    try {
      // Buscar facturas do AppyPay salvas no repositório (filtra por metadata.nif quando disponível)
      const appypayOps = FacturaRepository.listAllFacturas().filter((op: any) => {
        if (!sellerNIF) return true
        return op?.metadata?.nif === sellerNIF || op?.request?.taxRegistrationNumber === sellerNIF
      })
      
      if (appypayOps.length > 0) {
        facturas = appypayOps.flatMap((op: any) => {
          // Extrair documentos da response
          const docs = op.response?.documents || (op.response ? [op.response] : [])
          return docs.map((doc: any) => ({
            documentNo: doc.reference || doc.fiscal_document?.reference || doc.documentNo || '',
            documentDate: doc.issue_date || doc.fiscal_document?.issue_date || doc.documentDate || new Date().toISOString(),
            grossTotal: parseFloat(doc.total_amount || doc.fiscal_document?.total_amount || doc.grossTotal || '0') || 0
          }))
        })
        source = 'appypay'
        console.log(`📊 Dashboard stats: ${facturas.length} facturas do AppyPay (filtradas por NIF)`)
      }
    } catch (error) {
      console.error('⚠️ Falha ao buscar do AppyPay:', error)
    }
  } else if (activeProvider === 'agt') {
    try {
      const client = createAgtClient()
      const listarPayload: any = {
        queryStartDate: '2020-01-01',
        queryEndDate: now.toISOString().substring(0, 10),
      }
      if (sellerNIF) listarPayload.taxRegistrationNumber = sellerNIF

      const agtResponse = await client.listarFacturas(listarPayload)

      if (agtResponse.success && agtResponse.data?.statusResult?.resultEntryList) {
        const list = agtResponse.data.statusResult.resultEntryList
        if (Array.isArray(list) && list.length > 0) {
          facturas = list
            .map((item: any) => {
              const doc = item.documentEntryResult || item
              const docNif = doc.taxRegistrationNumber || doc.taxRegistrationNumbers || doc.companyTaxID || null
              return {
                documentNo: doc.documentNo || '',
                documentDate: doc.documentDate || '',
                grossTotal: parseFloat(doc.grossTotal || doc.documentTotals?.grossTotal || '0') || 0,
                nif: docNif,
              }
            })
            .filter((d: any) => !sellerNIF || d.nif === sellerNIF)
            .map((d: any) => ({ documentNo: d.documentNo, documentDate: d.documentDate, grossTotal: d.grossTotal }))

          source = 'agt'
          console.log(`📊 Dashboard stats: ${facturas.length} facturas da AGT (filtradas por NIF)`)
        }
      }
    } catch (error) {
      console.error('⚠️ Falha ao buscar da AGT:', error)
    }
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
