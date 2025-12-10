import { Buffer } from 'node:buffer'

import {
  type IntegrationDefinition,
  type IntegrationEnvironment,
  type IntegrationStatus,
  type IntegrationStatusSnapshot,
  type IntegrationSystem,
  type IntegrationType,
  getIntegrationDefinitions,
} from '@/lib/integrations'

export type IntegrationAuthDescriptor =
  | { type: 'none' }
  | { type: 'basic'; username: string; password: string }
  | { type: 'apiKey'; header: string; value: string }
  | { type: 'bearer'; token: string }

export interface ServerIntegrationDefinition extends IntegrationDefinition {
  auth?: IntegrationAuthDescriptor
  syntheticLatencyMs?: number
  availabilityBaseline?: number
}

export interface IntegrationStatusReport extends IntegrationStatusSnapshot {
  name: string
  provider: string
  type: IntegrationType
  endpoint: string
  documentationUrl?: string
  criticality?: 'core' | 'support'
  region?: string
  method?: 'GET' | 'HEAD'
  slaMs?: number
  availability: number
}

function getEnv(key: string): string | undefined {
  return process.env[key] ?? process.env[`NEXT_PUBLIC_${key}`]
}

function getNumberEnv(key: string, fallback?: number): number | undefined {
  const value = getEnv(key)
  if (!value) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function buildAuthDescriptor(prefix: string): IntegrationAuthDescriptor | undefined {
  const username = getEnv(`${prefix}_USERNAME`)
  const password = getEnv(`${prefix}_PASSWORD`)
  const apiKey = getEnv(`${prefix}_API_KEY`)
  const bearer = getEnv(`${prefix}_TOKEN`)
  const apiHeader = getEnv(`${prefix}_API_HEADER`) ?? 'Authorization'

  if (username && password) {
    return { type: 'basic', username, password }
  }

  if (apiKey) {
    return { type: 'apiKey', header: apiHeader, value: apiKey }
  }

  if (bearer) {
    return { type: 'bearer', token: bearer }
  }

  if (getEnv(`${prefix}_AUTH_TYPE`) === 'none') {
    return { type: 'none' }
  }

  return undefined
}

function getServerIntegrationDefinitions(): ServerIntegrationDefinition[] {
  const baseDefinitions = getIntegrationDefinitions()

  return baseDefinitions.map((definition) => {
    const suffix = definition.id.toUpperCase().replace(/-/g, '_')
    const auth = buildAuthDescriptor(suffix)
    const syntheticLatencyMs = getNumberEnv(`${suffix}_SYNTHETIC_LATENCY_MS`)
    const availabilityBaseline = getNumberEnv(`${suffix}_AVAILABILITY_BASELINE`, 99.8)
    const overrideHealth = getEnv(`${suffix}_HEALTH_URL`)

    return {
      ...definition,
      healthCheckUrl: overrideHealth ?? definition.healthCheckUrl ?? definition.endpoint,
      auth,
      syntheticLatencyMs,
      availabilityBaseline,
      slaMs: getNumberEnv(`${suffix}_SLA_MS`, definition.slaMs),
      warnLatencyMs: getNumberEnv(`${suffix}_WARN_LATENCY_MS`, definition.warnLatencyMs),
      timeoutMs: getNumberEnv(`${suffix}_TIMEOUT_MS`, definition.timeoutMs),
    }
  })
}

function applyAuthHeaders(auth: IntegrationAuthDescriptor | undefined, headers: Headers): void {
  if (!auth || auth.type === 'none') return

  switch (auth.type) {
    case 'basic': {
      const token = Buffer.from(`${auth.username}:${auth.password}`).toString('base64')
      headers.set('Authorization', `Basic ${token}`)
      break
    }
    case 'apiKey': {
      headers.set(auth.header, auth.value)
      break
    }
    case 'bearer': {
      headers.set('Authorization', `Bearer ${auth.token}`)
      break
    }
    default:
      break
  }
}

function calculateAvailability(status: IntegrationStatus, baseline = 99.8): number {
  if (status === 'connected') return baseline
  if (status === 'warning') return Math.max(baseline - 2.5, 85)
  return Math.max(baseline - 15, 60)
}

function resolveStatusByLatency(latency: number, definition: ServerIntegrationDefinition): IntegrationStatus {
  if (!Number.isFinite(latency)) return 'warning'
  if (definition.warnLatencyMs && latency > definition.warnLatencyMs) {
    return 'warning'
  }
  return 'connected'
}

async function probeIntegration(definition: ServerIntegrationDefinition): Promise<IntegrationStatusReport> {
  const controller = new AbortController()
  const timeout = definition.timeoutMs ?? 5000
  const timeoutRef = setTimeout(() => controller.abort(), timeout)
  const headers = new Headers({
    'User-Agent': 'Factura-AGT Monitor/1.0',
    Accept: 'application/json,text/html;q=0.7',
  })
  applyAuthHeaders(definition.auth, headers)

  const startedAt = Date.now()
  let latency = definition.syntheticLatencyMs ?? 0
  let status: IntegrationStatus = 'connected'
  let statusMessage = 'Ligação validada com sucesso.'

  try {
    const response = await fetch(definition.healthCheckUrl ?? definition.endpoint, {
      method: definition.method ?? 'GET',
      headers,
      signal: controller.signal,
    })

    latency = Date.now() - startedAt

    if (!response.ok) {
      status = response.status >= 500 ? 'error' : 'warning'
      statusMessage = `HTTP ${response.status} - ${response.statusText}`
    } else {
      status = resolveStatusByLatency(latency, definition)
      statusMessage = `Resposta ${response.status} em ${latency} ms`
    }
  } catch (error) {
    status = 'error'
    statusMessage = error instanceof Error ? error.message : 'Falha desconhecida ao contactar o serviço.'
  } finally {
    clearTimeout(timeoutRef)
  }

  const availability = calculateAvailability(status, definition.availabilityBaseline)

  return {
    id: definition.id,
    name: definition.name,
    provider: definition.provider,
    type: definition.type,
    endpoint: definition.endpoint,
    status,
    statusMessage,
    latencyMs: Math.max(0, Math.round(latency || definition.syntheticLatencyMs || 0)),
    lastChecked: new Date().toISOString(),
    environment: definition.environment,
    system: definition.system,
    documentationUrl: definition.documentationUrl,
    criticality: definition.criticality,
    region: definition.region,
    method: definition.method ?? 'GET',
    slaMs: definition.slaMs,
    availability,
  }
}

export async function getIntegrationStatusReports(targetIds?: string[]): Promise<IntegrationStatusReport[]> {
  const definitions = getServerIntegrationDefinitions()
  const targets = Array.isArray(targetIds) && targetIds.length > 0
    ? definitions.filter((definition) => targetIds.includes(definition.id))
    : definitions

  if (Array.isArray(targetIds) && targetIds.length > 0 && targets.length === 0) {
    throw new Error('INTEGRATION_NOT_FOUND')
  }

  const reports = await Promise.all(targets.map((definition) => probeIntegration(definition)))

  return reports.sort((a, b) => {
    if (a.system !== b.system) {
      return a.system.localeCompare(b.system)
    }
    if (a.criticality === b.criticality) {
      return a.name.localeCompare(b.name)
    }
    if (a.criticality === 'core') return -1
    if (b.criticality === 'core') return 1
    return a.name.localeCompare(b.name)
  })
}

export function summarizeIntegrationStatus(reports: IntegrationStatusReport[]) {
  const summary = reports.reduce(
    (acc, report) => {
      acc.total += 1
      acc[report.status] += 1
      if (report.status === 'error') {
        acc.overall = 'error'
      } else if (report.status === 'warning' && acc.overall !== 'error') {
        acc.overall = 'warning'
      }
      acc.avgAvailability += report.availability
      return acc
    },
    { total: 0, connected: 0, warning: 0, error: 0, overall: 'connected' as IntegrationStatus, avgAvailability: 0 }
  )

  return {
    total: summary.total,
    connected: summary.connected,
    warning: summary.warning,
    error: summary.error,
    overall: summary.overall,
    avgAvailability: summary.total > 0 ? summary.avgAvailability / summary.total : 0,
  }
}
