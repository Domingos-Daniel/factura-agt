/**
 * =============================================================================
 * API ROUTE - APPYPAY HEALTH CHECK
 * =============================================================================
 * 
 * Verifica o estado do provedor AppyPay.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAppyPayProvider } from '@/lib/providers/appypay';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const provider = getAppyPayProvider();
    const health = await provider.healthCheck();
    
    return NextResponse.json({
      success: true,
      health,
    });
  } catch (error) {
    console.error('[API AppyPay Health] Erro:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      health: {
        provider: 'appypay',
        status: 'unavailable',
        latencyMs: 0,
        lastChecked: new Date().toISOString(),
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      },
    }, { status: 500 });
  }
}
