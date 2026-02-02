/**
 * =============================================================================
 * PROVIDER MANAGER - GESTÃO DE PROVEDORES FISCAIS
 * =============================================================================
 * 
 * Gere provedores fiscais com suporte a:
 * - Seleção manual ou automática
 * - Fallback entre provedores
 * - Cache de estado
 * - Persistência de configuração
 */

import type { DocumentType, Factura } from '@/lib/types';
import type {
  FiscalProvider,
  FiscalProviderName,
  ProviderManagerConfig,
  ProviderHealth,
  UniversalInvoice,
  CreateInvoiceResult,
  InvoiceStatus,
  PendingInvoice,
  ProviderStorageData,
  CreateSeriesRequest,
  CreateSeriesResult,
  ProviderSeries,
} from './types';

import { getAppyPayProvider } from './appypay';

// =============================================================================
// CONFIGURAÇÃO
// =============================================================================

const STORAGE_KEY = 'factura-agt-provider-config';
const PENDING_INVOICES_KEY = 'factura-agt-pending-invoices';

const DEFAULT_CONFIG: ProviderManagerConfig = {
  activeProvider: (process.env.FISCAL_PROVIDER as FiscalProviderName) || 'appypay',
  selectionMode: 'manual',
  fallbackEnabled: process.env.FISCAL_FALLBACK_ENABLED === 'true',
  fallbackOrder: ['appypay', 'agt'],
};

// =============================================================================
// STORAGE
// =============================================================================

function getStoredConfig(): ProviderManagerConfig {
  if (typeof window === 'undefined') {
    return DEFAULT_CONFIG;
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.warn('[ProviderManager] Erro ao ler configuração:', e);
  }
  
  return DEFAULT_CONFIG;
}

function saveConfig(config: ProviderManagerConfig): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn('[ProviderManager] Erro ao salvar configuração:', e);
  }
}

function getPendingInvoices(): PendingInvoice[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(PENDING_INVOICES_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('[ProviderManager] Erro ao ler pending invoices:', e);
  }
  
  return [];
}

function savePendingInvoices(invoices: PendingInvoice[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(PENDING_INVOICES_KEY, JSON.stringify(invoices));
  } catch (e) {
    console.warn('[ProviderManager] Erro ao salvar pending invoices:', e);
  }
}

// =============================================================================
// PROVIDER INSTANCES
// =============================================================================

// Cache de provedores
const providers: Map<FiscalProviderName, FiscalProvider> = new Map();

function getProvider(name: FiscalProviderName): FiscalProvider | null {
  if (providers.has(name)) {
    return providers.get(name)!;
  }
  
  switch (name) {
    case 'appypay':
      const appyPay = getAppyPayProvider();
      providers.set('appypay', appyPay);
      return appyPay;
    
    case 'agt':
      // AGT provider seria implementado aqui (já existe código legado)
      // Por agora, retorna null
      console.warn('[ProviderManager] AGT provider não implementado nesta versão');
      return null;
    
    default:
      return null;
  }
}

// =============================================================================
// PROVIDER MANAGER CLASS
// =============================================================================

export class ProviderManager {
  private config: ProviderManagerConfig;
  private healthCache: Map<FiscalProviderName, ProviderHealth> = new Map();
  
  constructor() {
    this.config = getStoredConfig();
  }
  
  // =========================================================================
  // CONFIGURAÇÃO
  // =========================================================================
  
  getConfig(): ProviderManagerConfig {
    return { ...this.config };
  }
  
  setActiveProvider(name: FiscalProviderName): void {
    this.config.activeProvider = name;
    this.config.selectionMode = 'manual';
    saveConfig(this.config);
  }
  
  setFallbackEnabled(enabled: boolean): void {
    this.config.fallbackEnabled = enabled;
    saveConfig(this.config);
  }
  
  setFallbackOrder(order: FiscalProviderName[]): void {
    this.config.fallbackOrder = order;
    saveConfig(this.config);
  }
  
  // =========================================================================
  // PROVIDER ACCESS
  // =========================================================================
  
  getActiveProvider(): FiscalProvider | null {
    return getProvider(this.config.activeProvider);
  }
  
  getActiveProviderName(): FiscalProviderName {
    return this.config.activeProvider;
  }
  
  getProviderByName(name: FiscalProviderName): FiscalProvider | null {
    return getProvider(name);
  }
  
  getAllProviderNames(): FiscalProviderName[] {
    return ['appypay', 'agt'];
  }
  
  // =========================================================================
  // HEALTH CHECK
  // =========================================================================
  
  async checkProviderHealth(name: FiscalProviderName): Promise<ProviderHealth> {
    const provider = getProvider(name);
    
    if (!provider) {
      const health: ProviderHealth = {
        provider: name,
        status: 'unavailable',
        latencyMs: 0,
        lastChecked: new Date().toISOString(),
        message: 'Provider não implementado',
      };
      this.healthCache.set(name, health);
      return health;
    }
    
    const health = await provider.healthCheck();
    this.healthCache.set(name, health);
    return health;
  }
  
  async checkAllProvidersHealth(): Promise<Map<FiscalProviderName, ProviderHealth>> {
    const results = new Map<FiscalProviderName, ProviderHealth>();
    
    for (const name of this.getAllProviderNames()) {
      const health = await this.checkProviderHealth(name);
      results.set(name, health);
    }
    
    return results;
  }
  
  getCachedHealth(name: FiscalProviderName): ProviderHealth | null {
    return this.healthCache.get(name) || null;
  }
  
  // =========================================================================
  // SMART PROVIDER SELECTION
  // =========================================================================
  
  async getBestAvailableProvider(): Promise<FiscalProvider | null> {
    // Primeiro, tentar provedor ativo
    const active = this.getActiveProvider();
    if (active) {
      const health = await this.checkProviderHealth(this.config.activeProvider);
      if (health.status === 'available') {
        return active;
      }
    }
    
    // Se fallback desativado, retornar null
    if (!this.config.fallbackEnabled) {
      return null;
    }
    
    // Tentar fallback order
    for (const name of this.config.fallbackOrder) {
      if (name === this.config.activeProvider) continue; // Já tentou
      
      const provider = getProvider(name);
      if (!provider) continue;
      
      const health = await this.checkProviderHealth(name);
      if (health.status === 'available') {
        console.log(`[ProviderManager] Usando fallback: ${name}`);
        return provider;
      }
    }
    
    return null;
  }
  
  // =========================================================================
  // SÉRIES
  // =========================================================================
  
  async createSeries(request: CreateSeriesRequest): Promise<CreateSeriesResult> {
    const provider = await this.getBestAvailableProvider();
    if (!provider) {
      return {
        success: false,
        error: 'Nenhum provedor disponível',
      };
    }
    
    return provider.createSeries(request);
  }
  
  async listSeries(): Promise<ProviderSeries[]> {
    const provider = await this.getBestAvailableProvider();
    if (!provider) {
      return [];
    }
    
    return provider.listSeries();
  }
  
  // Alias para listSeries
  async getSeries(): Promise<ProviderSeries[]> {
    return this.listSeries();
  }
  
  async getActiveSeries(year: number, docType: DocumentType): Promise<ProviderSeries | null> {
    const provider = await this.getBestAvailableProvider();
    if (!provider) {
      return null;
    }
    
    return provider.getActiveSeries(year, docType);
  }
  
  // =========================================================================
  // EMISSÃO DE FACTURAS
  // =========================================================================
  
  async createInvoice(invoice: UniversalInvoice): Promise<CreateInvoiceResult> {
    const provider = await this.getBestAvailableProvider();
    if (!provider) {
      return {
        success: false,
        processingStatus: 'failed',
        error: 'Nenhum provedor disponível',
        provider: this.config.activeProvider,
        createdAt: new Date().toISOString(),
      };
    }
    
    const result = await provider.createInvoice(invoice);
    
    // Se assíncrono e sucesso, guardar em pending
    if (result.success && result.documentId && provider.isAsync) {
      this.addPendingInvoice({
        id: crypto.randomUUID(),
        facturaId: '', // Será atualizado quando criar a factura local
        provider: provider.name,
        documentId: result.documentId,
        status: 'processing',
        attempts: 0,
        lastAttempt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
    }
    
    return result;
  }
  
  async getInvoiceStatus(documentId: string, provider?: FiscalProviderName): Promise<InvoiceStatus> {
    const providerInstance = provider 
      ? getProvider(provider) 
      : this.getActiveProvider();
    
    if (!providerInstance) {
      return {
        documentId,
        status: 'failed',
        lastChecked: new Date().toISOString(),
        attempts: 0,
        error: 'Provider não disponível',
      };
    }
    
    return providerInstance.getInvoiceStatus(documentId);
  }
  
  // =========================================================================
  // LISTAGEM DE DOCUMENTOS
  // =========================================================================
  
  async listDocuments(): Promise<any[]> {
    const provider = await this.getBestAvailableProvider();
    if (!provider || !provider.listDocuments) {
      return [];
    }
    
    return provider.listDocuments();
  }
  
  // =========================================================================
  // PENDING INVOICES
  // =========================================================================
  
  addPendingInvoice(invoice: PendingInvoice): void {
    const pending = getPendingInvoices();
    pending.push(invoice);
    savePendingInvoices(pending);
  }
  
  getPendingInvoices(): PendingInvoice[] {
    return getPendingInvoices();
  }
  
  updatePendingInvoice(documentId: string, updates: Partial<PendingInvoice>): void {
    const pending = getPendingInvoices();
    const index = pending.findIndex(p => p.documentId === documentId);
    
    if (index !== -1) {
      pending[index] = { ...pending[index], ...updates };
      savePendingInvoices(pending);
    }
  }
  
  removePendingInvoice(documentId: string): void {
    const pending = getPendingInvoices().filter(p => p.documentId !== documentId);
    savePendingInvoices(pending);
  }
  
  async processPendingInvoices(): Promise<void> {
    const pending = getPendingInvoices();
    
    for (const invoice of pending) {
      if (invoice.status !== 'processing') continue;
      
      try {
        const status = await this.getInvoiceStatus(invoice.documentId, invoice.provider);
        
        this.updatePendingInvoice(invoice.documentId, {
          status: status.status,
          attempts: invoice.attempts + 1,
          lastAttempt: new Date().toISOString(),
          error: status.error,
        });
        
        if (status.status === 'success' || status.status === 'failed') {
          console.log(`[ProviderManager] Documento ${invoice.documentId} completado: ${status.status}`);
        }
      } catch (e) {
        console.error(`[ProviderManager] Erro ao processar pending ${invoice.documentId}:`, e);
      }
    }
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let managerInstance: ProviderManager | null = null;

export function getProviderManager(): ProviderManager {
  if (!managerInstance) {
    managerInstance = new ProviderManager();
  }
  return managerInstance;
}

// =============================================================================
// EXPORTS UTILITÁRIOS
// =============================================================================

export { getProvider };
