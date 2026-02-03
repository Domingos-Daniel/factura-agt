/**
 * =============================================================================
 * AUTHENTICATION MIDDLEWARE
 * =============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { UserRepository, SessionRepository } from './userRepository';
import { AuthUtils } from './auth';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

/**
 * Middleware para verificar autenticação
 */
export async function requireAuth(request: NextRequest): Promise<{ authenticated: boolean; user?: any; response?: NextResponse }> {
  // Obter token do cookie ou header
  const cookieToken = request.cookies.get('auth_token')?.value;
  const headerToken = AuthUtils.extractTokenFromHeader(request.headers.get('authorization'));
  
  const token = cookieToken || headerToken;

  if (!token) {
    return {
      authenticated: false,
      response: NextResponse.json(
        { success: false, error: 'Não autenticado' },
        { status: 401 }
      )
    };
  }

  // Verificar token JWT
  const payload = AuthUtils.verifyToken(token);

  if (!payload) {
    return {
      authenticated: false,
      response: NextResponse.json(
        { success: false, error: 'Token inválido' },
        { status: 401 }
      )
    };
  }

  // Verificar se sessão existe no banco
  const session = SessionRepository.findByToken(token);

  if (!session) {
    return {
      authenticated: false,
      response: NextResponse.json(
        { success: false, error: 'Sessão expirada' },
        { status: 401 }
      )
    };
  }

  // Buscar dados atualizados do usuário
  const user = UserRepository.findById(payload.userId);

  if (!user || user.status !== 'active') {
    return {
      authenticated: false,
      response: NextResponse.json(
        { success: false, error: 'Usuário inválido' },
        { status: 401 }
      )
    };
  }

  return {
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    }
  };
}

/**
 * Middleware para verificar role específica
 */
export async function requireRole(request: NextRequest, allowedRoles: string[]): Promise<{ authorized: boolean; user?: any; response?: NextResponse }> {
  const authResult = await requireAuth(request);

  if (!authResult.authenticated) {
    return {
      authorized: false,
      response: authResult.response
    };
  }

  if (!allowedRoles.includes(authResult.user!.role)) {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: 'Sem permissão' },
        { status: 403 }
      )
    };
  }

  return {
    authorized: true,
    user: authResult.user
  };
}

/**
 * Helper para extrair usuário da requisição
 */
export async function getUserFromRequest(request: NextRequest): Promise<any | null> {
  const authResult = await requireAuth(request);
  return authResult.authenticated ? authResult.user : null;
}
