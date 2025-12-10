'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FileText, FileStack, TrendingUp, Plus } from 'lucide-react'

import { isAuthenticated, getFacturas, getSeries } from '@/lib/storage'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { MetricCard } from '@/components/MetricCard'
import { ChartFacturasMes, type ChartFacturasMesData } from '@/components/charts/ChartFacturasMes'
import { seedMockData } from '@/lib/mockData'
import { IntegrationStatusBoard } from '@/components/integrations/IntegrationStatusBoard'

export default function DashboardPage() {
  const router = useRouter()
  const [metrics, setMetrics] = useState({
    totalFacturas: 0,
    totalSeries: 0,
    facturasThisMonth: 0,
    totalRevenue: 0,
  })
  const [chartData, setChartData] = useState<ChartFacturasMesData[]>([])
  
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login')
      return
    }
    
    seedMockData()

    // Carregar métricas
    const facturas = getFacturas()
    const series = getSeries()
    
    const now = new Date()
    const thisMonth = now.getMonth()
    const thisYear = now.getFullYear()
    
    const facturasThisMonth = facturas.filter((f) => {
      const date = new Date(f.submissionTimeStamp)
      return date.getMonth() === thisMonth && date.getFullYear() === thisYear
    })
    
    const totalRevenue = facturas.reduce((acc, f) => {
      return acc + f.documents.reduce((sum, d) => sum + d.documentTotals.grossTotal, 0)
    }, 0)
    
    setMetrics({
      totalFacturas: facturas.length,
      totalSeries: series.length,
      facturasThisMonth: facturasThisMonth.length,
      totalRevenue,
    })
    
    // Preparar dados do gráfico (últimos 6 meses)
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    const data: ChartFacturasMesData[] = Array.from({ length: 6 }, (_, i) => {
      const offset = thisMonth - 5 + i
      const monthIndex = (offset + 12) % 12
      const yearForMonth = thisYear + Math.floor(offset / 12)

      const monthlyDocs = facturas.filter((f) => {
        const date = new Date(f.submissionTimeStamp)
        return date.getMonth() === monthIndex && date.getFullYear() === yearForMonth
      })
      const count = monthlyDocs.length
      const revenue = monthlyDocs.reduce((acc, factura) => {
        return acc + factura.documents.reduce((sum, doc) => sum + doc.documentTotals.grossTotal, 0)
      }, 0)
      
      return {
        month: months[monthIndex],
        count,
        revenue,
      }
    })
    
    setChartData(data)
  }, [router])
  
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Visão geral do sistema de faturação eletrónica
          </p>
        </div>
        
        {/* Métricas */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total de Facturas"
            description="Facturas registadas"
            value={metrics.totalFacturas}
            icon={FileText}
            variant="primary"
          />
          <MetricCard
            title="Séries Ativas"
            description="Séries de numeração"
            value={metrics.totalSeries}
            icon={FileStack}
            variant="success"
          />
          <MetricCard
            title="Este mês"
            description="Facturas emitidas"
            value={metrics.facturasThisMonth}
            icon={TrendingUp}
            variant="warning"
          />
          <MetricCard
            title="Receita Total"
            description="Total faturado"
            value={formatCurrency(metrics.totalRevenue)}
            icon={TrendingUp}
            variant="primary"
          />
        </div>
        
  <IntegrationStatusBoard />

  {/* Gráfico */}
  <ChartFacturasMes data={chartData} />
        
        {/* Ações Rápidas */}
        <Card className="overflow-hidden border-border/50 bg-gradient-to-br from-card to-card/80 shadow-sm">
          <CardHeader>
            <CardTitle className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
              Ações Rápidas
            </CardTitle>
            <CardDescription>Acesso rápido às funcionalidades principais</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Link href="/facturas/nova" className="group">
              <div className="w-full h-20 p-4 rounded-xl border border-blue-200/50 bg-gradient-to-br from-blue-50/80 via-blue-50/60 to-blue-50/40 dark:from-blue-950/20 dark:via-blue-950/30 dark:to-blue-950/20 dark:border-blue-800/30 hover:shadow-md transition-all duration-200 hover:border-blue-300/60 dark:hover:border-blue-700/50 cursor-pointer">
                <div className="flex items-start gap-3 h-full">
                  <div className="p-2 rounded-lg bg-blue-100/80 dark:bg-blue-900/40 group-hover:bg-blue-200/80 dark:group-hover:bg-blue-800/60 transition-colors duration-200">
                    <Plus className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-blue-900 dark:text-blue-100 mb-1 group-hover:text-blue-700 dark:group-hover:text-blue-200 transition-colors duration-200">
                      Nova Factura
                    </div>
                    <p className="text-xs text-blue-700/80 dark:text-blue-300/80">
                      Criar uma nova factura eletrónica
                    </p>
                  </div>
                </div>
              </div>
            </Link>
            
            <Link href="/series/nova" className="group">
              <div className="w-full h-20 p-4 rounded-xl border border-emerald-200/50 bg-gradient-to-br from-emerald-50/80 via-emerald-50/60 to-emerald-50/40 dark:from-emerald-950/20 dark:via-emerald-950/30 dark:to-emerald-950/20 dark:border-emerald-800/30 hover:shadow-md transition-all duration-200 hover:border-emerald-300/60 dark:hover:border-emerald-700/50 cursor-pointer">
                <div className="flex items-start gap-3 h-full">
                  <div className="p-2 rounded-lg bg-emerald-100/80 dark:bg-emerald-900/40 group-hover:bg-emerald-200/80 dark:group-hover:bg-emerald-800/60 transition-colors duration-200">
                    <Plus className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-emerald-900 dark:text-emerald-100 mb-1 group-hover:text-emerald-700 dark:group-hover:text-emerald-200 transition-colors duration-200">
                      Nova Série
                    </div>
                    <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80">
                      Solicitar nova série de numeração
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
