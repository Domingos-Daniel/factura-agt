/**
 * =============================================================================
 * APPYPAY - AUTENTICAÇÃO OAuth2
 * =============================================================================
 * 
 * Implementa autenticação OAuth2 client_credentials para AppyPay Fiscal API.
 * Token é cacheado em memória e renovado automaticamente antes de expirar.
 */

import type { AuthToken } from '../types';

// =============================================================================
// CONFIGURAÇÃO
// =============================================================================

const APPYPAY_AUTH_URL = process.env.APPYPAY_AUTH_URL || 
  'https://login.microsoftonline.com/appypaydev.onmicrosoft.com/oauth2/token';

const APPYPAY_CLIENT_ID = process.env.APPYPAY_CLIENT_ID || '';
const APPYPAY_CLIENT_SECRET = process.env.APPYPAY_CLIENT_SECRET || '';
const APPYPAY_RESOURCE = process.env.APPYPAY_RESOURCE || '2aed7612-de64-46b5-9e59-1f48f8902d14';

// Token cache (em memória)
let cachedToken: AuthToken | null = null;

// =============================================================================
// FUNÇÕES
// =============================================================================

/**
 * Obtém token OAuth2 do AppyPay
 * Usa cache em memória e renova automaticamente
 */
export async function getAppyPayToken(): Promise<string> {
  // Verificar se token ainda é válido (com margem de 5 minutos)
  if (cachedToken) {
    const now = new Date();
    const expiresAt = new Date(cachedToken.expiresAt);
    const marginMs = 5 * 60 * 1000; // 5 minutos
    
    if (expiresAt.getTime() - marginMs > now.getTime()) {
      return cachedToken.accessToken;
    }
  }
  
  // Obter novo token
  const token = await authenticateAppyPay();
  cachedToken = token;
  return token.accessToken;
}

/**
 * Autentica com AppyPay e retorna token
 */
export async function authenticateAppyPay(): Promise<AuthToken> {
  if (!APPYPAY_CLIENT_ID || !APPYPAY_CLIENT_SECRET) {
    throw new Error('Credenciais AppyPay não configuradas. Verifique APPYPAY_CLIENT_ID e APPYPAY_CLIENT_SECRET.');
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: APPYPAY_CLIENT_ID,
    client_secret: APPYPAY_CLIENT_SECRET,
    resource: APPYPAY_RESOURCE,
  });

  console.log('[AppyPay Auth] Obtendo token de:', APPYPAY_AUTH_URL);

  const response = await fetch(APPYPAY_AUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[AppyPay Auth] Erro:', response.status, errorText);
    throw new Error(`Falha na autenticação AppyPay: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  if (!data.access_token) {
    throw new Error('Resposta de autenticação AppyPay inválida: access_token não encontrado');
  }

  // Calcular expiração (expires_in está em segundos)
  const expiresInSeconds = data.expires_in || 3600; // default 1 hora
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

  const token: AuthToken = {
    accessToken: data.access_token,
    expiresAt,
    tokenType: data.token_type || 'Bearer',
  };

  console.log('[AppyPay Auth] Token obtido. Expira em:', expiresAt.toISOString());
  
  return token;
}

/**
 * Verifica se o token atual é válido
 */
export function isTokenValid(): boolean {
  if (!cachedToken) return false;
  
  const now = new Date();
  const expiresAt = new Date(cachedToken.expiresAt);
  return expiresAt > now;
}

/**
 * Limpa o cache do token
 */
export function clearTokenCache(): void {
  cachedToken = null;
}

/**
 * Retorna informações sobre o token atual (para UI)
 */
export function getTokenInfo(): { valid: boolean; expiresAt: Date | null } {
  if (!cachedToken) {
    return { valid: false, expiresAt: null };
  }
  
  const now = new Date();
  const expiresAt = new Date(cachedToken.expiresAt);
  
  return {
    valid: expiresAt > now,
    expiresAt,
  };
}

/**
 * Headers de autenticação para requisições AppyPay
 */
export async function getAppyPayHeaders(): Promise<Record<string, string>> {
  const token = await getAppyPayToken();
  
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
}
