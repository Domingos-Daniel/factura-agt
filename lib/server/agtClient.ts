// AGT REST client with retries/backoff and error mapping
// Note: Endpoints, auth and timeouts come from environment variables.

import 'server-only'
import { transformToAGTFormat, addRequiredFields } from './agtTransformer'

export type AgtClientOptions = {
  baseUrl: string
  auth?: { type: 'none' | 'basic' | 'apiKey' | 'bearer'; value?: string }
  timeoutMs?: number
  maxRetries?: number
}

export class AgtClient {
  private baseUrl: string
  private auth?: AgtClientOptions['auth']
  private timeoutMs: number
  private maxRetries: number

  constructor(opts: AgtClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, '')
    this.auth = opts.auth
    this.timeoutMs = opts.timeoutMs ?? 15000
    this.maxRetries = Math.max(0, opts.maxRetries ?? 2)
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'content-type': 'application/json' }
    if (!this.auth || this.auth.type === 'none') return h
    if (this.auth.type === 'basic') h['authorization'] = `Basic ${this.auth.value ?? ''}`
    if (this.auth.type === 'apiKey') h['x-api-key'] = this.auth.value ?? ''
    if (this.auth.type === 'bearer') h['authorization'] = `Bearer ${this.auth.value ?? ''}`
    return h
  }

  private async post<TReq, TRes>(path: string, body: TReq): Promise<TRes> {
    let attempt = 0
    let lastError: any
    while (attempt <= this.maxRetries) {
      try {
        const controller = new AbortController()
        const id = setTimeout(() => controller.abort(), this.timeoutMs)
        const res = await fetch(`${this.baseUrl}${path}`, {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify(body),
          signal: controller.signal,
          cache: 'no-store',
        })
        clearTimeout(id)
        if (res.status === 429) {
          // E98 – demasiadas solicitações repetidas
          const retryAfter = Number(res.headers.get('retry-after') ?? '2')
          await new Promise((r) => setTimeout(r, (retryAfter + attempt) * 1000))
          attempt++
          continue
        }
        if (!res.ok) {
          const text = await res.text().catch(() => '')
          throw new Error(`AGT ${res.status}: ${text}`)
        }
        return (await res.json()) as TRes
      } catch (err: any) {
        lastError = err
        // E97 – prematura: dar um pequeno backoff e tentar de novo
        await new Promise((r) => setTimeout(r, (attempt + 1) * 1000))
        attempt++
      }
    }
    throw lastError
  }

  // Services
  registarFactura<T>(payload: T) {
    // Transformar payload para formato AGT antes de enviar
    const transformed = transformToAGTFormat(payload)
    return this.post<typeof transformed, { requestID: string } | { errorList: any[] }>(`/registarFactura`, transformed)
  }
  obterEstado<T>(payload: T) {
    const withRequired = addRequiredFields(payload)
    return this.post<typeof withRequired, any>(`/obterEstado`, withRequired)
  }
  listarFacturas<T>(payload: T) {
    const withRequired = addRequiredFields(payload)
    return this.post<typeof withRequired, any>(`/listarFacturas`, withRequired)
  }
  consultarFactura<T>(payload: T) {
    const withRequired = addRequiredFields(payload)
    return this.post<typeof withRequired, any>(`/consultarFactura`, withRequired)
  }
  solicitarSerie<T>(payload: T) {
    const withRequired = addRequiredFields(payload)
    return this.post<typeof withRequired, any>(`/solicitarSerie`, withRequired)
  }
  listarSeries<T>(payload: T) {
    const withRequired = addRequiredFields(payload)
    return this.post<typeof withRequired, any>(`/listarSeries`, withRequired)
  }
  validarDocumento<T>(payload: T) {
    const withRequired = addRequiredFields(payload)
    return this.post<typeof withRequired, any>(`/validarDocumento`, withRequired)
  }
}

export function createAgtClient(): AgtClient | any {
  // Verificar ambiente configurado
  const environment = process.env.AGT_ENVIRONMENT || 'mock'
  
  console.log(`🌍 AGT Environment: ${environment}`)
  
  // Se ambiente é mock, usa Mock Client
  if (environment === 'mock') {
    console.log('🎭 Usando AGT Mock Client (desenvolvimento)')
    const { MockAgtClient } = require('./mockAgtClient')
    return new MockAgtClient()
  }
  
  // Determinar base URL baseado no ambiente
  let baseUrl: string
  let authValue: string | undefined
  
  if (environment === 'hml') {
    baseUrl = process.env.AGT_HML_BASE_URL || 'https://sifphml.minfin.gov.ao/sigt/fe/v1'
    console.log(`🧪 Usando AGT HML (Homologação): ${baseUrl}`)
    
    // Autenticação HML
    const username = process.env.AGT_HML_USERNAME
    const password = process.env.AGT_HML_PASSWORD
    if (username && password) {
      authValue = Buffer.from(`${username}:${password}`).toString('base64')
      console.log(`🔐 Autenticação configurada para: ${username}`)
    }
  } else if (environment === 'prod') {
    baseUrl = process.env.AGT_PROD_BASE_URL || 'https://sifp.minfin.gov.ao/sigt/fe/v1'
    console.log(`🚀 Usando AGT Produção: ${baseUrl}`)
    
    // Autenticação Produção
    const username = process.env.AGT_PROD_USERNAME
    const password = process.env.AGT_PROD_PASSWORD
    if (username && password) {
      authValue = Buffer.from(`${username}:${password}`).toString('base64')
      console.log(`🔐 Autenticação configurada para: ${username}`)
    }
  } else {
    throw new Error(`Ambiente AGT inválido: ${environment}. Use: mock, hml ou prod`)
  }
  
  // Criar client real com configurações
  const authType = process.env.AGT_AUTH_TYPE || 'basic'
  const timeout = parseInt(process.env.AGT_TIMEOUT_MS || '30000', 10)
  const maxRetries = parseInt(process.env.AGT_MAX_RETRIES || '2', 10)
  
  return new AgtClient({
    baseUrl,
    auth: { type: authType as any, value: authValue },
    timeoutMs: timeout,
    maxRetries,
  })
}
