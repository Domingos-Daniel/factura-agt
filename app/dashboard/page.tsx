'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
import { FileText, FileStack, TrendingUp, Plus, AlertCircle, RefreshCw, Database } from 'lucide-react'

import { isAuthenticated, getSeries } from '@/lib/storage'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { MetricCard } from '@/components/MetricCard'
import { ChartFacturasMes, type ChartFacturasMesData } from '@/components/charts/ChartFacturasMes'
import { EnvironmentStatusCard } from '@/components/integrations/EnvironmentStatusCard'
import { Badge } from '@/components/ui/badge'

export default function DashboardPage() {
  const router = useRouter()
  const [metrics, setMetrics] = useState({
    totalFacturas: 0,
    totalSeries: 0,
    facturasThisMonth: 0,
    totalRevenue: 0,
  })
  const [chartData, setChartData] = useState<ChartFacturasMesData[]>([])
  const [dataSource, setDataSource] = useState<'agt' | 'backup' | 'loading'>('loading')
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  const loadData = async () => {
    if (!isAuthenticated()) {
      router.push('/login')
      return
    }
    
    setIsRefreshing(true)
    setDataSource('loading')
    
    try {
      // Buscar stats da API (AGT ou backup JSON)
      const response = await fetch('/api/dashboard/stats', {
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (response.ok) {
        const data = await response.json()
        
        // Buscar séries localmente
        const series = getSeries()
        
        setMetrics({
          totalFacturas: data.totalFacturas || 0,
          totalSeries: series.length,
          facturasThisMonth: data.facturasThisMonth || 0,
          totalRevenue: data.totalRevenue || 0,
        })
        
        setChartData(data.chartData || [])
        setDataSource(data.source || 'backup')
      } else {
        console.error('Erro ao buscar stats:', response.statusText)
        setDataSource('backup')
      }
    } catch (error) {
      console.error('Erro ao buscar stats:', error)
      setDataSource('backup')
    }
    
    setIsRefreshing(false)
  }
  
  useEffect(() => {
    loadData()
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
        
        {/* Indicador de fonte dos dados */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {dataSource === 'loading' ? (
              <Badge variant="outline" className="gap-1">
                <RefreshCw className="h-3 w-3 animate-spin" />
                A carregar...
              </Badge>
            ) : dataSource === 'agt' ? (
              <Badge className="bg-green-600 text-white gap-1">
                <FileText className="h-3 w-3" />
                Dados da AGT
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-600">
                <Database className="h-3 w-3" />
                Backup
              </Badge>
            )}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadData}
            disabled={isRefreshing}
            className="gap-1"
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
        
        {/* Card de ambiente */}
        <EnvironmentStatusCard />

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
