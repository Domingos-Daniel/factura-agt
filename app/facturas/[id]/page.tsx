'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'

import type { Factura } from '@/lib/types'
import { getFacturaById } from '@/lib/storage'
import { MainLayout } from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/button'
import { FacturaDetail } from '@/components/FacturaDetail'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'

type AgtConsultResponse =
  | {
      success: true
      source: 'agt' | 'backup' | 'agt-empty'
      factura: Factura
      agt?: any
      warning?: string
      error?: string
    }
  | {
      success: false
      error: string
    }

export default function FacturaDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [factura, setFactura] = useState<Factura | null>(null)
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState<'local' | 'json' | 'agt' | 'backup' | 'agt-empty' | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    async function loadFactura() {
      if (!params?.id) {
        setLoading(false)
        return
      }
      
      // Primeiro tenta buscar do localStorage
      const localDoc = getFacturaById(params.id)
      if (localDoc) {
        setFactura(localDoc)
        setSource('local')
        setLoading(false)
        return
      }
      
      // Se não encontrar, busca da API (que inclui o JSON)
      try {
        const response = await fetch(`/api/facturas/${params.id}`)
        if (response.ok) {
          const data = await response.json()
          if (data.factura) {
            setFactura(data.factura)
            setSource(data.source === 'json' ? 'json' : null)
            setLoading(false)
            return
          }
        }
      } catch (error) {
        console.error('Erro ao buscar factura:', error)
      }
      
      // Factura não encontrada em nenhum lugar
      setLoading(false)
    }
    
    loadFactura()
  }, [params?.id])

  useEffect(() => {
    return () => {
      abortController?.abort()
    }
  }, [abortController])

  async function pollForSyncCompletion(id: string, startedAt: number) {
    const maxWaitMs = 3 * 60 * 1000
    const intervalMs = 8000

    while (Date.now() - startedAt < maxWaitMs) {
      await new Promise((r) => setTimeout(r, intervalMs))
      try {
        const response = await fetch(`/api/facturas/${encodeURIComponent(id)}`, { method: 'GET' })
        if (!response.ok) continue
        const data = await response.json()
        if (data?.factura) {
          const maybeLastSync = data.factura?.agtLastSyncAt
          if (maybeLastSync) {
            setFactura(data.factura)
            setSource('agt')
            toast({
              title: 'Sync concluído',
              description: 'Dados atualizados a partir da AGT e gravados no backup.',
            })
            return
          }
        }
      } catch {
        // ignore transient polling failures
      }
    }
  }

  async function handleSyncFromAgt(opts?: { async?: boolean; silent?: boolean }) {
    if (!params?.id || isSyncing) return

    const controller = new AbortController()
    setAbortController(controller)
    setIsSyncing(true)
    setSyncError(null)
    setSyncMessage('A contactar a AGT…')

    const milestone1 = window.setTimeout(() => setSyncMessage('A validar documento e a aguardar resposta…'), 6000)
    const milestone2 = window.setTimeout(() => setSyncMessage('A consolidar dados e atualizar o backup…'), 14000)

    try {
      const useAsync = opts?.async ?? true
      const url = `/api/facturas/agt/consultar?id=${encodeURIComponent(params.id)}${useAsync ? '&async=1' : ''}`
      const response = await fetch(url,
        {
          method: 'GET',
          signal: controller.signal,
        }
      )

      const result = (await response.json()) as AgtConsultResponse

      if (!response.ok || !result.success) {
        const message = (result as any)?.error ?? 'Falha ao consultar a AGT.'
        setSyncError(message)
        if (!opts?.silent) {
          toast({
            variant: 'destructive',
            title: 'Consulta AGT falhou',
            description: message,
          })
        }
        return
      }

      setFactura(result.factura)
      setSource(result.source)

      if (useAsync) {
        setSyncMessage('Sync iniciado em background. Vou atualizar quando terminar…')
        void pollForSyncCompletion(params.id, Date.now())
      }

      if (result.warning) {
        if (!opts?.silent) {
          toast({
            title: 'Consulta concluída (com aviso)',
            description: result.warning,
          })
        }
      } else if (result.source === 'agt') {
        if (!opts?.silent) {
          toast({
            title: 'Dados atualizados da AGT',
            description: 'Os detalhes do documento foram sincronizados e guardados no backup.',
          })
        }
      } else {
        if (!opts?.silent) {
          toast({
            title: 'AGT indisponível',
            description: 'A mostrar dados do backup. Tente novamente mais tarde.',
          })
        }
      }

      if (result.error) {
        setSyncError(result.error)
      }
    } catch (error) {
      if ((error as any)?.name === 'AbortError') {
        setSyncError('Operação cancelada pelo utilizador.')
        return
      }
      const message = error instanceof Error ? error.message : 'Falha ao consultar a AGT.'
      setSyncError(message)
      toast({
        variant: 'destructive',
        title: 'Erro de conexão',
        description: message,
      })
    } finally {
      window.clearTimeout(milestone1)
      window.clearTimeout(milestone2)
      setIsSyncing(false)
      // Se for async, deixamos a mensagem enquanto o polling acontece
      if (!(opts?.async ?? true)) setSyncMessage(null)
      setAbortController(null)
    }
  }

  function handleCancelSync() {
    abortController?.abort()
  }

  const sourceBadge = (() => {
    if (!source) return null
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      agt: 'default',
      backup: 'secondary',
      'agt-empty': 'secondary',
      json: 'secondary',
      local: 'secondary',
    }
    const labels: Record<string, string> = {
      agt: 'AGT',
      backup: 'Backup',
      'agt-empty': 'AGT (sem documento)',
      json: 'JSON',
      local: 'Local',
    }

    return <Badge variant={variants[source]}>{labels[source] ?? source}</Badge>
  })()

  const lastSyncAt = (factura as any)?.agtLastSyncAt as string | undefined

  useEffect(() => {
    if (!factura?.id) return
    // Auto-sync: se ainda não houver sync AGT, tenta iniciar em background.
    if ((factura as any)?.agtLastSyncAt) return
    const t = window.setTimeout(() => {
      void handleSyncFromAgt({ async: true, silent: true })
    }, 800)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [factura?.id])

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/facturas/lista">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Detalhe da Factura</h2>
            <p className="text-muted-foreground">Visualize informações completas do documento</p>
          </div>
        </div>

        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Carregando factura...</span>
            </CardContent>
          </Card>
        ) : factura ? (
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    Fonte dos dados {sourceBadge}
                  </CardTitle>
                  <CardDescription>
                    {lastSyncAt ? `Última sincronização AGT: ${new Date(lastSyncAt).toLocaleString()}` : 'Sem sincronização AGT ainda.'}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={handleSyncFromAgt} disabled={isSyncing}>
                    {isSyncing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> A carregar da AGT…
                      </>
                    ) : (
                      'Carregar dados da AGT'
                    )}
                  </Button>
                  {isSyncing && (
                    <Button variant="outline" onClick={handleCancelSync}>
                      Cancelar
                    </Button>
                  )}
                </div>
              </CardHeader>
              {(syncMessage || syncError) && (
                <CardContent className="space-y-2">
                  {syncMessage && <p className="text-sm text-muted-foreground">{syncMessage}</p>}
                  {syncError && <p className="text-sm text-destructive">{syncError}</p>}
                </CardContent>
              )}
            </Card>

            <FacturaDetail factura={factura} />
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Factura não encontrada</CardTitle>
              <CardDescription>O documento selecionado não está disponível.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.push('/facturas/lista')}>Voltar à lista</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  )
}
