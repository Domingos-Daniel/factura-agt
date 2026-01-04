"use strict";
/**
 * =============================================================================
 * TIPOS OFICIAIS DA AGT - FACTURAÇÃO ELECTRÓNICA
 * =============================================================================
 *
 * Baseado no documento oficial:
 * "ESTRUTURA DE DADOS DE SOFTWARE, MODELO DE FACTURAÇÃO ELECTRÓNICA,
 *  ESPECIFICAÇÕES TÉCNICAS E PROCEDIMENTAIS"
 *
 * Departamento de Facturação Electrónica - AGT Angola
 * Agosto 2025 - 67 páginas
 *
 * Decreto Executivo 683/25
 * Decreto Presidencial 71/25
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AGT_ENDPOINTS = exports.AGT_ERROR_CODES = exports.AGT_QR_CODE_SPEC = void 0;
exports.AGT_QR_CODE_SPEC = {
    model: 'Model 2',
    version: 4,
    errorCorrectionLevel: 'M',
    dataMode: 'Byte',
    encoding: 'UTF-8',
    baseUrl: 'https://portaldocontribuinte.minfin.gov.ao/consultar-fe',
    format: 'PNG',
    width: 350,
    height: 350,
    spaceReplacement: '%20',
    logoMaxPercentage: 20,
};
// =============================================================================
// TABELA DE CÓDIGOS DE ERRO
// =============================================================================
exports.AGT_ERROR_CODES = {
    'E94': 'Erro na chamada, NIF diferente',
    'E95': 'Erro na chamada, NIF emissor diferente',
    'E96': 'Solicitação mal efectuada – erro de estrutura',
    'E97': 'Erro na chamada, solicitação prematura',
    'E98': 'Erro na chamada, demasiadas solicitações repetidas',
};
exports.AGT_ENDPOINTS = {
    registarFactura: '/api/facturas/registar',
    obterEstado: '/api/facturas/estado',
    listarFacturas: '/api/facturas/listar',
    consultarFactura: '/api/facturas/consultar',
    solicitarSerie: '/api/series/solicitar',
    listarSeries: '/api/series/listar',
    validarDocumento: '/api/documentos/validar',
};
