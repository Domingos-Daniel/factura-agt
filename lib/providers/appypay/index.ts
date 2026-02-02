/**
 * =============================================================================
 * APPYPAY - CLIENTE UNIFICADO
 * =============================================================================
 * 
 * Implementa interface FiscalProvider para AppyPay.
 * Encapsula autenticação, séries e documentos numa única API.
 */

import type { DocumentType } from '@/lib/types';
import type {
  FiscalProvider,
  FiscalProviderName,
  AuthToken,
  ProviderHealth,
  CreateSeriesRequest,
  CreateSeriesResult,
  ProviderSeries,
  UniversalInvoice,
  CreateInvoiceResult,
  InvoiceStatus,
} from '../types';

import { getAppyPayToken, authenticateAppyPay, isTokenValid, getTokenInfo } from './auth';
import { createAppyPaySeries, listAppyPaySeries, getActiveAppyPaySeries, hasActiveSeriesForCurrentYear } from './series';
import { createAppyPayInvoice, getAppyPayInvoiceStatus, pollAppyPayInvoice, listAppyPayDocuments } from './documents';

// =============================================================================
// CONFIGURAÇÃO
// =============================================================================

const getBaseUrl = () => {
  const env = process.env.APPYPAY_ENVIRONMENT || 'test';
  return env === 'production'
    ? process.env.APPYPAY_PROD_URL || 'https://gwy-api.appypay.co.ao/v1.0'
    : process.env.APPYPAY_BASE_URL || 'https://gwy-api-tst.appypay.co.ao/v1.0';
};

// =============================================================================
// CLASSE DO PROVIDER
// =============================================================================

export class AppyPayProvider implements FiscalProvider {
  readonly name: FiscalProviderName = 'appypay';
  readonly displayName = 'AppyPay Fiscal API';
  readonly isAsync = true;

  // =========================================================================
  // HEALTH CHECK
  // =========================================================================

  async healthCheck(): Promise<ProviderHealth> {
    const startTime = Date.now();
    
    try {
      // Tentar obter token
      await getAppyPayToken();
      
      const latencyMs = Date.now() - startTime;
      const tokenInfo = getTokenInfo();
      
      // Verificar séries ativas
      const hasSeries = await hasActiveSeriesForCurrentYear('FT');
      
      return {
        provider: 'appypay',
        status: 'available',
        latencyMs,
        lastChecked: new Date().toISOString(),
        message: `Conectado. Token válido até ${tokenInfo.expiresAt?.toLocaleTimeString() || 'N/A'}`,
        tokenValid: tokenInfo.valid,
        activeSeriesCount: hasSeries ? 1 : 0,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      
      return {
        provider: 'appypay',
        status: 'unavailable',
        latencyMs,
        lastChecked: new Date().toISOString(),
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        tokenValid: false,
      };
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const health = await this.healthCheck();
      return health.status === 'available';
    } catch {
      return false;
    }
  }

  // =========================================================================
  // AUTENTICAÇÃO
  // =========================================================================

  async authenticate(): Promise<AuthToken> {
    return authenticateAppyPay();
  }

  async getToken(): Promise<string> {
    return getAppyPayToken();
  }

  // =========================================================================
  // SÉRIES
  // =========================================================================

  async createSeries(request: CreateSeriesRequest): Promise<CreateSeriesResult> {
    return createAppyPaySeries(request);
  }

  async listSeries(): Promise<ProviderSeries[]> {
    return listAppyPaySeries();
  }

  async getActiveSeries(year: number, docType: DocumentType): Promise<ProviderSeries | null> {
    return getActiveAppyPaySeries(year, docType);
  }

  // =========================================================================
  // DOCUMENTOS
  // =========================================================================

  async createInvoice(invoice: UniversalInvoice): Promise<CreateInvoiceResult> {
    return createAppyPayInvoice(invoice);
  }

  async getInvoiceStatus(documentId: string): Promise<InvoiceStatus> {
    return getAppyPayInvoiceStatus(documentId);
  }
  
  async listDocuments(): Promise<any[]> {
    return listAppyPayDocuments();
  }

  async pollInvoiceUntilComplete(
    documentId: string,
    maxAttempts?: number
  ): Promise<InvoiceStatus> {
    return pollAppyPayInvoice(documentId, maxAttempts);
  }
}

// =============================================================================
// INSTÂNCIA SINGLETON
// =============================================================================

let appyPayInstance: AppyPayProvider | null = null;

export function getAppyPayProvider(): AppyPayProvider {
  if (!appyPayInstance) {
    appyPayInstance = new AppyPayProvider();
  }
  return appyPayInstance;
}

// =============================================================================
// RE-EXPORTAÇÕES
// =============================================================================

export { getAppyPayToken, isTokenValid, getTokenInfo, clearTokenCache } from './auth';
export { createAppyPaySeries, listAppyPaySeries, getActiveAppyPaySeries, clearSeriesCache } from './series';
export { createAppyPayInvoice, getAppyPayInvoiceStatus, pollAppyPayInvoice, getAppyPayInvoicePdf } from './documents';
