/**
 * =============================================================================
 * SETTINGS REPOSITORY - CONFIGURAÇÕES GLOBAIS
 * =============================================================================
 */

import db from './database';
import { randomUUID } from 'crypto';

export interface Setting {
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  description: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface ProviderConfig {
  activeProvider: 'agt' | 'appypay';
  selectionMode: 'manual' | 'automatic';
  fallbackEnabled: boolean;
  fallbackOrder: string[];
  agtEnabled: boolean;
  appypayEnabled: boolean;
  nif?: string;
  companyName?: string;
  email?: string;
  address?: string;
  defaultCurrency?: string;
  defaultPaymentMechanism?: string;
}

export interface AppyPayConfig {
  apiKey: string;
  baseUrl: string;
  clientId: string;
  clientSecret: string;
}

export interface AGTConfig {
  soapUrl: string;
  username: string;
  password: string;
  nif: string;
}

// =============================================================================
// SETTINGS OPERATIONS
// =============================================================================

export const SettingsRepository = {
  /**
   * Obter configuração por chave
   */
  get(key: string): Setting | null {
    const stmt = db.prepare('SELECT * FROM settings WHERE key = ?');
    return stmt.get(key) as Setting | null;
  },

  /**
   * Obter valor da configuração (com parse)
   */
  getValue<T = any>(key: string, defaultValue?: T): T {
    const setting = this.get(key);
    
    if (!setting) return defaultValue as T;
    
    switch (setting.type) {
      case 'number':
        return Number(setting.value) as T;
      case 'boolean':
        return (setting.value === 'true') as T;
      case 'json':
        try {
          return JSON.parse(setting.value) as T;
        } catch {
          return defaultValue as T;
        }
      default:
        return setting.value as T;
    }
  },

  /**
   * Definir configuração
   */
  set(key: string, value: any, type: Setting['type'] = 'string', description?: string, updatedBy?: string): void {
    let valueStr: string;
    
    switch (type) {
      case 'json':
        valueStr = JSON.stringify(value);
        break;
      case 'boolean':
        valueStr = value ? 'true' : 'false';
        break;
      case 'number':
        valueStr = String(value);
        break;
      default:
        valueStr = String(value);
    }
    
    const stmt = db.prepare(`
      INSERT INTO settings (key, value, type, description, updated_by, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        type = excluded.type,
        description = excluded.description,
        updated_by = excluded.updated_by,
        updated_at = datetime('now')
    `);
    
    stmt.run(key, valueStr, type, description || null, updatedBy || null);
  },

  /**
   * Deletar configuração
   */
  delete(key: string): boolean {
    const stmt = db.prepare('DELETE FROM settings WHERE key = ?');
    const result = stmt.run(key);
    return result.changes > 0;
  },

  /**
   * Listar todas as configurações
   */
  getAll(): Setting[] {
    const stmt = db.prepare('SELECT * FROM settings ORDER BY key');
    return stmt.all() as Setting[];
  },

  /**
   * Obter múltiplas configurações de uma vez
   */
  getMany(keys: string[]): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const key of keys) {
      result[key] = this.getValue(key);
    }
    
    return result;
  },

  // =============================================================================
  // CONFIGURAÇÕES ESPECÍFICAS DO SISTEMA
  // =============================================================================

  /**
   * Obter configuração do provider
   */
  getProviderConfig(): ProviderConfig {
    const config = this.getValue<ProviderConfig>('provider_config', {
      activeProvider: 'appypay',
      selectionMode: 'manual',
      fallbackEnabled: false,
      fallbackOrder: ['appypay', 'agt'],
      agtEnabled: false,
      appypayEnabled: true
    });
    
    return config;
  },

  /**
   * Salvar configuração do provider
   */
  setProviderConfig(config: Partial<ProviderConfig>, updatedBy?: string): void {
    const current = this.getProviderConfig();
    const updated = { ...current, ...config };
    
    this.set('provider_config', updated, 'json', 'Configuração dos providers fiscais', updatedBy);
  },

  /**
   * Obter configuração do AppyPay
   */
  getAppyPayConfig(): AppyPayConfig | null {
    return this.getValue<AppyPayConfig | null>('appypay_config', null);
  },

  /**
   * Salvar configuração do AppyPay
   */
  setAppyPayConfig(config: AppyPayConfig, updatedBy?: string): void {
    this.set('appypay_config', config, 'json', 'Credenciais AppyPay API', updatedBy);
  },

  /**
   * Obter configuração da AGT
   */
  getAGTConfig(): AGTConfig | null {
    return this.getValue<AGTConfig | null>('agt_config', null);
  },

  /**
   * Salvar configuração da AGT
   */
  setAGTConfig(config: AGTConfig, updatedBy?: string): void {
    this.set('agt_config', config, 'json', 'Credenciais AGT SOAP', updatedBy);
  },

  /**
   * Inicializar configurações padrão
   */
  initializeDefaults(): void {
    const defaults = [
      { key: 'app_name', value: 'FacturAGT', type: 'string' as const, description: 'Nome da aplicação' },
      { key: 'app_version', value: '1.0.0', type: 'string' as const, description: 'Versão da aplicação' },
      { key: 'timezone', value: 'Africa/Luanda', type: 'string' as const, description: 'Fuso horário' },
      { key: 'currency', value: 'AOA', type: 'string' as const, description: 'Moeda padrão' },
      { key: 'tax_rate', value: '14', type: 'number' as const, description: 'Taxa de IVA padrão (%)' },
    ];
    
    for (const def of defaults) {
      const existing = this.get(def.key);
      if (!existing) {
        this.set(def.key, def.value, def.type, def.description);
      }
    }
    
    console.log('✅ Configurações padrão inicializadas');
  }
};

// Inicializar configurações padrão na primeira execução
SettingsRepository.initializeDefaults();
