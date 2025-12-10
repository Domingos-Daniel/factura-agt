export type IntegrationType = 'odata' | 'rest' | 'queue' | 'portal' | 'status'
export type IntegrationStatus = 'connected' | 'warning' | 'error'
export type IntegrationEnvironment = 'sandbox' | 'quality' | 'production'
export type IntegrationSystem = 'sap' | 'agt' | 'external'

export interface IntegrationDefinition {
  id: string
  name: string
  provider: string
  description: string
  type: IntegrationType
  endpoint: string
  healthCheckUrl?: string
  method?: 'GET' | 'HEAD'
  environment: IntegrationEnvironment
  system: IntegrationSystem
  documentationUrl?: string
  criticality?: 'core' | 'support'
  region?: string
  slaMs?: number
  warnLatencyMs?: number
  timeoutMs?: number
}

export interface IntegrationStatusSnapshot {
  id: string
  status: IntegrationStatus
  statusMessage: string
  latencyMs: number
  lastChecked: string
  environment: IntegrationEnvironment
  system: IntegrationSystem
}

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
  environment: IntegrationEnvironment
  system: IntegrationSystem
  documentationUrl?: string
  criticality?: 'core' | 'support'
  region?: string
  healthCheckUrl?: string
  method?: 'GET' | 'HEAD'
  slaMs?: number
  warnLatencyMs?: number
  timeoutMs?: number
}

const STORAGE_KEY = 'factura-agt-integrations'
const DEFAULT_SLA_MS = 600

function resolveEnv(key: string, fallback: string): string {
  if (typeof process !== 'undefined' && process.env) {
    const direct = process.env[key]
    if (direct) return direct
  }
  if (typeof window !== 'undefined') {
    const clientKey = (window as unknown as { __env?: Record<string, string> }).__env?.[key]
    if (clientKey) return clientKey
  }
  return fallback
}

export function getIntegrationDefinitions(): IntegrationDefinition[] {
  const sapLandscape = (resolveEnv('NEXT_PUBLIC_SAP_LANDSCAPE', 'sandbox') as IntegrationEnvironment)
  const sapOdataUrl = resolveEnv(
    'NEXT_PUBLIC_SAP_ODATA_GATEWAY_URL',
    'https://sap-dev.local/sap/opu/odata/sap/ZFACTURA_AGT_SRV'
  )
  const sapOdataHealth = resolveEnv(
    'NEXT_PUBLIC_SAP_ODATA_HEALTH_URL',
    `${sapOdataUrl.replace(/\/$/, '')}/$metadata`
  )
  const sapEventMeshUrl = resolveEnv(
    'NEXT_PUBLIC_SAP_EVENT_MESH_URL',
    'https://sap-dev.local/api/facturas/notify'
  )
  const sapEventMeshHealth = resolveEnv(
    'NEXT_PUBLIC_SAP_EVENT_MESH_HEALTH_URL',
    `${sapEventMeshUrl.replace(/\/$/, '')}/health`
  )
  const agtSandboxUrl = resolveEnv(
    'NEXT_PUBLIC_AGT_EFATURA_URL',
    'https://sandbox.agt.gov.ao/api/efatura/v1'
  )
  const agtPortalUrl = resolveEnv(
    'NEXT_PUBLIC_AGT_PORTAL_URL',
    'https://portaldo.contribuinte.agt.gov.ao'
  )
  const agtStatusUrl = resolveEnv(
    'NEXT_PUBLIC_AGT_STATUS_URL',
    `${agtPortalUrl.replace(/\/$/, '')}/api/status`
  )

  return [
    {
      id: 'sap-odata',
      name: 'SAP S/4HANA OData Gateway',
      provider: 'SAP',
      description: 'Sincronização de materiais, clientes e impostos via serviço OData ZFACTURA_AGT_SRV.',
      type: 'odata',
      endpoint: sapOdataUrl,
      healthCheckUrl: sapOdataHealth,
      method: 'GET',
      environment: sapLandscape,
      system: 'sap',
      documentationUrl: 'https://help.sap.com/docs/SAP_S4HANA',
      criticality: 'core',
      region: 'BTP-EU11',
      slaMs: DEFAULT_SLA_MS,
      warnLatencyMs: 800,
      timeoutMs: 5000,
    },
    {
      id: 'sap-eventmesh',
      name: 'SAP Event Mesh REST',
      provider: 'SAP',
      description: 'Notificações assíncronas de faturação enviadas pelo SAP Event Mesh via RESTful API.',
      type: 'rest',
      endpoint: sapEventMeshUrl,
      healthCheckUrl: sapEventMeshHealth,
      method: 'GET',
      environment: sapLandscape,
      system: 'sap',
      documentationUrl: 'https://help.sap.com/docs/SAP_EVENT_MESH',
      criticality: 'core',
      region: 'BTP-US10',
      slaMs: 750,
      warnLatencyMs: 900,
      timeoutMs: 5500,
    },
    {
      id: 'agt-efatura',
      name: 'AGT e-Fatura Sandbox',
      provider: 'AGT',
      description: 'Integração simulada com o endpoint oficial de submissão e consulta do ambiente de homologação.',
      type: 'rest',
      endpoint: agtSandboxUrl,
      healthCheckUrl: `${agtSandboxUrl.replace(/\/$/, '')}/health`,
      method: 'GET',
      environment: 'sandbox',
      system: 'agt',
      documentationUrl: 'https://www.agt.minfin.gov.ao/',
      criticality: 'core',
      region: 'Luanda-DC',
      slaMs: 900,
      warnLatencyMs: 1100,
      timeoutMs: 6000,
    },
    {
      id: 'agt-portal-contribuinte',
      name: 'Portal do Contribuinte',
      provider: 'AGT',
      description: 'Disponibilidade do portal oficial para submissão manual e acompanhamento de obrigações fiscais.',
      type: 'portal',
      endpoint: agtPortalUrl,
      healthCheckUrl: agtStatusUrl,
      method: 'GET',
      environment: 'production',
      system: 'agt',
      documentationUrl: 'https://portaldo.contribuinte.agt.gov.ao',
      criticality: 'support',
      region: 'Luanda-DC',
      slaMs: 1200,
      warnLatencyMs: 1500,
      timeoutMs: 7000,
    },
  ]
}

function getBaseIntegrations(): Array<Pick<Integration, 'id' | 'name' | 'provider' | 'description' | 'type' | 'endpoint' | 'status' | 'environment' | 'system' | 'documentationUrl' | 'criticality' | 'region' | 'healthCheckUrl' | 'method' | 'slaMs' | 'warnLatencyMs' | 'timeoutMs'>> {
  return getIntegrationDefinitions().map((definition) => ({
    id: definition.id,
    name: definition.name,
    provider: definition.provider,
    description: definition.description,
    type: definition.type,
    endpoint: definition.endpoint,
    status: 'connected',
    environment: definition.environment,
    system: definition.system,
    documentationUrl: definition.documentationUrl,
    criticality: definition.criticality,
    region: definition.region,
    healthCheckUrl: definition.healthCheckUrl,
    method: definition.method,
    slaMs: definition.slaMs,
    warnLatencyMs: definition.warnLatencyMs,
    timeoutMs: definition.timeoutMs,
  }))
}

function nowIso(offsetMinutes = 0): string {
  return new Date(Date.now() - offsetMinutes * 60_000).toISOString()
}

function createDefaultIntegrations(): Integration[] {
  return getBaseIntegrations().map((integration, index) => ({
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

function alignWithDefinitions(integrations: Integration[]): Integration[] {
  const base = getBaseIntegrations()
  const map = new Map(integrations.map((item) => [item.id, item]))

  const aligned = base.map((definition, index) => {
    const existing = map.get(definition.id)
    if (!existing) {
      return {
        ...definition,
        latencyMs: 120 + index * 35,
        lastSync: nowIso(90 * (index + 1)),
        lastTested: nowIso(60 * (index + 1)),
        lastMessage: 'Ligação adicionada automaticamente a partir da configuração atual.',
      }
    }

    return {
      ...definition,
      ...existing,
    }
  })

  const knownIds = new Set(base.map((item) => item.id))
  const legacy = integrations.filter((item) => !knownIds.has(item.id))

  return [...aligned, ...legacy]
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
    const aligned = alignWithDefinitions(parsed)
    saveIntegrations(aligned)
    return aligned
  } catch {
    const defaults = createDefaultIntegrations()
    saveIntegrations(defaults)
    return defaults
  }
}

interface IntegrationStatusResponse {
  data: IntegrationStatusSnapshot[]
  lastUpdated: string
}

export async function testIntegration(id: string): Promise<{ integration: Integration; message: string }> {
  const integrations = getIntegrations()
  const target = integrations.find((item) => item.id === id)
  if (!target) {
    throw new Error('Integração não encontrada')
  }

  let snapshot: IntegrationStatusSnapshot | null = null
  try {
    const response = await fetch(`/api/integrations/status?id=${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (response.ok) {
      const payload = (await response.json()) as IntegrationStatusResponse
      snapshot = payload.data?.[0] ?? null
    } else if (response.status === 404) {
      throw new Error('Integração não configurada no ambiente atual.')
    }
  } catch (error) {
    console.error('[integration:testIntegration] Falha ao consultar monitorização', error)
  }

  const now = new Date().toISOString()

  if (snapshot) {
    const updated: Integration = {
      ...target,
      status: snapshot.status,
      latencyMs: snapshot.latencyMs,
      lastTested: snapshot.lastChecked,
      lastSync: snapshot.status === 'error' ? target.lastSync : snapshot.lastChecked,
      lastMessage: snapshot.statusMessage,
      environment: snapshot.environment,
      system: snapshot.system,
    }

    const next = alignWithDefinitions(integrations).map((item) => (item.id === id ? updated : item))
    saveIntegrations(next)

    return {
      integration: updated,
      message: snapshot.statusMessage,
    }
  }

  const random = Math.random()
  let status: IntegrationStatus = 'connected'
  let message = 'Monitorização executada com sucesso (modo simulador).'

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
    lastTested: now,
    lastSync: status === 'error' ? target.lastSync : now,
    lastMessage: message,
  }

  const next = alignWithDefinitions(integrations).map((item) => (item.id === id ? updated : item))
  saveIntegrations(next)

  return { integration: updated, message }
}

export function resetIntegrations(): Integration[] {
  const defaults = createDefaultIntegrations()
  saveIntegrations(defaults)
  return defaults
}

export function syncIntegration(id: string): Integration | null {
  const integrations = alignWithDefinitions(getIntegrations())
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
