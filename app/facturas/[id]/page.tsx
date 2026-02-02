'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, RefreshCw, Cloud, Database, CheckCircle, AlertCircle, Building2, Zap, FileDown, QrCode, Eye } from 'lucide-react'

import type { Factura } from '@/lib/types'
import { getFacturaById } from '@/lib/storage'
import { MainLayout } from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/button'
import { FacturaDetail } from '@/components/FacturaDetail'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Progress } from '@/components/ui/progress'
import { AsyncStatusTracker } from '@/components/providers'

type DataSource = 'local' | 'backup' | 'agt' | 'agt-empty' | 'appypay' | null

// Helper para mapear status AppyPay para status interno
function mapAppyPayStatus(status: string): 'P' | 'V' | 'I' | 'R' | 'E' {
  switch (status?.toUpperCase()) {
    case 'N':
    case 'PENDING':
    case 'PROCESSING':
      return 'P'
    case 'V':
    case 'SUCCESS':
    case 'COMPLETED':
      return 'V'
    case 'I':
    case 'FAILED':
    case 'REJECTED':
      return 'I'
    case 'R':
      return 'R'
    case 'E':
      return 'E'
    default:
      return 'P'
  }
}

export default function FacturaDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [factura, setFactura] = useState<Factura | null>(null)
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState<DataSource>(null)
  const [provider, setProvider] = useState<'agt' | 'appypay'>('agt')
  const [isSyncing, setIsSyncing] = useState(false)
  const [isSyncingEstado, setIsSyncingEstado] = useState(false)
  const [syncProgress, setSyncProgress] = useState(0)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [pdfData, setPdfData] = useState<string | null>(null)
  const [qrCodeData, setQrCodeData] = useState<string | null>(null)
  const [showQrModal, setShowQrModal] = useState(false)
  const { toast } = useToast()

  // Carregar factura do backup, AGT ou AppyPay
  const loadFactura = useCallback(async (forceRefresh = false) => {
    if (!params?.id) {
      setLoading(false)
      return
    }
    
    try {
      // Detectar provider activo
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
      
      // Se AppyPay, buscar directamente da API
      if (activeProvider === 'appypay') {
        setIsSyncing(true)
        setSyncProgress(30)
        setSyncMessage('Conectando à AppyPay...')
        
        try {
          const response = await fetch(`/api/appypay/documents/${params.id}`)
          setSyncProgress(80)
          
          if (response.ok) {
            const data = await response.json()
            // A API retorna campos directamente (não dentro de 'document')
            if (data.success && (data.documentId || data.documentNo)) {
              // Mapear resposta AppyPay para formato Factura
              const mappedFactura: Partial<Factura> = {
                id: data.documentId || params.id,
                submissionGUID: data.documentId || params.id,
                taxRegistrationNumber: data.customerTaxId || '',
                submissionTimeStamp: data.lastChecked || new Date().toISOString(),
                validationStatus: mapAppyPayStatus(data.status),
                validationResult: {
                  status: data.status === 'success' || data.status === 'completed' ? 'Validada' as const : 
                          data.status === 'failed' || data.status === 'rejected' ? 'Rejeitada' as const : 'Com Erros' as const,
                  qrCode: data.rawResponse?.qrCode,
                  hash: data.rawResponse?.hash,
                },
                requestID: data.documentId,
                documents: [{
                  documentNo: data.documentNo || '',
                  documentType: data.documentNo?.substring(0, 2) || 'FT',
                  documentDate: data.lastChecked,
                  customerTaxID: data.customerTaxId || '',
                  companyName: data.companyName || '',
                  documentStatus: data.status,
                  documentTotals: {
                    netTotal: data.rawResponse?.netTotal || 0,
                    taxPayable: data.rawResponse?.taxPayable || 0,
                    grossTotal: data.rawResponse?.grossTotal || 0,
                  },
                  lines: data.rawResponse?.lines || [],
                }] as any,
                schemaVersion: '1.2',
                softwareInfo: {} as any,
                createdAt: data.lastChecked || new Date().toISOString(),
                updatedAt: data.lastChecked || new Date().toISOString(),
              }
              
              setFactura(mappedFactura as Factura)
              setSource('appypay')
              setSyncProgress(100)
              setSyncMessage('Concluído!')
              
              // Armazenar PDF e QR Code se disponíveis
              if (data.rawResponse?.docData) {
                // docData pode ser string ou objeto com fileType e file
                const pdfContent = typeof data.rawResponse.docData === 'string' 
                  ? data.rawResponse.docData 
                  : data.rawResponse.docData?.file || null
                setPdfData(pdfContent)
              }
              if (data.rawResponse?.qrCode) {
                // qrCode pode ser string ou objeto com fileType e file
                const qrContent = typeof data.rawResponse.qrCode === 'string' 
                  ? data.rawResponse.qrCode 
                  : data.rawResponse.qrCode?.file || null
                setQrCodeData(qrContent)
              }
              
              toast({
                title: 'Dados carregados',
                description: `Documento ${data.documentNo} carregado do AppyPay`,
              })
            } else {
              throw new Error(data.error || 'Documento não encontrado')
            }
          } else {
            throw new Error(`HTTP ${response.status}`)
          }
        } catch (err: any) {
          setSyncError(err.message || 'Erro ao carregar do AppyPay')
          toast({
            title: 'Erro',
            description: err.message || 'Falha ao carregar do AppyPay',
            variant: 'destructive'
          })
        } finally {
          setIsSyncing(false)
          setLoading(false)
          setTimeout(() => {
            setSyncMessage(null)
            setSyncProgress(0)
          }, 2000)
        }
        return
      }
      
      // Provider AGT - lógica original
      if (forceRefresh) {
        setIsSyncing(true)
        setSyncProgress(10)
        setSyncMessage('Conectando à AGT...')
      }
      
      // 1. Primeiro tenta buscar do localStorage (dados locais)
      if (!forceRefresh) {
        const localDoc = getFacturaById(params.id)
        if (localDoc) {
          setFactura(localDoc)
          setSource('local')
          setLoading(false)
          return
        }
      }
      
      // 2. Buscar do backup via API
      if (!forceRefresh) {
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
      
      // 3. Se forceRefresh ou não encontrou no backup, consultar AGT
      if (forceRefresh) {
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

  // Função para download do PDF
  const handleDownloadPdf = useCallback(() => {
    if (!pdfData) {
      toast({
        title: 'PDF não disponível',
        description: 'O documento PDF ainda não foi gerado ou não está disponível.',
        variant: 'destructive'
      })
      return
    }
    
    try {
      // Converter base64 para blob
      const byteCharacters = atob(pdfData)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: 'application/pdf' })
      
      // Criar link de download
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${factura?.documents?.[0]?.documentNo || params?.id || 'documento'}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      toast({
        title: 'Download iniciado',
        description: 'O PDF está a ser transferido.',
      })
    } catch (error) {
      console.error('Erro ao fazer download do PDF:', error)
      toast({
        title: 'Erro',
        description: 'Falha ao fazer download do PDF.',
        variant: 'destructive'
      })
    }
  }, [pdfData, factura, params?.id, toast])

  // Função para abrir PDF no navegador
  const handleViewPdf = useCallback(() => {
    if (!pdfData) {
      toast({
        title: 'PDF não disponível',
        description: 'O documento PDF ainda não foi gerado ou não está disponível.',
        variant: 'destructive'
      })
      return
    }
    
    try {
      const byteCharacters = atob(pdfData)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      window.open(url, '_blank')
    } catch (error) {
      console.error('Erro ao visualizar PDF:', error)
      toast({
        title: 'Erro',
        description: 'Falha ao visualizar o PDF.',
        variant: 'destructive'
      })
    }
  }, [pdfData, toast])

  // Sincronizar com AGT
  const handleSyncFromAgt = useCallback(() => {
    loadFactura(true)
  }, [loadFactura])

  useEffect(() => {
    loadFactura(false)
  }, [loadFactura])

  const sourceBadge = (() => {
    if (!source) return null
    const config: Record<string, { variant: 'default' | 'secondary' | 'outline'; icon: any; label: string; className?: string }> = {
      agt: { variant: 'default', icon: Building2, label: 'AGT', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
      appypay: { variant: 'default', icon: Zap, label: 'AppyPay', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
      backup: { variant: 'secondary', icon: Database, label: 'Backup' },
      'agt-empty': { variant: 'outline', icon: AlertCircle, label: 'AGT (vazio)' },
      local: { variant: 'secondary', icon: Database, label: 'Local' },
    }
    const cfg = config[source] || { variant: 'secondary', icon: Database, label: source }
    const Icon = cfg.icon
    
    return (
      <Badge variant={cfg.variant} className={`flex items-center gap-1 ${cfg.className || ''}`}>
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
                    {provider === 'appypay' ? (
                      <span>Dados carregados do AppyPay</span>
                    ) : (
                      <>
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
                      </>
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
                        <RefreshCw className="mr-2 h-4 w-4" /> {provider === 'appypay' ? 'Actualizar AppyPay' : 'Consultar AGT'}
                      </>
                    )}
                  </Button>
                  {provider !== 'appypay' && (
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
                  )}
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

            {/* Botões de PDF e QR Code para AppyPay */}
            {provider === 'appypay' && (pdfData || qrCodeData) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Documentos Gerados</CardTitle>
                  <CardDescription>PDF e QR Code do documento fiscal</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-4">
                  {pdfData && (
                    <>
                      <Button onClick={handleViewPdf} variant="default" className="gap-2">
                        <Eye className="h-4 w-4" />
                        Visualizar PDF
                      </Button>
                      <Button onClick={handleDownloadPdf} variant="outline" className="gap-2">
                        <FileDown className="h-4 w-4" />
                        Download PDF
                      </Button>
                    </>
                  )}
                  {qrCodeData && (
                    <Button onClick={() => setShowQrModal(true)} variant="outline" className="gap-2">
                      <QrCode className="h-4 w-4" />
                      Ver QR Code
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Modal QR Code */}
            {showQrModal && qrCodeData && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowQrModal(false)}>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">QR Code do Documento</h3>
                    <Button variant="ghost" size="sm" onClick={() => setShowQrModal(false)}>✕</Button>
                  </div>
                  <div className="flex justify-center p-4 bg-white rounded-lg">
                    <img 
                      src={qrCodeData.startsWith('data:') ? qrCodeData : `data:image/png;base64,${qrCodeData}`} 
                      alt="QR Code" 
                      className="max-w-full h-auto"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground text-center mt-4">
                    Documento: {factura?.documents?.[0]?.documentNo || params?.id}
                  </p>
                </div>
              </div>
            )}

            {/* Tracker assíncrono AppyPay */}
            {(factura as any)?.appyPayDocumentId && (
              <AsyncStatusTracker
                invoiceId={(factura as any).appyPayDocumentId}
                onComplete={(result) => {
                  if (result.status === 'completed' && result.invoice) {
                    // Atualizar a factura com dados finalizados da AppyPay
                    setFactura(prev => prev ? {
                      ...prev,
                      validationResult: {
                        ...prev.validationResult,
                        status: 'Validada' as const,
                        hash: result.invoice?.hash || prev.validationResult?.hash,
                        qrCode: result.invoice?.qrCode || prev.validationResult?.qrCode,
                      }
                    } : prev)
                    setSource('appypay')
                    toast({
                      title: 'Documento finalizado',
                      description: 'O documento foi processado com sucesso pela AppyPay.',
                    })
                  }
                }}
                onError={(error) => {
                  toast({
                    title: 'Erro no processamento',
                    description: error,
                    variant: 'destructive'
                  })
                }}
              />
            )}

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
