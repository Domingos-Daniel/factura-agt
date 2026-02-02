/**
 * =============================================================================
 * API ROUTE - PROCESSAR PENDING INVOICES
 * =============================================================================
 * 
 * Processa documentos pendentes (polling).
 * Pode ser chamado via cron job ou manualmente.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProviderManager } from '@/lib/providers';

export const dynamic = 'force-dynamic';

/**
 * POST - Processa pending invoices
 */
export async function POST(request: NextRequest) {
  try {
    const manager = getProviderManager();
    
    const pendingBefore = manager.getPendingInvoices();
    const processingCount = pendingBefore.filter(p => p.status === 'processing').length;
    
    if (processingCount === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhum documento pendente para processar',
        processed: 0,
      });
    }
    
    console.log(`[API Providers Poll] Processando ${processingCount} documentos pendentes...`);
    
    await manager.processPendingInvoices();
    
    const pendingAfter = manager.getPendingInvoices();
    const completedCount = pendingBefore.filter(before => {
      const after = pendingAfter.find(a => a.documentId === before.documentId);
      return after && 
             before.status === 'processing' && 
             (after.status === 'success' || after.status === 'failed');
    }).length;
    
    return NextResponse.json({
      success: true,
      message: `Processados ${completedCount} de ${processingCount} documentos`,
      processed: processingCount,
      completed: completedCount,
      pending: pendingAfter.filter(p => p.status === 'processing').length,
    });
  } catch (error) {
    console.error('[API Providers Poll] Erro:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }, { status: 500 });
  }
}

/**
 * GET - Retorna estado dos pending
 */
export async function GET(request: NextRequest) {
  try {
    const manager = getProviderManager();
    const pending = manager.getPendingInvoices();
    
    const summary = {
      total: pending.length,
      processing: pending.filter(p => p.status === 'processing').length,
      success: pending.filter(p => p.status === 'success').length,
      failed: pending.filter(p => p.status === 'failed').length,
      timeout: pending.filter(p => p.status === 'timeout').length,
    };
    
    return NextResponse.json({
      success: true,
      summary,
      pending,
    });
  } catch (error) {
    console.error('[API Providers Poll] Erro:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }, { status: 500 });
  }
}
