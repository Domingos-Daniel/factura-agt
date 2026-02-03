/**
 * =============================================================================
 * API ROUTE - PERFIL DO UTILIZADOR COM DADOS DE IMPORTAÇÃO
 * =============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { UserRepository, SessionRepository } from '@/lib/server/userRepository';
import { SettingsRepository } from '@/lib/server/settingsRepository';
import { getAllSeriesJson } from '@/lib/server/seriesJson';

export const dynamic = 'force-dynamic';

/**
 * GET - Obter perfil do utilizador com dados para importação
 */
export async function GET(request: NextRequest) {
  try {
    // Obter token do cookie
    const cookieToken = request.cookies.get('auth_token')?.value;

    if (!cookieToken) {
      return NextResponse.json(
        { success: false, error: 'Token não fornecido' },
        { status: 401 }
      );
    }

    // Verificar sessão
    const session = SessionRepository.findByToken(cookieToken);

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Sessão expirada' },
        { status: 401 }
      );
    }

    // Buscar dados do utilizador
    const user = UserRepository.findById(session.user_id);

    if (!user || user.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Utilizador inválido' },
        { status: 401 }
      );
    }

    // Obter configurações (companyName, NIF, etc)
    const providerConfig = SettingsRepository.getProviderConfig();

    // Obter séries do provedor ativo
    let activeSeries = null;
    try {
      const allSeries = await getAllSeriesJson();
      // Pegar a primeira série aberta ou em uso
      activeSeries = allSeries.find(
        (s: any) => s.status === 'U' || s.status === 'A'
      ) || allSeries[0];
    } catch (err) {
      console.warn('Erro ao obter séries:', err);
    }

    return NextResponse.json({
      success: true,
      profile: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          nif: user.nif,
        },
        company: {
          nif: user.nif || providerConfig?.nif,
          name: providerConfig?.companyName || 'Empresa',
          email: providerConfig?.email,
          address: providerConfig?.address,
        },
        provider: {
          activeProvider: providerConfig?.activeProvider || 'agt',
        },
        series: activeSeries ? {
          code: activeSeries.seriesCode,
          year: activeSeries.seriesYear,
          documentType: activeSeries.documentType,
          status: activeSeries.status,
        } : null,
      },
    });
  } catch (error) {
    console.error('Erro ao obter perfil:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao carregar perfil' },
      { status: 500 }
    );
  }
}
