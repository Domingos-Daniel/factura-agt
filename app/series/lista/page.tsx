'use client'

import { useCallback, useEffect, useState } from 'react'
import { Serie, SeriesStatus } from '@/lib/types'

export const dynamic = 'force-dynamic'
import { MainLayout } from '@/components/layout/MainLayout'
import { TabelaSeries } from '@/components/tables/TabelaSeries'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'

export default function ListaSeriesPage() {
  const [series, setSeries] = useState<Serie[]>([])
  const [statusFilter, setStatusFilter] = useState<'all' | SeriesStatus>('all')
  const [documentTypeFilter, setDocumentTypeFilter] = useState<string>('all')
  const [pageSize, setPageSize] = useState<number>(50)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [loading, setLoading] = useState(false)
  const [source, setSource] = useState<'agt' | 'backup' | null>(null)
  const { toast } = useToast()

  const loadSeries = useCallback(async (opts?: { refresh?: boolean }) => {
    setLoading(true)
    try {
      const doRefresh = opts?.refresh ?? true
      const qs = doRefresh ? '?refresh=true' : ''
      const res = await fetch(`/api/series/agt${qs}`, { cache: 'no-store' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || `Erro ${res.status}`)
      setSeries(Array.isArray(json?.series) ? json.series : [])
      setSource(json?.source === 'agt' ? 'agt' : 'backup')
      if (json?.warning) {
        toast({ title: 'Aviso', description: String(json.warning) })
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao carregar séries', description: e?.message || 'Falha' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const handleToggleStatus = async (serieId: string, newStatus: SeriesStatus) => {
    setSeries((prev) => prev.map((s) => (s.id === serieId ? { ...s, status: newStatus } : s)))
    try {
      const res = await fetch('/api/series/backup', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: serieId, updates: { status: newStatus } }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || `Erro ${res.status}`)
      toast({
        title: 'Status atualizado',
        description: `Série ${newStatus === 'F' ? 'fechada' : 'reaberta'} com sucesso.`,
      })
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Falha ao salvar', description: e?.message || 'Erro' })
    }
  }
  
  useEffect(() => {
    loadSeries({ refresh: true })
  }, [loadSeries])
  
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Séries de Numeração</h2>
          <p className="text-muted-foreground">
            Gerencie as séries de numeração dos seus documentos
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Fonte: {source === 'agt' ? 'AGT' : source === 'backup' ? 'Backup' : '...'}
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => loadSeries({ refresh: true })} disabled={loading} variant="secondary">
            {loading ? 'A carregar...' : 'Atualizar da AGT'}
          </Button>
        </div>

        <TabelaSeries
          data={series}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          documentTypeFilter={documentTypeFilter}
          onDocumentTypeFilterChange={setDocumentTypeFilter}
          pageSize={pageSize}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setCurrentPage(1)
          }}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          onToggleStatus={handleToggleStatus}
        />
      </div>
    </MainLayout>
  )
}
