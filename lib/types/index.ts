// Tipos base do sistema AGT Angola

export type DocumentType = 
  | 'FT' // Factura
  | 'FR' // Factura Recibo
  | 'FA' // Factura Adiantamento
  | 'NC' // Nota de Crédito
  | 'ND' // Nota de Débito
  | 'AR' // Aviso de Recebimento
  | 'RC' // Recibo
  | 'RG'; // Recibo Global

export type DocumentStatus = 
  | 'N' // Normal
  | 'A' // Anulado
  | 'F' // Facturado
  | 'S'; // Substituição

export type SeriesStatus = 
  | 'A' // Aberta
  | 'U' // Em Uso
  | 'F'; // Fechada

export type TaxType = 
  | 'IVA' // Imposto sobre o Valor Acrescentado
  | 'IS'  // Imposto de Selo
  | 'IEC'; // Imposto Especial de Consumo

export type TaxExemptionCode = 
  | 'I01' // Isenção de IVA - Exportação
  | 'I02' // Isenção de IVA - Imunidade
  | 'I03' // Isenção de IVA - Não sujeição
  | 'I04' // Isenção de IVA - Regime de exclusão
  | 'I05' // Isenção de IVA - Regime de não sujeição
  | 'I06' // Isenção de IVA - Regime de isenção
  | 'I07' // Isenção de IVA - Regime especial
  | 'I08' // Isenção de IVA - Regime transitório
  | 'I09' // Isenção de IVA - Regime de margem
  | 'I10' // Isenção de IVA - Operações triangulares
  | 'I11' // Isenção de IVA - Inversão do sujeito passivo
  | 'I12' // Isenção de IVA - Autoliquidação
  | 'I13' // Isenção de IVA - Regime de caixa
  | 'I14' // Isenção de IVA - Outros
  | 'I15' // Isenção de IVA - Regime especial de bens em segunda mão
  | 'I16'; // Isenção de IVA - Regime especial de agências de viagens

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
}

export interface SoftwareInfo {
  productId: string;
  productVersion: string;
  softwareValidationNumber: string;
  jwsSoftwareSignature: string;
}

export interface TaxLine {
  taxType: TaxType;
  taxCountry: string;
  taxCode: string;
  taxPercentage: number;
  taxBase: number;
  taxAmount: number;
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
  taxPointDate?: string;
  description?: string;
  debitAmount?: number;
  creditAmount?: number;
  tax: TaxLine[];
  taxExemptionReason?: string;
  settlementAmount?: number;
}

export interface DocumentTotals {
  netTotal: number;
  taxPayable: number;
  grossTotal: number;
  currency: string;
  settlementAmount?: number;
  changeAmount?: number;
}

export interface PaymentMethod {
  paymentMechanism: string;
  paymentAmount: number;
  paymentDate: string;
}

export interface PaymentReceipt {
  paymentRefNo?: string;
  paymentDate?: string;
  paymentMethod?: PaymentMethod[];
}

export interface WithholdingTax {
  withholdingTaxType: string;
  withholdingTaxDescription: string;
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
  validationStatus?: 'V' | 'I'; // V=Válida, I=Inválida
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
