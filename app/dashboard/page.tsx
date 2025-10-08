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
          />
          <MetricCard
            title="Séries Ativas"
            description="Séries de numeração"
            value={metrics.totalSeries}
            icon={FileStack}
          />
          <MetricCard
            title="Este mês"
            description="Facturas emitidas"
            value={metrics.facturasThisMonth}
            icon={TrendingUp}
          />
          <MetricCard
            title="Receita Total"
            description="Total faturado"
            value={formatCurrency(metrics.totalRevenue)}
            icon={TrendingUp}
          />
        </div>
        
        {/* Gráfico */}
        <ChartFacturasMes data={chartData} />
        
        {/* Ações Rápidas */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>Acesso rápido às funcionalidades principais</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Link href="/facturas/nova">
              <Button variant="outline" className="w-full h-20 text-left justify-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Plus className="h-4 w-4" />
                    <span className="font-semibold">Nova Factura</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Criar uma nova factura eletrónica
                  </p>
                </div>
              </Button>
            </Link>
            
            <Link href="/series/nova">
              <Button variant="outline" className="w-full h-20 text-left justify-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Plus className="h-4 w-4" />
                    <span className="font-semibold">Nova Série</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Solicitar nova série de numeração
                  </p>
                </div>
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
