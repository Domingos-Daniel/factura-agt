'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, RefreshCw, Cloud, Database, CheckCircle, AlertCircle } from 'lucide-react'

import type { Factura } from '@/lib/types'
import { getFacturaById } from '@/lib/storage'
import { MainLayout } from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/button'
import { FacturaDetail } from '@/components/FacturaDetail'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Progress } from '@/components/ui/progress'

type DataSource = 'local' | 'backup' | 'agt' | 'agt-empty' | null

export default function FacturaDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [factura, setFactura] = useState<Factura | null>(null)
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState<DataSource>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isSyncingEstado, setIsSyncingEstado] = useState(false)
  const [syncProgress, setSyncProgress] = useState(0)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const { toast } = useToast()

  // Carregar factura do backup ou AGT
  const loadFactura = useCallback(async (forceAgt = false) => {
    if (!params?.id) {
      setLoading(false)
      return
    }
    
    try {
      if (forceAgt) {
        setIsSyncing(true)
        setSyncProgress(10)
        setSyncMessage('Conectando à AGT...')
      }
      
      // 1. Primeiro tenta buscar do localStorage (dados locais)
      if (!forceAgt) {
        const localDoc = getFacturaById(params.id)
        if (localDoc) {
          setFactura(localDoc)
          setSource('local')
          setLoading(false)
          return
        }
      }
      
      // 2. Buscar do backup via API
      if (!forceAgt) {
        setSyncMessage('Carregando do backup...')
        const response = await fetch(`/api/facturas/${params.id}`)
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.factura) {
            setFactura(data.factura)
            setSource('backup')
            setLoading(false)
            return
          }
        }
      }
      
      // 3. Se forceAgt ou não encontrou no backup, consultar AGT
      if (forceAgt) {
        setSyncProgress(30)
        setSyncMessage('Consultando AGT...')
        
        const consultResponse = await fetch(
          `/api/facturas/agt/consultar?id=${encodeURIComponent(params.id)}&timeoutMs=60000`
        )
        
        setSyncProgress(60)
        
        if (consultResponse.ok) {
          const consultData = await consultResponse.json()
          if (consultData.success && consultData.factura) {
            setFactura(consultData.factura)
            setSource(consultData.source || 'agt')
            
            // Também obter estado
            setSyncProgress(80)
            setSyncMessage('Obtendo estado do documento...')
            
            try {
              const estadoResponse = await fetch(
                `/api/facturas/agt/estado?id=${encodeURIComponent(params.id)}&timeoutMs=30000`
              )
              if (estadoResponse.ok) {
                const estadoData = await estadoResponse.json()
                if (estadoData.success && estadoData.factura) {
                  setFactura(estadoData.factura)
                }
              }
            } catch (e) {
              console.warn('Erro ao obter estado:', e)
            }
            
            setSyncProgress(100)
            setSyncMessage('Sincronização concluída!')
            
            toast({
              title: 'Dados sincronizados',
              description: `Fonte: ${consultData.source === 'agt' ? 'AGT' : 'Backup'}`,
            })
          } else if (consultData.warning) {
            setSyncError(consultData.warning)
          }
        }
      }
      
      setLoading(false)
    } catch (error) {
      console.error('Erro ao carregar factura:', error)
      setSyncError(error instanceof Error ? error.message : 'Erro desconhecido')
      setLoading(false)
    } finally {
      setIsSyncing(false)
      setTimeout(() => {
        setSyncMessage(null)
        setSyncProgress(0)
      }, 2000)
    }
  }, [params?.id, toast])

  // Obter estado da AGT
  const handleObterEstado = useCallback(async () => {
    if (!params?.id || isSyncingEstado) return
    
    setIsSyncingEstado(true)
    setSyncError(null)
    
    try {
      const response = await fetch(
        `/api/facturas/agt/estado?id=${encodeURIComponent(params.id)}&timeoutMs=30000`
      )
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.factura) {
          setFactura(data.factura)
          setSource(data.source || 'agt')
          
          toast({
            title: 'Estado atualizado',
            description: data.source === 'agt' 
              ? 'Estado obtido da AGT e salvo no backup.' 
              : 'AGT indisponível, usando backup.',
          })
        } else if (data.warning) {
          toast({
            title: 'Aviso',
            description: data.warning,
            variant: 'destructive'
          })
        }
      }
    } catch (error) {
      console.error('Erro ao obter estado:', error)
      toast({
        title: 'Erro',
        description: 'Falha ao obter estado da AGT.',
        variant: 'destructive'
      })
    } finally {
      setIsSyncingEstado(false)
    }
  }, [params?.id, isSyncingEstado, toast])

  // Sincronizar com AGT
  const handleSyncFromAgt = useCallback(() => {
    loadFactura(true)
  }, [loadFactura])

  useEffect(() => {
    loadFactura(false)
  }, [loadFactura])

  const sourceBadge = (() => {
    if (!source) return null
    const config: Record<string, { variant: 'default' | 'secondary' | 'outline'; icon: any; label: string }> = {
      agt: { variant: 'default', icon: Cloud, label: 'AGT' },
      backup: { variant: 'secondary', icon: Database, label: 'Backup' },
      'agt-empty': { variant: 'outline', icon: AlertCircle, label: 'AGT (vazio)' },
      local: { variant: 'secondary', icon: Database, label: 'Local' },
    }
    const cfg = config[source] || { variant: 'secondary', icon: Database, label: source }
    const Icon = cfg.icon
    
    return (
      <Badge variant={cfg.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {cfg.label}
      </Badge>
    )
  })()

  const validationBadge = (() => {
    const status = (factura as any)?.validationStatus
    if (!status) return null
    
    const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      V: { variant: 'default', label: 'Válida' },
      P: { variant: 'secondary', label: 'Pendente' },
      I: { variant: 'destructive', label: 'Inválida' },
      R: { variant: 'destructive', label: 'Rejeitada' },
      E: { variant: 'destructive', label: 'Erro' },
    }
    const cfg = config[status] || { variant: 'outline', label: status }
    
    return <Badge variant={cfg.variant}>{cfg.label}</Badge>
  })()

  const lastSyncAt = (factura as any)?.agtLastSyncAt as string | undefined
  const lastEstadoSyncAt = (factura as any)?.agtEstadoLastSyncAt as string | undefined

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
            {/* Card de Sincronização */}
            <Card>
              <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    Fonte dos dados {sourceBadge} {validationBadge}
                  </CardTitle>
                  <CardDescription className="space-y-1">
                    {lastSyncAt && (
                      <div className="flex items-center gap-1 text-xs">
                        <Cloud className="h-3 w-3" />
                        Última sync consulta: {new Date(lastSyncAt).toLocaleString()}
                      </div>
                    )}
                    {lastEstadoSyncAt && (
                      <div className="flex items-center gap-1 text-xs">
                        <CheckCircle className="h-3 w-3" />
                        Última sync estado: {new Date(lastEstadoSyncAt).toLocaleString()}
                      </div>
                    )}
                    {!lastSyncAt && !lastEstadoSyncAt && (
                      <span>Sem sincronização AGT ainda.</span>
                    )}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button 
                    onClick={handleSyncFromAgt} 
                    disabled={isSyncing}
                    variant="default"
                  >
                    {isSyncing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sincronizando...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" /> Consultar AGT
                      </>
                    )}
                  </Button>
                  <Button 
                    onClick={handleObterEstado} 
                    disabled={isSyncingEstado}
                    variant="outline"
                  >
                    {isSyncingEstado ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Obtendo...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" /> Obter Estado
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              {(syncMessage || syncError || syncProgress > 0) && (
                <CardContent className="space-y-2">
                  {syncProgress > 0 && syncProgress < 100 && (
                    <Progress value={syncProgress} className="h-2" />
                  )}
                  {syncMessage && <p className="text-sm text-muted-foreground">{syncMessage}</p>}
                  {syncError && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" /> {syncError}
                    </p>
                  )}
                </CardContent>
              )}
            </Card>

            {/* Mensagens de validação */}
            {(factura as any)?.validationMessages?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Mensagens de Validação AGT</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {((factura as any).validationMessages as string[]).map((msg, i) => (
                      <li key={i} className="text-muted-foreground">{msg}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

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
