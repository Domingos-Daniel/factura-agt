/**
 * =============================================================================
 * API ROUTE - CONFIGURAÇÕES DO SISTEMA (SQLITE)
 * =============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { SettingsRepository } from '@/lib/server/settingsRepository';
import { requireAuth, getUserFromRequest } from '@/lib/server/authMiddleware';

export const dynamic = 'force-dynamic';

/**
 * GET - Obter todas as configurações
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const authResult = await requireAuth(request);
    if (!authResult.authenticated) {
      return authResult.response;
    }

    // Obter configurações do provider
    const providerConfig = SettingsRepository.getProviderConfig();
    const appypayConfig = SettingsRepository.getAppyPayConfig();
    const agtConfig = SettingsRepository.getAGTConfig();

    return NextResponse.json({
      success: true,
      config: {
        provider: providerConfig,
        appypay: appypayConfig ? {
          ...appypayConfig,
          // Mascarar credenciais sensíveis
          apiKey: appypayConfig.apiKey ? '***' + appypayConfig.apiKey.slice(-4) : null,
          clientSecret: appypayConfig.clientSecret ? '***' + appypayConfig.clientSecret.slice(-4) : null
        } : null,
        agt: agtConfig ? {
          ...agtConfig,
          password: agtConfig.password ? '***' + agtConfig.password.slice(-4) : null
        } : null
      }
    });
  } catch (error) {
    console.error('Erro ao obter configurações:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao carregar configurações' },
      { status: 500 }
    );
  }
}

/**
 * POST - Salvar configurações
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const authResult = await requireAuth(request);
    if (!authResult.authenticated) {
      return authResult.response;
    }

    const user = authResult.user;
    const body = await request.json();

    // Atualizar configuração do provider
    if (body.provider) {
      SettingsRepository.setProviderConfig(body.provider, user?.id);
    }

    // Atualizar configuração do AppyPay
    if (body.appypay) {
      // Se as credenciais estão mascaradas, manter as existentes
      const currentConfig = SettingsRepository.getAppyPayConfig();
      const newConfig = {
        ...body.appypay,
        apiKey: body.appypay.apiKey?.startsWith('***') 
          ? currentConfig?.apiKey 
          : body.appypay.apiKey,
        clientSecret: body.appypay.clientSecret?.startsWith('***')
          ? currentConfig?.clientSecret
          : body.appypay.clientSecret
      };
      
      SettingsRepository.setAppyPayConfig(newConfig, user?.id);
    }

    // Atualizar configuração da AGT
    if (body.agt) {
      const currentConfig = SettingsRepository.getAGTConfig();
      const newConfig = {
        ...body.agt,
        password: body.agt.password?.startsWith('***')
          ? currentConfig?.password
          : body.agt.password
      };
      
      SettingsRepository.setAGTConfig(newConfig, user?.id);
    }

    console.log('✅ Configurações salvas no banco de dados por:', user?.email);

    return NextResponse.json({
      success: true,
      message: 'Configurações salvas com sucesso'
    });
  } catch (error) {
    console.error('Erro ao salvar configurações:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao salvar configurações' },
      { status: 500 }
    );
  }
}

/**
 * PUT - Atualizar configuração específica
 */
export async function PUT(request: NextRequest) {
  try {
    // Verificar autenticação
    const authResult = await requireAuth(request);
    if (!authResult.authenticated) {
      return authResult.response;
    }

    const user = authResult.user;
    const { key, value, type } = await request.json();

    if (!key || value === undefined) {
      return NextResponse.json(
        { success: false, error: 'Key e value são obrigatórios' },
        { status: 400 }
      );
    }

    SettingsRepository.set(key, value, type || 'string', undefined, user?.id);

    return NextResponse.json({
      success: true,
      message: `Configuração '${key}' atualizada`
    });
  } catch (error) {
    console.error('Erro ao atualizar configuração:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar configuração' },
      { status: 500 }
    );
  }
}
