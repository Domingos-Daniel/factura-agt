/**
 * =============================================================================
 * REPOSITÓRIO PERSISTENTE DE FACTURAS E OPERAÇÕES
 * =============================================================================
 * 
 * Este módulo gerencia o armazenamento persistente de facturas e operações
 * em arquivo JSON centralizado, permitindo compartilhamento entre serviços.
 * 
 * Funcionalidades:
 * - Salvar facturas registadas
 * - Salvar séries criadas
 * - Salvar operações de validação
 * - Consultar por ID, status, data
 * - Listar todas as operações
 * - Sincronizar com serviços externos
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  AGTRegistarFacturaRequest,
  AGTRegistarFacturaResponse,
  AGTDocument,
  AGTSeriesInfo,
} from '../types/agt-official';

// =============================================================================
// TIPOS E INTERFACES
// =============================================================================

export interface StoredFacturaOperation {
  id: string;
  type: 'factura' | 'serie' | 'validacao' | 'consulta';
  serviceName: 'mock' | 'soap' | 'api' | 'direct';
  status: 'pending' | 'registered' | 'validated' | 'rejected' | 'error';
  requestID?: string;
  request: any;
  response: any;
  errors?: any[];
  createdAt: string;
  updatedAt: string;
  metadata?: {
    nif?: string;
    documentNo?: string;
    submissionGUID?: string;
  };
}

export interface FacturaRepositoryData {
  metadata: {
    lastUpdated: string;
    version: string;
    totalFacturas: number;
    totalSeries: number;
    totalOperations: number;
  };
  facturas: StoredFacturaOperation[];
  series: StoredFacturaOperation[];
  validations: StoredFacturaOperation[];
  consultations: StoredFacturaOperation[];
}

// =============================================================================
// CONFIGURAÇÃO
// =============================================================================

const STORAGE_DIR = path.join(process.cwd(), 'data', 'storage');
const STORAGE_FILE = path.join(STORAGE_DIR, 'facturas.json');

// Garantir que o diretório existe
function ensureStorageDir(): void {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
}

// =============================================================================
// FUNÇÕES PRIVADAS
// =============================================================================

/**
 * Carrega dados do repositório do arquivo JSON
 */
function loadData(): FacturaRepositoryData {
  ensureStorageDir();

  if (!fs.existsSync(STORAGE_FILE)) {
    return getDefaultData();
  }

  try {
    const rawData = fs.readFileSync(STORAGE_FILE, 'utf-8');
    return JSON.parse(rawData);
  } catch (error) {
    console.error('Erro ao carregar repositório:', error);
    return getDefaultData();
  }
}

/**
 * Retorna estrutura padrão vazia
 */
function getDefaultData(): FacturaRepositoryData {
  return {
    metadata: {
      lastUpdated: new Date().toISOString(),
      version: '1.0',
      totalFacturas: 0,
      totalSeries: 0,
      totalOperations: 0,
    },
    facturas: [],
    series: [],
    validations: [],
    consultations: [],
  };
}

/**
 * Salva dados no arquivo JSON
 */
function saveData(data: FacturaRepositoryData): void {
  ensureStorageDir();

  try {
    // Atualizar metadata
    data.metadata.lastUpdated = new Date().toISOString();
    data.metadata.totalFacturas = data.facturas.length;
    data.metadata.totalSeries = data.series.length;
    data.metadata.totalOperations =
      data.facturas.length +
      data.series.length +
      data.validations.length +
      data.consultations.length;

    fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Erro ao salvar repositório:', error);
    throw error;
  }
}

/**
 * Gera ID único para operação
 */
function generateOperationId(type: string, nif?: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${type}-${nif || 'unknown'}-${timestamp}-${random}`;
}

// =============================================================================
// API PÚBLICA
// =============================================================================

export const FacturaRepository = {
  /**
   * Salva uma operação de factura registada
   */
  saveFacturaOperation(
    serviceName: 'mock' | 'soap' | 'api' | 'direct',
    request: AGTRegistarFacturaRequest,
    response: AGTRegistarFacturaResponse | any,
    requestID?: string,
  ): StoredFacturaOperation {
    const data = loadData();

    const nif = request.taxRegistrationNumber;
    const documentNo = request.documents?.[0]?.documentNo || 'unknown';
    const operationId = generateOperationId('FT', nif);

    const operation: StoredFacturaOperation = {
      id: operationId,
      type: 'factura',
      serviceName,
      status: response?.returnCode === '0' ? 'registered' : 'error',
      requestID: requestID || response?.requestID,
      request,
      response,
      errors: response?.errors || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        nif,
        documentNo,
        submissionGUID: request.submissionGUID,
      },
    };

    data.facturas.push(operation);
    saveData(data);

    console.log(`✓ Factura salva no repositório: ${operationId}`);
    return operation;
  },

  /**
   * Salva uma operação de série criada
   */
  saveSerieOperation(
    serviceName: 'mock' | 'soap' | 'api' | 'direct',
    request: any,
    response: any,
    requestID?: string,
  ): StoredFacturaOperation {
    const data = loadData();

    const nif = request.taxRegistrationNumber || 'unknown';
    const seriesCode = request.serieCode || 'unknown';
    const operationId = generateOperationId('SR', nif);

    const operation: StoredFacturaOperation = {
      id: operationId,
      type: 'serie',
      serviceName,
      status: response?.returnCode === '0' ? 'registered' : 'error',
      requestID: requestID || response?.requestID,
      request,
      response,
      errors: response?.errors || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        nif,
        documentNo: seriesCode,
      },
    };

    data.series.push(operation);
    saveData(data);

    console.log(`✓ Série salva no repositório: ${operationId}`);
    return operation;
  },

  /**
   * Salva uma operação de validação (confirmar/rejeitar)
   */
  saveValidationOperation(
    serviceName: 'mock' | 'soap' | 'api' | 'direct',
    request: any,
    response: any,
    action: 'C' | 'R',
  ): StoredFacturaOperation {
    const data = loadData();

    const documentNo = request.documentNumber || 'unknown';
    const operationId = generateOperationId('VAL', documentNo);

    const operation: StoredFacturaOperation = {
      id: operationId,
      type: 'validacao',
      serviceName,
      status: response?.actionResultCode?.includes('OK')
        ? 'validated'
        : 'error',
      request: { ...request, action },
      response,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        documentNo,
      },
    };

    data.validations.push(operation);
    saveData(data);

    console.log(
      `✓ Validação salva no repositório (${action === 'C' ? 'Confirmada' : 'Rejeitada'}): ${operationId}`,
    );
    return operation;
  },

  /**
   * Salva uma operação de consulta
   */
  saveConsultationOperation(
    serviceName: 'mock' | 'soap' | 'api' | 'direct',
    request: any,
    response: any,
    operationType: 'obterEstado' | 'listarFacturas' | 'consultarFactura' | 'listarSeries',
  ): StoredFacturaOperation {
    const data = loadData();

    const nif = request.taxRegistrationNumber || 'unknown';
    const operationId = generateOperationId(operationType.substring(0, 3), nif);

    const operation: StoredFacturaOperation = {
      id: operationId,
      type: 'consulta',
      serviceName,
      status: response?.returnCode === '0' ? 'registered' : 'error',
      request,
      response,
      errors: response?.errors || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        nif,
        documentNo: operationType,
      },
    };

    data.consultations.push(operation);
    saveData(data);

    console.log(`✓ Consulta salva no repositório: ${operationId}`);
    return operation;
  },

  /**
   * Obtém factura pelo ID
   */
  getFacturaById(id: string): StoredFacturaOperation | null {
    const data = loadData();
    return data.facturas.find(f => f.id === id) || null;
  },

  /**
   * Obtém factura pelo requestID (para obterEstado)
   */
  getFacturaByRequestId(requestID: string): StoredFacturaOperation | null {
    const data = loadData();
    return data.facturas.find(f => f.requestID === requestID) || null;
  },

  /**
   * Lista todas as facturas
   */
  listAllFacturas(): StoredFacturaOperation[] {
    const data = loadData();
    return data.facturas;
  },

  /**
   * Lista todas as séries
   */
  listAllSeries(): StoredFacturaOperation[] {
    const data = loadData();
    return data.series;
  },

  /**
   * Lista todas as validações
   */
  listAllValidations(): StoredFacturaOperation[] {
    const data = loadData();
    return data.validations;
  },

  /**
   * Lista todas as consultas
   */
  listAllConsultations(): StoredFacturaOperation[] {
    const data = loadData();
    return data.consultations;
  },

  /**
   * Filtra facturas por status
   */
  getFacturasByStatus(
    status: 'pending' | 'registered' | 'validated' | 'rejected' | 'error',
  ): StoredFacturaOperation[] {
    const data = loadData();
    return data.facturas.filter(f => f.status === status);
  },

  /**
   * Filtra facturas por NIF
   */
  getFacturasByNif(nif: string): StoredFacturaOperation[] {
    const data = loadData();
    return data.facturas.filter(f => f.metadata?.nif === nif);
  },

  /**
   * Filtra facturas por serviço
   */
  getFacturasByService(
    serviceName: 'mock' | 'soap' | 'api' | 'direct',
  ): StoredFacturaOperation[] {
    const data = loadData();
    return data.facturas.filter(f => f.serviceName === serviceName);
  },

  /**
   * Filtra facturas por intervalo de datas
   */
  getFacturasByDateRange(
    startDate: Date,
    endDate: Date,
  ): StoredFacturaOperation[] {
    const data = loadData();
    return data.facturas.filter(f => {
      const date = new Date(f.createdAt);
      return date >= startDate && date <= endDate;
    });
  },

  /**
   * Obtém estatísticas gerais
   */
  getStatistics(): {
    totalFacturas: number;
    totalSeries: number;
    totalValidations: number;
    totalConsultations: number;
    byStatus: Record<string, number>;
    byService: Record<string, number>;
  } {
    const data = loadData();

    const byStatus: Record<string, number> = {};
    const byService: Record<string, number> = {};

    data.facturas.forEach(f => {
      byStatus[f.status] = (byStatus[f.status] || 0) + 1;
      byService[f.serviceName] = (byService[f.serviceName] || 0) + 1;
    });

    return {
      totalFacturas: data.facturas.length,
      totalSeries: data.series.length,
      totalValidations: data.validations.length,
      totalConsultations: data.consultations.length,
      byStatus,
      byService,
    };
  },

  /**
   * Limpa todo o repositório (para testes)
   */
  clearAll(): void {
    ensureStorageDir();
    const defaultData = getDefaultData();
    saveData(defaultData);
    console.log('✓ Repositório limpo');
  },

  /**
   * Exporta todos os dados
   */
  exportAll(): FacturaRepositoryData {
    return loadData();
  },

  /**
   * Obtém caminho do arquivo de storage
   */
  getStoragePath(): string {
    return STORAGE_FILE;
  },
};

export default FacturaRepository;
