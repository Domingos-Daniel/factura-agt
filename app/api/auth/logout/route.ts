/**
 * =============================================================================
 * API ROUTE - LOGOUT
 * =============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { SessionRepository } from '@/lib/server/userRepository';
import { AuthUtils } from '@/lib/server/auth';
import { serialize } from 'cookie';

export async function POST(request: NextRequest) {
  try {
    // Obter token do cookie ou header
    const cookieToken = request.cookies.get('auth_token')?.value;
    const headerToken = AuthUtils.extractTokenFromHeader(request.headers.get('authorization'));
    
    const token = cookieToken || headerToken;

    if (token) {
      // Deletar sessão do banco
      SessionRepository.delete(token);
    }

    // Criar resposta limpando o cookie
    const response = NextResponse.json({
      success: true,
      message: 'Logout realizado com sucesso'
    });

    // Limpar cookie
    response.headers.set(
      'Set-Cookie',
      serialize('auth_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/'
      })
    );

    return response;
  } catch (error) {
    console.error('Erro no logout:', error);
    return NextResponse.json(
      { success: false, error: 'Erro no servidor' },
      { status: 500 }
    );
  }
}
