'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useToast } from '@/components/ui/use-toast'
import { ProviderSelector } from '@/components/providers'
import { Cloud, Building2, AlertTriangle, CheckCircle, Info } from 'lucide-react'

export default function ProvedoresPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isClient, setIsClient] = useState(false)
  
  useEffect(() => {
    setIsClient(true)
  }, [router])
  
  if (!isClient) {
    return null
  }
  
  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Provedores Fiscais</h2>
          <p className="text-muted-foreground">
            Configure os provedores de faturação eletrónica do sistema
          </p>
        </div>
        
        {/* Alerta informativo */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Sobre os Provedores</AlertTitle>
          <AlertDescription>
            O sistema suporta múltiplos provedores fiscais. O <strong>AppyPay</strong> é 
            um provedor alternativo com processamento assíncrono, enquanto a <strong>AGT</strong> é 
            o provedor oficial da Administração Geral Tributária. Pode configurar fallback 
            automático entre provedores.
          </AlertDescription>
        </Alert>
        
        {/* Selector de provedores */}
        <ProviderSelector />
        
        <Separator />
        
        {/* Configurações AppyPay */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Cloud className="h-5 w-5 text-blue-600" />
              <CardTitle>Configurações AppyPay</CardTitle>
            </div>
            <CardDescription>
              Credenciais de acesso à API AppyPay Fiscal. Estas configurações são 
              definidas via variáveis de ambiente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Ambiente</Label>
                <div className="flex items-center gap-2">
                  <Badge variant={process.env.NEXT_PUBLIC_APPYPAY_ENV === 'production' ? 'default' : 'secondary'}>
                    {process.env.NEXT_PUBLIC_APPYPAY_ENV || 'test'}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {process.env.NEXT_PUBLIC_APPYPAY_ENV === 'production' 
                      ? 'Produção' 
                      : 'Teste (TST)'}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Base URL</Label>
                <Input 
                  value={process.env.NEXT_PUBLIC_APPYPAY_ENV === 'production'
                    ? 'https://gwy-api.appypay.co.ao/v1.0'
                    : 'https://gwy-api-tst.appypay.co.ao/v1.0'
                  }
                  disabled
                  className="font-mono text-sm"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Client ID</Label>
                <Input 
                  type="password"
                  value="••••••••••••••••••••"
                  disabled
                />
                <p className="text-xs text-muted-foreground">
                  Definido via APPYPAY_CLIENT_ID
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>Client Secret</Label>
                <Input 
                  type="password"
                  value="••••••••••••••••••••"
                  disabled
                />
                <p className="text-xs text-muted-foreground">
                  Definido via APPYPAY_CLIENT_SECRET
                </p>
              </div>
            </div>
            
            <Alert variant="default" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Configuração via Ambiente</AlertTitle>
              <AlertDescription>
                As credenciais AppyPay são configuradas via variáveis de ambiente 
                (.env.local) por segurança. Para alterar, edite o ficheiro .env.local 
                e reinicie a aplicação.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
        
        {/* Configurações AGT */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-orange-600" />
              <CardTitle>Configurações AGT</CardTitle>
            </div>
            <CardDescription>
              Credenciais de acesso à API e-Factura da AGT.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Ambiente</Label>
                <div className="flex items-center gap-2">
                  <Badge variant={process.env.AGT_ENVIRONMENT === 'prod' ? 'default' : 'secondary'}>
                    {process.env.AGT_ENVIRONMENT || 'hml'}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {process.env.AGT_ENVIRONMENT === 'prod' 
                      ? 'Produção' 
                      : 'Homologação (HML)'}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>NIF Emissor</Label>
                <Input 
                  value={process.env.NEXT_PUBLIC_AGT_NIF || '••••••••••'}
                  disabled
                  className="font-mono"
                />
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground">
              As credenciais AGT (username, password, chave privada) são configuradas 
              via variáveis de ambiente.
            </p>
          </CardContent>
        </Card>
        
        {/* Documentação */}
        <Card>
          <CardHeader>
            <CardTitle>Documentação</CardTitle>
            <CardDescription>
              Links úteis para configuração dos provedores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <a 
                href="https://docs.appypay.co.ao" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-600 hover:underline"
              >
                <Cloud className="h-4 w-4" />
                Documentação AppyPay
              </a>
              <a 
                href="https://portaldoparceiro.minfin.gov.ao/doc-agt/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-orange-600 hover:underline"
              >
                <Building2 className="h-4 w-4" />
                Portal do Parceiro AGT
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
