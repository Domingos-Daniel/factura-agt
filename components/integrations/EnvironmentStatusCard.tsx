'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Server, Wifi, WifiOff, AlertCircle } from 'lucide-react'

interface EnvironmentStatus {
  name: string
  label: string
  color: string
  bgColor: string
  isActive: boolean
  status: 'online' | 'offline' | 'unknown'
  description: string
}

export function EnvironmentStatusCard() {
  const [environments, setEnvironments] = useState<EnvironmentStatus[]>([])
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkEnvironments = async () => {
      setIsChecking(true)
      
      // Buscar ambiente atual do servidor
      let activeEnv = 'mock'
      try {
        const response = await fetch('/api/config/environment', { cache: 'no-store' })
        if (response.ok) {
          const data = await response.json()
          activeEnv = data.environment || 'mock'
        }
      } catch (error) {
        console.error('Erro ao buscar ambiente:', error)
      }

      // Definir os ambientes
      const envList: EnvironmentStatus[] = [
        {
          name: 'mock',
          label: 'DEMO',
          color: 'text-gray-700',
          bgColor: 'bg-gray-100 border-gray-300',
          isActive: activeEnv === 'mock',
          status: activeEnv === 'mock' ? 'online' : 'unknown',
          description: 'Ambiente de demonstração local'
        },
        {
          name: 'hml',
          label: 'HML',
          color: 'text-yellow-700',
          bgColor: 'bg-yellow-50 border-yellow-300',
          isActive: activeEnv === 'hml',
          status: activeEnv === 'hml' ? 'online' : 'unknown',
          description: 'e-Fatura Sandbox'
        },
        {
          name: 'prod',
          label: 'PRODUÇÃO',
          color: 'text-green-700',
          bgColor: 'bg-green-50 border-green-300',
          isActive: activeEnv === 'prod',
          status: activeEnv === 'prod' ? 'online' : 'unknown',
          description: 'e-Fatura Produção'
        }
      ]

      // Se estiver no ambiente ativo, tentar verificar conexão
      if (activeEnv !== 'mock') {
        try {
          const response = await fetch('/api/agt/health', { 
            method: 'HEAD',
            cache: 'no-store' 
          })
          
          const activeIndex = envList.findIndex(e => e.isActive)
          if (activeIndex !== -1) {
            envList[activeIndex].status = response.ok ? 'online' : 'offline'
          }
        } catch (error) {
          const activeIndex = envList.findIndex(e => e.isActive)
          if (activeIndex !== -1) {
            envList[activeIndex].status = 'offline'
          }
        }
      }

      setEnvironments(envList)
      setIsChecking(false)
    }

    checkEnvironments()
    
    // Atualizar a cada 60 segundos
    const interval = setInterval(checkEnvironments, 60000)
    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <Wifi className="w-4 h-4 text-green-600" />
      case 'offline':
        return <WifiOff className="w-4 h-4 text-red-600" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online':
        return <Badge className="bg-green-600 text-white text-[10px] px-2 py-0 h-5">Online</Badge>
      case 'offline':
        return <Badge className="bg-red-600 text-white text-[10px] px-2 py-0 h-5">Offline</Badge>
      default:
        return <Badge variant="outline" className="text-[10px] px-2 py-0 h-5">Desconhecido</Badge>
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Server className="w-4 h-4" />
          Status dos Ambientes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isChecking ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : (
          environments.map((env) => (
            <div
              key={env.name}
              className={`p-3 rounded-lg border-2 transition-all ${
                env.isActive 
                  ? `${env.bgColor} shadow-sm` 
                  : 'bg-muted/30 border-muted-foreground/20 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(env.status)}
                  <span className={`font-semibold text-sm ${env.isActive ? env.color : 'text-muted-foreground'}`}>
                    {env.label}
                  </span>
                  {env.isActive && (
                    <Badge variant="default" className="bg-primary text-white text-[9px] px-1.5 py-0 h-4">
                      ATIVO
                    </Badge>
                  )}
                </div>
                {getStatusBadge(env.status)}
              </div>
              <p className={`text-xs ${env.isActive ? 'text-muted-foreground' : 'text-muted-foreground/60'}`}>
                {env.description}
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
