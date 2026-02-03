/**
 * =============================================================================
 * SQLITE DATABASE CONNECTION AND INITIALIZATION
 * =============================================================================
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.join(process.cwd(), 'data', 'database');
const DB_PATH = path.join(DB_DIR, 'facturagt.db');

// Garantir que o diretório existe
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Criar conexão
const db = new Database(DB_PATH, { verbose: console.log });

// Habilitar foreign keys
db.pragma('foreign_keys = ON');

// =============================================================================
// SCHEMA DO BANCO DE DADOS
// =============================================================================

function initializeDatabase() {
  console.log('🗄️  Inicializando banco de dados SQLite...');

  // Tabela de usuários
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'user' CHECK(role IN ('admin', 'user', 'accountant')),
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'suspended')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      last_login TEXT
    )
  `);

  // Tabela de sessões
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Tabela de configurações globais
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      type TEXT DEFAULT 'string' CHECK(type IN ('string', 'number', 'boolean', 'json')),
      description TEXT,
      updated_at TEXT DEFAULT (datetime('now')),
      updated_by TEXT,
      FOREIGN KEY (updated_by) REFERENCES users(id)
    )
  `);

  // Tabela de empresas (para multi-tenant futuro)
  db.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      nif TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      trade_name TEXT,
      address TEXT,
      city TEXT,
      country TEXT DEFAULT 'AO',
      email TEXT,
      phone TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'suspended')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Tabela de configurações das empresas
  db.exec(`
    CREATE TABLE IF NOT EXISTS company_settings (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      provider TEXT CHECK(provider IN ('agt', 'appypay')),
      config TEXT NOT NULL,
      is_active BOOLEAN DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
      UNIQUE(company_id, provider)
    )
  `);

  // Índices
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
    CREATE INDEX IF NOT EXISTS idx_companies_nif ON companies(nif);
    CREATE INDEX IF NOT EXISTS idx_company_settings_company ON company_settings(company_id);
  `);

  console.log('✅ Banco de dados inicializado com sucesso!');
}

// Inicializar na primeira execução
initializeDatabase();

// =============================================================================
// FUNÇÕES HELPER
// =============================================================================

export function getDatabase(): Database.Database {
  return db;
}

export function closeDatabase(): void {
  db.close();
}

export function runMigrations(): void {
  // Adicionar migrações futuras aqui
  console.log('🔄 Verificando migrações...');
  // Exemplo: Adicionar novas colunas, índices, etc.
}

export default db;
