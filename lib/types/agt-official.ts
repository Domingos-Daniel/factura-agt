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

// =============================================================================
// TIPOS BASE
// =============================================================================

/**
 * Tipos de Documento de Facturação Electrónica
 * Conforme Anexo I da AGT
 */
export type AGTDocumentType =
  | 'FA'  // Factura de Adiantamento
  | 'FT'  // Factura
  | 'FR'  // Factura/Recibo
  | 'FG'  // Factura Global
  | 'AC'  // Aviso de Cobrança
  | 'AR'  // Aviso de Cobrança/Recibo
  | 'TV'  // Talão de Venda
  | 'RC'  // Recibo Emitido
  | 'RG'  // Outros Recibos Emitidos
  | 'RE'  // Estorno ou Recibo de Estorno
  | 'ND'  // Nota de Débito
  | 'NC'  // Nota de Crédito
  | 'AF'  // Factura/Recibo de Autofacturação
  | 'RP'  // Prémio ou Recibo de Prémio
  | 'RA'  // Resseguro Aceite
  | 'CS'  // Imputação a Co-seguradoras
  | 'LD'; // Imputação a Co-seguradora Líder

/**
 * Estado do Documento
 * N - Normal
 * S - Autofacturação
 * A - Anulado
 * R - Documento de resumo
 * C - Correcção de documento rejeitado
 */
export type AGTDocumentStatus = 'N' | 'S' | 'A' | 'R' | 'C';

/**
 * Motivo de Anulação (conforme nºs 8 e 9 do artigo 8º do Decreto Presidencial 71/25)
 * I - Incorrecta identificação do adquirente
 * N - Não foi enviado o documento ao adquirente
 */
export type AGTCancelReason = 'I' | 'N';

/**
 * Sistema de Imposto
 */
export type AGTTaxType = 'IVA' | 'IS' | 'IEC' | 'NS';

/**
 * Código de Imposto IVA
 */
export type AGTIVATaxCode = 'NOR' | 'INT' | 'RED' | 'ISE' | 'OUT';

/**
 * Estado da Série
 * A - Série aberta
 * U - Série em utilização
 * F - Série fechada
 */
export type AGTSeriesStatus = 'A' | 'U' | 'F';

/**
 * Método de Facturação
 * FEPC - Facturação electrónica com emissão no Portal do Contribuinte
 * FESF - Facturação electrónica com emissão via Software de Facturação
 * SF   - Facturação não electrónica via Software de Facturação
 */
export type AGTInvoicingMethod = 'FEPC' | 'FESF' | 'SF';

/**
 * Estado de Validação de Documento
 * V - Factura válida
 * I - Factura inválida
 * P - Factura válida com penalização (mais de 24h de atraso)
 */
export type AGTValidationStatus = 'V' | 'I' | 'P';

/**
 * Tipos de Retenção na Fonte
 */
export type AGTWithholdingTaxType = 
  | 'IRT'   // Imposto Sobre os Rendimentos do Trabalho
  | 'II'    // Imposto Industrial
  | 'IS'    // Imposto de Selo
  | 'IVA'   // Imposto s/ o Valor Acrescentado
  | 'IP'    // Imposto Predial
  | 'IAC'   // Imposto sobre Aplicação de Capitais
  | 'OU'    // Outros
  | 'IRPC'  // Imposto s/ rendimento de pessoas colectivas (futuro)
  | 'IRPS'; // Imposto s/ rendimento de pessoas singulares (futuro)

/**
 * Acção de Validação de Documento
 * C - Confirmação do documento
 * R - Rejeição do documento
 */
export type AGTValidationAction = 'C' | 'R';

/**
 * Código de Resultado da Acção
 */
export type AGTActionResultCode = 'C_OK' | 'R_OK' | 'C_NOK' | 'R_NOK';

/**
 * Código de Estado do Documento
 */
export type AGTDocumentStatusCode = 'S_A' | 'S_C' | 'S_I' | 'S_RG' | 'S_RJ' | 'S_V';

// =============================================================================
// ESTRUTURAS DE DADOS - SERVIÇO REGISTAR FACTURA
// =============================================================================

/**
 * Detalhes do Software de Facturação
 */
export interface AGTSoftwareInfoDetail {
  /** Nome do Software de Facturação */
  productId: string;
  /** Versão do Software de Facturação */
  productVersion: string;
  /** Número de Certificação do Software de Facturação */
  softwareValidationNumber: string;
}

/**
 * Informação do Software de Facturação
 */
export interface AGTSoftwareInfo {
  /** Objecto com os detalhes do Software */
  softwareInfoDetail: AGTSoftwareInfoDetail;
  /** 
   * Assinatura do Software de Facturação
   * Encriptação usando a chave privada do produtor
   * minLength: 256, maxLength: 256
   */
  jwsSoftwareSignature: string;
}

/**
 * Referência a documento base
 */
export interface AGTReferenceInfo {
  /** Referência do documento de facturação origem (minLength: 1, maxLength: 60) */
  reference: string;
  /** Motivo de intervenção no documento origem (maxLength: 60) */
  reason?: string;
}

/**
 * Imposto calculado para uma linha
 */
export interface AGTTaxEntry {
  /** Sistema de imposto: IVA, IS, IEC, NS */
  taxType: AGTTaxType;
  /** Código de País ou Região (ISO 3166-1-alpha-2, ou AO-CAB para Cabinda) */
  taxCountryRegion: string;
  /** Código de imposto (NOR, INT, RED, ISE, OUT para IVA) */
  taxCode?: string;
  /** Valor tributável unitário */
  taxBase?: number;
  /** Taxa em percentagem (ex: 14 = 14%) */
  taxPercentage?: number;
  /** Valor fixo da verba de IS */
  taxAmount?: number;
  /** Valor calculado de imposto (arredondado por excesso, 2 casas decimais) */
  taxContribution?: number;
  /** Código de motivo de isenção (Tabelas 4, 5 ou 6) */
  taxExemptionCode?: string;
}

/**
 * Linha de artigos/serviços do documento
 */
export interface AGTDocumentLine {
  /** Número da linha (minimum: 1) */
  lineNumber: number;
  /** Código do produto ou serviço (minLength: 1, maxLength: 60) */
  productCode: string;
  /** Descrição do produto ou serviço (minLength: 1, maxLength: 200) */
  productDescription: string;
  /** Quantidade (minimum: 0) */
  quantity: number;
  /** Unidade de medida (minLength: 1, maxLength: 20) */
  unitOfMeasure: string;
  /** Preço unitário sem descontos e sem impostos (minimum: 0) */
  unitPrice: number;
  /** Preço unitário deduzido de descontos, sem impostos (minimum: 0) */
  unitPriceBase: number;
  /** Referência para documento base (obrigatório para NC) */
  referenceInfo?: AGTReferenceInfo;
  /** Montante total débito (excluindo impostos) */
  debitAmount?: number;
  /** Montante total crédito (excluindo impostos) */
  creditAmount?: number;
  /** Array de impostos calculados para a linha */
  taxes?: AGTTaxEntry[];
  /** Valor total de descontos */
  settlementAmount: number;
}

/**
 * ID do documento de origem
 */
export interface AGTSourceDocumentID {
  /** Número do documento de facturação regularizado (minLength: 1, maxLength: 60) */
  OriginatingON: string;
  /** Data de emissão do documento (format: date) */
  documentDate: string;
}

/**
 * Linha do recibo
 */
export interface AGTSourceDocument {
  /** Número da linha (minimum: 1) */
  lineNo: number;
  /** Dados do documento de facturação */
  sourceDocumentID: AGTSourceDocumentID;
  /** Valor débito do documento rectificativo */
  debitAmount?: number;
  /** Valor crédito da factura */
  creditAmount?: number;
}

/**
 * Dados do Recibo
 * Obrigatório para: AR, RC, RG
 */
export interface AGTPaymentReceipt {
  /** Dados dos documentos pagos */
  sourceDocuments: AGTSourceDocument[];
}

/**
 * Informação de moeda (quando diferente de AOA)
 */
export interface AGTCurrency {
  /** Código da moeda ISO 4217 (excluindo AOA) */
  currencyCode: string;
  /** Valor total na moeda estrangeira */
  currencyAmount: number;
  /** Taxa de câmbio para AOA */
  exchangeRate: number;
}

/**
 * Totais do documento
 */
export interface AGTDocumentTotals {
  /** Valor total de imposto devido */
  taxPayable: number;
  /** Valor total do documento sem imposto */
  netTotal: number;
  /** Soma de netTotal + taxPayable */
  grossTotal: number;
  /** Moeda (se diferente de AOA) */
  currency?: AGTCurrency;
}

/**
 * Retenção na Fonte
 */
export interface AGTWithholdingTax {
  /** Código de tipo de retenção */
  withholdingTaxType: AGTWithholdingTaxType;
  /** Motivo/disposições legais (maxLength: 120) */
  withholdingTaxDescription?: string;
  /** Valor de retenção na fonte */
  withholdingTaxAmount: number;
}

/**
 * Documento de Facturação Electrónica
 */
export interface AGTDocument {
  /** 
   * Identificação única do documento (SAF-T(AO))
   * Formato: código interno - espaço - série - / - número sequencial
   * minLength: 8, maxLength: 60
   */
  documentNo: string;
  /** Estado actual do documento */
  documentStatus: AGTDocumentStatus;
  /** Motivo de anulação (obrigatório se documentStatus = 'A') */
  documentCancelReason?: AGTCancelReason;
  /** Documento rejeitado que está a ser corrigido (obrigatório se documentStatus = 'C') */
  rejectedDocumentNo?: string;
  /** 
   * Assinatura da factura (minLength: 256, maxLength: 256)
   * Campos assinados: documentNo, taxRegistrationNumber, documentType,
   * documentDate, customerTaxID, customerCountry, companyName, documentTotals
   */
  jwsDocumentSignature: string;
  /** Data de emissão (format: date) */
  documentDate: string;
  /** Tipo de documento */
  documentType: AGTDocumentType;
  /** Código de actividade económica - CAE (Tabela 1) */
  eacCode?: string;
  /** Timestamp de gravação - formato ISO 8601 */
  systemEntryDate: string;
  /** Código país do comprador ISO 3166-1-alpha-2 (AO para Angola) */
  customerCountry: string;
  /** 
   * NIF do cliente (minLength: 1, maxLength: 50)
   * Usar 999999999 para consumidor final sem identificação
   */
  customerTaxID: string;
  /** Nome/denominação do contribuinte (minLength: 1, maxLength: 200) */
  companyName: string;
  /** 
   * Linhas de artigos (não preenchido para AR, RC, RG)
   * Obrigatório para os demais tipos
   */
  lines?: AGTDocumentLine[];
  /** 
   * Dados do recibo (obrigatório para AR, RC, RG)
   */
  paymentReceipt?: AGTPaymentReceipt;
  /** Totais do documento */
  documentTotals: AGTDocumentTotals;
  /** Lista de retenções na fonte */
  withholdingTaxList?: AGTWithholdingTax[];
}

// =============================================================================
// PEDIDO - REGISTAR FACTURA (POST registarFactura)
// =============================================================================

/**
 * Pedido para registar facturas electrónicas
 */
export interface AGTRegistarFacturaRequest {
  /** Versão do schema (ex: "1.0") */
  schemaVersion: string;
  /** 
   * UUID único da solicitação (RFC 4122)
   * Formato: xxxxxxxx-xxxx-Mxxx-Nxxx-xxxxxxxxxxxx
   */
  submissionGUID: string;
  /** NIF do contribuinte emissor (maxLength: 15) */
  taxRegistrationNumber: string;
  /** Timestamp ISO 8601 (ex: "2025-05-27T14:30:00Z") */
  submissionTimeStamp: string;
  /** Informação do software de facturação */
  softwareInfo: AGTSoftwareInfo;
  /** Número de facturas no pedido */
  numberOfEntries: number;
  /** Array de documentos (máximo 30) */
  documents: AGTDocument[];
}

/**
 * Erro retornado pelo serviço
 */
export interface AGTErrorEntry {
  /** Código do erro */
  idError: string;
  /** Descrição do erro */
  descriptionError: string;
  /** Número do documento (se aplicável) */
  documentNo?: string;
}

/**
 * Resposta do serviço registarFactura
 * HTTP 200: requestID (string, maxLength: 15)
 * HTTP 400: errorList (array)
 */
export interface AGTRegistarFacturaResponse {
  /** ID do pedido (em caso de sucesso) */
  requestID?: string;
  /** Lista de erros (em caso de falha) */
  errorList?: AGTErrorEntry[];
}

// =============================================================================
// PEDIDO - OBTER ESTADO (POST obterEstado)
// =============================================================================

/**
 * Pedido para obter estado de validação
 */
export interface AGTObterEstadoRequest {
  /** Versão do schema */
  schemaVersion: string;
  /** ID da solicitação (formato: xxxxx-99999999-9999) */
  submissionId: string;
  /** NIF do contribuinte */
  taxRegistrationNumber: string;
  /** Timestamp ISO 8601 */
  submissionTimeStamp: string;
  /** Informação do software */
  softwareInfo: AGTSoftwareInfo;
  /** Assinatura JWS (campos: taxRegistrationNumber, requestID) */
  jwsSignature: string;
  /** ID do pedido de registo (maxLength: 15) */
  requestID: string;
}

/**
 * Estado de um documento validado
 */
export interface AGTDocumentStatusEntry {
  /** Identificação do documento (minLength: 1, maxLength: 60) */
  documentNo: string;
  /** Estado: V=Válida, I=Inválida, P=Válida com penalização */
  documentStatus: AGTValidationStatus;
  /** Erros encontrados (obrigatório se documentStatus = 'I') */
  errorList?: AGTErrorEntry[];
}

/**
 * Resultado do processamento
 * 0 - Concluído, sem facturas inválidas
 * 1 - Concluído, com facturas válidas e inválidas
 * 2 - Concluído, sem facturas válidas
 * 7 - Não respondida (prematura ou repetitiva)
 * 8 - Em curso
 * 9 - Cancelado
 */
export type AGTResultCode = 0 | 1 | 2 | 7 | 8 | 9;

/**
 * Resultado do estado de validação
 */
export interface AGTStatusResult {
  /** ID do pedido consultado */
  requestID: string;
  /** Resultado do processamento */
  resultCode: AGTResultCode;
  /** Estado de cada documento (obrigatório se resultCode != 7, 8, 9) */
  documentStatusList?: AGTDocumentStatusEntry[];
}

/**
 * Resposta do serviço obterEstado
 */
export interface AGTObterEstadoResponse {
  /** Resultado (HTTP 200) */
  statusResult?: AGTStatusResult;
  /** Erro (HTTP 400, 422, 429) */
  errorEntry?: AGTErrorEntry;
}

// =============================================================================
// PEDIDO - LISTAR FACTURAS (POST listarFacturas)
// =============================================================================

/**
 * Pedido para listar facturas
 */
export interface AGTListarFacturasRequest {
  schemaVersion: string;
  submissionId: string;
  taxRegistrationNumber: string;
  submissionTimeStamp: string;
  softwareInfo: AGTSoftwareInfo;
  /** Assinatura JWS (campos: taxRegistrationNumber, queryStartDate, queryEndDate) */
  jwsSignature: string;
  /** Data inicial (format: date) */
  queryStartDate: string;
  /** Data final (format: date) */
  queryEndDate: string;
}

/**
 * Documento encontrado na lista
 */
export interface AGTDocumentListEntry {
  documentNo: string;
  documentDate: string;
}

/**
 * Resultado da lista de facturas
 */
export interface AGTDocumentListResult {
  documentResultCount: number;
  documentResultList: AGTDocumentListEntry[];
}

// =============================================================================
// PEDIDO - CONSULTAR FACTURA (POST consultarFactura)
// =============================================================================

/**
 * Pedido para consultar factura específica
 */
export interface AGTConsultarFacturaRequest {
  schemaVersion: string;
  submissionId: string;
  taxRegistrationNumber: string;
  submissionTimeStamp: string;
  softwareInfo: AGTSoftwareInfo;
  /** Assinatura JWS (campos: taxRegistrationNumber, documentNo) */
  jwsSignature: string;
  /** Identificador da factura a consultar (maxLength: 60) */
  documentNo: string;
}

/**
 * Resultado da consulta de factura
 */
export interface AGTConsultarFacturaResult {
  documentNo: string;
  /** Estado (obrigatório se não anulada) */
  validationStatus?: 'V' | 'P';
  /** Dados da(s) factura(s) */
  documents: AGTDocument[];
}

// =============================================================================
// PEDIDO - SOLICITAR SÉRIE (POST solicitarSerie)
// =============================================================================

/**
 * Pedido para criar série de numeração
 */
export interface AGTSolicitarSerieRequest {
  schemaVersion: string;
  submissionId: string;
  taxRegistrationNumber: string;
  submissionTimeStamp: string;
  softwareInfo: AGTSoftwareInfo;
  /** 
   * Assinatura JWS (campos: taxRegistrationNumber, seriesCode, 
   * seriesYear, documentType, firstDocumentNumber) 
   */
  jwsSignature: string;
  /** Código da série (deve conter ano 2 ou 4 dígitos) (minLength: 3, maxLength: 60) */
  seriesCode: string;
  /** Ano de emissão */
  seriesYear: number;
  /** Tipo de documento */
  documentType: AGTDocumentType;
  /** Primeiro número de factura (minimum: 1) */
  firstDocumentNumber: number;
}

/**
 * Resposta do serviço solicitarSerie
 * HTTP 200: resultCode (1=sucesso, 0=insucesso)
 * HTTP 400: errorList
 */
export interface AGTSolicitarSerieResponse {
  resultCode?: 0 | 1;
  errorList?: AGTErrorEntry[];
}

// =============================================================================
// PEDIDO - LISTAR SÉRIES (POST listarSeries)
// =============================================================================

/**
 * Pedido para listar séries
 */
export interface AGTListarSeriesRequest {
  schemaVersion: string;
  submissionId: string;
  taxRegistrationNumber: string;
  submissionTimeStamp: string;
  softwareInfo: AGTSoftwareInfo;
  /** Assinatura JWS (campos: taxRegistrationNumber, documentNo) */
  jwsSignature: string;
  /** Filtro: código da série */
  seriesCode?: string;
  /** Filtro: ano */
  seriesYear?: number;
  /** Filtro: tipo de documento */
  documentType?: AGTDocumentType;
  /** Filtro: estado */
  seriesStatus?: AGTSeriesStatus;
}

/**
 * Informação de uma série
 */
export interface AGTSeriesInfo {
  seriesCode?: string;
  seriesYear?: number;
  documentType?: AGTDocumentType;
  seriesStatus?: AGTSeriesStatus;
  /** Data de criação */
  seriesCreationDate: string;
  /** Primeiro documento criado */
  firstDocumentCreated: string;
  /** Último documento criado */
  lastDocumentCreated?: string;
  /** Método de facturação */
  invoicingMethod: AGTInvoicingMethod;
}

/**
 * Resultado da lista de séries
 */
export interface AGTSeriesListResult {
  seriesResultCount: number;
  seriesInfo: AGTSeriesInfo[];
}

// =============================================================================
// PEDIDO - VALIDAR DOCUMENTO (POST validarDocumento)
// =============================================================================

/**
 * Pedido para validar/confirmar/rejeitar documento
 */
export interface AGTValidarDocumentoRequest {
  schemaVersion: string;
  submissionId: string;
  taxRegistrationNumber: string;
  submissionTimeStamp: string;
  softwareInfo: AGTSoftwareInfo;
  /** Assinatura JWS (campos: taxRegistrationNumber, documentNo) */
  jwsSignature: string;
  /** Documento a validar (maxLength: 60) */
  documentNo: string;
  /** Acção: C=Confirmar, R=Rejeitar */
  action: AGTValidationAction;
  /** 
   * Percentagem IVA dedutível (0-100)
   * Usado quando action='C' e não é recibo nem NC
   */
  deductibleVATPercentage?: number;
}

/**
 * Resultado da validação de documento
 */
export interface AGTConfirmRejectResult {
  /** Código de resultado */
  actionResultCode: AGTActionResultCode;
  /** Estado anterior do documento */
  documentStatusCode: AGTDocumentStatusCode;
  /** Erros (se actionResultCode = 'C_NOK' ou 'R_NOK') */
  errorList?: AGTErrorEntry[];
}

// =============================================================================
// ESPECIFICAÇÕES DO QR CODE
// =============================================================================

export interface AGTQRCodeSpec {
  /** QR Code Model 2 */
  model: 'Model 2';
  /** Versão 4 (33 x 33 módulos) */
  version: 4;
  /** Nível de correcção de erros M (15%) */
  errorCorrectionLevel: 'M';
  /** Modo de dados: Byte */
  dataMode: 'Byte';
  /** Codificação UTF-8 */
  encoding: 'UTF-8';
  /** URL base */
  baseUrl: 'https://portaldocontribuinte.minfin.gov.ao/consultar-fe';
  /** Formato PNG 350x350 px */
  format: 'PNG';
  width: 350;
  height: 350;
  /** Substituir espaços por %20 no documentNo */
  spaceReplacement: '%20';
  /** Logotipo AGT pode ocupar < 20% da imagem */
  logoMaxPercentage: 20;
}

export const AGT_QR_CODE_SPEC: AGTQRCodeSpec = {
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

export const AGT_ERROR_CODES: Record<string, string> = {
  'E94': 'Erro na chamada, NIF diferente',
  'E95': 'Erro na chamada, NIF emissor diferente',
  'E96': 'Solicitação mal efectuada – erro de estrutura',
  'E97': 'Erro na chamada, solicitação prematura',
  'E98': 'Erro na chamada, demasiadas solicitações repetidas',
};

// =============================================================================
// CONFIGURAÇÃO DE ENDPOINTS AGT
// =============================================================================

export interface AGTEndpointConfig {
  /** URL base do ambiente */
  baseUrl: string;
  /** Ambiente */
  environment: 'production' | 'sandbox' | 'mock';
  /** Timeout em ms */
  timeout: number;
  /** Headers padrão */
  headers: Record<string, string>;
}

export const AGT_ENDPOINTS = {
  registarFactura: '/api/facturas/registar',
  obterEstado: '/api/facturas/estado',
  listarFacturas: '/api/facturas/listar',
  consultarFactura: '/api/facturas/consultar',
  solicitarSerie: '/api/series/solicitar',
  listarSeries: '/api/series/listar',
  validarDocumento: '/api/documentos/validar',
} as const;

export type AGTEndpoint = keyof typeof AGT_ENDPOINTS;
