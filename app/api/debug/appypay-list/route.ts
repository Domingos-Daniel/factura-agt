/**
 * =============================================================================
 * DEBUG ENDPOINT - Lista documentos AppyPay sem processamento
 * =============================================================================
 */

import { NextResponse } from 'next/server';
import { listAppyPayDocuments } from '@/lib/providers/appypay/documents';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('[DEBUG /api/debug/appypay-list] Listando documentos...');
    
    const documents = await listAppyPayDocuments();
    
    console.log(`[DEBUG /api/debug/appypay-list] Total retornado: ${documents.length}`);
    
    return NextResponse.json({
      success: true,
      total: documents.length,
      documents: documents,
      rawDocumentIds: documents.map(d => d.id || d.documentNo),
    });
  } catch (error) {
    console.error('[DEBUG /api/debug/appypay-list] Erro:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      total: 0,
      documents: [],
    }, { status: 500 });
  }
}
