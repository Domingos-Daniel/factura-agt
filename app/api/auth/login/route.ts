/**
 * =============================================================================
 * API ROUTE - LOGIN COM SQLITE
 * =============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { UserRepository, SessionRepository } from '@/lib/server/userRepository';
import { AuthUtils } from '@/lib/server/auth';
import { serialize } from 'cookie';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = body.email || body.nif; // Aceitar email ou nif
    const password = body.password;

    // Validar entrada
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar credenciais no banco de dados
    const user = await UserRepository.verifyPassword(email, password);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    // Verificar status do usuário
    if (user.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Usuário inativo ou suspenso' },
        { status: 403 }
      );
    }

    // Gerar token JWT
    const { token, sessionId } = AuthUtils.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    // Obter informações da requisição
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Criar sessão no banco
    SessionRepository.create(user.id, token, 24, ipAddress, userAgent);

    // Criar resposta com cookie
    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        token
      }
    });

    // Definir cookie httpOnly
    response.headers.set(
      'Set-Cookie',
      serialize('auth_token', token, {
        httpOnly: true,
        secure: false, // Desabilitado para desenvolvimento local
        sameSite: 'lax',
        maxAge: 60 * 60 * 24, // 24 horas
        path: '/'
      })
    );

    return response;
  } catch (error) {
    console.error('Erro no login:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao processar login' },
      { status: 500 }
    );
  }
}
