/**
 * =============================================================================
 * API ROUTE - GESTÃO DE PROVEDORES
 * =============================================================================
 * 
 * Gestão de configuração de provedores fiscais.
 * - GET: Obtém configuração e estado
 * - POST: Actualiza configuração
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProviderManager } from '@/lib/providers';
import type { FiscalProviderName } from '@/lib/providers/types';

export const dynamic = 'force-dynamic';

/**
 * GET - Obtém configuração e estado dos provedores
 */
export async function GET(request: NextRequest) {
  try {
    const manager = getProviderManager();
    const config = manager.getConfig();
    
    // Obter health de todos os provedores
    const healthMap = await manager.checkAllProvidersHealth();
    const providers = Array.from(healthMap.entries()).map(([name, health]) => ({
      name,
      displayName: name === 'appypay' ? 'AppyPay Fiscal API' : 'AGT e-Factura',
      ...health,
      isActive: name === config.activeProvider,
    }));
    
    // Contagem de pending
    const pendingCount = manager.getPendingInvoices().filter(p => p.status === 'processing').length;
    
    return NextResponse.json({
      success: true,
      config,
      providers,
      pendingInvoicesCount: pendingCount,
    });
  } catch (error) {
    console.error('[API Providers] Erro:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }, { status: 500 });
  }
}

/**
 * POST - Actualiza configuração
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const manager = getProviderManager();
    
    // Actualizar provedor ativo
    if (body.activeProvider) {
      const validProviders: FiscalProviderName[] = ['agt', 'appypay'];
      if (!validProviders.includes(body.activeProvider)) {
        return NextResponse.json({
          success: false,
          error: `Provedor inválido: ${body.activeProvider}`,
        }, { status: 400 });
      }
      manager.setActiveProvider(body.activeProvider);
    }
    
    // Actualizar fallback
    if (typeof body.fallbackEnabled === 'boolean') {
      manager.setFallbackEnabled(body.fallbackEnabled);
    }
    
    // Actualizar ordem de fallback
    if (Array.isArray(body.fallbackOrder)) {
      manager.setFallbackOrder(body.fallbackOrder);
    }
    
    const updatedConfig = manager.getConfig();
    
    return NextResponse.json({
      success: true,
      message: 'Configuração actualizada com sucesso',
      config: updatedConfig,
    });
  } catch (error) {
    console.error('[API Providers] Erro ao actualizar:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }, { status: 500 });
  }
}
