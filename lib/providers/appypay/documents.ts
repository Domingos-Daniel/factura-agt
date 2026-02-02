/**
 * =============================================================================
 * APPYPAY - GESTÃO DE DOCUMENTOS FISCAIS
 * =============================================================================
 * 
 * Implementa emissão e consulta de documentos fiscais via AppyPay Fiscal API.
 * ⚠️ Processo ASSÍNCRONO - Retorna HTTP 202 e requer polling.
 */

import type { UniversalInvoice, CreateInvoiceResult, InvoiceStatus, InvoiceProcessingStatus } from '../types';
import { getAppyPayHeaders } from './auth';
import { getActiveAppyPaySeries } from './series';

// =============================================================================
// CONFIGURAÇÃO
// =============================================================================

const getBaseUrl = () => {
  const env = process.env.APPYPAY_ENVIRONMENT || 'test';
  return env === 'production'
    ? process.env.APPYPAY_PROD_URL || 'https://gwy-api.appypay.co.ao/v1.0'
    : process.env.APPYPAY_BASE_URL || 'https://gwy-api-tst.appypay.co.ao/v1.0';
};

// Configuração de polling
const DEFAULT_POLLING_INTERVAL_MS = 30000; // 30 segundos
const DEFAULT_MAX_POLLING_ATTEMPTS = 60; // 30 minutos máximo

// =============================================================================
// FUNÇÕES DE EMISSÃO
// =============================================================================

/**
 * Transforma UniversalInvoice em payload AppyPay
 */
function transformToAppyPayPayload(invoice: UniversalInvoice, seriesCode: string): object {
  // Normalizar linhas para formato AppyPay
  const normalizedLines = invoice.lines.map(line => {
    // Verificar se é InvoiceLine (tem taxes) ou UniversalInvoiceLine
    const hasLegacyFormat = 'taxes' in line && Array.isArray((line as any).taxes);
    const hasNewFormat = 'taxRate' in line;
    
    if (hasLegacyFormat) {
      // Formato InvoiceLine (legado)
      const legacyLine = line as any;
      return {
        lineNumber: legacyLine.lineNumber,
        operationType: legacyLine.operationType || 'SG',
        productCode: legacyLine.productCode || 'PROD',
        productDescription: legacyLine.productDescription || legacyLine.description || 'Produto',
        quantity: legacyLine.quantity,
        unitOfMeasure: legacyLine.unitOfMeasure || 'UN',
        unitPrice: legacyLine.unitPrice,
        unitPriceBase: legacyLine.unitPriceBase ?? legacyLine.unitPrice,
        taxes: legacyLine.taxes.map((tax: any) => ({
          taxCode: tax.taxCode || 'NOR',
          taxType: tax.taxType || 'IVA',
          taxCountryRegion: tax.taxCountryRegion || 'AO',
          taxPercentage: tax.taxPercentage || 14,
          ...(tax.taxExemptionCode && { taxExemptionCode: tax.taxExemptionCode }),
        })),
      };
    } else if (hasNewFormat) {
      // Formato UniversalInvoiceLine (novo)
      const newLine = line as any;
      return {
        lineNumber: newLine.lineNumber,
        operationType: 'SG',
        productCode: newLine.productCode || 'PROD',
        productDescription: newLine.description || 'Produto',
        quantity: newLine.quantity,
        unitOfMeasure: newLine.unitOfMeasure || 'UN',
        unitPrice: newLine.unitPrice,
        unitPriceBase: newLine.unitPrice,
        taxes: [{
          taxCode: newLine.taxCode === 'IVA' ? 'NOR' : (newLine.taxCode || 'NOR'),
          taxType: 'IVA',
          taxCountryRegion: 'AO',
          taxPercentage: newLine.taxRate || 14,
        }],
      };
    } else {
      // Fallback básico
      return {
        lineNumber: (line as any).lineNumber || 1,
        operationType: 'SG',
        productCode: (line as any).productCode || 'PROD',
        productDescription: (line as any).description || (line as any).productDescription || 'Produto',
        quantity: (line as any).quantity || 1,
        unitOfMeasure: (line as any).unitOfMeasure || 'UN',
        unitPrice: (line as any).unitPrice || 0,
        unitPriceBase: (line as any).unitPrice || 0,
        taxes: [{
          taxCode: 'NOR',
          taxType: 'IVA',
          taxCountryRegion: 'AO',
          taxPercentage: 14,
        }],
      };
    }
  });

  return {
    documentDate: invoice.documentDate || invoice.date,
    seriesCode: seriesCode,
    documentType: invoice.documentType || 'FT',
    eacCode: invoice.eacCode || invoice.seller?.taxId?.substring(0, 5) || '00000',
    customerTaxID: invoice.customerTaxID || invoice.customer?.taxId || '999999999',
    customerCountry: invoice.customerCountry || invoice.customer?.country || 'AO',
    companyName: invoice.companyName || invoice.customer?.name || 'Consumidor Final',
    lines: normalizedLines,
  };
}

/**
 * Emite uma factura via AppyPay
 * ⚠️ Retorna imediatamente com documentId - usar polling para obter resultado
 */
export async function createAppyPayInvoice(invoice: UniversalInvoice): Promise<CreateInvoiceResult> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/fiscal-documents`;

  try {
    // 1. Garantir série ativa
    const currentYear = new Date().getFullYear();
    const docType = invoice.documentType || 'FT';
    const series = await getActiveAppyPaySeries(currentYear, docType);
    
    if (!series) {
      return {
        success: false,
        processingStatus: 'failed',
        error: `Não foi possível obter série ativa para ${docType} ${currentYear}`,
        provider: 'appypay',
        createdAt: new Date().toISOString(),
      };
    }

    // 2. Transformar payload
    const payload = transformToAppyPayPayload(invoice, series.seriesCode);

    console.log('[AppyPay Docs] Emitindo factura:', JSON.stringify(payload, null, 2));

    // 3. Enviar para AppyPay
    const headers = await getAppyPayHeaders();
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    // 4. Verificar resposta
    // AppyPay retorna HTTP 202 para processamento assíncrono
    if (response.status === 202 || response.ok) {
      const documentId = data.id || data.documentId;
      
      if (!documentId) {
        return {
          success: false,
          processingStatus: 'failed',
          error: 'Resposta inválida: documentId não encontrado',
          rawResponse: data,
          provider: 'appypay',
          createdAt: new Date().toISOString(),
        };
      }

      console.log('[AppyPay Docs] Factura submetida. ID:', documentId);

      return {
        success: true,
        documentId,
        processingStatus: 'processing',
        provider: 'appypay',
        createdAt: new Date().toISOString(),
        rawResponse: data,
      };
    }

    // Erro
    console.error('[AppyPay Docs] Erro:', response.status, data);
    return {
      success: false,
      processingStatus: 'failed',
      error: data.message || data.error || `Erro ${response.status}`,
      rawResponse: data,
      provider: 'appypay',
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[AppyPay Docs] Erro de rede:', error);
    return {
      success: false,
      processingStatus: 'failed',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      provider: 'appypay',
      createdAt: new Date().toISOString(),
    };
  }
}

/**
 * Consulta o estado de um documento
 */
export async function getAppyPayInvoiceStatus(documentId: string): Promise<InvoiceStatus> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/fiscal-documents/${documentId}`;

  try {
    const headers = await getAppyPayHeaders();
    
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        documentId,
        status: 'failed',
        lastChecked: new Date().toISOString(),
        attempts: 1,
        error: data.message || `Erro ${response.status}`,
        rawResponse: data,
      };
    }

    // Mapear status AppyPay para status interno
    let status: InvoiceProcessingStatus = 'processing';
    
    if (data.documentStatus === 'Success' || data.status === 'Success') {
      status = 'success';
    } else if (data.documentStatus === 'Failed' || data.status === 'Failed' || data.status === 'Error') {
      status = 'failed';
    } else if (data.documentStatus === 'Processing' || data.status === 'Processing' || data.status === 'Pending') {
      status = 'processing';
    }

    return {
      documentId,
      documentNo: data.documentNo,
      status,
      documentUrl: data.documentURL || data.pdfUrl,
      lastChecked: new Date().toISOString(),
      attempts: 1,
      rawResponse: data,
    };
  } catch (error) {
    console.error('[AppyPay Docs] Erro ao consultar status:', error);
    return {
      documentId,
      status: 'failed',
      lastChecked: new Date().toISOString(),
      attempts: 1,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

/**
 * Faz polling até documento estar completo ou falhar
 */
export async function pollAppyPayInvoice(
  documentId: string,
  maxAttempts: number = DEFAULT_MAX_POLLING_ATTEMPTS,
  intervalMs: number = DEFAULT_POLLING_INTERVAL_MS,
  onProgress?: (status: InvoiceStatus) => void
): Promise<InvoiceStatus> {
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    attempts++;
    
    console.log(`[AppyPay Docs] Polling tentativa ${attempts}/${maxAttempts} para ${documentId}`);
    
    const status = await getAppyPayInvoiceStatus(documentId);
    status.attempts = attempts;
    
    // Callback de progresso
    onProgress?.(status);
    
    // Verificar se completou
    if (status.status === 'success' || status.status === 'failed') {
      return status;
    }
    
    // Aguardar antes da próxima tentativa
    if (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }
  
  // Timeout
  return {
    documentId,
    status: 'timeout',
    lastChecked: new Date().toISOString(),
    attempts,
    error: `Timeout após ${attempts} tentativas (${Math.round(maxAttempts * intervalMs / 60000)} minutos)`,
  };
}

/**
 * Obtém PDF de uma factura
 */
export async function getAppyPayInvoicePdf(documentId: string): Promise<{ url: string } | null> {
  const status = await getAppyPayInvoiceStatus(documentId);
  
  if (status.documentUrl) {
    return { url: status.documentUrl };
  }
  
  return null;
}

/**
 * Lista todos os documentos fiscais da AppyPay
 */
export async function listAppyPayDocuments(): Promise<any[]> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/fiscal-documents`;
  
  console.log('[AppyPay Docs] Listando documentos...');
  
  try {
    const headers = await getAppyPayHeaders();
    
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('[AppyPay Docs] Erro ao listar documentos:', response.status, data);
      return [];
    }
    
    // Retornar array de documentos
    if (Array.isArray(data)) {
      return data;
    } else if (data?.documents && Array.isArray(data.documents)) {
      return data.documents;
    } else if (data?.items && Array.isArray(data.items)) {
      return data.items;
    }
    
    console.log('[AppyPay Docs] Resposta inesperada:', data);
    return [];
  } catch (error) {
    console.error('[AppyPay Docs] Erro ao listar documentos:', error);
    return [];
  }
}
