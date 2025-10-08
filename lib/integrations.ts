export type IntegrationType = 'odata' | 'rest' | 'queue'
export type IntegrationStatus = 'connected' | 'warning' | 'error'

export interface Integration {
  id: string
  name: string
  provider: string
  description: string
  type: IntegrationType
  endpoint: string
  status: IntegrationStatus
  latencyMs: number
  lastSync: string
  lastTested: string
  lastMessage?: string
}

const STORAGE_KEY = 'factura-agt-integrations'

const BASE_INTEGRATIONS: Array<Pick<Integration, 'id' | 'name' | 'provider' | 'description' | 'type' | 'endpoint' | 'status'>> = [
  {
    id: 'sap-odata',
    name: 'SAP S/4HANA OData Gateway',
    provider: 'SAP',
    description:
      'Sincronização de materiais, clientes e impostos via serviço OData ZFACTURA_AGT_SRV.',
    type: 'odata',
    endpoint: 'https://sap-dev.local/sap/opu/odata/sap/ZFACTURA_AGT_SRV',
    status: 'connected',
  },
  {
    id: 'sap-rest',
    name: 'SAP Event Mesh REST',
    provider: 'SAP',
    description:
      'Notificações assíncronas de faturação enviadas pelo SAP Event Mesh via RESTful API.',
    type: 'rest',
    endpoint: 'https://sap-dev.local/api/facturas/notify',
    status: 'connected',
  },
  {
    id: 'agt-rest',
    name: 'AGT e-Fatura Sandbox',
    provider: 'AGT',
    description:
      'Integração simulada com o endpoint oficial de submissão e consulta do ambiente de homologação.',
    type: 'rest',
    endpoint: 'https://sandbox.agt.gov.ao/api/efatura/v1',
    status: 'connected',
  },
]

function nowIso(offsetMinutes = 0): string {
  return new Date(Date.now() - offsetMinutes * 60_000).toISOString()
}

function createDefaultIntegrations(): Integration[] {
  return BASE_INTEGRATIONS.map((integration, index) => ({
    ...integration,
    latencyMs: 120 + index * 35,
    lastSync: nowIso(90 * (index + 1)),
    lastTested: nowIso(60 * (index + 1)),
    lastMessage: 'Ligação estável monitorizada nas últimas 24h.',
  }))
}

function saveIntegrations(integrations: Integration[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(integrations))
}

export function getIntegrations(): Integration[] {
  if (typeof window === 'undefined') {
    return createDefaultIntegrations()
  }

  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) {
    const defaults = createDefaultIntegrations()
    saveIntegrations(defaults)
    return defaults
  }

  try {
    const parsed = JSON.parse(stored) as Integration[]
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const defaults = createDefaultIntegrations()
      saveIntegrations(defaults)
      return defaults
    }
    return parsed
  } catch {
    const defaults = createDefaultIntegrations()
    saveIntegrations(defaults)
    return defaults
  }
}

export async function testIntegration(id: string): Promise<{ integration: Integration; message: string }> {
  const integrations = getIntegrations()
  const target = integrations.find((item) => item.id === id)
  if (!target) {
    throw new Error('Integração não encontrada')
  }

  await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 600))

  const random = Math.random()
  let status: IntegrationStatus = 'connected'
  let message = 'Ligação simulada com sucesso.'

  if (random > 0.9) {
    status = 'error'
    message = 'Timeout ao contactar o endpoint remoto. Tente novamente.'
  } else if (random > 0.7) {
    status = 'warning'
    message = 'Latência elevada detetada. Monitorize os próximos envios.'
  }

  const latencyMs = Math.round(120 + Math.random() * 180)
  const updated: Integration = {
    ...target,
    status,
    latencyMs,
    lastTested: new Date().toISOString(),
    lastSync: status === 'error' ? target.lastSync : new Date().toISOString(),
    lastMessage: message,
  }

  const next = integrations.map((item) => (item.id === id ? updated : item))
  saveIntegrations(next)

  return { integration: updated, message }
}

export function resetIntegrations(): Integration[] {
  const defaults = createDefaultIntegrations()
  saveIntegrations(defaults)
  return defaults
}

export function syncIntegration(id: string): Integration | null {
  const integrations = getIntegrations()
  const target = integrations.find((item) => item.id === id)
  if (!target) return null

  const updated: Integration = {
    ...target,
    lastSync: new Date().toISOString(),
    status: 'connected',
    latencyMs: Math.round(120 + Math.random() * 90),
    lastMessage: 'Sincronização manual executada.',
  }

  const next = integrations.map((item) => (item.id === id ? updated : item))
  saveIntegrations(next)
  return updated
}
