/**
 * =============================================================================
 * API ROUTE - GESTÃO DE PROVEDORES (COM SQLITE)
 * =============================================================================
 * 
 * Gestão de configuração de provedores fiscais.
 * - GET: Obtém configuração e estado
 * - POST: Actualiza configuração
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProviderManager } from '@/lib/providers';
import { SettingsRepository } from '@/lib/server/settingsRepository';
import { getUserFromRequest } from '@/lib/server/authMiddleware';
import type { FiscalProviderName } from '@/lib/providers/types';

export const dynamic = 'force-dynamic';

/**
 * GET - Obtém configuração e estado dos provedores
 */
export async function GET(request: NextRequest) {
  try {
    // Carregar configuração do banco de dados
    const dbConfig = SettingsRepository.getProviderConfig();
    
    const manager = getProviderManager();
    
    // Atualizar manager com config do BD
    manager.setActiveProvider(dbConfig.activeProvider);
    
    // Obter health de todos os provedores
    const healthMap = await manager.checkAllProvidersHealth();
    const providers = Array.from(healthMap.entries()).map(([name, health]) => ({
      name,
      displayName: name === 'appypay' ? 'AppyPay Fiscal API' : 'AGT e-Factura',
      ...health,
      isActive: name === dbConfig.activeProvider,
    }));
    
    // Contagem de pending
    const pendingCount = manager.getPendingInvoices().filter(p => p.status === 'processing').length;
    
    return NextResponse.json({
      success: true,
      config: dbConfig,
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
 * POST - Actualiza configuração (SALVA NO SQLITE)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const user = await getUserFromRequest(request);
    
    const manager = getProviderManager();
    
    // Preparar atualização
    const updates: any = {};
    
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
      updates.activeProvider = body.activeProvider;
    }
    
    // Actualizar fallback
    if (typeof body.fallbackEnabled === 'boolean') {
      manager.setFallbackEnabled(body.fallbackEnabled);
      updates.fallbackEnabled = body.fallbackEnabled;
    }
    
    // Actualizar ordem de fallback
    if (Array.isArray(body.fallbackOrder)) {
      manager.setFallbackOrder(body.fallbackOrder);
      updates.fallbackOrder = body.fallbackOrder;
    }
    
    // Atualizar habilitação dos providers
    if (typeof body.agtEnabled === 'boolean') {
      updates.agtEnabled = body.agtEnabled;
    }
    
    if (typeof body.appypayEnabled === 'boolean') {
      updates.appypayEnabled = body.appypayEnabled;
    }
    
    // Salvar no banco de dados
    SettingsRepository.setProviderConfig(updates, user?.id);
    
    const updatedConfig = SettingsRepository.getProviderConfig();
    
    console.log('✅ Configuração de providers salva no BD por:', user?.email || 'anônimo');
    
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
