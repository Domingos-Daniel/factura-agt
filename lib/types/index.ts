// Tipos base do sistema AGT Angola

export type DocumentType =
  | 'FA' // Factura de Adiantamento
  | 'FT' // Factura
  | 'FR' // Factura/Recibo
  | 'FG' // Factura Global
  | 'AC' // Aviso de Cobrança
  | 'AR' // Aviso de Cobrança/Recibo
  | 'TV' // Talão de Venda
  | 'RC' // Recibo Emitido
  | 'RG' // Outros Recibos Emitidos
  | 'RE' // Estorno ou Recibo de Estorno
  | 'ND' // Nota de Débito
  | 'NC' // Nota de Crédito
  | 'AF' // Factura/Recibo de Autofacturação
  | 'RP' // Prémio ou Recibo de Prémio
  | 'RA' // Resseguro Aceite
  | 'CS' // Imputação a Co-seguradoras
  | 'LD'; // Imputação a Co-seguradora Líder

export type DocumentStatus =
  | 'N' // Normal
  | 'S' // Autofacturação
  | 'A' // Anulado
  | 'R' // Resumo
  | 'C'; // Correcção

export type SeriesStatus = 
  | 'A' // Aberta
  | 'U' // Em Uso
  | 'F'; // Fechada

export type TaxType =
  | 'IVA' // Imposto sobre o Valor Acrescentado
  | 'IS' // Imposto de Selo
  | 'IEC' // Imposto Especial de Consumo
  | 'NS'; // Não sujeito a IVA, IS ou IEC

// Código de motivo de isenção: conforme Tabelas 4/5/6 (ex.: M10.., S01.., I01..)
export type TaxExemptionCode = string;

export interface AppConfig {
  companyName: string
  companyEmail: string
  companyNIF: string
  companyAddress: string
  defaultCurrency: string
  defaultPaymentMechanism: string
  defaultCountry: string
  aiAssistantsEnabled: boolean
  autoSuggestTaxes: boolean
  systemName?: string
  systemSubtitle?: string
}

export interface SoftwareInfo {
  productId: string;
  productVersion: string;
  softwareValidationNumber: string;
  jwsSoftwareSignature: string;
}

export interface TaxLine {
  taxType: TaxType;
  taxCountryRegion: string;
  taxCode: string;
  taxPercentage: number;
  taxBase: number;
  taxAmount: number;
  // Valor calculado de imposto que contribui para o total do documento (arredondado por excesso a 2 casas decimais)
  taxContribution?: number;
  taxExemptionCode?: TaxExemptionCode;
  taxExemptionReason?: string;
}

export interface ProductLine {
  lineNo: number;
  productCode?: string;
  productDescription: string;
  quantity: number;
  unitOfMeasure: string;
  unitPrice: number;
  // Preço unitário deduzido de descontos (sem impostos)
  unitPriceBase?: number;
  taxPointDate?: string;
  description?: string;
  debitAmount?: number;
  creditAmount?: number;
  // Impostos calculados para a linha
  taxes: TaxLine[];
  taxExemptionReason?: string;
  // Valor total de descontos aplicáveis à linha
  settlementAmount?: number;
  // Referência a documento base (ex.: NC)
  referenceInfo?: { reference: string; reason?: string };
}

export interface DocumentTotals {
  netTotal: number;
  taxPayable: number;
  grossTotal: number;
  // Informação de moeda quando diferente de AOA
  currency?: {
    currencyCode: string; // ISO 4217
    currencyAmount: number; // Valor total na moeda estrangeira
    exchangeRate: number; // Taxa de câmbio para AOA
  };
  settlementAmount?: number;
  changeAmount?: number;
}

export interface PaymentMethod {
  paymentMechanism: string;
  paymentAmount: number;
  paymentDate: string;
}

export interface SourceDocumentID {
  OriginatingON: string;
  documentDate: string; // YYYY-MM-DD
}

export interface PaymentSourceDocument {
  lineNo: number;
  sourceDocumentID: SourceDocumentID;
  debitAmount?: number;
  creditAmount?: number;
}

export interface PaymentReceipt {
  // Dados do recibo (AR/RC/RG): documentos de origem regularizados
  sourceDocuments?: PaymentSourceDocument[];
  paymentRefNo?: string;
  paymentDate?: string;
  paymentMethod?: PaymentMethod[];
}

export interface WithholdingTax {
  withholdingTaxType: string;
  withholdingTaxDescription?: string;
  withholdingTaxAmount: number;
}

export interface Document {
  documentNo: string;
  atcud?: string;
  documentStatus: DocumentStatus;
  documentCancelReason?: 'I' | 'N'; // I=Incorreto, N=Não entregue
  rejectedDocumentNo?: string;
  hash?: string;
  hashControl?: string;
  period?: string;
  jwsDocumentSignature: string;
  documentDate: string;
  documentType: DocumentType;
  eacCode: string;
  systemEntryDate: string;
  transactionDate?: string;
  customerCountry: string;
  customerTaxID: string;
  companyName: string;
  companyAddress?: string;
  companyCity?: string;
  companyPostalCode?: string;
  companyCountry?: string;
  billingAddress?: string;
  shipToAddress?: string;
  lines: ProductLine[];
  paymentReceipt?: PaymentReceipt;
  documentTotals: DocumentTotals;
  withholdingTaxList?: WithholdingTax[];
}

export interface Factura {
  id?: string;
  schemaVersion: string;
  submissionGUID: string;
  taxRegistrationNumber: string;
  submissionTimeStamp: string;
  softwareInfo: SoftwareInfo;
  documents: Document[];
  requestID?: string;
  validationStatus?: 'V' | 'I' | 'R' | 'E'; // V=Válida, I=Inválida, R=Rejeitada, E=Com Erros
  validationDate?: string;
  validationResult?: {
    status: 'Validada' | 'Rejeitada' | 'Com Erros';
    qrCode?: string;
    hash?: string;
    certificateNumber?: string;
    errors?: Array<{
      code: string;
      message: string;
      field?: string;
    }>;
  };
  validationMessages?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Serie {
  id: string;
  seriesCode: string;
  seriesYear: number;
  documentType: DocumentType;
  firstDocumentNumber: number;
  lastDocumentNumber?: number;
  currentSequence: number;
  status: SeriesStatus;
  invoicingMethod?: 'FEPC' | 'FESF' | 'SF';
  requestDate: string;
  approvalDate?: string;
  closureDate?: string;
}

export interface User {
  nif: string;
  name: string;
  email?: string;
  company?: string;
}

export interface AuthToken {
  token: string;
  user: User;
  expiresAt: string;
}

export interface CAECode {
  code: string;
  description: string;
  category: string;
}

export interface IECTax {
  productCode: string;
  productDescription: string;
  taxRate: number;
  taxAmount?: number;
}

export interface ISTax {
  verba: string;
  description: string;
  taxRate?: number;
  fixedAmount?: number;
}

export interface IVAExemption {
  code: TaxExemptionCode;
  description: string;
  legalReference: string;
}

// Dashboard metrics
export interface DashboardMetrics {
  totalFacturas: number;
  totalSeries: number;
  facturasThisMonth: number;
  totalRevenue: number;
  facturasPerMonth: { month: string; count: number; revenue: number }[];
}

// Filter types
export interface FacturaFilters {
  queryStartDate?: string;
  queryEndDate?: string;
  documentType?: DocumentType;
  status?: DocumentStatus;
  searchTerm?: string;
}

export interface SerieFilters {
  status?: SeriesStatus;
  documentType?: DocumentType;
  year?: number;
}
