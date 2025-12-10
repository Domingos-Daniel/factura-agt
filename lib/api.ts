// Lightweight client-side API wrapper for AGT proxy routes

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; status?: number; code?: string }

async function postJson<TReq, TRes>(url: string, body: TReq): Promise<ApiResult<TRes>> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    })
    const contentType = res.headers.get('content-type') || ''
    const isJson = contentType.includes('application/json')
    const payload = isJson ? await res.json() : await res.text()
    if (!res.ok) {
      const error = (isJson ? payload?.error : String(payload)) || `Erro ${res.status}`
      const code = isJson ? payload?.errorCode : undefined
      return { ok: false, error, status: res.status, code }
    }
    return { ok: true, data: (isJson ? payload : ({} as any)) as TRes }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Erro de ligação' }
  }
}

// AGT endpoints
export function registarFactura<TReq, TRes>(body: TReq) {
  return postJson<TReq, TRes>('/api/agt/registarFactura', body)
}
export function obterEstado<TReq, TRes>(body: TReq) {
  return postJson<TReq, TRes>('/api/agt/obterEstado', body)
}
export function listarFacturas<TReq, TRes>(body: TReq) {
  return postJson<TReq, TRes>('/api/agt/listarFacturas', body)
}
export function consultarFactura<TReq, TRes>(body: TReq) {
  return postJson<TReq, TRes>('/api/agt/consultarFactura', body)
}
export function solicitarSerie<TReq, TRes>(body: TReq) {
  return postJson<TReq, TRes>('/api/agt/solicitarSerie', body)
}
export function listarSeries<TReq, TRes>(body: TReq) {
  return postJson<TReq, TRes>('/api/agt/listarSeries', body)
}
export function validarDocumento<TReq, TRes>(body: TReq) {
  return postJson<TReq, TRes>('/api/agt/validarDocumento', body)
}
