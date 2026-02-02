/**
 * =============================================================================
 * API ROUTE - APPYPAY DOCUMENTO ESPECÍFICO
 * =============================================================================
 * 
 * Consulta estado de um documento específico.
 * - GET: Obtém estado do documento
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProviderManager } from '@/lib/providers';
import { FacturaRepository } from '@/lib/server/facturaRepository';

export const dynamic = 'force-dynamic';

/**
 * GET - Consulta estado do documento
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: documentId } = await params;
    
    if (!documentId) {
      return NextResponse.json({
        success: false,
        error: 'ID do documento é obrigatório',
      }, { status: 400 });
    }
    
    console.log('[API AppyPay Docs] Consultando:', documentId);
    
    const manager = getProviderManager();
    const status = await manager.getInvoiceStatus(documentId, 'appypay');
    
    // Buscar dados originais do repositório para obter as linhas
    let originalLines = null;
    let originalRequest = null;
    let storedOp = null;
    
    // Tentar buscar por requestID
    storedOp = FacturaRepository.getFacturaByRequestId(documentId);
    
    // Se não encontrou, tentar buscar por response.documentId em todas as facturas
    if (!storedOp) {
      const allFacturas = FacturaRepository.listAllFacturas();
      storedOp = allFacturas.find(f => 
        f.response?.documentId === documentId ||
        f.response?.providerRequestId === documentId ||
        f.metadata?.submissionGUID === documentId
      ) || null;
      
      if (storedOp) {
        console.log('[API AppyPay Docs] Factura encontrada via response.documentId');
      }
    }
    
    if (storedOp?.request?.documents?.[0]?.lines) {
      originalLines = storedOp.request.documents[0].lines;
      originalRequest = storedOp.request;
      console.log('[API AppyPay Docs] Linhas encontradas no repositório:', originalLines.length);
    }
    
    // Obter totais do request original se não estiverem na resposta da API
    const documentTotals = storedOp?.request?.documents?.[0]?.documentTotals;
    
    // Mesclar linhas originais com resposta da API
    const enrichedRawResponse = {
      ...status.rawResponse,
      lines: originalLines || status.rawResponse?.lines,
      originalRequest,
      // Adicionar totais ao nível superior para facilitar acesso
      netTotal: documentTotals?.netTotal || status.rawResponse?.netTotal,
      taxPayable: documentTotals?.taxPayable || status.rawResponse?.taxPayable,
      grossTotal: documentTotals?.grossTotal || status.rawResponse?.grossTotal,
      currency: documentTotals?.currency || status.rawResponse?.currency,
    };
    
    return NextResponse.json({
      success: true,
      ...status,
      rawResponse: enrichedRawResponse,
    });
  } catch (error) {
    console.error('[API AppyPay Docs] Erro ao consultar:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }, { status: 500 });
  }
}
