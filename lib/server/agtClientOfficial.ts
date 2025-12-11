/**
 * =============================================================================
 * CLIENTE AGT - FACTURAÇÃO ELECTRÓNICA
 * =============================================================================
 * 
 * Cliente oficial para comunicação com os serviços REST da AGT Angola.
 * Implementa os 7 serviços definidos no Anexo III das especificações técnicas.
 * 
 * Serviços implementados:
 * 1. registarFactura - Registar facturas electrónicas
 * 2. obterEstado     - Obter estado de validação
 * 3. listarFacturas  - Listar facturas de um período
 * 4. consultarFactura - Consultar factura específica
 * 5. solicitarSerie  - Criar série de numeração
 * 6. listarSeries    - Listar séries existentes
 * 7. validarDocumento - Confirmar/rejeitar documento
 */

import {
  AGTEndpointConfig,
  AGT_ENDPOINTS,
  AGTRegistarFacturaRequest,
  AGTRegistarFacturaResponse,
  AGTObterEstadoRequest,
  AGTObterEstadoResponse,
  AGTListarFacturasRequest,
  AGTDocumentListResult,
  AGTConsultarFacturaRequest,
  AGTConsultarFacturaResult,
  AGTSolicitarSerieRequest,
  AGTSolicitarSerieResponse,
  AGTListarSeriesRequest,
  AGTSeriesListResult,
  AGTValidarDocumentoRequest,
  AGTConfirmRejectResult,
  AGTErrorEntry,
  AGTSoftwareInfo,
} from '../types/agt-official';

// =============================================================================
// CONFIGURAÇÃO
// =============================================================================

/**
 * Configuração padrão para produção (a ser definida pela AGT)
 */
export const AGT_PRODUCTION_CONFIG: AGTEndpointConfig = {
  baseUrl: 'https://api.agt.minfin.gov.ao/facturacao-electronica/v1',
  environment: 'production',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};

/**
 * Configuração para sandbox/testes
 */
export const AGT_SANDBOX_CONFIG: AGTEndpointConfig = {
  baseUrl: 'https://sandbox.agt.minfin.gov.ao/facturacao-electronica/v1',
  environment: 'sandbox',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};

/**
 * Configuração para desenvolvimento local (mock)
 */
export const AGT_MOCK_CONFIG: AGTEndpointConfig = {
  baseUrl: '/api/agt',
  environment: 'mock',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};

// =============================================================================
// CLASSE CLIENTE AGT
// =============================================================================

export class AGTClient {
  private config: AGTEndpointConfig;
  private authToken: string | null = null;

  constructor(config: AGTEndpointConfig = AGT_MOCK_CONFIG) {
    this.config = config;
  }

  /**
   * Define o token de autenticação JWT
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Obtém headers para a requisição
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      ...this.config.headers,
    };
    
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    
    return headers;
  }

  /**
   * Executa uma requisição POST para a AGT
   */
  private async post<TRequest, TResponse>(
    endpoint: string,
    data: TRequest
  ): Promise<TResponse> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseData = await response.json();

      if (!response.ok) {
        // Mapeamento de erros HTTP para estrutura AGT
        if (response.status === 400 || response.status === 422 || response.status === 429) {
          throw new AGTError(
            responseData.errorEntry?.errorDescription || 
            responseData.errorList?.[0]?.descriptionError || 
            'Erro na requisição',
            responseData.errorEntry?.errorCode ||
            responseData.errorList?.[0]?.idError ||
            `HTTP_${response.status}`,
            response.status
          );
        }
        throw new AGTError('Erro de comunicação com AGT', 'NETWORK_ERROR', response.status);
      }

      return responseData as TResponse;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof AGTError) {
        throw error;
      }
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new AGTError('Timeout na comunicação com AGT', 'TIMEOUT_ERROR', 408);
        }
        throw new AGTError(error.message, 'NETWORK_ERROR', 0);
      }
      
      throw new AGTError('Erro desconhecido', 'UNKNOWN_ERROR', 0);
    }
  }

  // ===========================================================================
  // SERVIÇO 1: REGISTAR FACTURA
  // ===========================================================================
  
  /**
   * Registar facturas electrónicas
   * 
   * Serviço destinado à recepção de pedidos de registo de facturas electrónicas,
   * devolvendo em resposta o identificador único do pedido.
   * 
   * @param request - Dados do pedido de registo
   * @returns requestID em caso de sucesso, ou errorList em caso de falha
   */
  async registarFactura(
    request: AGTRegistarFacturaRequest
  ): Promise<AGTRegistarFacturaResponse> {
    return this.post<AGTRegistarFacturaRequest, AGTRegistarFacturaResponse>(
      AGT_ENDPOINTS.registarFactura,
      request
    );
  }

  // ===========================================================================
  // SERVIÇO 2: OBTER ESTADO
  // ===========================================================================
  
  /**
   * Obter estado de validação das facturas
   * 
   * Serviço destinado a obter o estado de validação das facturas
   * previamente transmitidas através do serviço registarFactura.
   * 
   * @param request - Dados do pedido de consulta de estado
   * @returns statusResult com o ponto de situação
   */
  async obterEstado(
    request: AGTObterEstadoRequest
  ): Promise<AGTObterEstadoResponse> {
    return this.post<AGTObterEstadoRequest, AGTObterEstadoResponse>(
      AGT_ENDPOINTS.obterEstado,
      request
    );
  }

  // ===========================================================================
  // SERVIÇO 3: LISTAR FACTURAS
  // ===========================================================================
  
  /**
   * Listar facturas electrónicas
   * 
   * Serviço destinado a obter a lista de facturas registadas
   * em nome do contribuinte durante um determinado período.
   * 
   * @param request - Dados do pedido de listagem
   * @returns documentListResult com as facturas encontradas
   */
  async listarFacturas(
    request: AGTListarFacturasRequest
  ): Promise<AGTDocumentListResult> {
    return this.post<AGTListarFacturasRequest, AGTDocumentListResult>(
      AGT_ENDPOINTS.listarFacturas,
      request
    );
  }

  // ===========================================================================
  // SERVIÇO 4: CONSULTAR FACTURA
  // ===========================================================================
  
  /**
   * Consultar factura electrónica
   * 
   * Serviço destinado a obter os dados detalhados de uma
   * factura electrónica emitida em nome do contribuinte.
   * 
   * @param request - Dados do pedido de consulta
   * @returns Dados completos da factura
   */
  async consultarFactura(
    request: AGTConsultarFacturaRequest
  ): Promise<AGTConsultarFacturaResult> {
    return this.post<AGTConsultarFacturaRequest, AGTConsultarFacturaResult>(
      AGT_ENDPOINTS.consultarFactura,
      request
    );
  }

  // ===========================================================================
  // SERVIÇO 5: SOLICITAR SÉRIE
  // ===========================================================================
  
  /**
   * Solicitar criação de série de numeração
   * 
   * Serviço destinado à criação de séries de numeração
   * de Facturas Electrónicas.
   * 
   * Nota: De 1 de Janeiro até 15 de Dezembro só podem ser criadas
   * séries para o ano actual. Após 15 de Dezembro, também para o ano seguinte.
   * 
   * @param request - Dados da série a criar
   * @returns resultCode (1=sucesso, 0=insucesso)
   */
  async solicitarSerie(
    request: AGTSolicitarSerieRequest
  ): Promise<AGTSolicitarSerieResponse> {
    return this.post<AGTSolicitarSerieRequest, AGTSolicitarSerieResponse>(
      AGT_ENDPOINTS.solicitarSerie,
      request
    );
  }

  // ===========================================================================
  // SERVIÇO 6: LISTAR SÉRIES
  // ===========================================================================
  
  /**
   * Listar séries de numeração
   * 
   * Serviço destinado a obter a lista de séries de numeração
   * registadas em nome do contribuinte.
   * 
   * @param request - Dados do pedido de listagem
   * @returns seriesListResult com as séries encontradas
   */
  async listarSeries(
    request: AGTListarSeriesRequest
  ): Promise<AGTSeriesListResult> {
    return this.post<AGTListarSeriesRequest, AGTSeriesListResult>(
      AGT_ENDPOINTS.listarSeries,
      request
    );
  }

  // ===========================================================================
  // SERVIÇO 7: VALIDAR DOCUMENTO
  // ===========================================================================
  
  /**
   * Validar documento de facturação
   * 
   * Serviço destinado a transmitir a confirmação ou rejeição
   * de uma factura ou documento equivalente em que o solicitante
   * é indicado como adquirente.
   * 
   * O adquirente tem 2 meses para validar documentos em seu nome.
   * 
   * @param request - Dados do pedido de validação
   * @returns Resultado da confirmação/rejeição
   */
  async validarDocumento(
    request: AGTValidarDocumentoRequest
  ): Promise<AGTConfirmRejectResult> {
    return this.post<AGTValidarDocumentoRequest, AGTConfirmRejectResult>(
      AGT_ENDPOINTS.validarDocumento,
      request
    );
  }
}

// =============================================================================
// CLASSE DE ERRO AGT
// =============================================================================

export class AGTError extends Error {
  public readonly code: string;
  public readonly httpStatus: number;
  public readonly timestamp: string;

  constructor(message: string, code: string, httpStatus: number) {
    super(message);
    this.name = 'AGTError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.timestamp = new Date().toISOString();
  }

  toJSON(): AGTErrorEntry {
    return {
      idError: this.code,
      descriptionError: this.message,
    };
  }
}

// =============================================================================
// FUNÇÕES AUXILIARES
// =============================================================================

/**
 * Gera um UUID v4 conforme RFC 4122 para submissionGUID
 */
export function generateSubmissionGUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Gera um submissionId conforme formato AGT (xxxxx-99999999-9999)
 */
export function generateSubmissionId(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const letterPart = Array.from({ length: 5 }, () => 
    letters.charAt(Math.floor(Math.random() * letters.length))
  ).join('');
  
  const numberPart1 = String(Math.floor(Math.random() * 100000000)).padStart(8, '0');
  const numberPart2 = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  
  return `${letterPart}-${numberPart1}-${numberPart2}`;
}

/**
 * Gera timestamp ISO 8601 actual
 */
export function generateTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Valida formato de NIF angolano
 */
export function validateNIF(nif: string): boolean {
  // NIF angolano tem 9 ou 10 dígitos
  const nifClean = nif.replace(/\D/g, '');
  return nifClean.length >= 9 && nifClean.length <= 15;
}

/**
 * Cria informação de software padrão (a ser configurada pelo integrador)
 */
export function createSoftwareInfo(
  productId: string,
  productVersion: string,
  softwareValidationNumber: string,
  jwsSoftwareSignature: string
): AGTSoftwareInfo {
  return {
    softwareInfoDetail: {
      productId,
      productVersion,
      softwareValidationNumber,
    },
    jwsSoftwareSignature,
  };
}

// =============================================================================
// INSTÂNCIA SINGLETON
// =============================================================================

let agtClientInstance: AGTClient | null = null;

/**
 * Obtém instância singleton do cliente AGT
 */
export function getAGTClient(config?: AGTEndpointConfig): AGTClient {
  if (!agtClientInstance || config) {
    agtClientInstance = new AGTClient(config || AGT_MOCK_CONFIG);
  }
  return agtClientInstance;
}

/**
 * Reseta a instância (útil para testes)
 */
export function resetAGTClient(): void {
  agtClientInstance = null;
}

export default AGTClient;
