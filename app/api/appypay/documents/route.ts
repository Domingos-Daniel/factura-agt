/**
 * =============================================================================
 * API ROUTE - APPYPAY DOCUMENTOS
 * =============================================================================
 * 
 * Emissão de documentos fiscais via AppyPay.
 * - POST: Emite nova factura (assíncrono)
 * - GET: Lista documentos pendentes
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProviderManager } from '@/lib/providers';
import type { UniversalInvoice, InvoiceLine, InvoiceTax } from '@/lib/providers/types';

export const dynamic = 'force-dynamic';

/**
 * POST - Emite nova factura
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validar payload mínimo
    if (!body.customerTaxID || !body.companyName || !body.lines?.length) {
      return NextResponse.json({
        success: false,
        error: 'Dados obrigatórios em falta: customerTaxID, companyName, lines',
      }, { status: 400 });
    }
    
    // Transformar para UniversalInvoice
    const invoice: UniversalInvoice = {
      documentType: body.documentType || 'FT',
      documentDate: body.documentDate || new Date().toISOString().split('T')[0],
      seriesCode: body.seriesCode || '', // Será preenchido pelo provider
      customerTaxID: body.customerTaxID,
      customerCountry: body.customerCountry || 'AO',
      companyName: body.companyName,
      companyAddress: body.companyAddress,
      emitterTaxID: body.emitterTaxID || process.env.AGT_HML_NIF_TEST || '',
      eacCode: body.eacCode || '00000',
      lines: body.lines.map((line: any, index: number): InvoiceLine => ({
        lineNumber: line.lineNumber || index + 1,
        operationType: 'SG',
        productCode: line.productCode || `PROD${index + 1}`,
        productDescription: line.productDescription || line.description,
        quantity: line.quantity || 1,
        unitOfMeasure: line.unitOfMeasure || 'UN',
        unitPrice: line.unitPrice || 0,
        unitPriceBase: line.unitPriceBase || line.unitPrice || 0,
        taxes: (line.taxes || [{ taxCode: 'NOR', taxType: 'IVA', taxCountryRegion: 'AO', taxPercentage: 14 }]).map((tax: any): InvoiceTax => ({
          taxCode: tax.taxCode || 'NOR',
          taxType: tax.taxType || 'IVA',
          taxCountryRegion: tax.taxCountryRegion || 'AO',
          taxPercentage: tax.taxPercentage || 14,
        })),
      })),
      currency: body.currency || 'AOA',
      paymentMechanism: body.paymentMechanism,
      observations: body.observations,
    };
    
    console.log('[API AppyPay Docs] Emitindo:', JSON.stringify(invoice, null, 2));
    
    // Emitir via Provider Manager
    const manager = getProviderManager();
    const result = await manager.createInvoice(invoice);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        documentId: result.documentId,
        processingStatus: result.processingStatus,
        provider: result.provider,
        message: result.processingStatus === 'processing' 
          ? 'Factura submetida. A processar assíncronamente.'
          : 'Factura emitida com sucesso.',
      }, { status: result.processingStatus === 'processing' ? 202 : 200 });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Erro ao emitir factura',
        provider: result.provider,
        rawResponse: result.rawResponse,
      }, { status: 400 });
    }
  } catch (error) {
    console.error('[API AppyPay Docs] Erro:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }, { status: 500 });
  }
}

/**
 * GET - Lista documentos pendentes
 */
export async function GET(request: NextRequest) {
  try {
    const manager = getProviderManager();
    const pending = manager.getPendingInvoices();
    
    return NextResponse.json({
      success: true,
      pendingInvoices: pending,
      count: pending.length,
    });
  } catch (error) {
    console.error('[API AppyPay Docs] Erro ao listar pendentes:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      pendingInvoices: [],
    }, { status: 500 });
  }
}
