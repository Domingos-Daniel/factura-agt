/**
 * =============================================================================
 * TIPOS COMUNS PARA PROVEDORES FISCAIS
 * =============================================================================
 * 
 * Interface universal para provedores de faturação eletrónica (AGT, AppyPay, etc.)
 * Permite switching automático e fallback entre provedores.
 */

import type { DocumentType, DocumentStatus, Factura, Serie } from '@/lib/types';

// =============================================================================
// TIPOS DE PROVEDOR
// =============================================================================

export type FiscalProviderName = 'agt' | 'appypay';
export type FiscalProviderStatus = 'available' | 'unavailable' | 'degraded' | 'unknown';
export type InvoiceProcessingStatus = 'pending' | 'processing' | 'success' | 'failed' | 'timeout';

// =============================================================================
// CONFIGURAÇÃO
// =============================================================================

export interface ProviderConfig {
  name: FiscalProviderName;
  displayName: string;
  environment: 'test' | 'production';
  baseUrl: string;
  timeout: number;
  isAsync: boolean; // AppyPay é assíncrono
  maxPollingAttempts?: number;
  pollingIntervalMs?: number;
}

export interface AppyPayConfig extends ProviderConfig {
  name: 'appypay';
  authUrl: string;
  clientId: string;
  clientSecret: string;
  resource: string;
}

export interface AGTConfig extends ProviderConfig {
  name: 'agt';
  username: string;
  password: string;
  nif: string;
  privateKey: string;
}

// =============================================================================
// AUTENTICAÇÃO
// =============================================================================

export interface AuthToken {
  accessToken: string;
  expiresAt: Date;
  tokenType: string;
}

// =============================================================================
// SÉRIES
// =============================================================================

export interface CreateSeriesRequest {
  year: number;
  documentType: DocumentType;
  establishmentNumber?: string;
  contingencyIndicator?: 'N' | 'S';
}

export interface CreateSeriesResult {
  success: boolean;
  seriesCode?: string;
  error?: string;
  rawResponse?: unknown;
}

export interface ProviderSeries {
  seriesCode: string;
  seriesYear: number;
  documentType: DocumentType;
  status: 'active' | 'closed';
  createdAt: string;
}

// =============================================================================
// FACTURAS / DOCUMENTOS
// =============================================================================

export interface UniversalInvoiceLine {
  lineNumber: number;
  productCode?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  totalWithoutTax: number;
  taxCode?: string;
  taxRate?: number;
  taxAmount: number;
  total: number;
  unitOfMeasure?: string;
}

export interface InvoiceLine {
  lineNumber: number;
  operationType?: 'SG' | 'CR' | 'DB'; // SG=Sem garantia (padrão)
  productCode: string;
  productDescription: string;
  quantity: number;
  unitOfMeasure: string;
  unitPrice: number;
  unitPriceBase?: number; // AppyPay requer ambos
  taxes: InvoiceTax[];
  settlementAmount?: number;
}

export interface InvoiceTax {
  taxCode: string; // NOR, INT, RED, ISE, OUT
  taxType: 'IVA' | 'IS' | 'IEC' | 'NS';
  taxCountryRegion: string;
  taxPercentage?: number;
  taxAmount?: number;
  taxExemptionCode?: string;
}

export interface UniversalInvoice {
  // Identificação interna
  id?: string;
  
  // Tipo de documento
  documentType?: DocumentType;
  documentDate?: string;
  date?: string;
  dueDate?: string;
  seriesCode: string;
  number?: number;
  
  // Cliente
  customerTaxID?: string;
  customerCountry?: string;
  companyName?: string;
  companyAddress?: string;
  customer?: {
    taxId: string;
    name: string;
    address?: string;
    country?: string;
  };
  
  // Dados do emitente
  emitterTaxID?: string;
  eacCode?: string;
  seller?: {
    taxId: string;
    name: string;
    address?: string;
  };
  
  // Linhas (suporta ambos os formatos)
  lines: (InvoiceLine | UniversalInvoiceLine)[];
  
  // Totais (calculados)
  documentTotals?: {
    netTotal: number;
    taxPayable: number;
    grossTotal: number;
  };
  totalWithoutTax?: number;
  totalTax?: number;
  totalWithTax?: number;
  
  // Metadados
  currency?: string;
  paymentMechanism?: string;
  observations?: string;
  notes?: string;
  
  // Referência (para NC)
  referenceNo?: string;
  
  // Status
  status?: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface CreateInvoiceResult {
  success: boolean;
  // ID do documento no provedor (para polling)
  documentId?: string;
  providerRequestId?: string;
  // Número do documento (após confirmação)
  documentNo?: string;
  // Status do processamento
  processingStatus: InvoiceProcessingStatus;
  // É assíncrono? (precisa polling)
  isAsync?: boolean;
  // URL do PDF (se disponível)
  documentUrl?: string;
  // Mensagem de erro
  error?: string;
  // Resposta raw do provedor
  rawResponse?: unknown;
  // Provedor usado
  provider: FiscalProviderName;
  // Timestamp
  createdAt: string;
  // Dados do documento finalizado
  invoice?: {
    documentNumber?: string;
    hash?: string;
    qrCode?: string;
    status?: string;
  };
}

export interface InvoiceStatus {
  documentId: string;
  documentNo?: string;
  status: InvoiceProcessingStatus;
  documentUrl?: string;
  lastChecked: string;
  attempts: number;
  error?: string;
  rawResponse?: unknown;
}

// =============================================================================
// HEALTH CHECK
// =============================================================================

export interface ProviderHealth {
  provider: FiscalProviderName;
  status: FiscalProviderStatus;
  latencyMs: number;
  lastChecked: string;
  message?: string;
  tokenValid?: boolean;
  activeSeriesCount?: number;
}

// =============================================================================
// INTERFACE DO PROVEDOR
// =============================================================================

export interface FiscalProvider {
  readonly name: FiscalProviderName;
  readonly displayName: string;
  readonly isAsync: boolean;
  
  // Health
  healthCheck(): Promise<ProviderHealth>;
  isAvailable(): Promise<boolean>;
  
  // Autenticação
  authenticate(): Promise<AuthToken>;
  getToken(): Promise<string>;
  
  // Séries
  createSeries(request: CreateSeriesRequest): Promise<CreateSeriesResult>;
  listSeries(): Promise<ProviderSeries[]>;
  getActiveSeries(year: number, docType: DocumentType): Promise<ProviderSeries | null>;
  
  // Documentos
  createInvoice(invoice: UniversalInvoice): Promise<CreateInvoiceResult>;
  getInvoiceStatus(documentId: string): Promise<InvoiceStatus>;
  listDocuments?(): Promise<any[]>;
  
  // Polling (para provedores assíncronos)
  pollInvoiceUntilComplete?(documentId: string, maxAttempts?: number): Promise<InvoiceStatus>;
}

// =============================================================================
// PROVIDER MANAGER
// =============================================================================

export type ProviderSelectionMode = 'manual' | 'auto' | 'fallback';

export interface ProviderManagerConfig {
  activeProvider: FiscalProviderName;
  selectionMode: ProviderSelectionMode;
  fallbackEnabled: boolean;
  fallbackOrder: FiscalProviderName[];
}

export interface PendingInvoice {
  id: string;
  facturaId: string;
  provider: FiscalProviderName;
  documentId: string;
  status: InvoiceProcessingStatus;
  attempts: number;
  lastAttempt: string;
  createdAt: string;
  error?: string;
}

// =============================================================================
// STORAGE
// =============================================================================

export interface ProviderStorageData {
  config: ProviderManagerConfig;
  pendingInvoices: PendingInvoice[];
  seriesCache: Record<string, ProviderSeries[]>;
  lastHealthCheck: Record<FiscalProviderName, ProviderHealth>;
}
