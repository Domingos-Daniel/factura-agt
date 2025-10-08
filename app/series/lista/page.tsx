'use client'

import { useEffect, useState } from 'react'
import { getSeries } from '@/lib/storage'
import { Serie, SeriesStatus } from '@/lib/types'
import { MainLayout } from '@/components/layout/MainLayout'
import { TabelaSeries } from '@/components/tables/TabelaSeries'

export default function ListaSeriesPage() {
  const [series, setSeries] = useState<Serie[]>([])
  const [statusFilter, setStatusFilter] = useState<'all' | SeriesStatus>('all')
  
  useEffect(() => {
    const loadedSeries = getSeries()
    setSeries(loadedSeries)
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
        />
      </div>
    </MainLayout>
  )
}
