// Utils para gerenciar localStorage de forma type-safe

import { Factura, Serie, AuthToken, User, AppConfig } from './types';

const KEYS = {
  AUTH: 'factura-agt-auth',
  FACTURAS: 'factura-agt-facturas',
  SERIES: 'factura-agt-series',
  CONFIG: 'factura-agt-config',
  THEME: 'factura-agt-theme',
};

const DEFAULT_CONFIG: AppConfig = {
  companyName: 'Empresa Demo AGT',
  companyEmail: 'contabilidade@exemplo.co.ao',
  companyNIF: '500000000',
  companyAddress: 'Luanda, Angola',
  defaultCurrency: 'AOA',
  defaultPaymentMechanism: 'NU',
  defaultCountry: 'AO',
  aiAssistantsEnabled: true,
  autoSuggestTaxes: true,
  systemName: 'Sistema AGT',
  systemSubtitle: 'Faturação Eletrónica',
};

// ==================== AUTH ====================

export function saveAuth(auth: AuthToken): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEYS.AUTH, JSON.stringify(auth));
  if (typeof document !== 'undefined') {
    const maxAge = 60 * 60 * 8; // 8 horas
    document.cookie = `${KEYS.AUTH}=${auth.token}; path=/; max-age=${maxAge}`;
  }
}

export function getAuth(): AuthToken | null {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem(KEYS.AUTH);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function clearAuth(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEYS.AUTH);
  if (typeof document !== 'undefined') {
    document.cookie = `${KEYS.AUTH}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }
}

export function isAuthenticated(): boolean {
  const auth = getAuth();
  if (!auth) return false;
  
  // Verificar se token expirou
  const expiresAt = new Date(auth.expiresAt);
  return expiresAt > new Date();
}

// ==================== SEED INITIALIZATION ====================

function initializeFacturasSeed(): void {
  if (typeof window === 'undefined') return;
  
  // Importar seed dinamicamente para evitar problemas SSR
  import('./seedFacturas').then(({ seedFacturas }) => {
    const enrichedSeed = seedFacturas.map(f => ({
      ...f,
      id: f.submissionGUID,
      createdAt: f.submissionTimeStamp,
      updatedAt: f.submissionTimeStamp
    }));
    localStorage.setItem(KEYS.FACTURAS, JSON.stringify(enrichedSeed));
  }).catch(err => {
    console.warn('Erro ao carregar seed de facturas:', err);
  });
}

function initializeSeriesSeed(): void {
  if (typeof window === 'undefined') return;
  
  const mockSeries: Serie[] = [
    {
      id: 'serie-ft-2025',
      seriesCode: 'FT2025',
      seriesYear: 2025,
      documentType: 'FT',
      firstDocumentNumber: 1,
      currentSequence: 100,
      status: 'A',
      invoicingMethod: 'FESF',
      requestDate: '2025-01-01T00:00:00Z'
    },
    {
      id: 'serie-ar-2025',
      seriesCode: 'AR2025',
      seriesYear: 2025,
      documentType: 'AR',
      firstDocumentNumber: 1,
      currentSequence: 50,
      status: 'A',
      invoicingMethod: 'FESF',
      requestDate: '2025-01-01T00:00:00Z'
    },
    {
      id: 'serie-nc-2025',
      seriesCode: 'NC2025',
      seriesYear: 2025,
      documentType: 'NC',
      firstDocumentNumber: 1,
      currentSequence: 10,
      status: 'F',
      invoicingMethod: 'FESF',
      requestDate: '2025-01-01T00:00:00Z'
    }
  ];
  
  localStorage.setItem(KEYS.SERIES, JSON.stringify(mockSeries));
}

// ==================== FACTURAS ====================

export function saveFacturas(facturas: Factura[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEYS.FACTURAS, JSON.stringify(facturas));
}

export function getFacturas(): Factura[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(KEYS.FACTURAS);
  if (!data) {
    // Primeira vez: carregar seed
    initializeFacturasSeed();
    const newData = localStorage.getItem(KEYS.FACTURAS);
    if (!newData) return [];
    try {
      return JSON.parse(newData);
    } catch {
      return [];
    }
  }
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function addFactura(factura: Factura): void {
  const facturas = getFacturas();
  const newFactura = {
    ...factura,
    id: factura.id || generateId(),
    createdAt: factura.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  facturas.push(newFactura);
  saveFacturas(facturas);
}

export function updateFactura(id: string, updates: Partial<Factura>): void {
  const facturas = getFacturas();
  const index = facturas.findIndex((f) => f.id === id);
  if (index !== -1) {
    facturas[index] = {
      ...facturas[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    saveFacturas(facturas);
  }
}

export function getFacturaById(id: string): Factura | undefined {
  const facturas = getFacturas();
  return facturas.find((f) => f.id === id);
}

export function deleteFactura(id: string): void {
  const facturas = getFacturas();
  const filtered = facturas.filter((f) => f.id !== id);
  saveFacturas(filtered);
}

// ==================== SERIES ====================

export function saveSeries(series: Serie[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEYS.SERIES, JSON.stringify(series));
}

export function getSeries(): Serie[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(KEYS.SERIES);
  if (!data) {
    // Primeira vez: carregar seed
    initializeSeriesSeed();
    const newData = localStorage.getItem(KEYS.SERIES);
    if (!newData) return [];
    try {
      return JSON.parse(newData);
    } catch {
      return [];
    }
  }
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function addSerie(serie: Serie): void {
  const series = getSeries();
  const newSerie = {
    ...serie,
    id: serie.id || generateId(),
  };
  series.push(newSerie);
  saveSeries(series);
}

export function updateSerie(id: string, updates: Partial<Serie>): void {
  const series = getSeries();
  const index = series.findIndex((s) => s.id === id);
  if (index !== -1) {
    series[index] = {
      ...series[index],
      ...updates,
    };
    saveSeries(series);
  }
}

export function getSerieById(id: string): Serie | undefined {
  const series = getSeries();
  return series.find((s) => s.id === id);
}

export function deleteSerie(id: string): void {
  const series = getSeries();
  const filtered = series.filter((s) => s.id !== id);
  saveSeries(filtered);
}

// ==================== CONFIG ====================

export function saveConfig(config: Record<string, any>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEYS.CONFIG, JSON.stringify(config));
}

export function getConfig(): Record<string, any> {
  if (typeof window === 'undefined') return {};
  const data = localStorage.getItem(KEYS.CONFIG);
  if (!data) return {};
  try {
    return JSON.parse(data);
  } catch {
    return {};
  }
}

export function getAppConfig(): AppConfig {
  const stored = getConfig();
  return {
    ...DEFAULT_CONFIG,
    ...(stored || {}),
  };
}

export function updateAppConfig(partial: Partial<AppConfig>): AppConfig {
  const updated = {
    ...getAppConfig(),
    ...partial,
  };
  saveConfig(updated);
  return updated;
}

export function resetAppConfig(): AppConfig {
  saveConfig(DEFAULT_CONFIG);
  return DEFAULT_CONFIG;
}

export { DEFAULT_CONFIG as DEFAULT_APP_CONFIG };

// ==================== THEME ====================

export function saveTheme(theme: 'light' | 'dark'): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEYS.THEME, theme);
}

export function getTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return (localStorage.getItem(KEYS.THEME) as 'light' | 'dark') || 'light';
}

// ==================== HELPERS ====================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Função para limpar todos os dados (útil para testes)
export function clearAllData(): void {
  if (typeof window === 'undefined') return;
  Object.values(KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });
}

// Função para resetar dados com seed
export function resetWithSeed(): void {
  if (typeof window === 'undefined') return;
  clearAllData();
  initializeFacturasSeed();
  initializeSeriesSeed();
}
