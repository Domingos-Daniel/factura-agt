/**
 * =============================================================================
 * SERVIÇO MOCK AGT - SIMULAÇÃO COMPLETA DOS 7 SERVIÇOS
 * =============================================================================
 * 
 * Este módulo implementa uma simulação completa dos serviços da AGT
 * para desenvolvimento e testes locais.
 * 
 * Quando a AGT disponibilizar os endpoints reais, este mock deve ser
 * substituído pela implementação real usando o AGTClient.
 * 
 * Serviços implementados:
 * 1. registarFactura    - Registar facturas electrónicas
 * 2. obterEstado        - Obter estado de validação  
 * 3. listarFacturas     - Listar facturas de um período
 * 4. consultarFactura   - Consultar factura específica
 * 5. solicitarSerie     - Criar série de numeração
 * 6. listarSeries       - Listar séries existentes
 * 7. validarDocumento   - Confirmar/rejeitar documento
 */

import {
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
  AGTDocument,
  AGTSeriesInfo,
  AGTErrorEntry,
  AGTValidationStatus,
  AGT_ERROR_CODES,
} from '../types/agt-official';

import { generateSubmissionId } from './agtClientOfficial';

// =============================================================================
// ARMAZENAMENTO EM MEMÓRIA (PARA MOCK)
// =============================================================================

interface MockStorage {
  facturas: Map<string, {
    request: AGTRegistarFacturaRequest;
    requestID: string;
    status: 'pending' | 'processed';
    validationResults: Map<string, AGTValidationStatus>;
    createdAt: Date;
  }>;
  series: Map<string, AGTSeriesInfo>;
  validations: Map<string, { action: 'C' | 'R'; date: Date }>;
}

const mockStorage: MockStorage = {
  facturas: new Map(),
  series: new Map(),
  validations: new Map(),
};

// =============================================================================
// FUNÇÕES AUXILIARES
// =============================================================================

/**
 * Gera requestID no formato AGT (xxxxx-99999999-9999)
 */
function generateRequestID(): string {
  return generateSubmissionId();
}

/**
 * Simula delay de processamento
 */
async function simulateDelay(ms: number = 100): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Valida estrutura básica do pedido
 */
function validateBasicRequest(request: { 
  schemaVersion: string; 
  taxRegistrationNumber: string;
  submissionTimeStamp: string;
  softwareInfo: { softwareInfoDetail: { productId: string } };
}): AGTErrorEntry | null {
  if (!request.schemaVersion) {
    return { idError: 'E001', descriptionError: 'schemaVersion é obrigatório' };
  }
  if (!request.taxRegistrationNumber) {
    return { idError: 'E002', descriptionError: 'taxRegistrationNumber é obrigatório' };
  }
  if (!request.submissionTimeStamp) {
    return { idError: 'E003', descriptionError: 'submissionTimeStamp é obrigatório' };
  }
  if (!request.softwareInfo?.softwareInfoDetail?.productId) {
    return { idError: 'E004', descriptionError: 'softwareInfo é obrigatório' };
  }
  return null;
}

/**
 * Valida documento de facturação
 */
function validateDocument(doc: AGTDocument, index: number): AGTErrorEntry[] {
  const errors: AGTErrorEntry[] = [];
  const receiptTypes = ['AR', 'RC', 'RG'];
  
  // Validações básicas
  if (!doc.documentNo || doc.documentNo.length < 8) {
    errors.push({
      idError: 'E010',
      descriptionError: 'documentNo inválido (mínimo 8 caracteres)',
      documentNo: doc.documentNo || `doc_${index}`,
    });
  }
  
  if (!doc.documentType) {
    errors.push({
      idError: 'E011',
      descriptionError: 'documentType é obrigatório',
      documentNo: doc.documentNo,
    });
  }
  
  if (!doc.documentDate) {
    errors.push({
      idError: 'E012',
      descriptionError: 'documentDate é obrigatório',
      documentNo: doc.documentNo,
    });
  }
  
  if (!doc.customerTaxID) {
    errors.push({
      idError: 'E013',
      descriptionError: 'customerTaxID é obrigatório',
      documentNo: doc.documentNo,
    });
  }
  
  if (!doc.companyName) {
    errors.push({
      idError: 'E014',
      descriptionError: 'companyName é obrigatório',
      documentNo: doc.documentNo,
    });
  }
  
  // Validação de recibos
  if (receiptTypes.includes(doc.documentType)) {
    if (!doc.paymentReceipt?.sourceDocuments?.length) {
      errors.push({
        idError: 'E020',
        descriptionError: 'Recibos (AR/RC/RG) requerem paymentReceipt com sourceDocuments',
        documentNo: doc.documentNo,
      });
    }
    if (doc.lines && doc.lines.length > 0) {
      errors.push({
        idError: 'E021',
        descriptionError: 'Recibos (AR/RC/RG) não devem ter linhas',
        documentNo: doc.documentNo,
      });
    }
  } else {
    // Não-recibos requerem linhas
    if (!doc.lines || doc.lines.length === 0) {
      errors.push({
        idError: 'E022',
        descriptionError: `Documento ${doc.documentType} requer pelo menos uma linha`,
        documentNo: doc.documentNo,
      });
    }
  }
  
  // Validação de NC
  if (doc.documentType === 'NC') {
    const hasReference = doc.lines?.some(l => l.referenceInfo?.reference);
    if (!hasReference) {
      errors.push({
        idError: 'E023',
        descriptionError: 'Nota de Crédito requer referenceInfo nas linhas',
        documentNo: doc.documentNo,
      });
    }
  }
  
  // Validação de anulação
  if (doc.documentStatus === 'A' && !doc.documentCancelReason) {
    errors.push({
      idError: 'E024',
      descriptionError: 'Documento anulado requer documentCancelReason',
      documentNo: doc.documentNo,
    });
  }
  
  // Validação de correcção
  if (doc.documentStatus === 'C' && !doc.rejectedDocumentNo) {
    errors.push({
      idError: 'E025',
      descriptionError: 'Documento de correcção requer rejectedDocumentNo',
      documentNo: doc.documentNo,
    });
  }
  
  // Validação de totais
  if (!doc.documentTotals) {
    errors.push({
      idError: 'E030',
      descriptionError: 'documentTotals é obrigatório',
      documentNo: doc.documentNo,
    });
  } else {
    const { netTotal, taxPayable, grossTotal } = doc.documentTotals;
    const calculatedGross = netTotal + taxPayable;
    if (Math.abs(calculatedGross - grossTotal) > 0.01) {
      errors.push({
        idError: 'E031',
        descriptionError: `grossTotal (${grossTotal}) difere de netTotal + taxPayable (${calculatedGross})`,
        documentNo: doc.documentNo,
      });
    }
  }
  
  // Validação de linhas
  for (const line of doc.lines || []) {
    if (line.quantity <= 0) {
      errors.push({
        idError: 'E040',
        descriptionError: `Quantidade inválida na linha ${line.lineNumber}`,
        documentNo: doc.documentNo,
      });
    }
    if (line.unitPrice < 0) {
      errors.push({
        idError: 'E041',
        descriptionError: `Preço unitário negativo na linha ${line.lineNumber}`,
        documentNo: doc.documentNo,
      });
    }
    if (line.settlementAmount < 0) {
      errors.push({
        idError: 'E042',
        descriptionError: `Desconto negativo na linha ${line.lineNumber}`,
        documentNo: doc.documentNo,
      });
    }
  }
  
  return errors;
}

// =============================================================================
// SERVIÇO 1: REGISTAR FACTURA
// =============================================================================

export async function mockRegistarFactura(
  request: AGTRegistarFacturaRequest
): Promise<{ response: AGTRegistarFacturaResponse; httpStatus: number }> {
  await simulateDelay();
  
  // Validação básica
  const basicError = validateBasicRequest(request);
  if (basicError) {
    return {
      response: { errorList: [basicError] },
      httpStatus: 400,
    };
  }
  
  // Validação do número de documentos
  if (!request.documents || request.documents.length === 0) {
    return {
      response: { 
        errorList: [{ 
          idError: 'E005', 
          descriptionError: 'documents array é obrigatório e não pode estar vazio' 
        }] 
      },
      httpStatus: 400,
    };
  }
  
  if (request.documents.length > 30) {
    return {
      response: { 
        errorList: [{ 
          idError: 'E006', 
          descriptionError: 'Máximo de 30 documentos por pedido' 
        }] 
      },
      httpStatus: 400,
    };
  }
  
  if (request.numberOfEntries !== request.documents.length) {
    return {
      response: { 
        errorList: [{ 
          idError: 'E007', 
          descriptionError: 'numberOfEntries não corresponde ao número de documentos' 
        }] 
      },
      httpStatus: 400,
    };
  }
  
  // Validação de cada documento
  const allErrors: AGTErrorEntry[] = [];
  for (let i = 0; i < request.documents.length; i++) {
    const docErrors = validateDocument(request.documents[i], i);
    allErrors.push(...docErrors);
  }
  
  if (allErrors.length > 0) {
    return {
      response: { errorList: allErrors },
      httpStatus: 400,
    };
  }
  
  // Sucesso - registar pedido
  const requestID = generateRequestID();
  
  mockStorage.facturas.set(requestID, {
    request,
    requestID,
    status: 'pending',
    validationResults: new Map(),
    createdAt: new Date(),
  });
  
  // Simular processamento assíncrono (validação diferida)
  setTimeout(() => {
    const stored = mockStorage.facturas.get(requestID);
    if (stored) {
      stored.status = 'processed';
      // Simular validação de cada documento (90% válidos, 10% com penalização)
      for (const doc of request.documents) {
        const random = Math.random();
        let status: AGTValidationStatus = 'V';
        if (random > 0.9) {
          status = 'P'; // Penalização (mais de 24h de atraso)
        }
        stored.validationResults.set(doc.documentNo, status);
      }
    }
  }, 2000); // Simular 2 segundos de processamento
  
  return {
    response: { requestID },
    httpStatus: 200,
  };
}

// =============================================================================
// SERVIÇO 2: OBTER ESTADO
// =============================================================================

export async function mockObterEstado(
  request: AGTObterEstadoRequest
): Promise<{ response: AGTObterEstadoResponse; httpStatus: number }> {
  await simulateDelay();
  
  // Validação básica
  const basicError = validateBasicRequest(request);
  if (basicError) {
    return {
      response: { errorEntry: basicError },
      httpStatus: 400,
    };
  }
  
  if (!request.requestID) {
    return {
      response: { 
        errorEntry: { 
          idError: 'E050', 
          descriptionError: 'requestID é obrigatório' 
        } 
      },
      httpStatus: 400,
    };
  }
  
  // Verificar se o pedido existe
  const stored = mockStorage.facturas.get(request.requestID);
  if (!stored) {
    return {
      response: { 
        errorEntry: { 
          idError: 'E051', 
          descriptionError: 'requestID não encontrado' 
        } 
      },
      httpStatus: 422,
    };
  }
  
  // Verificar NIF
  if (stored.request.taxRegistrationNumber !== request.taxRegistrationNumber) {
    return {
      response: { 
        errorEntry: { 
          idError: 'E95', 
          descriptionError: AGT_ERROR_CODES['E95'] 
        } 
      },
      httpStatus: 422,
    };
  }
  
  // Verificar se ainda está em processamento
  if (stored.status === 'pending') {
    return {
      response: {
        statusResult: {
          requestID: request.requestID,
          resultCode: 8, // Em curso
        },
      },
      httpStatus: 200,
    };
  }
  
  // Retornar resultados
  const documentStatusList = Array.from(stored.validationResults.entries()).map(
    ([documentNo, status]) => ({
      documentNo,
      documentStatus: status,
    })
  );
  
  const hasInvalid = documentStatusList.some(d => d.documentStatus === 'I');
  const hasValid = documentStatusList.some(d => d.documentStatus === 'V' || d.documentStatus === 'P');
  
  let resultCode: 0 | 1 | 2;
  if (!hasInvalid) {
    resultCode = 0; // Sem facturas inválidas
  } else if (hasValid) {
    resultCode = 1; // Com válidas e inválidas
  } else {
    resultCode = 2; // Sem facturas válidas
  }
  
  return {
    response: {
      statusResult: {
        requestID: request.requestID,
        resultCode,
        documentStatusList,
      },
    },
    httpStatus: 200,
  };
}

// =============================================================================
// SERVIÇO 3: LISTAR FACTURAS
// =============================================================================

export async function mockListarFacturas(
  request: AGTListarFacturasRequest
): Promise<{ response: AGTDocumentListResult; httpStatus: number }> {
  await simulateDelay();
  
  // Validação básica
  const basicError = validateBasicRequest(request);
  if (basicError) {
    return {
      response: { documentResultCount: 0, documentResultList: [] },
      httpStatus: 400,
    };
  }
  
  // Filtrar facturas pelo período e NIF
  const startDate = new Date(request.queryStartDate);
  const endDate = new Date(request.queryEndDate);
  
  const documentResultList: { documentNo: string; documentDate: string }[] = [];
  
  // Usar forEach em vez de for...of para compatibilidade
  mockStorage.facturas.forEach((stored) => {
    if (stored.request.taxRegistrationNumber !== request.taxRegistrationNumber) {
      return;
    }
    
    for (const doc of stored.request.documents) {
      const docDate = new Date(doc.documentDate);
      if (docDate >= startDate && docDate <= endDate) {
        documentResultList.push({
          documentNo: doc.documentNo,
          documentDate: doc.documentDate,
        });
      }
    }
  });
  
  return {
    response: {
      documentResultCount: documentResultList.length,
      documentResultList,
    },
    httpStatus: 200,
  };
}

// =============================================================================
// SERVIÇO 4: CONSULTAR FACTURA
// =============================================================================

export async function mockConsultarFactura(
  request: AGTConsultarFacturaRequest
): Promise<{ response: AGTConsultarFacturaResult | { errorEntry: AGTErrorEntry }; httpStatus: number }> {
  await simulateDelay();
  
  // Validação básica
  const basicError = validateBasicRequest(request);
  if (basicError) {
    return {
      response: { errorEntry: basicError },
      httpStatus: 400,
    };
  }
  
  if (!request.documentNo) {
    return {
      response: { 
        errorEntry: { 
          idError: 'E060', 
          descriptionError: 'documentNo é obrigatório' 
        } 
      },
      httpStatus: 400,
    };
  }
  
  // Procurar documento
  let foundResponse: { response: any; httpStatus: number } | null = null;
  
  mockStorage.facturas.forEach((stored) => {
    if (foundResponse) return;
    if (stored.request.taxRegistrationNumber !== request.taxRegistrationNumber) {
      return;
    }
    
    const doc = stored.request.documents.find((d: any) => d.documentNo === request.documentNo);
    if (doc) {
      const validationStatus = stored.validationResults.get(doc.documentNo);
      
      foundResponse = {
        response: {
          documentNo: doc.documentNo,
          validationStatus: validationStatus === 'I' ? undefined : (validationStatus || 'V'),
          documents: [doc],
        },
        httpStatus: 200,
      };
    }
  });
  
  if (foundResponse) {
    return foundResponse;
  }
  
  return {
    response: { 
      errorEntry: { 
        idError: 'E061', 
        descriptionError: 'Documento não encontrado' 
      } 
    },
    httpStatus: 422,
  };
}

// =============================================================================
// SERVIÇO 5: SOLICITAR SÉRIE
// =============================================================================

export async function mockSolicitarSerie(
  request: AGTSolicitarSerieRequest
): Promise<{ response: AGTSolicitarSerieResponse; httpStatus: number }> {
  await simulateDelay();
  
  // Validação básica
  const basicError = validateBasicRequest(request);
  if (basicError) {
    return {
      response: { errorList: [basicError] },
      httpStatus: 400,
    };
  }
  
  // Validações específicas
  const errors: AGTErrorEntry[] = [];
  
  if (!request.seriesCode || request.seriesCode.length < 3) {
    errors.push({
      idError: 'E070',
      descriptionError: 'seriesCode deve ter no mínimo 3 caracteres',
    });
  }
  
  // Verificar se contém ano
  const yearMatch = request.seriesCode.match(/\d{2,4}/);
  if (!yearMatch) {
    errors.push({
      idError: 'E071',
      descriptionError: 'seriesCode deve conter o ano (2 ou 4 dígitos)',
    });
  }
  
  if (!request.seriesYear) {
    errors.push({
      idError: 'E072',
      descriptionError: 'seriesYear é obrigatório',
    });
  }
  
  // Validar ano (só pode criar para ano actual ou seguinte após 15/12)
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const currentDay = new Date().getDate();
  
  if (request.seriesYear < currentYear) {
    errors.push({
      idError: 'E073',
      descriptionError: 'Não é possível criar séries para anos anteriores',
    });
  }
  
  if (request.seriesYear > currentYear + 1) {
    errors.push({
      idError: 'E074',
      descriptionError: 'Não é possível criar séries para mais de um ano no futuro',
    });
  }
  
  if (request.seriesYear === currentYear + 1 && (currentMonth < 12 || currentDay < 15)) {
    errors.push({
      idError: 'E075',
      descriptionError: 'Séries para o ano seguinte só podem ser criadas após 15 de Dezembro',
    });
  }
  
  if (!request.documentType) {
    errors.push({
      idError: 'E076',
      descriptionError: 'documentType é obrigatório',
    });
  }
  
  if (!request.firstDocumentNumber || request.firstDocumentNumber < 1) {
    errors.push({
      idError: 'E077',
      descriptionError: 'firstDocumentNumber deve ser >= 1',
    });
  }
  
  // Verificar duplicidade
  const seriesKey = `${request.taxRegistrationNumber}-${request.seriesCode}-${request.documentType}`;
  if (mockStorage.series.has(seriesKey)) {
    errors.push({
      idError: 'E078',
      descriptionError: 'Série já existe para este NIF, código e tipo de documento',
    });
  }
  
  if (errors.length > 0) {
    return {
      response: { resultCode: 0, errorList: errors },
      httpStatus: 400,
    };
  }
  
  // Criar série
  const seriesInfo: AGTSeriesInfo = {
    seriesCode: request.seriesCode,
    seriesYear: request.seriesYear,
    documentType: request.documentType,
    seriesStatus: 'A',
    seriesCreationDate: new Date().toISOString().split('T')[0],
    firstDocumentCreated: String(request.firstDocumentNumber),
    invoicingMethod: 'FESF',
  };
  
  mockStorage.series.set(seriesKey, seriesInfo);
  
  return {
    response: { resultCode: 1 },
    httpStatus: 200,
  };
}

// =============================================================================
// SERVIÇO 6: LISTAR SÉRIES
// =============================================================================

export async function mockListarSeries(
  request: AGTListarSeriesRequest
): Promise<{ response: AGTSeriesListResult; httpStatus: number }> {
  await simulateDelay();
  
  // Validação básica
  const basicError = validateBasicRequest(request);
  if (basicError) {
    return {
      response: { seriesResultCount: 0, seriesInfo: [] },
      httpStatus: 400,
    };
  }
  
  // Filtrar séries
  const seriesInfo: AGTSeriesInfo[] = [];
  
  mockStorage.series.forEach((series, key) => {
    if (!key.startsWith(request.taxRegistrationNumber)) {
      return;
    }
    
    // Aplicar filtros
    if (request.seriesCode && series.seriesCode !== request.seriesCode) {
      return;
    }
    if (request.seriesYear && series.seriesYear !== request.seriesYear) {
      return;
    }
    if (request.documentType && series.documentType !== request.documentType) {
      return;
    }
    if (request.seriesStatus && series.seriesStatus !== request.seriesStatus) {
      return;
    }
    
    seriesInfo.push(series);
  });
  
  return {
    response: {
      seriesResultCount: seriesInfo.length,
      seriesInfo,
    },
    httpStatus: 200,
  };
}

// =============================================================================
// SERVIÇO 7: VALIDAR DOCUMENTO
// =============================================================================

export async function mockValidarDocumento(
  request: AGTValidarDocumentoRequest
): Promise<{ response: AGTConfirmRejectResult | { errorEntry: AGTErrorEntry }; httpStatus: number }> {
  await simulateDelay();
  
  // Validação básica
  const basicError = validateBasicRequest(request);
  if (basicError) {
    return {
      response: { errorEntry: basicError },
      httpStatus: 400,
    };
  }
  
  if (!request.documentNo) {
    return {
      response: { 
        errorEntry: { 
          idError: 'E080', 
          descriptionError: 'documentNo é obrigatório' 
        } 
      },
      httpStatus: 400,
    };
  }
  
  if (!request.action || !['C', 'R'].includes(request.action)) {
    return {
      response: { 
        errorEntry: { 
          idError: 'E081', 
          descriptionError: 'action deve ser C (confirmar) ou R (rejeitar)' 
        } 
      },
      httpStatus: 400,
    };
  }
  
  // Verificar se documento existe e pertence ao adquirente
  let documentFound = false;
  let currentStatus: string = 'S_RG';
  
  mockStorage.facturas.forEach((stored) => {
    if (documentFound) return;
    const doc = stored.request.documents.find((d: any) => d.documentNo === request.documentNo);
    if (doc && doc.customerTaxID === request.taxRegistrationNumber) {
      documentFound = true;
      const validationStatus = stored.validationResults.get(doc.documentNo);
      if (validationStatus === 'V') currentStatus = 'S_V';
      else if (validationStatus === 'I') currentStatus = 'S_I';
    }
  });
  
  if (!documentFound) {
    return {
      response: {
        actionResultCode: request.action === 'C' ? 'C_NOK' : 'R_NOK',
        documentStatusCode: 'S_RG',
        errorList: [{
          idError: 'E082',
          descriptionError: 'Documento não encontrado ou não pertence ao adquirente',
        }],
      },
      httpStatus: 200,
    };
  }
  
  // Verificar se já foi validado
  const existingValidation = mockStorage.validations.get(request.documentNo);
  if (existingValidation) {
    return {
      response: {
        actionResultCode: request.action === 'C' ? 'C_NOK' : 'R_NOK',
        documentStatusCode: existingValidation.action === 'C' ? 'S_C' : 'S_RJ',
        errorList: [{
          idError: 'E083',
          descriptionError: `Documento já foi ${existingValidation.action === 'C' ? 'confirmado' : 'rejeitado'}`,
        }],
      },
      httpStatus: 200,
    };
  }
  
  // Registar validação
  mockStorage.validations.set(request.documentNo, {
    action: request.action,
    date: new Date(),
  });
  
  return {
    response: {
      actionResultCode: request.action === 'C' ? 'C_OK' : 'R_OK',
      documentStatusCode: currentStatus as any,
    },
    httpStatus: 200,
  };
}

// =============================================================================
// EXPORTAÇÕES
// =============================================================================

export const AGTMockService = {
  registarFactura: mockRegistarFactura,
  obterEstado: mockObterEstado,
  listarFacturas: mockListarFacturas,
  consultarFactura: mockConsultarFactura,
  solicitarSerie: mockSolicitarSerie,
  listarSeries: mockListarSeries,
  validarDocumento: mockValidarDocumento,
  
  // Utilidades
  storage: mockStorage,
  clearStorage: () => {
    mockStorage.facturas.clear();
    mockStorage.series.clear();
    mockStorage.validations.clear();
  },
};

export default AGTMockService;
