'use client'

import { useState, useEffect, useCallback } from 'react'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { RefreshCw, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react'
import type { InvoiceProcessingStatus } from '@/lib/providers/types'

interface AsyncStatusTrackerProps {
  invoiceId: string
  initialStatus?: InvoiceProcessingStatus
  provider?: string
  onStatusChange?: (status: InvoiceProcessingStatus) => void
  onComplete?: (result: { status: string; invoice?: { hash?: string; qrCode?: string } }) => void
  onError?: (error: string) => void
  pollingIntervalMs?: number
  maxAttempts?: number
  autoStart?: boolean
}

const statusConfig: Record<InvoiceProcessingStatus, { 
  icon: typeof Clock; 
  label: string; 
  color: string; 
  bgColor: string; 
  progress: number;
  animate?: boolean;
}> = {
  pending: {
    icon: Clock,
    label: 'Pendente',
    color: 'text-gray-500',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    progress: 10,
  },
  processing: {
    icon: Loader2,
    label: 'A processar...',
    color: 'text-blue-500',
    bgColor: 'bg-blue-100 dark:bg-blue-800',
    progress: 50,
    animate: true,
  },
  success: {
    icon: CheckCircle,
    label: 'Emitida com sucesso',
    color: 'text-green-500',
    bgColor: 'bg-green-100 dark:bg-green-800',
    progress: 100,
  },
  failed: {
    icon: XCircle,
    label: 'Falhou',
    color: 'text-red-500',
    bgColor: 'bg-red-100 dark:bg-red-800',
    progress: 100,
  },
  timeout: {
    icon: Clock,
    label: 'Timeout',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-100 dark:bg-yellow-800',
    progress: 100,
  },
}

export function AsyncStatusTracker({
  invoiceId,
  initialStatus = 'processing',
  provider = 'appypay',
  onStatusChange,
  onComplete,
  onError,
  pollingIntervalMs = 30000,
  maxAttempts = 60,
  autoStart = true,
}: AsyncStatusTrackerProps) {
  const [status, setStatus] = useState<InvoiceProcessingStatus>(initialStatus)
  const [attempts, setAttempts] = useState(0)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)
  const [nextCheck, setNextCheck] = useState<Date | null>(null)
  const [documentNo, setDocumentNo] = useState<string | null>(null)
  const [documentUrl, setDocumentUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPolling, setIsPolling] = useState(autoStart)
  
  const config = statusConfig[status]
  const Icon = config.icon
  
  const checkStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/appypay/documents/${invoiceId}`)
      const data = await response.json()
      
      setLastChecked(new Date())
      setAttempts(prev => prev + 1)
      
      if (data.success !== false) {
        const newStatus = data.status as InvoiceProcessingStatus
        setStatus(newStatus)
        onStatusChange?.(newStatus)
        
        if (data.documentNo) {
          setDocumentNo(data.documentNo)
        }
        if (data.documentUrl) {
          setDocumentUrl(data.documentUrl)
        }
        
        if (newStatus === 'success' || newStatus === 'failed') {
          setIsPolling(false)
          onComplete?.({ 
            status: newStatus, 
            invoice: { hash: data.hash, qrCode: data.qrCode }
          })
        }
      } else {
        setError(data.error || 'Erro ao verificar estado')
        onError?.(data.error || 'Erro ao verificar estado')
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'Erro de rede'
      setError(errMsg)
      onError?.(errMsg)
    }
  }, [invoiceId, onStatusChange, onComplete, onError])
  
  useEffect(() => {
    if (!isPolling) return
    if (status === 'success' || status === 'failed' || status === 'timeout') return
    if (attempts >= maxAttempts) {
      setStatus('timeout')
      setIsPolling(false)
      return
    }
    
    // Primeira verificação imediata
    if (attempts === 0) {
      checkStatus()
    }
    
    // Polling interval
    const nextCheckTime = new Date(Date.now() + pollingIntervalMs)
    setNextCheck(nextCheckTime)
    
    const interval = setInterval(() => {
      checkStatus()
    }, pollingIntervalMs)
    
    return () => clearInterval(interval)
  }, [isPolling, attempts, status, checkStatus, maxAttempts, pollingIntervalMs])
  
  const handleManualCheck = () => {
    checkStatus()
  }
  
  const handleRetry = () => {
    setAttempts(0)
    setStatus('processing')
    setError(null)
    setIsPolling(true)
  }
  
  // Calcular progresso estimado
  const estimatedProgress = status === 'processing' 
    ? Math.min(90, 20 + (attempts / maxAttempts) * 70)
    : config.progress
  
  return (
    <Card className={config.bgColor}>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${config.color} ${config.animate === true ? 'animate-spin' : ''}`} />
            <span className={`font-medium ${config.color}`}>{config.label}</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {provider.toUpperCase()}
          </Badge>
        </div>
        
        <Progress value={estimatedProgress} className="h-2" />
        
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div>
            <span className="font-medium">ID: </span>
            <span className="font-mono">{invoiceId.substring(0, 8)}...</span>
          </div>
          <div className="text-right">
            <span className="font-medium">Tentativas: </span>
            <span>{attempts}/{maxAttempts}</span>
          </div>
        </div>
        
        {documentNo && (
          <div className="text-sm">
            <span className="font-medium">Documento: </span>
            <span className="font-mono">{documentNo}</span>
          </div>
        )}
        
        {lastChecked && (
          <p className="text-xs text-muted-foreground">
            Última verificação: {lastChecked.toLocaleTimeString('pt-AO')}
            {nextCheck && isPolling && (
              <> • Próxima em {Math.round((nextCheck.getTime() - Date.now()) / 1000)}s</>
            )}
          </p>
        )}
        
        {error && (
          <p className="text-xs text-red-500">{error}</p>
        )}
        
        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleManualCheck}
            disabled={isPolling && attempts > 0}
            className="flex-1"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Verificar Agora
          </Button>
          
          {(status === 'failed' || status === 'timeout') && (
            <Button 
              size="sm" 
              onClick={handleRetry}
              className="flex-1"
            >
              Tentar Novamente
            </Button>
          )}
          
          {documentUrl && (
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => window.open(documentUrl, '_blank')}
            >
              Ver PDF
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
