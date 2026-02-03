/**
 * TIPOS TYPESCRIPT PARA API DE FACTURAÇÃO ELECTRÓNICA AGT
 * Baseado na especificação técnica AGT v1.1 (Novembro 2025)
 * 
 * Referência: new-tec-specs.md e decreto.md
 */

/**
 * Informações do Software de Facturação
 */
export interface SoftwareInfoDetail {
  productId: string;              // ID do produto de facturação
  productVersion: string;          // Versão do software
  softwareValidationNumber: string; // Número de validação AGT
}

export interface SoftwareInfo {
  softwareInfoDetail: SoftwareInfoDetail;
  jwsSoftwareSignature: string;    // Assinatura JWS (256 chars) - encriptação com chave privada
}

/**
 * Informação de Referência (para NC/ND)
 * Usado em Notas de Crédito/Débito para referenciar documento original
 */
export interface ReferenceInfo {
  reference: string;               // Número do documento referenciado (ex: FT A/001)
  referenceItemLineNo?: number;    // Número da linha referenciada (opcional)
  reason: string;                  // Motivo da nota (devolução, erro, etc)
}

/**
 * Impostos aplicados à linha
 * Suporta: IVA, IEC (Imposto Especial Consumo), IS (Imposto Selo)
 */
export interface Tax {
  taxType: string;                 // "IVA" | "IEC" | "IS"
  taxCountryRegion: string;        // "AO" para Angola
  taxCode: string;                 // Código específico (ISE - Isento, RED - Reduzido, NOR - Normal)
  taxBase: string;                 // Base de cálculo (valor antes do imposto)
  taxPercentage: string;           // Percentagem (ex: "14.00" para IVA 14%)
  taxAmount: string;               // Valor do imposto calculado
  taxContribution?: string;        // Valor de contribuição adicional (opcional)
  taxExemptionCode?: string;       // Código de isenção (ex: "M01" - Artigo X da Lei Y)
}

/**
 * Linha de Item/Produto no documento
 */
export interface DocumentLine {
  lineNumber: string;              // Número sequencial da linha (1, 2, 3...)
  productCode: string;             // Código do produto/serviço
  productDescription: string;      // Descrição do produto/serviço
  quantity: string;                // Quantidade
  unitOfMeasure: string;           // Unidade de medida (UN, KG, L, M, etc)
  unitPrice: string;               // Preço unitário
  unitPriceBase?: string;          // Preço base antes de descontos (opcional)
  referenceInfo?: ReferenceInfo;   // Referência a documento anterior (NC/ND)
  debitAmount?: string;            // Valor a débito (para ND)
  creditAmount?: string;           // Valor a crédito (para NC)
  taxes: Tax[];                    // Array de impostos aplicados
  settlementAmount: string;        // Valor líquido da linha (após impostos)
}

/**
 * Identificação do Documento Fonte (para Recibos)
 * Referencia faturas pagas por este recibo
 */
export interface SourceDocumentID {
  originatingON: string;           // Número da factura original
  documentDate: string;            // Data da factura original (ISO 8601)
}

export interface SourceDocument {
  lineNo: string;                  // Número da linha no recibo
  sourceDocumentID: SourceDocumentID;
  debitAmount?: string;            // Valor a débito
  creditAmount?: string;           // Valor pago (crédito)
}

/**
 * Informação de Recibo de Pagamento
 * Usado em documentos tipo RC (Recibo) para listar facturas pagas
 */
export interface PaymentReceipt {
  sourceDocuments: SourceDocument[]; // Lista de documentos fontes (facturas pagas)
}

/**
 * Moeda e Taxa de Câmbio
 */
export interface Currency {
  currencyCode: string;            // Código ISO 4217 (USD, EUR, AOA)
  currencyAmount: string;          // Valor na moeda estrangeira
  exchangeRate: string;            // Taxa de câmbio aplicada
}

/**
 * Totais do Documento
 */
export interface DocumentTotals {
  taxPayable: string;              // Total de impostos a pagar
  netTotal: string;                // Total líquido (sem impostos)
  grossTotal: string;              // Total bruto (com impostos)
  currency?: Currency;             // Informação de moeda estrangeira (opcional)
}

/**
 * Imposto Retido na Fonte
 * Ex: Retenção de IVA, IR
 */
export interface WithholdingTax {
  withholdingTaxType: string;      // Tipo de retenção (IVA, IR, etc)
  withholdingTaxDescription: string; // Descrição da retenção
  withholdingTaxAmount: string;    // Valor retido
}

/**
 * DOCUMENTO PRINCIPAL
 * Representa uma Factura, Nota de Crédito, Recibo, etc.
 */
export interface Document {
  documentNo: string;              // Número do documento (ex: "FT A/001")
  documentStatus: string;          // "N" - Normal, "A" - Anulado, "R" - Rejeitado
  documentCancelReason?: string;   // Motivo de anulação (se documentStatus = "A")
  rejectedDocumentNo?: string;     // Número do documento rejeitado (se aplicável)
  jwsDocumentSignature: string;    // Assinatura digital do documento (JWS)
  documentDate: string;            // Data do documento (ISO 8601: YYYY-MM-DD)
  documentType: string;            // "FT" | "FR" | "NC" | "ND" | "RC" | "AC"
  eacCode: string;                 // Código de Atividade Económica (CAE)
  systemEntryDate: string;         // Data/hora de registo no sistema (ISO 8601)
  customerCountry: string;         // País do cliente (ISO 3166: "AO", "PT", "US")
  customerTaxID: string;           // NIF do cliente (ou "999999999" se consumidor final)
  companyName: string;             // Nome/Razão social do cliente
  lines: DocumentLine[];           // Linhas de itens/produtos
  paymentReceipt?: PaymentReceipt; // Informação de pagamento (para RC)
  documentTotals: DocumentTotals;  // Totais do documento
  withholdingTaxList?: WithholdingTax[]; // Retenções na fonte (opcional)
}

/**
 * PAYLOAD COMPLETO - Pedido de Registo de Factura(s)
 * Enviado para endpoint: POST /sigt/fe/v1/registarFactura
 */
export interface RegistarFacturaRequest {
  schemaVersion: string;           // Versão do schema (ex: "1.0")
  submissionGUID: string;          // UUID v4 único por submissão
  taxRegistrationNumber: string;   // NIF do emissor (contribuinte)
  submissionTimeStamp: string;     // Timestamp da submissão (ISO 8601)
  softwareInfo: SoftwareInfo;      // Informação do software certificado
  numberOfEntries: number;         // Número de documentos no array (max 30)
  documents: Document[];           // Array de documentos
}

/**
 * Entrada de Erro na Resposta
 */
export interface ErrorEntry {
  idError: string;                 // Código do erro (ex: "E001", "E002")
  documentNo?: string;             // Número do documento com erro (se aplicável)
  descriptionError: string;        // Descrição do erro
}

/**
 * RESPOSTA DO SERVIÇO - Registo de Factura
 */
export interface RegistarFacturaResponse {
  requestID: string;               // ID único do pedido (para consulta posterior)
  errorList?: ErrorEntry[];        // Lista de erros (se houver)
}

/**
 * TIPOS DE DOCUMENTO AGT
 */
export const DocumentType = {
  FACTURA: 'FT',                   // Factura
  FACTURA_RECIBO: 'FR',            // Factura-Recibo (com pagamento)
  NOTA_CREDITO: 'NC',              // Nota de Crédito (devolução)
  NOTA_DEBITO: 'ND',               // Nota de Débito (acréscimo)
  RECIBO: 'RC',                    // Recibo de Pagamento
  AVISO_COBRANCA: 'AC'             // Aviso de Cobrança
} as const;

/**
 * STATUS DO DOCUMENTO
 */
export const DocumentStatus = {
  NORMAL: 'N',                     // Documento normal/válido
  ANULADO: 'A',                    // Documento anulado
  REJEITADO: 'R'                   // Documento rejeitado pela AGT
} as const;

/**
 * TIPOS DE IMPOSTO
 */
export const TaxType = {
  IVA: 'IVA',                      // Imposto sobre Valor Acrescentado
  IEC: 'IEC',                      // Imposto Especial de Consumo
  IS: 'IS'                         // Imposto de Selo
} as const;

/**
 * CÓDIGOS DE IMPOSTO (IVA)
 */
export const TaxCode = {
  ISENTO: 'ISE',                   // Isento
  REDUZIDO: 'RED',                 // Taxa reduzida
  NORMAL: 'NOR',                   // Taxa normal
  INTERMEDIARIO: 'INT',            // Taxa intermédia
  ZERO: 'OUT'                      // Taxa zero ou outros
} as const;

/**
 * TAXAS DE IVA EM ANGOLA (2025)
 */
export const IVA_RATES = {
  NORMAL: 14.0,                    // 14% - taxa geral
  ZERO: 0.0                        // 0% - exportações, serviços essenciais
} as const;
