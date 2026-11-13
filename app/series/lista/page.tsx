'use client'

import { useCallback, useEffect, useState } from 'react'
import { Serie, SeriesStatus } from '@/lib/types'

export const dynamic = 'force-dynamic'
import { MainLayout } from '@/components/layout/MainLayout'
import { TabelaSeries } from '@/components/tables/TabelaSeries'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { Badge } from '@/components/ui/badge'

export default function ListaSeriesPage() {
  const [series, setSeries] = useState<Serie[]>([])
  const [statusFilter, setStatusFilter] = useState<'all' | SeriesStatus>('all')
  const [documentTypeFilter, setDocumentTypeFilter] = useState<string>('all')
  const [pageSize, setPageSize] = useState<number>(50)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [loading, setLoading] = useState(false)
  const [source, setSource] = useState<'agt' | 'appypay' | 'backup' | null>(null)
  const [provider, setProvider] = useState<'agt' | 'appypay' | null>(null)
  const { toast } = useToast()

  const [agtError, setAgtError] = useState<string | null>(null)
  const [showRaw, setShowRaw] = useState(false)
  const [backupCorrupted, setBackupCorrupted] = useState(false)

  // helpers
  const unwrapAgtMessage = (msg?: string | null): string | null => {
    if (!msg) return msg
    try {
      const o = JSON.parse(msg)
      if (typeof o.error === 'string') return o.error
      if (typeof o.agtError === 'string') return o.agtError
    } catch {
      // not JSON, ignore
    }
    return msg
  }

  const formatAgtError = (raw?: string | null) => {
    if (!raw) return ''
    const prefix = 'AGT raw:'
    if (raw.startsWith(prefix)) {
      const payload = raw.slice(prefix.length).trim()
      try {
        const obj = JSON.parse(payload)
        if (obj.errorList && Array.isArray(obj.errorList)) {
          return obj.errorList.map((e: any) => `${e.idError}: ${e.descriptionError}`).join('; ')
        }
        return payload
      } catch {
        return payload
      }
    }
    return raw
  }

  const loadSeries = useCallback(async (opts?: { refresh?: boolean }) => {
    setLoading(true)
    try {
      const doRefresh = opts?.refresh ?? true
      const qs = doRefresh ? '?refresh=true' : ''
      const res = await fetch(`/api/series/agt${qs}`, { cache: 'no-store' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        // stringify entire response so caller can see payload
        const detail = Object.keys(json).length ? JSON.stringify(json, null, 2) : `Status ${res.status}`
        throw new Error(detail)
      }

      setSeries(Array.isArray(json?.series) ? json.series : [])
      setSource(json?.source || 'backup')
      setProvider(json?.provider || 'agt')

      if (json?.warning) {
        const msg = String(json.warning)
        setAgtError(msg)
        toast({ title: 'Aviso', description: formatAgtError(msg) })
        if (msg.toLowerCase().includes('corrompido')) {
          setBackupCorrupted(false)
          toast({ title: 'Backup removido', description: 'Backup de séries corrompido apagado.' })
        }
      } else {
        setAgtError(null)
      }
      if (json?.error && String(json.error).includes('Erro ao analisar backup local')) {
        setBackupCorrupted(true)
        setAgtError(String(json.error))
      }
    } catch (e: any) {
      const msg = unwrapAgtMessage(e?.message || '')
      toast({ variant: 'destructive', title: 'Erro ao carregar séries', description: formatAgtError(msg || '') })
      setAgtError(msg)
      setSeries([]) // clear list to ensure user sees empty state
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
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-3xl font-bold tracking-tight">Séries de Numeração</h2>
            {provider && (
              <Badge variant={provider === 'appypay' ? 'default' : 'secondary'}>
                {provider === 'appypay' ? 'AppyPay' : 'AGT'}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            Gerencie as séries de numeração dos seus documentos
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Fonte: {source === 'appypay' ? 'AppyPay API' : source === 'agt' ? 'AGT API' : source === 'backup' ? 'Backup local' : '...'}
          </p>
          {agtError && (
            <div className="mt-2 p-2 bg-yellow-50 text-yellow-800 rounded">
              <p className="font-semibold">Erro ao contactar AGT:</p>
              <p className="text-sm">{formatAgtError(agtError)}</p>
              <button
                className="text-xs text-blue-600 hover:underline mt-1"
                onClick={() => setShowRaw((prev) => !prev)}
              >
                {showRaw ? 'Ocultar detalhes' : 'Mostrar detalhes'}
              </button>
              {showRaw && (
                <pre className="mt-2 text-xs break-words whitespace-pre-wrap bg-white p-2 rounded">
                  {agtError}
                </pre>
              )}
            </div>
          )}
          {backupCorrupted && (
            <div className="mt-2 p-2 bg-red-50 text-red-800 rounded">
              <p className="font-semibold">Backup local corrompido</p>
              <p className="text-sm">Não foi possível ler o ficheiro de backup. Clique em "Limpar" e actualize.</p>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button onClick={() => loadSeries({ refresh: true })} disabled={loading} variant="secondary">
            {loading ? 'A carregar...' : `Atualizar de ${provider === 'appypay' ? 'AppyPay' : 'AGT'}`}
          </Button>
          {agtError && (
            <Button
              onClick={() => loadSeries({ refresh: false })}
              disabled={loading}
              variant="outline"
              className="ml-2"
            >
              Usar backup local
            </Button>
          )}
          {backupCorrupted && (
            <Button
              onClick={async () => {
                await fetch('/api/series/agt?reset=1')
                setBackupCorrupted(false)
                toast({ title: 'Backup limpo' })
                // refetch from provider to rebuild cache
                loadSeries({ refresh: true })
              }}
              disabled={loading}
              variant="destructive"
              className="ml-2"
            >
              Limpar backup
            </Button>
          )}
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
