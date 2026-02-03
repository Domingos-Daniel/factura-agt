/**
 * =============================================================================
 * USER REPOSITORY - CRUD OPERATIONS
 * =============================================================================
 */

import db from './database';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'accountant';
  status: 'active' | 'inactive' | 'suspended';
  nif?: string | null;
  created_at: string;
  updated_at: string;
  last_login: string | null;
}

export interface CreateUserData {
  email: string;
  password: string;
  name: string;
  role?: 'admin' | 'user' | 'accountant';
  nif?: string;
}

export interface Session {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// =============================================================================
// USER OPERATIONS
// =============================================================================

export const UserRepository = {
  /**
   * Criar novo usuário
   */
  async create(data: CreateUserData): Promise<User> {
    const id = randomUUID();
    const passwordHash = await bcrypt.hash(data.password, 10);
    
    const stmt = db.prepare(`
      INSERT INTO users (id, email, password_hash, name, role, nif)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(id, data.email, passwordHash, data.name, data.role || 'user', data.nif || null);
    
    return this.findById(id)!;
  },

  /**
   * Buscar usuário por ID
   */
  findById(id: string): User | null {
    const stmt = db.prepare(`
      SELECT id, email, name, role, status, nif, created_at, updated_at, last_login
      FROM users WHERE id = ?
    `);
    
    return stmt.get(id) as User | null;
  },

  /**
   * Buscar usuário por email
   */
  findByEmail(email: string): User | null {
    const stmt = db.prepare(`
      SELECT id, email, name, role, status, nif, created_at, updated_at, last_login
      FROM users WHERE email = ?
    `);
    
    return stmt.get(email) as User | null;
  },

  /**
   * Verificar senha
   * Aceita email ou NIF como identificador
   */
  async verifyPassword(emailOrNif: string, password: string): Promise<User | null> {
    const stmt = db.prepare(`
      SELECT id, email, password_hash, name, role, status, nif, created_at, updated_at, last_login
      FROM users WHERE email = ? OR nif = ?
    `);
    
    const user = stmt.get(emailOrNif, emailOrNif) as any;
    
    if (!user) return null;
    
    const isValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isValid) return null;
    
    // Atualizar last_login
    const updateStmt = db.prepare(`
      UPDATE users SET last_login = datetime('now') WHERE id = ?
    `);
    updateStmt.run(user.id);
    
    // Remover password_hash do retorno
    delete user.password_hash;
    
    return user as User;
  },

  /**
   * Listar todos os usuários
   */
  findAll(): User[] {
    const stmt = db.prepare(`
      SELECT id, email, name, role, status, nif, created_at, updated_at, last_login
      FROM users
      ORDER BY created_at DESC
    `);
    
    return stmt.all() as User[];
  },

  /**
   * Atualizar usuário
   */
  update(id: string, data: Partial<CreateUserData>): User | null {
    const updates: string[] = [];
    const values: any[] = [];
    
    if (data.name) {
      updates.push('name = ?');
      values.push(data.name);
    }
    
    if (data.email) {
      updates.push('email = ?');
      values.push(data.email);
    }
    
    if (data.role) {
      updates.push('role = ?');
      values.push(data.role);
    }
    
    if (updates.length === 0) return this.findById(id);
    
    updates.push("updated_at = datetime('now')");
    values.push(id);
    
    const stmt = db.prepare(`
      UPDATE users SET ${updates.join(', ')} WHERE id = ?
    `);
    
    stmt.run(...values);
    
    return this.findById(id);
  },

  /**
   * Deletar usuário
   */
  delete(id: string): boolean {
    const stmt = db.prepare('DELETE FROM users WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Criar usuário admin padrão se não existir
   */
  async ensureAdminExists(): Promise<void> {
    const count = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    
    if (count.count === 0) {
      console.log('🔧 Criando usuário admin padrão...');
      await this.create({
        email: 'admin@facturagt.ao',
        password: 'Admin@123',
        name: 'Administrador',
        role: 'admin',
        nif: '5000000000'
      });
      console.log('✅ Admin criado: admin@facturagt.ao / Admin@123 (NIF: 5000000000)');
    }
  }
};

// =============================================================================
// SESSION OPERATIONS
// =============================================================================

export const SessionRepository = {
  /**
   * Criar nova sessão
   */
  create(userId: string, token: string, expiresInHours: number = 24, ipAddress?: string, userAgent?: string): Session {
    const id = randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);
    
    const stmt = db.prepare(`
      INSERT INTO sessions (id, user_id, token, expires_at, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(id, userId, token, expiresAt.toISOString(), ipAddress || null, userAgent || null);
    
    return this.findById(id)!;
  },

  /**
   * Buscar sessão por ID
   */
  findById(id: string): Session | null {
    const stmt = db.prepare(`
      SELECT * FROM sessions WHERE id = ?
    `);
    
    return stmt.get(id) as Session | null;
  },

  /**
   * Buscar sessão por token
   */
  findByToken(token: string): Session | null {
    const stmt = db.prepare(`
      SELECT * FROM sessions WHERE token = ? AND expires_at > datetime('now')
    `);
    
    return stmt.get(token) as Session | null;
  },

  /**
   * Deletar sessão (logout)
   */
  delete(token: string): boolean {
    const stmt = db.prepare('DELETE FROM sessions WHERE token = ?');
    const result = stmt.run(token);
    return result.changes > 0;
  },

  /**
   * Deletar todas as sessões de um usuário
   */
  deleteByUserId(userId: string): void {
    const stmt = db.prepare('DELETE FROM sessions WHERE user_id = ?');
    stmt.run(userId);
  },

  /**
   * Limpar sessões expiradas
   */
  cleanExpired(): void {
    const stmt = db.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')");
    const result = stmt.run();
    if (result.changes > 0) {
      console.log(`🧹 Limpou ${result.changes} sessões expiradas`);
    }
  }
};

// Garantir que existe um admin ao iniciar
UserRepository.ensureAdminExists();

// Limpar sessões expiradas periodicamente (a cada hora)
setInterval(() => {
  SessionRepository.cleanExpired();
}, 60 * 60 * 1000);
