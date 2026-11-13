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

  private async post<TReq, TRes>(
    path: string,
    body: TReq,
    opts?: {
      timeoutMs?: number
    }
  ): Promise<TRes> {
    let attempt = 0
    let lastError: any
    const maxRetries = path === '/listarFacturas' ? 0 : this.maxRetries // Sem retry para listar (muito lento)

    // stages of https.Agent to try: undefined (default), TLS1.2 only, then IPv4+TLS1.2
    const agentStages: Array<{ family?: number; minVersion?: string } | undefined> = [undefined, { minVersion: 'TLSv1.2' }, { family: 4, minVersion: 'TLSv1.2' }]
    let agentStage = 0

    let triedPowershell = false

    // on Windows the PowerShell fallback is known to work reliably; try it first
    if (process.platform === 'win32') {
      triedPowershell = true
      try {
        console.warn('🔁 [AgtClient] executing PowerShell fallback as first attempt (Windows)')
        const { execFileSync } = require('child_process')
        const authHeader = this.headers().authorization || ''
        const localTimeout = opts?.timeoutMs ?? this.timeoutMs
        const bodyBase64 = Buffer.from(JSON.stringify(body)).toString('base64')
        const ps = `
$body = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('${bodyBase64}'))
$h=@{ 'Content-Type'='application/json' }
${authHeader ? `$h.Authorization='${authHeader}'` : ''}
try {
  $r = Invoke-RestMethod -Uri '${this.baseUrl}${path}' -Method Post -Body $body -Headers $h -TimeoutSec ${localTimeout/1000}
  $r | ConvertTo-Json -Compress
} catch { Write-Error $_; exit 1 }
`
        const result = execFileSync('powershell', ['-NoProfile', '-Command', ps], { encoding: 'utf8' })
        try {
          return JSON.parse(result)
        } catch (parseErr) {
          console.error('❌ [AgtClient] PowerShell result not valid JSON:', result)
          // return a wrapper object containing raw response so caller can handle
          return { __agtRaw: result } as any
        }
      } catch (psErr) {
        console.error('❌ [AgtClient] initial PowerShell fallback failed:', (psErr as any).message)
        // fall through to normal retry logic
      }
    }

    while (attempt <= maxRetries) {
      try {
        const timeoutMs = opts?.timeoutMs ?? this.timeoutMs
        const stage = agentStages[agentStage]
        console.log(`🌐 [AgtClient] POST ${path} - Tentativa ${attempt + 1}/${maxRetries + 1}, timeout: ${timeoutMs}ms` +
          (stage ? ` (agent: ${JSON.stringify(stage)})` : ''))

        const controller = new AbortController()
        const id = setTimeout(() => {
          console.log(`⏰ [AgtClient] Timeout após ${timeoutMs}ms - abortando request`)
          controller.abort()
        }, timeoutMs)

        let fetchOptions: any = {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify(body),
          signal: controller.signal,
          cache: 'no-store',
        }
        if (stage) {
          const https = require('https')
          fetchOptions.agent = new https.Agent(stage)
        }

        const startTime = Date.now()
        const res = await fetch(`${this.baseUrl}${path}`, fetchOptions)
        clearTimeout(id)

        const duration = ((Date.now() - startTime) / 1000).toFixed(2)
        console.log(`✅ [AgtClient] Resposta em ${duration}s - Status: ${res.status}`)

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
        console.error(`❌ [AgtClient] Erro na tentativa ${attempt + 1}: ${err?.message}`)

        // rede/TLS falhou? subir de estágio para tentar outro agent
        const msg: string = err?.message?.toLowerCase() || ''
        const shouldEscalate =
          msg.includes('network socket disconnected') ||
          msg.includes('tls') ||
          msg.includes('socket') ||
          msg.includes('getaddrinfo')
        if (shouldEscalate && agentStage < agentStages.length - 1) {
          agentStage++
          console.warn(`⚠️ [AgtClient] network/TLS error, escalating agent to stage ${agentStage}`)
          // não incrementar attempt para que este ciclo repita com novo agent
          continue
        }

        // Se foi abort (timeout), não fazer retry para listar
        if (err?.name === 'AbortError' || path === '/listarFacturas') {
          throw err
        }

        // Before giving up completely, try PowerShell fallback once on Windows
        if (process.platform === 'win32' && !triedPowershell) {
          triedPowershell = true
          try {
            console.warn('🔁 [AgtClient] executing PowerShell fallback')
            const { execFileSync } = require('child_process')
            const authHeader = this.headers().authorization || ''
            const localTimeout = opts?.timeoutMs ?? this.timeoutMs
          // use a PowerShell here-string to avoid complex escaping issues
          const bodyBase64 = Buffer.from(JSON.stringify(body)).toString('base64')
          const ps = `
$body = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('${bodyBase64}'))
$h=@{ 'Content-Type'='application/json' }
${authHeader ? `$h.Authorization='${authHeader}'` : ''}
try {
  $r = Invoke-RestMethod -Uri '${this.baseUrl}${path}' -Method Post -Body $body -Headers $h -TimeoutSec ${localTimeout/1000}
  # Ensure proper JSON serialization with -Depth to avoid truncation
  $r | ConvertTo-Json -Depth 10 -Compress
} catch { Write-Error $_; exit 1 }
`
            const result = execFileSync('powershell', ['-NoProfile', '-Command', ps], { encoding: 'utf8' })
            try {
              return JSON.parse(result)
            } catch(parseErr) {
              console.error('❌ [AgtClient] PowerShell result not valid JSON:', result.slice(0, 500))
              // return raw response container to stop retries
              return { __agtRaw: result.slice(0, 500) } as any
            }
          } catch (psErr) {
            console.error('❌ [AgtClient] PowerShell fallback failed:', (psErr as any).message)
            // continue to normal retry/throw logic
          }
        }

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
  obterEstadoWithTimeout<T>(payload: T, timeoutMs: number) {
    const withRequired = addRequiredFields(payload)
    return this.post<typeof withRequired, any>(`/obterEstado`, withRequired, { timeoutMs })
  }
  listarFacturas<T>(payload: T) {
    // Não adicionar required fields, payload já vem completo da route
    return this.post<T, any>(`/listarFacturas`, payload)
  }
  listarFacturasWithTimeout<T>(payload: T, timeoutMs: number) {
    // Não adicionar required fields, payload já vem completo da route
    return this.post<T, any>(`/listarFacturas`, payload, { timeoutMs })
  }
  consultarFactura<T>(payload: T) {
    const withRequired = addRequiredFields(payload)
    return this.post<typeof withRequired, any>(`/consultarFactura`, withRequired)
  }
  consultarFacturaWithTimeout<T>(payload: T, timeoutMs: number) {
    const withRequired = addRequiredFields(payload)
    return this.post<typeof withRequired, any>(`/consultarFactura`, withRequired, { timeoutMs })
  }
  solicitarSerie<T>(payload: T) {
    const withRequired = addRequiredFields(payload)
    return this.post<typeof withRequired, any>(`/solicitarSerie`, withRequired)
  }
  solicitarSerieWithTimeout<T>(payload: T, timeoutMs: number) {
    const withRequired = addRequiredFields(payload)
    return this.post<typeof withRequired, any>(`/solicitarSerie`, withRequired, { timeoutMs })
  }
  listarSeries<T>(payload: T) {
    // Payload já vem com todos os campos obrigatórios da route
    return this.post<T, any>(`/listarSeries`, payload)
  }
  listarSeriesWithTimeout<T>(payload: T, timeoutMs: number) {
    // Payload já vem com todos os campos obrigatórios da route
    return this.post<T, any>(`/listarSeries`, payload, { timeoutMs })
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
