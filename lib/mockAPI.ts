// Mock API para simular chamadas ao backend AGT

import { v4 as uuidv4 } from 'uuid';
import { Factura, Serie, AuthToken, User, DocumentType, SeriesStatus } from './types';
import { getFacturas, getSeries, addFactura, addSerie, updateFactura } from './storage';

// Delay para simular latência de rede
const DELAY_MS = 800;

function delay(ms: number = DELAY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ==================== AUTENTICAÇÃO ====================

const MOCK_USERS: Record<string, { password: string; user: User }> = {
  '123456789': {
    password: 'admin123',
    user: {
      nif: '123456789',
      name: 'Empresa Demo AGT',
      email: 'admin@empresademo.ao',
      company: 'Empresa Demo Lda',
    },
  },
  '987654321': {
    password: 'senha123',
    user: {
      nif: '987654321',
      name: 'João Silva',
      email: 'joao@example.ao',
      company: 'Silva Comércio',
    },
  },
};

export async function loginAPI(
  nif: string,
  password: string
): Promise<{ success: boolean; data?: AuthToken; error?: string }> {
  await delay();
  
  const mockUser = MOCK_USERS[nif];
  
  if (!mockUser || mockUser.password !== password) {
    return {
      success: false,
      error: 'NIF ou senha incorretos',
    };
  }
  
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 8); // Token válido por 8 horas
  
  const token: AuthToken = {
    token: uuidv4(),
    user: mockUser.user,
    expiresAt: expiresAt.toISOString(),
  };
  
  return {
    success: true,
    data: token,
  };
}

// ==================== SÉRIES ====================

export async function solicitarSerieAPI(data: {
  seriesCode: string;
  seriesYear: number;
  documentType: DocumentType;
  firstDocumentNumber: number;
}): Promise<{ success: boolean; data?: Serie; error?: string }> {
  await delay();
  
  // Validar se série já existe
  const series = getSeries();
  const exists = series.some(
    (s) => s.seriesCode === data.seriesCode && s.seriesYear === data.seriesYear
  );
  
  if (exists) {
    return {
      success: false,
      error: 'Série já existe para este ano',
    };
  }
  
  const novaSerie: Serie = {
    id: uuidv4(),
    seriesCode: data.seriesCode,
    seriesYear: data.seriesYear,
    documentType: data.documentType,
    firstDocumentNumber: data.firstDocumentNumber,
    currentSequence: data.firstDocumentNumber,
    status: 'A', // Aberta
    requestDate: new Date().toISOString(),
  };
  
  addSerie(novaSerie);
  
  return {
    success: true,
    data: novaSerie,
  };
}

export async function listarSeriesAPI(filters?: {
  status?: SeriesStatus;
  documentType?: DocumentType;
  year?: number;
}): Promise<{ success: boolean; data?: Serie[]; total?: number }> {
  await delay(300);
  
  let series = getSeries();
  
  // Aplicar filtros
  if (filters) {
    if (filters.status) {
      series = series.filter((s) => s.status === filters.status);
    }
    if (filters.documentType) {
      series = series.filter((s) => s.documentType === filters.documentType);
    }
    if (filters.year) {
      series = series.filter((s) => s.seriesYear === filters.year);
    }
  }
  
  return {
    success: true,
    data: series,
    total: series.length,
  };
}

// ==================== FACTURAS ====================

export async function registarFacturaAPI(
  factura: Omit<Factura, 'id' | 'createdAt' | 'updatedAt'>
): Promise<{
  success: boolean;
  data?: { requestID: string; status: 'V' | 'I'; messages?: string[] };
  error?: string;
}> {
  await delay(1500); // Simula processamento mais longo
  
  // Validação básica (simula validação do servidor)
  if (!factura.documents || factura.documents.length === 0) {
    return {
      success: false,
      error: 'Nenhum documento foi enviado',
    };
  }
  
  if (factura.documents.length > 30) {
    return {
      success: false,
      error: 'Máximo de 30 documentos por submissão',
    };
  }
  
  // Simula validação aleatória (90% válido, 10% inválido)
  const isValid = Math.random() > 0.1;
  const requestID = uuidv4();
  
  const novaFactura: Factura = {
    ...factura,
    id: uuidv4(),
    requestID,
    validationStatus: isValid ? 'V' : 'I',
    validationMessages: isValid
      ? ['Factura validada com sucesso']
      : ['Erro na validação: NIF do cliente inválido', 'Código CAE não encontrado'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  addFactura(novaFactura);
  
  return {
    success: true,
    data: {
      requestID,
      status: isValid ? 'V' : 'I',
      messages: novaFactura.validationMessages,
    },
  };
}

export async function listarFacturasAPI(filters?: {
  queryStartDate?: string;
  queryEndDate?: string;
  documentType?: DocumentType;
  status?: string;
  searchTerm?: string;
}): Promise<{ success: boolean; data?: Factura[]; total?: number }> {
  await delay(400);
  
  let facturas = getFacturas();
  
  // Aplicar filtros
  if (filters) {
    if (filters.queryStartDate) {
      const startDate = new Date(filters.queryStartDate);
      facturas = facturas.filter((f) => new Date(f.submissionTimeStamp) >= startDate);
    }
    if (filters.queryEndDate) {
      const endDate = new Date(filters.queryEndDate);
      facturas = facturas.filter((f) => new Date(f.submissionTimeStamp) <= endDate);
    }
    if (filters.documentType) {
      facturas = facturas.filter((f) =>
        f.documents.some((d) => d.documentType === filters.documentType)
      );
    }
    if (filters.status) {
      facturas = facturas.filter((f) =>
        f.documents.some((d) => d.documentStatus === filters.status)
      );
    }
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      facturas = facturas.filter(
        (f) =>
          f.documents.some((d) => d.documentNo.toLowerCase().includes(term)) ||
          f.documents.some((d) => d.companyName.toLowerCase().includes(term)) ||
          f.taxRegistrationNumber.includes(term)
      );
    }
  }
  
  // Ordenar por data (mais recentes primeiro)
  facturas.sort((a, b) => {
    const dateA = new Date(a.submissionTimeStamp);
    const dateB = new Date(b.submissionTimeStamp);
    return dateB.getTime() - dateA.getTime();
  });
  
  return {
    success: true,
    data: facturas,
    total: facturas.length,
  };
}

export async function validarDocumentoAPI(
  documentNo: string,
  action: 'C' | 'R', // C=Consultar, R=Registar
  deductibleVATPercentage?: number
): Promise<{
  success: boolean;
  data?: { valid: boolean; details: any };
  error?: string;
}> {
  await delay();
  
  const facturas = getFacturas();
  const factura = facturas.find((f) =>
    f.documents.some((d) => d.documentNo === documentNo)
  );
  
  if (!factura) {
    return {
      success: false,
      error: 'Documento não encontrado',
    };
  }
  
  const document = factura.documents.find((d) => d.documentNo === documentNo);
  
  return {
    success: true,
    data: {
      valid: factura.validationStatus === 'V',
      details: {
        documentNo: document?.documentNo,
        documentDate: document?.documentDate,
        grossTotal: document?.documentTotals.grossTotal,
        taxPayable: document?.documentTotals.taxPayable,
        deductibleVAT: deductibleVATPercentage
          ? (document?.documentTotals.taxPayable || 0) * (deductibleVATPercentage / 100)
          : 0,
      },
    },
  };
}

export async function obterEstadoAPI(
  requestID: string
): Promise<{
  success: boolean;
  data?: { status: 'P' | 'V' | 'I'; messages: string[] }; // P=Pendente, V=Válida, I=Inválida
  error?: string;
}> {
  await delay(600);
  
  const facturas = getFacturas();
  const factura = facturas.find((f) => f.requestID === requestID);
  
  if (!factura) {
    return {
      success: false,
      error: 'Request ID não encontrado',
    };
  }
  
  return {
    success: true,
    data: {
      status: factura.validationStatus || 'P',
      messages: factura.validationMessages || ['Processamento em andamento'],
    },
  };
}

// ==================== HELPERS ====================

export function generateDocumentNo(
  codigoInterno: string,
  seriesCode: string,
  sequencial: number
): string {
  const seq = sequencial.toString().padStart(6, '0');
  return `${codigoInterno}-${seriesCode}/-${seq}`;
}

export function generateJWSSignature(): string {
  // Simula uma assinatura JWS
  return `eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.${uuidv4().replace(/-/g, '')}.${uuidv4().replace(/-/g, '')}`;
}
