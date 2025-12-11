'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'

import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import {
  DEFAULT_APP_CONFIG,
  getAppConfig,
  updateAppConfig,
  getAuth,
  saveAuth,
  isAuthenticated,
  saveFacturas,
  saveSeries,
} from '@/lib/storage'
import type { AppConfig } from '@/lib/types'
import { seedMockData } from '@/lib/mockData'
import { getIntegrations, testIntegration, resetIntegrations, syncIntegration } from '@/lib/integrations'
import type { Integration } from '@/lib/integrations'
import { IntegrationStatusBoard } from '@/components/integrations/IntegrationStatusBoard'

const currencyOptions = [
  { value: 'AOA', label: 'AOA - Kwanza' },
  { value: 'USD', label: 'USD - Dólar Norte-Americano' },
  { value: 'EUR', label: 'EUR - Euro' },
]

const paymentOptions = [
  { value: 'NU', label: 'Numerário' },
  { value: 'TB', label: 'Transferência Bancária' },
  { value: 'CD', label: 'Cartão de Débito' },
  { value: 'CC', label: 'Cartão de Crédito' },
]

export default function ConfiguracoesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [config, setConfig] = useState<AppConfig>(DEFAULT_APP_CONFIG)
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [testingIntegrationId, setTestingIntegrationId] = useState<string | null>(null)
  const [syncingIntegrationId, setSyncingIntegrationId] = useState<string | null>(null)
  const [profile, setProfile] = useState({
    companyName: DEFAULT_APP_CONFIG.companyName,
    companyNIF: DEFAULT_APP_CONFIG.companyNIF,
    companyEmail: DEFAULT_APP_CONFIG.companyEmail,
    companyAddress: DEFAULT_APP_CONFIG.companyAddress,
  })
  const [preferences, setPreferences] = useState({
    defaultCurrency: DEFAULT_APP_CONFIG.defaultCurrency,
    defaultPaymentMechanism: DEFAULT_APP_CONFIG.defaultPaymentMechanism,
    defaultCountry: DEFAULT_APP_CONFIG.defaultCountry,
    aiAssistantsEnabled: DEFAULT_APP_CONFIG.aiAssistantsEnabled,
    autoSuggestTaxes: DEFAULT_APP_CONFIG.autoSuggestTaxes,
  })
  const [systemSettings, setSystemSettings] = useState({
    systemName: DEFAULT_APP_CONFIG.systemName || 'Sistema AGT',
    systemSubtitle: DEFAULT_APP_CONFIG.systemSubtitle || 'Faturação Eletrónica',
  })

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login')
      return
    }

    const currentConfig = getAppConfig()
    setConfig(currentConfig)
    setPreferences({
      defaultCurrency: currentConfig.defaultCurrency,
      defaultPaymentMechanism: currentConfig.defaultPaymentMechanism,
      defaultCountry: currentConfig.defaultCountry,
      aiAssistantsEnabled: currentConfig.aiAssistantsEnabled,
      autoSuggestTaxes: currentConfig.autoSuggestTaxes,
    })
    setSystemSettings({
      systemName: currentConfig.systemName || 'Sistema AGT',
      systemSubtitle: currentConfig.systemSubtitle || 'Faturação Eletrónica',
    })

    const auth = getAuth()
    setProfile({
      companyName: auth?.user?.company || currentConfig.companyName,
      companyNIF: auth?.user?.nif || currentConfig.companyNIF,
      companyEmail: auth?.user?.email || currentConfig.companyEmail,
      companyAddress: currentConfig.companyAddress,
    })

    setIntegrations(getIntegrations())
  }, [router])

  const handleProfileSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextConfig = updateAppConfig({
      companyName: profile.companyName,
      companyNIF: profile.companyNIF,
      companyEmail: profile.companyEmail,
      companyAddress: profile.companyAddress,
    })
    setConfig(nextConfig)

    const auth = getAuth()
    if (auth) {
      const updatedAuth = {
        ...auth,
        user: {
          ...auth.user,
          name: profile.companyName,
          company: profile.companyName,
          nif: profile.companyNIF,
          email: profile.companyEmail,
        },
      }
      saveAuth(updatedAuth)
    }

    toast({
      title: 'Configurações guardadas',
      description: 'Os dados do emitente foram atualizados com sucesso.',
    })
  }

  const handlePreferencesSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const updated = updateAppConfig({
      defaultCurrency: preferences.defaultCurrency,
      defaultPaymentMechanism: preferences.defaultPaymentMechanism,
      defaultCountry: preferences.defaultCountry,
      aiAssistantsEnabled: preferences.aiAssistantsEnabled,
      autoSuggestTaxes: preferences.autoSuggestTaxes,
    })
    setConfig(updated)
    toast({
      title: 'Preferências guardadas',
      description: 'Os valores padrão para novas facturas foram atualizados.',
    })
  }

  const handleSystemSettingsSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const updated = updateAppConfig({
      systemName: systemSettings.systemName,
      systemSubtitle: systemSettings.systemSubtitle,
    })
    setConfig(updated)
    toast({
      title: 'Configurações do sistema guardadas',
      description: 'O nome e subtítulo do sistema foram atualizados.',
    })
  }

  const handleSeedData = () => {
    seedMockData()
    toast({
      title: 'Dados mock gerados',
      description: 'Séries e facturas de exemplo foram recarregadas.',
    })
  }

  const handleClearDocuments = () => {
    saveFacturas([])
    saveSeries([])
    toast({
      variant: 'destructive',
      title: 'Facturas e séries limpas',
      description: 'Todos os documentos locais foram removidos.',
    })
  }

  const handleResetConfig = () => {
    const reset = updateAppConfig(DEFAULT_APP_CONFIG)
    setConfig(reset)
    setPreferences({
      defaultCurrency: reset.defaultCurrency,
      defaultPaymentMechanism: reset.defaultPaymentMechanism,
      defaultCountry: reset.defaultCountry,
      aiAssistantsEnabled: reset.aiAssistantsEnabled,
      autoSuggestTaxes: reset.autoSuggestTaxes,
    })
    setSystemSettings({
      systemName: reset.systemName || 'Sistema AGT',
      systemSubtitle: reset.systemSubtitle || 'Faturação Eletrónica',
    })
    setProfile({
      companyName: reset.companyName,
      companyNIF: reset.companyNIF,
      companyEmail: reset.companyEmail,
      companyAddress: reset.companyAddress,
    })
    setIntegrations(resetIntegrations())
    toast({
      title: 'Configuração restaurada',
      description: 'As definições voltaram aos valores padrão do sistema.',
    })
  }

  const handleTestIntegration = async (id: string) => {
    setTestingIntegrationId(id)
    try {
      const { integration, message } = await testIntegration(id)
      setIntegrations(getIntegrations())
      toast({
        title:
          integration.status === 'connected'
            ? 'Ligação SAP/REST validada'
            : integration.status === 'warning'
              ? 'Ligação com latência elevada'
              : 'Falha na ligação simulada',
        description: message,
        variant: integration.status === 'error' ? 'destructive' : 'default',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Teste de ligação falhou',
        description: error instanceof Error ? error.message : 'Erro inesperado ao testar ligação.',
      })
    } finally {
      setTestingIntegrationId(null)
    }
  }

  const handleSyncIntegration = async (id: string) => {
    setSyncingIntegrationId(id)
    await new Promise((resolve) => setTimeout(resolve, 500))
    const updated = syncIntegration(id)
    if (updated) {
      setIntegrations(getIntegrations())
      toast({
        title: 'Sincronização executada',
        description: `${updated.name} sincronizado às ${new Date(updated.lastSync).toLocaleTimeString('pt-AO', {
          hour: '2-digit',
          minute: '2-digit',
        })}.`,
      })
    }
    setSyncingIntegrationId(null)
  }

  const integrationTypeLabel: Record<string, string> = {
    odata: 'SAP OData',
    rest: 'RESTful',
    queue: 'Mensageria',
    portal: 'Portal Web',
    status: 'Status API',
  }

  const statusVariant: Record<Integration['status'], 'default' | 'secondary' | 'destructive'> = {
    connected: 'default',
    warning: 'secondary',
    error: 'destructive',
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Configurações</h2>
          <p className="text-muted-foreground">Personalize os dados do emitente e os padrões de faturação.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Perfil do Emitente</CardTitle>
            <CardDescription>Dados utilizados nas comunicações com a AGT e nos documentos emitidos.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleProfileSubmit}>
              <div className="space-y-2">
                <Label htmlFor="companyName">Nome da empresa</Label>
                <Input
                  id="companyName"
                  value={profile.companyName}
                  onChange={(event) => setProfile((prev) => ({ ...prev, companyName: event.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyNIF">NIF</Label>
                <Input
                  id="companyNIF"
                  value={profile.companyNIF}
                  onChange={(event) => setProfile((prev) => ({ ...prev, companyNIF: event.target.value }))}
                  required
                  maxLength={15}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyEmail">Email de contacto</Label>
                <Input
                  id="companyEmail"
                  type="email"
                  value={profile.companyEmail}
                  onChange={(event) => setProfile((prev) => ({ ...prev, companyEmail: event.target.value }))}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="companyAddress">Endereço</Label>
                <Input
                  id="companyAddress"
                  placeholder="Rua, cidade"
                  value={profile.companyAddress}
                  onChange={(event) => setProfile((prev) => ({ ...prev, companyAddress: event.target.value }))}
                />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <Button type="submit">Guardar dados do emitente</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preferências de Faturação</CardTitle>
            <CardDescription>Defina padrões para novas facturas e comportamento das assistentes inteligentes.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={handlePreferencesSubmit}>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Moeda padrão</Label>
                  <Select
                    value={preferences.defaultCurrency}
                    onValueChange={(value) => setPreferences((prev) => ({ ...prev, defaultCurrency: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencyOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Meio de pagamento padrão</Label>
                  <Select
                    value={preferences.defaultPaymentMechanism}
                    onValueChange={(value) => setPreferences((prev) => ({ ...prev, defaultPaymentMechanism: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultCountry">País padrão</Label>
                  <Input
                    id="defaultCountry"
                    value={preferences.defaultCountry}
                    maxLength={2}
                    onChange={(event) => setPreferences((prev) => ({ ...prev, defaultCountry: event.target.value.toUpperCase() }))}
                  />
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-start gap-3">
                  <input
                    id="aiAssistantsEnabled"
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-primary"
                    checked={preferences.aiAssistantsEnabled}
                    onChange={(event) => setPreferences((prev) => ({ ...prev, aiAssistantsEnabled: event.target.checked }))}
                  />
                  <div>
                    <Label htmlFor="aiAssistantsEnabled">Mostrar assistentes de IA</Label>
                    <p className="text-sm text-muted-foreground">
                      Controla a exibição do assistente inteligente, pesquisa de produtos e sugestões de impostos na página de nova factura.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <input
                    id="autoSuggestTaxes"
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-primary"
                    checked={preferences.autoSuggestTaxes}
                    onChange={(event) => setPreferences((prev) => ({ ...prev, autoSuggestTaxes: event.target.checked }))}
                  />
                  <div>
                    <Label htmlFor="autoSuggestTaxes">Sugerir isenções automaticamente</Label>
                    <p className="text-sm text-muted-foreground">
                      Preenche automaticamente códigos de isenção de IVA com base no CAE e na descrição da linha.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit">Guardar preferências</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Aparência do Sistema</CardTitle>
            <CardDescription>Personalize o nome e subtítulo exibidos no cabeçalho da aplicação.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSystemSettingsSubmit}>
              <div className="space-y-2">
                <Label htmlFor="systemName">Nome do Sistema</Label>
                <Input
                  id="systemName"
                  value={systemSettings.systemName}
                  onChange={(event) => setSystemSettings((prev) => ({ ...prev, systemName: event.target.value }))}
                  placeholder="Sistema AGT"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="systemSubtitle">Subtítulo do Sistema</Label>
                <Input
                  id="systemSubtitle"
                  value={systemSettings.systemSubtitle}
                  onChange={(event) => setSystemSettings((prev) => ({ ...prev, systemSubtitle: event.target.value }))}
                  placeholder="Faturação Eletrónica"
                />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <Button type="submit">Guardar aparência</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h2v-2h-2v2zm0-4h2V7h-2v6z"/>
              </svg>
              Integração SAP → AGT
            </CardTitle>
            <CardDescription>
              Documentação técnica, WSDL e exemplos para programadores SAP (ECC/S/4HANA)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                📘 Para Programadores SAP
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                Este sistema fornece APIs REST e SOAP para integração com SAP ECC, S/4HANA via PI/PO ou CPI.
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="bg-white dark:bg-gray-800">
                  REST API
                </Badge>
                <Badge variant="outline" className="bg-white dark:bg-gray-800">
                  SOAP/WSDL
                </Badge>
                <Badge variant="outline" className="bg-white dark:bg-gray-800">
                  JWT Auth
                </Badge>
                <Badge variant="outline" className="bg-white dark:bg-gray-800">
                  JSON Format
                </Badge>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">📄 Documentação Técnica</h4>
                <div className="space-y-2">
                  <a
                    href="/INTEGRACAO_SAP_AGT.md"
                    target="_blank"
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div>
                        <p className="font-medium text-sm">Guia de Integração</p>
                        <p className="text-xs text-muted-foreground">Completo com exemplos</p>
                      </div>
                    </div>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>

                  <a
                    href="/wsdl/AGT_FacturaService.wsdl"
                    download
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      <div>
                        <p className="font-medium text-sm">WSDL Service</p>
                        <p className="text-xs text-muted-foreground">Para SAP PI/PO</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">Download</Badge>
                  </a>

                  <a
                    href="/postman/AGT_API_Collection.json"
                    download
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                      </svg>
                      <div>
                        <p className="font-medium text-sm">Postman Collection</p>
                        <p className="text-xs text-muted-foreground">Testes de API</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">Download</Badge>
                  </a>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-sm">🔌 Endpoints REST</h4>
                <div className="space-y-2 text-sm font-mono bg-muted p-3 rounded-lg">
                  <div>
                    <Badge variant="default" className="text-xs">POST</Badge>
                    <span className="ml-2 text-xs">/api/agt/registarFactura</span>
                  </div>
                  <div>
                    <Badge variant="secondary" className="text-xs">GET</Badge>
                    <span className="ml-2 text-xs">/api/agt/listarFacturas</span>
                  </div>
                  <div>
                    <Badge variant="default" className="text-xs">POST</Badge>
                    <span className="ml-2 text-xs">/api/agt/consultarFactura</span>
                  </div>
                  <div>
                    <Badge variant="secondary" className="text-xs">GET</Badge>
                    <span className="ml-2 text-xs">/api/agt/obterEstado</span>
                  </div>
                  <div>
                    <Badge variant="default" className="text-xs">POST</Badge>
                    <span className="ml-2 text-xs">/api/agt/solicitarSerie</span>
                  </div>
                  <div>
                    <Badge variant="secondary" className="text-xs">GET</Badge>
                    <span className="ml-2 text-xs">/api/agt/listarSeries</span>
                  </div>
                </div>

                <div className="pt-2">
                  <h5 className="font-semibold text-sm mb-2">🔑 Autenticação</h5>
                  <div className="bg-yellow-50 dark:bg-yellow-950 p-3 rounded border border-yellow-200 dark:border-yellow-800">
                    <p className="text-xs font-mono text-yellow-900 dark:text-yellow-100">
                      Authorization: Bearer &lt;JWT_TOKEN&gt;
                    </p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                      Token obtido via POST /api/auth/login
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-semibold text-sm mb-3">📋 Mapeamento SAP → AGT</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-2 rounded-tl">Campo SAP</th>
                      <th className="text-left p-2">Campo AGT</th>
                      <th className="text-left p-2 rounded-tr">Observações</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs">
                    <tr className="border-b">
                      <td className="p-2 font-mono">VBRK-VBELN</td>
                      <td className="p-2 font-mono">documentNumber</td>
                      <td className="p-2 text-muted-foreground">Nº interno SAP</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-mono">VBRK-FKART</td>
                      <td className="p-2 font-mono">documentType</td>
                      <td className="p-2 text-muted-foreground">F1→FT, RE→NC</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-mono">KNA1-STCD1</td>
                      <td className="p-2 font-mono">client.nif</td>
                      <td className="p-2 text-muted-foreground">NIF cliente (9 dígitos)</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-mono">VBRP-MATNR</td>
                      <td className="p-2 font-mono">lines[].productCode</td>
                      <td className="p-2 text-muted-foreground">Código material</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-mono">KONV-KBETR</td>
                      <td className="p-2 font-mono">taxes[].rate</td>
                      <td className="p-2 text-muted-foreground">Taxa IVA/IS (%)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-2 text-right">
                <a href="/INTEGRACAO_SAP_AGT.md#mapeamento-sap--agt" target="_blank" className="text-xs text-primary hover:underline">
                  Ver mapeamento completo →
                </a>
              </div>
            </div>

            <Separator />

            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
              <h4 className="font-semibold text-sm mb-2">💡 Exemplo de Payload (SAP → AGT)</h4>
              <pre className="text-xs overflow-x-auto bg-white dark:bg-black p-3 rounded border">
{`{
  "nif": "999888777",
  "documentType": "FT",
  "seriesNumber": "FT 2025/00123",
  "issueDate": "2025-12-11T10:30:00",
  "client": {
    "nif": "123456789",
    "name": "Empresa ABC Lda"
  },
  "lines": [{
    "lineNumber": 1,
    "productCode": "MAT001",
    "description": "Produto",
    "quantity": 5,
    "unitPrice": 10000.00,
    "taxes": [{"type": "IVA", "rate": 14}]
  }],
  "totals": {
    "subtotal": 50000.00,
    "totalTax": 7000.00,
    "total": 57000.00
  },
  "payment": {
    "method": "TB",
    "currency": "AOA"
  }
}`}
              </pre>
            </div>

            <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
              <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-green-800 dark:text-green-200">
                <p className="font-semibold">Pronto para Integração</p>
                <p className="text-xs mt-1">
                  Todos os ficheiros e documentação estão disponíveis. 
                  Compartilhe com a equipa SAP para iniciar o desenvolvimento da integração PI/PO ou CPI.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <IntegrationStatusBoard variant="compact" autoRefreshMs={90_000} />

        <Card>
          <CardHeader>
            <CardTitle>Integrações Mock (SAP & AGT)</CardTitle>
            <CardDescription>
              Estado simulado das ligações OData SAP e serviços RESTful para dar visibilidade aos fluxos externos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {integrations.map((integration) => (
              <div key={integration.id} className="rounded-lg border p-4 space-y-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{integration.name}</p>
                      <Badge variant="outline">{integrationTypeLabel[integration.type]}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{integration.description}</p>
                    <p className="text-xs font-mono text-muted-foreground break-all">{integration.endpoint}</p>
                  </div>
                  <div className="flex flex-col items-start gap-1 text-xs text-muted-foreground md:items-end">
                    <Badge variant={statusVariant[integration.status]}>
                      {integration.status === 'connected'
                        ? 'Ligado'
                        : integration.status === 'warning'
                          ? 'Latência elevada'
                          : 'Interrupção'}
                    </Badge>
                    <span>Latência média: {integration.latencyMs} ms</span>
                    <span>
                      Último teste: {formatDistanceToNow(new Date(integration.lastTested), { addSuffix: true })}
                    </span>
                    <span>
                      Último sync: {formatDistanceToNow(new Date(integration.lastSync), { addSuffix: true })}
                    </span>
                  </div>
                </div>
                {integration.lastMessage && (
                  <p className="text-xs text-muted-foreground">{integration.lastMessage}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleTestIntegration(integration.id)}
                    disabled={testingIntegrationId === integration.id || syncingIntegrationId === integration.id}
                  >
                    {testingIntegrationId === integration.id ? 'A testar...' : 'Testar ligação'}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleSyncIntegration(integration.id)}
                    disabled={syncingIntegrationId === integration.id || testingIntegrationId === integration.id}
                  >
                    {syncingIntegrationId === integration.id ? 'A sincronizar...' : 'Sincronizar agora'}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dados Locais</CardTitle>
            <CardDescription>Ferramentas para gestão rápida dos dados armazenados no navegador.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium">Recarregar dados de exemplo</p>
                <p className="text-sm text-muted-foreground">
                  Popular novamente séries e facturas de demonstração sem eliminar os seus registos existentes.
                </p>
              </div>
              <Button type="button" variant="outline" onClick={handleSeedData}>
                Recarregar mock data
              </Button>
            </div>
            <Separator />
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium">Limpar documentos locais</p>
                <p className="text-sm text-muted-foreground">
                  Remove todas as facturas e séries guardadas no navegador. Não afeta as suas credenciais.
                </p>
              </div>
              <Button type="button" variant="destructive" onClick={handleClearDocuments}>
                Limpar facturas e séries
              </Button>
            </div>
            <Separator />
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium">Restaurar configuração padrão</p>
                <p className="text-sm text-muted-foreground">
                  Reverte todas as preferências para os valores originais do protótipo.
                </p>
              </div>
              <Button type="button" variant="secondary" onClick={handleResetConfig}>
                Restaurar padrões
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
