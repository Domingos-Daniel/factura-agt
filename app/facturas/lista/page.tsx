'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Plus, RefreshCw, Cloud, Database, AlertCircle, Zap } from 'lucide-react'

export const dynamic = 'force-dynamic'

import type { Factura } from '@/lib/types'
import { getFacturas } from '@/lib/storage'
import { MainLayout } from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/button'
import { TabelaFacturas } from '@/components/tables/TabelaFacturas'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'

type DataSource = 'cache' | 'cache-stale' | 'agt' | 'appypay' | 'cache-fallback' | 'empty' | 'local' | 'loading' | 'no-cache'

function buildFacturaKeys(f: any): string[] {
  const keys: string[] = []
  const id = f?.id
  const submissionGUID = f?.submissionGUID
  const nif = f?.taxRegistrationNumber
  const docNo = f?.documents?.[0]?.documentNo

  if (id) keys.push(`id:${id}`)
  if (submissionGUID) keys.push(`submissionGUID:${submissionGUID}`)
  if (nif && docNo) keys.push(`nifDoc:${nif}|${docNo}`)
  return keys
}

function normalizeValidationStatusForList(f: any): any {
  // Só confiar em "V" se veio de um sync real (obterEstado) e gravou timestamp.
  if (f?.validationStatus === 'V' && f?.requestID && !f?.agtEstadoLastSyncAt) return undefined
  return f?.validationStatus
}

export default function ListaFacturasPage() {
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { toast } = useToast()
  const [isSyncingEstados, setIsSyncingEstados] = useState(false)
  const [dataSource, setDataSource] = useState<DataSource>('loading')
  const [provider, setProvider] = useState<'agt' | 'appypay' | null>(null)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showRaw, setShowRaw] = useState(false)
  const [backupCorrupted, setBackupCorrupted] = useState(false)
  const [cacheAge, setCacheAge] = useState<number | null>(null)

  // error helpers
  const unwrapAgtMessage = (msg?: string | null): string | null => {
    if (!msg) return msg
    try {
      const o = JSON.parse(msg)
      if (typeof o.error === 'string') return o.error
      if (typeof o.agtError === 'string') return o.agtError
    } catch {
      // not JSON
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
  
  // Filtros e paginação
  const [documentTypeFilter, setDocumentTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'P' | 'V' | 'I'>('all')
  const [pageSize, setPageSize] = useState<number>(50)
  const [currentPage, setCurrentPage] = useState<number>(1)

  const refreshFromJsonBackup = useCallback(async () => {
    try {
      const response = await fetch('/api/facturas/list')
      if (!response.ok) {
        const text = await response.text().catch(() => '')
        const msg = text || `Backup fetch failed (${response.status})`
        setError(msg)
        if (msg.includes('Erro ao analisar backup local')) {
          setBackupCorrupted(true)
        }
        return
      }
      const data = await response.json().catch((e) => {
        setError(`Erro parse backup: ${e?.message}`)
        setBackupCorrupted(true)
        return null
      })
      if (!data) return
      // if server warned us about corruption it has already deleted file
      if (data.warning && String(data.warning).toLowerCase().includes('corrompido')) {
        // clear client flags and show informational toast
        setBackupCorrupted(false)
        toast({ title: 'Backup removido', description: 'Backup local corrompido apagado.' })
        setError(null)
        return
      }
      // se conseguirmos ler com sucesso, limpar o flag de corrupção
      setBackupCorrupted(false)
      const jsonFacturas: Factura[] = data.facturas || []
      if (!Array.isArray(jsonFacturas) || jsonFacturas.length === 0) return

      const index = new Map<string, Factura>()
      jsonFacturas.forEach((f: any) => {
        buildFacturaKeys(f).forEach((k) => index.set(k, f))
      })

      setFacturas((prev) =>
        prev.map((f: any) => {
          const keys = buildFacturaKeys(f)
          const candidate = keys.map((k) => index.get(k)).find(Boolean) as any
          if (!candidate) return f
          return {
            ...f,
            validationStatus: normalizeValidationStatusForList(candidate),
            validationDate: candidate.validationDate,
            validationMessages: candidate.validationMessages,
          } as any
        })
      )
    } catch (e: any) {
      const msg = `Erro backup: ${e?.message}`
      setError(msg)
      if (msg.includes('Erro ao analisar backup local')) {
        setBackupCorrupted(true)
      }
    }
  }, [])

  // helper to build a single local/backup dataset when user asks for it
  const loadLocalFacturas = useCallback(async () => {
    setError(null)
    const localFacturas = getFacturas()
    let jsonFacturas: Factura[] = []

    try {
      const response = await fetch('/api/facturas/list')
      if (response.ok) {
        const data = await response.json()
        // if the backup itself failed to parse the route returns an error message
        if (data.error && String(data.error).includes('Erro ao analisar backup local')) {
          setBackupCorrupted(true)
          setError(data.error)
          return
        }
        jsonFacturas = data.facturas || []
      }
    } catch {
      // ignore
    }

    const jsonIndex = new Map<string, Factura>()
    jsonFacturas.forEach((f: any) => {
      buildFacturaKeys(f).forEach((k) => jsonIndex.set(k, f))
    })

    const seen = new Set<string>()
    const allFacturas = localFacturas.map((f: any) => {
      const keys = buildFacturaKeys(f)
      keys.forEach((k) => seen.add(k))
      const candidate = keys.map((k) => jsonIndex.get(k)).find(Boolean) as any
      if (!candidate) return f
      return {
        ...f,
        validationStatus: normalizeValidationStatusForList(candidate),
        validationDate: candidate.validationDate,
        validationMessages: candidate.validationMessages,
      } as any
    })

    jsonFacturas.forEach((f: any) => {
      const keys = buildFacturaKeys(f)
      const already = keys.some((k) => seen.has(k))
      if (!already) {
        keys.forEach((k) => seen.add(k))
        allFacturas.push(f)
      }
    })

    // Ordenar por data
    allFacturas.sort((a, b) => {
      const dateA = new Date(a.submissionTimeStamp || a.createdAt || 0)
      const dateB = new Date(b.submissionTimeStamp || b.createdAt || 0)
      return dateB.getTime() - dateA.getTime()
    })

    setFacturas(allFacturas)
    setDataSource('local')
  }, [])

  const loadFacturas = useCallback(async (forceRefresh = false) => {
    try {
      setError(null)
      
      // Primeiro, detectar o provider activo
      let activeProvider: 'agt' | 'appypay' = 'agt'
      try {
        const providerRes = await fetch('/api/providers')
        if (providerRes.ok) {
          const providerData = await providerRes.json()
          activeProvider = providerData.config?.activeProvider || 'agt'
          setProvider(activeProvider)
        }
      } catch {
        // ignore
      }
      
      // Se AppyPay, sempre buscar da API (não há backup local significativo)
      if (activeProvider === 'appypay') {
        setIsRefreshing(true)
        setLoadingProgress(0)
        setLoadingMessage('Conectando à AppyPay...')
        
        const progressInterval = setInterval(() => {
          setLoadingProgress(prev => Math.min(prev + 5, 95))
        }, 500)
        
        try {
          const response = await fetch('/api/facturas/list?refresh=true')
          clearInterval(progressInterval)
          setLoadingProgress(100)
          
          if (response.ok) {
            const data = await response.json()
            console.log(`📦 AppyPay: ${data.facturas?.length || 0} facturas`)
            setFacturas(data.facturas || [])
            setDataSource('appypay')
            setProvider('appypay')
            setCacheAge(null)
            setLoadingMessage('Concluído!')
          } else {
            throw new Error(`HTTP ${response.status}`)
          }
        } catch (err: any) {
          clearInterval(progressInterval)
          setError(err.message || 'Erro ao carregar de AppyPay')
          setFacturas([])
        } finally {
          setIsRefreshing(false)
          setIsLoading(false)
        }
        return
      }
      
      // Provider AGT
      if (forceRefresh) {
        setIsRefreshing(true)
        setLoadingProgress(0)
        setLoadingMessage('Conectando à AGT...')
        
        const progressInterval = setInterval(() => {
          setLoadingProgress(prev => {
            if (prev >= 95) return prev
            const increment = prev < 50 ? 2 : prev < 80 ? 1 : 0.5
            return Math.min(prev + increment, 95)
          })
        }, 2000)
        
        setTimeout(() => setLoadingMessage('Autenticando...'), 3000)
        setTimeout(() => setLoadingMessage('Buscando facturas da AGT...'), 6000)
        setTimeout(() => setLoadingMessage('Aguardando resposta...'), 15000)
        
        try {
          const response = await fetch('/api/facturas/agt/listar?refresh=true&timeoutMs=180000')
          clearInterval(progressInterval)
          setLoadingProgress(100)
          
          if (response.ok) {
            const data = await response.json()
            const success = data.success !== false
            if (success) {
              if (data.error && (data.facturas?.length === 0 || data.facturas === undefined)) {
                const isAgtUnavailable = data.error?.includes?.('503') || data.error?.includes?.('indisponível')
                if (isAgtUnavailable) {
                  setError('Servidor AGT temporariamente indisponível (503).')
                } else {
                  setError(data.error)
                }
              }
              setFacturas(data.facturas || [])
              setDataSource(data.source || 'agt')
              setProvider('agt')
              setCacheAge(data.cacheAge || null)
              void refreshFromJsonBackup()
              setLoadingMessage(data.facturas?.length > 0 ? 'Concluído!' : 'AGT não retornou dados')
            } else {
              // include entire payload for debugging
              throw new Error(JSON.stringify(data, null, 2))
            }
          } else {
            const text = await response.text().catch(() => '')
            throw new Error(text || `HTTP ${response.status}`)
          }
        } catch (err: any) {
          clearInterval(progressInterval)
          // propagate so outer catch can handle display
          throw err
        }
      } else {
        setLoadingMessage('Carregando...')
        
        try {
          const response = await fetch('/api/facturas/agt/listar')
          if (response.ok) {
            const data = await response.json()

            // warning from route (backup) should surface; but if it's a corruption notice we clean it
            if (data.warning) {
              const msg = String(data.warning)
              if (msg.toLowerCase().includes('corrompido')) {
                // we already removed backup on the server; just inform user via toast
                toast({ title: 'Aviso', description: formatAgtError(msg) })
              } else {
                setError(formatAgtError(msg))
              }
            }

            if (data.success) {
              if (data.facturas?.length > 0) {
                console.log(`📦 Carregadas ${data.facturas.length} facturas (${data.source})`)
                setFacturas(data.facturas)
                setDataSource(data.source)
                setProvider('agt')
                setCacheAge(data.cacheAge || null)
                void refreshFromJsonBackup()
                return
              } else {
                // zero results is not an error, just show info and keep list empty
                console.log('📦 AGT retornou 0 facturas')
                setFacturas([])
                setDataSource(data.source || 'agt')
                setProvider('agt')
                setCacheAge(data.cacheAge || null)
                toast({ title: 'Aviso', description: 'Nenhuma factura encontrada para o período' })
                setIsLoading(false)
                setIsRefreshing(false)
                return
              }
            }

            // not success => treat as error
            const msg = data.error || data.warning || 'Sem facturas retornadas'
            setError(String(msg))
            setIsLoading(false)
            setIsRefreshing(false)
            return
          } else {
            const text = await response.text().catch(() => '')
            setError(text || `HTTP ${response.status}`)
          }
        } catch (e) {
          console.warn('⚠️ Falha ao carregar da AGT:', e)
          setError(String(e))
          // do not fall back automatically; stop here
          setIsLoading(false)
          setIsRefreshing(false)
          return
        }
      }
    } catch (error: any) {
      console.error('❌ Erro ao carregar facturas:', error)
      const msg = unwrapAgtMessage(error.message || '')
      setError(msg || error.message || 'Erro ao carregar facturas')
      // do not automatically render local data, user must click button
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [refreshFromJsonBackup])

  useEffect(() => {
    loadFacturas()
  }, [loadFacturas])

  const syncEstados = useCallback(async () => {
    if (isSyncingEstados) return
    setIsSyncingEstados(true)
    try {
      // Sincronizar estados para facturas com requestID (pendentes ou ainda não verificadas).
      const candidates = facturas
        .filter((f: any) => {
          if (!f?.id || !f?.requestID) return false
          const status = f?.validationStatus
          const unverifiedValid = status === 'V' && !(f as any)?.agtEstadoLastSyncAt
          const pending = !status || status === 'P'
          return pending || unverifiedValid
        })
        .slice(0, 10)

      if (candidates.length === 0) return

      // Fire-and-forget: o endpoint grava no backup JSON em background.
      candidates.forEach((f: any) => {
        fetch(`/api/facturas/agt/estado?id=${encodeURIComponent(f.id)}&async=1`).catch(() => {})
      })

      // Atualizar a tabela mais tarde a partir do JSON
      window.setTimeout(() => {
        void refreshFromJsonBackup()
      }, 12000)
    } finally {
      window.setTimeout(() => setIsSyncingEstados(false), 1500)
    }
  }, [facturas, isSyncingEstados, refreshFromJsonBackup])

  useEffect(() => {
    // Auto-sync leve quando carrega a lista local/cache.
    if (facturas.length === 0) return
    if (dataSource === 'loading') return
    void syncEstados()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataSource, facturas.length])

  const handleRefresh = () => {
    loadFacturas(true)
  }

  const getSourceBadge = () => {
    switch (dataSource) {
      case 'appypay':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
            <Zap className="h-3 w-3" />
            AppyPay
          </span>
        )
      case 'agt':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <Cloud className="h-3 w-3" />
            AGT Tempo Real
          </span>
        )
      case 'cache':
      case 'cache-stale':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            <Database className="h-3 w-3" />
            Cache {provider === 'appypay' ? 'AppyPay' : 'AGT'} {cacheAge ? `(${Math.floor(cacheAge / 60)}m)` : ''}
          </span>
        )
      case 'cache-fallback':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            <AlertCircle className="h-3 w-3" />
            Cache ({provider === 'appypay' ? 'AppyPay' : 'AGT'} offline)
          </span>
        )
      case 'empty':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            <AlertCircle className="h-3 w-3" />
            {provider === 'appypay' ? 'AppyPay' : 'AGT'} Indisponível
          </span>
        )
      case 'local':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
            <Database className="h-3 w-3" />
            Dados Locais
          </span>
        )
      default:
        return null
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold tracking-tight">Facturas</h2>
              {provider && (
                <Badge variant={provider === 'appypay' ? 'default' : 'secondary'}>
                  {provider === 'appypay' ? 'AppyPay' : 'AGT'}
                </Badge>
              )}
              {getSourceBadge()}
            </div>
            <p className="text-muted-foreground">
              {facturas.length > 0 
                ? `${facturas.length} facturas encontradas`
                : 'Consulte e acompanhe o estado das facturas emitidas.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Carregando...' : `Actualizar ${provider === 'appypay' ? 'AppyPay' : 'AGT'}`}
            </Button>
            {error && !isRefreshing && dataSource !== 'local' && (
              <Button
                variant="outline"
                onClick={loadLocalFacturas}
                disabled={isLoading}
                className="ml-2"
              >
                <Database className="mr-2 h-4 w-4" />
                Dados Locais
              </Button>
            )}
            {provider !== 'appypay' && (
              <Button
                variant="outline"
                onClick={syncEstados}
                disabled={isSyncingEstados || isRefreshing || isLoading}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isSyncingEstados ? 'animate-spin' : ''}`} />
                {isSyncingEstados ? 'Sync estados...' : 'Sync estados'}
              </Button>
            )}
            <Link href="/facturas/nova">
              <Button variant="gradient">
                <Plus className="mr-2 h-4 w-4" />
                Nova Factura
              </Button>
            </Link>
          </div>
        </div>

        {/* Indicador de carregamento da AGT */}
        {isRefreshing && (
          <Card className="border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{loadingMessage}</span>
                  <span className="text-muted-foreground">{Math.round(loadingProgress)}%</span>
                </div>
                <Progress value={loadingProgress} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  A AGT pode levar até 2-3 minutos para responder (inclui retries automáticos). Por favor aguarde...
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Erro/Aviso */}
        {error && !isRefreshing && (
          <Alert variant={error.includes('503') || error.includes('indisponível') ? 'default' : 'destructive'}>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{error.includes('503') ? 'AGT Temporariamente Indisponível' : 'Erro'}</AlertTitle>
            <AlertDescription>
              {formatAgtError(error)}
              {error?.includes('503') && (
                <span className="block mt-1 text-xs">
                  O servidor AGT HML pode estar em manutenção. Tente novamente mais tarde.
                </span>
              )}
              <button
                className="text-xs text-blue-600 hover:underline mt-1"
                onClick={() => setShowRaw((prev) => !prev)}
              >
                {showRaw ? 'Ocultar detalhes' : 'Mostrar detalhes'}
              </button>
              {showRaw && (
                <pre className="mt-2 text-xs break-words whitespace-pre-wrap bg-white p-2 rounded">
                  {error}
                </pre>
              )}
            </AlertDescription>
          </Alert>
        )}
        {/* quando o backup local está corrompido mostramos um aviso e botão para limpar */}
        {backupCorrupted && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Backup local corrompido</AlertTitle>
            <AlertDescription>
              O ficheiro de backup em disco não pôde ser analisado. Você pode limpar o backup
              para forçar a regeneração na próxima consulta.
              <button
                className="ml-2 text-xs text-blue-600 hover:underline"
                onClick={async () => {
                  try {
                    await fetch('/api/facturas/list?reset=1')
                    setBackupCorrupted(false)
                    setError(null)
                    toast({ title: 'Backup limpo', description: 'O backup local foi removido.' })
                    // refetch from AGT para repopular o cache se possível
                    await loadFacturas(true)
                  } catch {
                    // ignore
                  }
                }}
              >
                Limpar backup local
              </button>
            </AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <Card>
            <CardContent className="space-y-4 p-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ) : (
          <TabelaFacturas 
            data={facturas}
            documentTypeFilter={documentTypeFilter}
            statusFilter={statusFilter}
            pageSize={pageSize}
            currentPage={currentPage}
            onDocumentTypeFilterChange={setDocumentTypeFilter}
            onStatusFilterChange={setStatusFilter}
            onPageSizeChange={setPageSize}
            onPageChange={setCurrentPage}
          />
        )}
      </div>
    </MainLayout>
  )
}
