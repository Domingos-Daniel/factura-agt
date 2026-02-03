/**
 * =============================================================================
 * API ROUTE - VERIFICAR SESSÃO
 * =============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { UserRepository, SessionRepository } from '@/lib/server/userRepository';
import { AuthUtils } from '@/lib/server/auth';

export async function GET(request: NextRequest) {
  try {
    // Obter token do cookie ou header
    const cookieToken = request.cookies.get('auth_token')?.value;
    const headerToken = AuthUtils.extractTokenFromHeader(request.headers.get('authorization'));
    
    const token = cookieToken || headerToken;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token não fornecido' },
        { status: 401 }
      );
    }

    // Verificar token JWT
    const payload = AuthUtils.verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Token inválido' },
        { status: 401 }
      );
    }

    // Verificar se sessão existe no banco
    const session = SessionRepository.findByToken(token);

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Sessão expirada' },
        { status: 401 }
      );
    }

    // Buscar dados atualizados do usuário
    const user = UserRepository.findById(payload.userId);

    if (!user || user.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Usuário inválido' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Erro ao verificar sessão:', error);
    return NextResponse.json(
      { success: false, error: 'Erro no servidor' },
      { status: 500 }
    );
  }
}
