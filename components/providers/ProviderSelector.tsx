'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { RefreshCw, Cloud, Building2, ArrowRightLeft } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { ProviderStatusCard } from './ProviderStatusCard'
import type { FiscalProviderName, ProviderHealth, ProviderManagerConfig } from '@/lib/providers/types'

interface ProviderSelectorProps {
  onProviderChange?: (provider: FiscalProviderName) => void
}

interface ProviderState {
  name: FiscalProviderName
  displayName: string
  status: 'available' | 'unavailable' | 'degraded' | 'unknown'
  latencyMs: number
  lastChecked: string
  message?: string
  tokenValid?: boolean
  activeSeriesCount?: number
  isActive: boolean
}

export function ProviderSelector({ onProviderChange }: ProviderSelectorProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [config, setConfig] = useState<ProviderManagerConfig | null>(null)
  const [providers, setProviders] = useState<ProviderState[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  
  const loadProviders = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/providers')
      const data = await response.json()
      
      if (data.success) {
        setConfig(data.config)
        setProviders(data.providers)
        setPendingCount(data.pendingInvoicesCount || 0)
      }
    } catch (e) {
      console.error('Erro ao carregar provedores:', e)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar provedores',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])
  
  useEffect(() => {
    loadProviders()
  }, [loadProviders])
  
  const handleSelectProvider = async (name: FiscalProviderName) => {
    try {
      const response = await fetch('/api/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activeProvider: name }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        setConfig(data.config)
        setProviders(prev => prev.map(p => ({
          ...p,
          isActive: p.name === name,
        })))
        onProviderChange?.(name)
        
        toast({
          title: 'Provedor alterado',
          description: `${name === 'appypay' ? 'AppyPay' : 'AGT'} está agora ativo`,
        })
      }
    } catch (e) {
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar provedor',
        variant: 'destructive',
      })
    }
  }
  
  const handleToggleFallback = async (enabled: boolean) => {
    try {
      const response = await fetch('/api/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fallbackEnabled: enabled }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        setConfig(data.config)
        toast({
          title: enabled ? 'Fallback ativado' : 'Fallback desativado',
          description: enabled 
            ? 'Sistema usará provedor alternativo se o principal falhar'
            : 'Sistema usará apenas o provedor principal',
        })
      }
    } catch (e) {
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar fallback',
        variant: 'destructive',
      })
    }
  }
  
  const handleTestProvider = async (name: FiscalProviderName) => {
    try {
      const response = await fetch(`/api/appypay/health`)
      const data = await response.json()
      
      if (data.success) {
        setProviders(prev => prev.map(p => 
          p.name === name 
            ? { ...p, ...data.health }
            : p
        ))
        
        toast({
          title: 'Teste concluído',
          description: data.health.message || 'Provedor testado com sucesso',
        })
      }
    } catch (e) {
      toast({
        title: 'Erro',
        description: 'Falha ao testar provedor',
        variant: 'destructive',
      })
    }
  }
  
  const handleCreateSeries = async () => {
    try {
      const response = await fetch('/api/appypay/series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: new Date().getFullYear(),
          documentType: 'FT',
        }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: 'Série criada',
          description: `Série ${data.seriesCode} criada com sucesso`,
        })
        loadProviders()
      } else {
        toast({
          title: 'Erro',
          description: data.error || 'Não foi possível criar série',
          variant: 'destructive',
        })
      }
    } catch (e) {
      toast({
        title: 'Erro',
        description: 'Falha ao criar série',
        variant: 'destructive',
      })
    }
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Header com ações */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Provedores Fiscais</h3>
          <p className="text-sm text-muted-foreground">
            Selecione o provedor para emissão de facturas
          </p>
        </div>
        <div className="flex items-center gap-4">
          {pendingCount > 0 && (
            <Badge variant="secondary">
              {pendingCount} pendente{pendingCount !== 1 ? 's' : ''}
            </Badge>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadProviders}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </div>
      
      {/* Cards dos provedores */}
      <div className="grid gap-4 md:grid-cols-2">
        {providers.map(provider => (
          <ProviderStatusCard
            key={provider.name}
            provider={provider.name}
            health={{
              provider: provider.name,
              status: provider.status,
              latencyMs: provider.latencyMs,
              lastChecked: provider.lastChecked,
              message: provider.message,
              tokenValid: provider.tokenValid,
              activeSeriesCount: provider.activeSeriesCount,
            }}
            isActive={provider.isActive}
            onTest={() => handleTestProvider(provider.name)}
            onSelect={() => handleSelectProvider(provider.name)}
            onCreateSeries={provider.name === 'appypay' ? handleCreateSeries : undefined}
          />
        ))}
      </div>
      
      {/* Configuração de fallback */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Fallback Automático</CardTitle>
          </div>
          <CardDescription>
            Se o provedor principal estiver indisponível, usar automaticamente o alternativo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="fallback-switch">Ativar Fallback</Label>
              <p className="text-xs text-muted-foreground">
                Ordem: {config?.fallbackOrder.join(' → ')}
              </p>
            </div>
            <Switch
              id="fallback-switch"
              checked={config?.fallbackEnabled || false}
              onCheckedChange={handleToggleFallback}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
