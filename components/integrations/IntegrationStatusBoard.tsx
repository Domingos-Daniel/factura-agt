"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, RefreshCw, XCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { pt } from 'date-fns/locale'

import { type IntegrationStatus, type IntegrationType } from '@/lib/integrations'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface IntegrationStatusReport {
  id: string
  name: string
  provider: string
  type: IntegrationType
  endpoint: string
  status: IntegrationStatus
  statusMessage: string
  latencyMs: number
  lastChecked: string
  environment: string
  system: string
  documentationUrl?: string
  criticality?: 'core' | 'support'
  region?: string
  method?: 'GET' | 'HEAD'
  slaMs?: number
  availability: number
}

interface IntegrationStatusSummary {
  total: number
  connected: number
  warning: number
  error: number
  overall: IntegrationStatus
  avgAvailability: number
}

const DEFAULT_AUTO_REFRESH = (() => {
  const value = process.env.NEXT_PUBLIC_INTEGRATION_MONITOR_INTERVAL_MS
  if (!value) return 60_000
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 15_000 ? parsed : 60_000
})()

interface IntegrationStatusBoardProps {
  autoRefreshMs?: number
  variant?: 'default' | 'compact'
}

export function IntegrationStatusBoard({ autoRefreshMs = DEFAULT_AUTO_REFRESH, variant = 'default' }: IntegrationStatusBoardProps) {
  const [data, setData] = useState<IntegrationStatusReport[]>([])
  const [summary, setSummary] = useState<IntegrationStatusSummary | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async (opts: { showSpinner?: boolean } = {}) => {
    try {
      if (opts.showSpinner) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }
      setError(null)

      const response = await fetch('/api/integrations/status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      })

      if (!response.ok) {
        throw new Error('Falha ao carregar o estado das integrações externas.')
      }

      const payload = await response.json()

      setData(payload.data as IntegrationStatusReport[])
      setSummary(payload.summary as IntegrationStatusSummary)
      setLastUpdated(payload.lastUpdated as string)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível monitorizar as integrações.')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadData({ showSpinner: false })
  }, [loadData])

  useEffect(() => {
    if (!autoRefreshMs) return

    const interval = setInterval(() => {
      loadData({ showSpinner: true }).catch(() => {
        /* handled in loadData */
      })
    }, autoRefreshMs)

    return () => clearInterval(interval)
  }, [autoRefreshMs, loadData])

  const statusBadge = useCallback((status: IntegrationStatus) => {
    const map: Record<IntegrationStatus, { label: string; className: string; icon: JSX.Element }> = {
      connected: {
        label: 'Operacional',
        className: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400',
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      },
      warning: {
        label: 'Degradado',
        className: 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400',
        icon: <AlertTriangle className="h-3.5 w-3.5" />,
      },
      error: {
        label: 'Indisponível',
        className: 'border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400',
        icon: <XCircle className="h-3.5 w-3.5" />,
      },
    }

    const { label, className, icon } = map[status]
    return (
      <Badge variant="outline" className={cn('flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium', className)}>
        {icon}
        {label}
      </Badge>
    )
  }, [])

  const availabilityColor = (status: IntegrationStatus): string => {
    switch (status) {
      case 'connected':
        return 'bg-emerald-500'
      case 'warning':
        return 'bg-amber-500'
      case 'error':
      default:
        return 'bg-rose-500'
    }
  }

  const gridClass = useMemo(() => {
    if (variant === 'compact') {
      return 'grid gap-3 md:grid-cols-2'
    }
    return 'grid gap-4 md:grid-cols-2 xl:grid-cols-3'
  }, [variant])

  const renderSkeleton = () => (
    <div className={gridClass}>
      {Array.from({ length: variant === 'compact' ? 2 : 3 }).map((_, index) => (
        <Skeleton key={index} className="h-48 rounded-xl" />
      ))}
    </div>
  )

  const renderError = () => (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-rose-500/40 bg-rose-500/5 p-4 text-sm text-rose-500 dark:text-rose-400">
      <p className="font-medium">Não foi possível consultar o estado das integrações externas.</p>
      <p className="text-xs text-rose-500/80 dark:text-rose-300/80">{error}</p>
      <Button size="sm" variant="outline" onClick={() => loadData({ showSpinner: true })}>
        <RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente
      </Button>
    </div>
  )

  const totalLabel = useMemo(() => {
    if (!summary) return ''
    const statusMap: Record<IntegrationStatus, string> = {
      connected: 'Todos os serviços operacionais',
      warning: 'Alguns serviços com latência elevada',
      error: 'Serviços críticos indisponíveis',
    }
    return statusMap[summary.overall]
  }, [summary])

  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl font-semibold">Estado das integrações</CardTitle>
            <CardDescription>
              Monitorização contínua dos conectores SAP, AGT e serviços auxiliares para garantir a disponibilidade da faturação eletrónica.
            </CardDescription>
            {summary && (
              <p className="text-xs text-muted-foreground">
                {summary.total} integrações • Disponibilidade média de {summary.avgAvailability.toFixed(2)}%
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-xs text-muted-foreground">
                Atualizado {formatDistanceToNow(new Date(lastUpdated), { addSuffix: true, locale: pt })}
              </span>
            )}
            <Button
              size="sm"
              variant="outline"
              disabled={isRefreshing}
              onClick={() => loadData({ showSpinner: true })}
            >
              {isRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Atualizar
            </Button>
          </div>
        </div>
        {summary && (
          <div
            className={cn(
              'inline-flex items-center gap-2 self-start rounded-full border px-3 py-1 text-xs font-medium',
              summary.overall === 'connected'
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : summary.overall === 'warning'
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  : 'border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400',
            )}
          >
            {summary.overall === 'connected' && <CheckCircle2 className="h-3.5 w-3.5" />}
            {summary.overall === 'warning' && <AlertTriangle className="h-3.5 w-3.5" />}
            {summary.overall === 'error' && <XCircle className="h-3.5 w-3.5" />}
            {totalLabel}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? renderSkeleton() : error ? renderError() : (
          <div className={gridClass}>
            {data.map((integration) => (
              <div
                key={integration.id}
                className="flex h-full flex-col justify-between rounded-xl border border-border/60 bg-card/40 p-4 shadow-sm backdrop-blur-sm transition hover:border-primary/40 hover:shadow-md"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{integration.provider} • {integration.system.toUpperCase()}</p>
                      <h3 className="text-base font-semibold leading-tight">{integration.name}</h3>
                      <p className="text-xs text-muted-foreground">{integration.statusMessage}</p>
                    </div>
                    {statusBadge(integration.status)}
                  </div>

                  <div className="grid gap-3 text-xs text-muted-foreground sm:grid-cols-2">
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">Latência</p>
                      <p>{integration.latencyMs} ms{integration.slaMs ? ` • SLA ${integration.slaMs} ms` : ''}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">Ambiente</p>
                      <p className="uppercase">{integration.environment}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">Região</p>
                      <p>{integration.region ?? '—'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">Método</p>
                      <p>{integration.method ?? 'GET'}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Disponibilidade</span>
                    <span className="font-medium text-foreground">{integration.availability.toFixed(2)}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className={cn('h-full rounded-full transition-all duration-500', availabilityColor(integration.status))}
                      style={{ width: `${Math.min(100, integration.availability)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{integration.criticality === 'core' ? 'Crítico' : 'Suporte'}</span>
                    <a
                      href={integration.documentationUrl ?? integration.endpoint}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" /> Documentação
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
