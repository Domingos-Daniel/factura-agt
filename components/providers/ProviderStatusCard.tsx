'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Cloud, Building2, RefreshCw, CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react'
import type { FiscalProviderName, ProviderHealth } from '@/lib/providers/types'

interface ProviderStatusCardProps {
  provider: FiscalProviderName
  health: ProviderHealth
  isActive: boolean
  onTest?: () => Promise<void>
  onSelect?: () => void
  onCreateSeries?: () => void
  activeSeriesCode?: string
}

const providerConfig = {
  appypay: {
    name: 'AppyPay Fiscal API',
    description: 'Provedor alternativo com processamento assíncrono',
    icon: Cloud,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950',
  },
  agt: {
    name: 'AGT e-Factura',
    description: 'Administração Geral Tributária - Provedor oficial',
    icon: Building2,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-950',
  },
}

const statusConfig = {
  available: {
    icon: CheckCircle,
    label: 'Disponível',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900',
  },
  unavailable: {
    icon: XCircle,
    label: 'Indisponível',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900',
  },
  degraded: {
    icon: AlertTriangle,
    label: 'Degradado',
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900',
  },
  unknown: {
    icon: Clock,
    label: 'Desconhecido',
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-900',
  },
}

export function ProviderStatusCard({
  provider,
  health,
  isActive,
  onTest,
  onSelect,
  onCreateSeries,
  activeSeriesCode,
}: ProviderStatusCardProps) {
  const [isTesting, setIsTesting] = useState(false)
  
  const config = providerConfig[provider]
  const statusCfg = statusConfig[health.status]
  const Icon = config.icon
  const StatusIcon = statusCfg.icon
  
  const handleTest = async () => {
    if (!onTest) return
    setIsTesting(true)
    try {
      await onTest()
    } finally {
      setIsTesting(false)
    }
  }
  
  return (
    <Card className={`relative ${isActive ? 'ring-2 ring-primary' : ''}`}>
      {isActive && (
        <div className="absolute -top-2 -right-2">
          <Badge className="bg-primary text-primary-foreground">Ativo</Badge>
        </div>
      )}
      
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${config.bgColor}`}>
            <Icon className={`h-6 w-6 ${config.color}`} />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">{config.name}</CardTitle>
            <CardDescription className="text-xs">{config.description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusIcon className={`h-4 w-4 ${statusCfg.color}`} />
            <span className={`text-sm font-medium ${statusCfg.color}`}>
              {statusCfg.label}
            </span>
          </div>
          {health.latencyMs > 0 && (
            <span className="text-xs text-muted-foreground">
              {health.latencyMs}ms
            </span>
          )}
        </div>
        
        {/* Mensagem */}
        {health.message && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {health.message}
          </p>
        )}
        
        {/* Série ativa (AppyPay) */}
        {provider === 'appypay' && activeSeriesCode && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Série:</span>
            <Badge variant="outline">{activeSeriesCode}</Badge>
          </div>
        )}
        
        {/* Última verificação */}
        <p className="text-xs text-muted-foreground">
          Última verificação: {new Date(health.lastChecked).toLocaleString('pt-AO')}
        </p>
        
        {/* Ações */}
        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleTest}
            disabled={isTesting}
            className="flex-1"
          >
            {isTesting ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Testar
          </Button>
          
          {!isActive && onSelect && (
            <Button 
              size="sm" 
              onClick={onSelect}
              className="flex-1"
            >
              Ativar
            </Button>
          )}
          
          {provider === 'appypay' && onCreateSeries && (
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={onCreateSeries}
            >
              Criar Série
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
