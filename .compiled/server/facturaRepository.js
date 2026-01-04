"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FacturaRepository = void 0;
const fs = require("fs");
const path = require("path");
// =============================================================================
// CONFIGURAÇÃO
// =============================================================================
const STORAGE_DIR = path.join(process.cwd(), 'data', 'storage');
const STORAGE_FILE = path.join(STORAGE_DIR, 'facturas.json');
// Garantir que o diretório existe
function ensureStorageDir() {
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
function loadData() {
    ensureStorageDir();
    if (!fs.existsSync(STORAGE_FILE)) {
        return getDefaultData();
    }
    try {
        const rawData = fs.readFileSync(STORAGE_FILE, 'utf-8');
        return JSON.parse(rawData);
    }
    catch (error) {
        console.error('Erro ao carregar repositório:', error);
        return getDefaultData();
    }
}
/**
 * Retorna estrutura padrão vazia
 */
function getDefaultData() {
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
function saveData(data) {
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
    }
    catch (error) {
        console.error('Erro ao salvar repositório:', error);
        throw error;
    }
}
/**
 * Gera ID único para operação
 */
function generateOperationId(type, nif) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${type}-${nif || 'unknown'}-${timestamp}-${random}`;
}
// =============================================================================
// API PÚBLICA
// =============================================================================
exports.FacturaRepository = {
    /**
     * Salva uma operação de factura registada
     */
    saveFacturaOperation(serviceName, request, response, requestID) {
        const data = loadData();
        const nif = request.taxRegistrationNumber;
        const documentNo = request.documents?.[0]?.documentNo || 'unknown';
        const operationId = generateOperationId('FT', nif);
        const operation = {
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
    saveSerieOperation(serviceName, request, response, requestID) {
        const data = loadData();
        const nif = request.taxRegistrationNumber || 'unknown';
        const seriesCode = request.serieCode || 'unknown';
        const operationId = generateOperationId('SR', nif);
        const operation = {
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
    saveValidationOperation(serviceName, request, response, action) {
        const data = loadData();
        const documentNo = request.documentNumber || 'unknown';
        const operationId = generateOperationId('VAL', documentNo);
        const operation = {
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
        console.log(`✓ Validação salva no repositório (${action === 'C' ? 'Confirmada' : 'Rejeitada'}): ${operationId}`);
        return operation;
    },
    /**
     * Salva uma operação de consulta
     */
    saveConsultationOperation(serviceName, request, response, operationType) {
        const data = loadData();
        const nif = request.taxRegistrationNumber || 'unknown';
        const operationId = generateOperationId(operationType.substring(0, 3), nif);
        const operation = {
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
    getFacturaById(id) {
        const data = loadData();
        return data.facturas.find(f => f.id === id) || null;
    },
    /**
     * Lista todas as facturas
     */
    listAllFacturas() {
        const data = loadData();
        return data.facturas;
    },
    /**
     * Lista todas as séries
     */
    listAllSeries() {
        const data = loadData();
        return data.series;
    },
    /**
     * Lista todas as validações
     */
    listAllValidations() {
        const data = loadData();
        return data.validations;
    },
    /**
     * Lista todas as consultas
     */
    listAllConsultations() {
        const data = loadData();
        return data.consultations;
    },
    /**
     * Filtra facturas por status
     */
    getFacturasByStatus(status) {
        const data = loadData();
        return data.facturas.filter(f => f.status === status);
    },
    /**
     * Filtra facturas por NIF
     */
    getFacturasByNif(nif) {
        const data = loadData();
        return data.facturas.filter(f => f.metadata?.nif === nif);
    },
    /**
     * Filtra facturas por serviço
     */
    getFacturasByService(serviceName) {
        const data = loadData();
        return data.facturas.filter(f => f.serviceName === serviceName);
    },
    /**
     * Filtra facturas por intervalo de datas
     */
    getFacturasByDateRange(startDate, endDate) {
        const data = loadData();
        return data.facturas.filter(f => {
            const date = new Date(f.createdAt);
            return date >= startDate && date <= endDate;
        });
    },
    /**
     * Obtém estatísticas gerais
     */
    getStatistics() {
        const data = loadData();
        const byStatus = {};
        const byService = {};
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
    clearAll() {
        ensureStorageDir();
        const defaultData = getDefaultData();
        saveData(defaultData);
        console.log('✓ Repositório limpo');
    },
    /**
     * Exporta todos os dados
     */
    exportAll() {
        return loadData();
    },
    /**
     * Obtém caminho do arquivo de storage
     */
    getStoragePath() {
        return STORAGE_FILE;
    },
};
exports.default = exports.FacturaRepository;
