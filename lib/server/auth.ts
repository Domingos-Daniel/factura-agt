/**
 * =============================================================================
 * AUTHENTICATION UTILITY
 * =============================================================================
 */

import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'facturagt-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  sessionId: string;
}

export const AuthUtils = {
  /**
   * Gerar token JWT
   */
  generateToken(payload: Omit<JWTPayload, 'sessionId'>): { token: string; sessionId: string } {
    const sessionId = randomUUID();
    
    const token = jwt.sign(
      { ...payload, sessionId },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    return { token, sessionId };
  },

  /**
   * Verificar e decodificar token
   */
  verifyToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  },

  /**
   * Extrair token do header Authorization
   */
  extractTokenFromHeader(authHeader: string | null): string | null {
    if (!authHeader) return null;
    
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    
    return authHeader;
  },

  /**
   * Validar força da senha
   */
  validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Senha deve ter no mínimo 8 caracteres');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Senha deve conter pelo menos uma letra maiúscula');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Senha deve conter pelo menos uma letra minúscula');
    }
    
    if (!/[0-9]/.test(password)) {
      errors.push('Senha deve conter pelo menos um número');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Senha deve conter pelo menos um caractere especial');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  },

  /**
   * Validar email
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
};
