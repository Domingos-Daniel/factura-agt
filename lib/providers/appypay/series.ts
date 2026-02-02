/**
 * =============================================================================
 * APPYPAY - GESTÃO DE SÉRIES FISCAIS
 * =============================================================================
 * 
 * Implementa criação e listagem de séries fiscais via AppyPay Fiscal API.
 * ⚠️ Uma série ativa é OBRIGATÓRIA para emitir documentos.
 */

import type { DocumentType } from '@/lib/types';
import type { CreateSeriesRequest, CreateSeriesResult, ProviderSeries } from '../types';
import { getAppyPayHeaders } from './auth';

// =============================================================================
// CONFIGURAÇÃO
// =============================================================================

const getBaseUrl = () => {
  const env = process.env.APPYPAY_ENVIRONMENT || 'test';
  return env === 'production'
    ? process.env.APPYPAY_PROD_URL || 'https://gwy-api.appypay.co.ao/v1.0'
    : process.env.APPYPAY_BASE_URL || 'https://gwy-api-tst.appypay.co.ao/v1.0';
};

// Cache de séries (em memória)
let seriesCache: Map<string, ProviderSeries> = new Map();
let lastSeriesFetch: Date | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos

// =============================================================================
// FUNÇÕES
// =============================================================================

/**
 * Cria uma nova série fiscal no AppyPay
 */
export async function createAppyPaySeries(request: CreateSeriesRequest): Promise<CreateSeriesResult> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/fiscal-series`;
  
  const payload = {
    seriesYear: String(request.year),
    documentType: request.documentType,
    establishmentNumber: request.establishmentNumber || 'SEDE',
    seriesContingencyIndicator: request.contingencyIndicator || 'N',
  };

  console.log('[AppyPay Series] Criando série:', payload);

  try {
    const headers = await getAppyPayHeaders();
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[AppyPay Series] Erro ao criar série:', response.status, data);
      return {
        success: false,
        error: data.message || data.error || `Erro ${response.status}`,
        rawResponse: data,
      };
    }

    const seriesCode = data.series?.seriesCode || data.seriesCode;
    
    if (!seriesCode) {
      return {
        success: false,
        error: 'Resposta inválida: seriesCode não encontrado',
        rawResponse: data,
      };
    }

    console.log('[AppyPay Series] Série criada:', seriesCode);

    // Adicionar ao cache
    const newSeries: ProviderSeries = {
      seriesCode,
      seriesYear: request.year,
      documentType: request.documentType,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    seriesCache.set(`${request.year}-${request.documentType}`, newSeries);

    return {
      success: true,
      seriesCode,
      rawResponse: data,
    };
  } catch (error) {
    console.error('[AppyPay Series] Erro de rede:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

/**
 * Lista todas as séries fiscais
 */
export async function listAppyPaySeries(): Promise<ProviderSeries[]> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/fiscal-series`;

  try {
    const headers = await getAppyPayHeaders();
    
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AppyPay Series] Erro ao listar:', response.status, errorText);
      return [];
    }

    const data = await response.json();
    
    // Mapear resposta para formato interno
    const series: ProviderSeries[] = (data.series || data || []).map((s: any) => ({
      seriesCode: s.seriesCode,
      seriesYear: parseInt(s.seriesYear) || new Date().getFullYear(),
      documentType: s.documentType as DocumentType,
      status: s.status === 'active' || s.status === 'A' ? 'active' : 'closed',
      createdAt: s.createdAt || new Date().toISOString(),
    }));

    // Atualizar cache
    seriesCache.clear();
    series.forEach(s => {
      seriesCache.set(`${s.seriesYear}-${s.documentType}`, s);
    });
    lastSeriesFetch = new Date();

    return series;
  } catch (error) {
    console.error('[AppyPay Series] Erro de rede:', error);
    return Array.from(seriesCache.values());
  }
}

/**
 * Obtém série ativa para um ano e tipo de documento específico
 * Se não existir, cria automaticamente
 */
export async function getActiveAppyPaySeries(
  year: number, 
  docType: DocumentType
): Promise<ProviderSeries | null> {
  const cacheKey = `${year}-${docType}`;
  
  // Verificar cache
  const now = new Date();
  if (
    lastSeriesFetch &&
    now.getTime() - lastSeriesFetch.getTime() < CACHE_TTL_MS &&
    seriesCache.has(cacheKey)
  ) {
    const cached = seriesCache.get(cacheKey);
    if (cached && cached.status === 'active') {
      return cached;
    }
  }

  // Buscar do servidor
  const allSeries = await listAppyPaySeries();
  const found = allSeries.find(
    s => s.seriesYear === year && 
         s.documentType === docType && 
         s.status === 'active'
  );

  if (found) {
    return found;
  }

  // Série não existe - criar automaticamente
  console.log(`[AppyPay Series] Série ${docType} ${year} não encontrada. Criando...`);
  
  const result = await createAppyPaySeries({
    year,
    documentType: docType,
  });

  if (result.success && result.seriesCode) {
    return {
      seriesCode: result.seriesCode,
      seriesYear: year,
      documentType: docType,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
  }

  console.error('[AppyPay Series] Falha ao criar série:', result.error);
  return null;
}

/**
 * Limpa o cache de séries
 */
export function clearSeriesCache(): void {
  seriesCache.clear();
  lastSeriesFetch = null;
}

/**
 * Verifica se há série ativa para o ano corrente
 */
export async function hasActiveSeriesForCurrentYear(docType: DocumentType = 'FT'): Promise<boolean> {
  const year = new Date().getFullYear();
  const series = await getActiveAppyPaySeries(year, docType);
  return series !== null;
}
