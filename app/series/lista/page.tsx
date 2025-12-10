'use client'

import { useEffect, useState } from 'react'
import { getSeries, updateSerie } from '@/lib/storage'
import { Serie, SeriesStatus } from '@/lib/types'
import { MainLayout } from '@/components/layout/MainLayout'
import { TabelaSeries } from '@/components/tables/TabelaSeries'
import { useToast } from '@/components/ui/use-toast'

export default function ListaSeriesPage() {
  const [series, setSeries] = useState<Serie[]>([])
  const [statusFilter, setStatusFilter] = useState<'all' | SeriesStatus>('all')
  const { toast } = useToast()

  const handleToggleStatus = (serieId: string, newStatus: SeriesStatus) => {
    updateSerie(serieId, { status: newStatus })
    setSeries((prev) => prev.map((s) => (s.id === serieId ? { ...s, status: newStatus } : s)))
    toast({
      title: 'Status atualizado',
      description: `Série ${newStatus === 'F' ? 'fechada' : 'reaberta'} com sucesso.`,
    })
  }
  
  useEffect(() => {
    // Carregar séries do localStorage (com seed automático na primeira vez)
    const loadSeries = () => {
      const data = getSeries()
      setSeries(data)
    }
    
    loadSeries()
  }, [])
  
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Séries de Numeração</h2>
          <p className="text-muted-foreground">
            Gerencie as séries de numeração dos seus documentos
          </p>
        </div>

        <TabelaSeries
          data={series}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onToggleStatus={handleToggleStatus}
        />
      </div>
    </MainLayout>
  )
}
