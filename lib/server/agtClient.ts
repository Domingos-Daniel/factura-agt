// AGT REST client with retries/backoff and error mapping
// Note: Endpoints, auth and timeouts come from environment variables.

import 'server-only'

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
    return this.post<T, { requestID: string } | { errorList: any[] }>(`/registarFactura`, payload)
  }
  obterEstado<T>(payload: T) {
    return this.post<T, any>(`/obterEstado`, payload)
  }
  listarFacturas<T>(payload: T) {
    return this.post<T, any>(`/listarFacturas`, payload)
  }
  consultarFactura<T>(payload: T) {
    return this.post<T, any>(`/consultarFactura`, payload)
  }
  solicitarSerie<T>(payload: T) {
    return this.post<T, any>(`/solicitarSerie`, payload)
  }
  listarSeries<T>(payload: T) {
    return this.post<T, any>(`/listarSeries`, payload)
  }
  validarDocumento<T>(payload: T) {
    return this.post<T, any>(`/validarDocumento`, payload)
  }
}

export function createAgtClient(): AgtClient | any {
  // Se AGT_USE_MOCK=true ou se AGT_BASE_URL não está definido, usa Mock
  const useMock = process.env.AGT_USE_MOCK === 'true' || !process.env.AGT_BASE_URL
  
  if (useMock) {
    // Importa dinamicamente o Mock Client
    const { createMockAgtClient } = require('./mockAgtClient')
    console.log('🔧 [AGT] Usando Mock Client (desenvolvimento)')
    return createMockAgtClient()
  }
  
  const baseUrl = process.env.AGT_BASE_URL!
  const authType = (process.env.AGT_AUTH_TYPE as 'none' | 'basic' | 'apiKey' | 'bearer') || 'none'
  const authValue = process.env.AGT_AUTH_VALUE
  const timeoutMs = Number(process.env.AGT_TIMEOUT_MS || '15000')
  const maxRetries = Number(process.env.AGT_MAX_RETRIES || '2')
  console.log('🌐 [AGT] Usando Client real:', baseUrl)
  return new AgtClient({ baseUrl, auth: { type: authType, value: authValue }, timeoutMs, maxRetries })
}
