import { z } from 'zod';

export const taxTypeEnum = z.enum(['IVA', 'IS', 'IEC', 'NS']);
export const documentStatusEnum = z.enum(['N', 'S', 'A', 'R', 'C']);
export const documentTypeEnum = z.enum([
  'FA','FT','FR','FG','AC','AR','TV','RC','RG','RE','ND','NC','AF','RP','RA','CS','LD'
]);
export const taxExemptionCodeEnum = z.enum([
  'I01', 'I02', 'I03', 'I04', 'I05', 'I06', 'I07', 'I08',
  'I09', 'I10', 'I11', 'I12', 'I13', 'I14', 'I15', 'I16'
]);

export const softwareInfoSchema = z.object({
  productId: z.string().min(1),
  productVersion: z.string().min(1),
  softwareValidationNumber: z.string().min(1),
  jwsSoftwareSignature: z.string().min(1),
});

export const taxLineSchema = z.object({
  taxType: taxTypeEnum,
  taxCountryRegion: z.string().min(2).max(10),
  taxCode: z.string().min(1),
  taxPercentage: z.number().min(0).max(100),
  taxBase: z.number().min(0),
  taxAmount: z.number().min(0),
  taxContribution: z.number().min(0).optional(),
  taxExemptionCode: taxExemptionCodeEnum.optional(),
  taxExemptionReason: z.string().optional(),
}).superRefine((t, ctx) => {
  // ISE/NS require exemption code
  if ((t.taxCode === 'ISE' || t.taxType === 'NS') && !t.taxExemptionCode) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Código de isenção é obrigatório para ISE/NS' })
  }
});

export const productLineSchema = z.object({
  lineNo: z.number().int().min(1),
  productCode: z.string().optional(),
  productDescription: z.string().min(1, 'Descrição do produto é obrigatória'),
  quantity: z.number().min(0.01, 'Quantidade deve ser maior que zero'),
  unitOfMeasure: z.string().min(1, 'Unidade de medida é obrigatória'),
  unitPrice: z.number().min(0, 'Preço unitário deve ser positivo'),
  unitPriceBase: z.number().min(0).optional(),
  taxPointDate: z.string().optional(),
  description: z.string().optional(),
  debitAmount: z.number().optional(),
  creditAmount: z.number().optional(),
  taxes: z.array(taxLineSchema).min(1, 'Pelo menos um imposto é obrigatório'),
  taxExemptionReason: z.string().optional(),
  settlementAmount: z.number().optional(),
  referenceInfo: z.object({ reference: z.string().min(1), reason: z.string().optional() }).optional(),
});

export const documentTotalsSchema = z.object({
  netTotal: z.number().min(0),
  taxPayable: z.number().min(0),
  grossTotal: z.number().min(0),
  currency: z.object({
    currencyCode: z.string().length(3),
    currencyAmount: z.number().min(0),
    exchangeRate: z.number().min(0.000001),
  }).optional(),
  settlementAmount: z.number().optional(),
  changeAmount: z.number().optional(),
});

export const paymentMethodSchema = z.object({
  paymentMechanism: z.string().min(1),
  paymentAmount: z.number().min(0),
  paymentDate: z.string(),
});

export const sourceDocumentIDSchema = z.object({
  OriginatingON: z.string().min(1),
  documentDate: z.string(), // YYYY-MM-DD
});

export const paymentSourceDocumentSchema = z.object({
  lineNo: z.number().int().min(1),
  sourceDocumentID: sourceDocumentIDSchema,
  debitAmount: z.number().min(0).optional(),
  creditAmount: z.number().min(0).optional(),
});

export const paymentReceiptSchema = z.object({
  sourceDocuments: z.array(paymentSourceDocumentSchema).optional(),
  paymentRefNo: z.string().optional(),
  paymentDate: z.string().optional(),
  paymentMethod: z.array(paymentMethodSchema).optional(),
});

export const withholdingTaxSchema = z.object({
  withholdingTaxType: z.string().min(1),
  withholdingTaxDescription: z.string().min(1).optional(),
  withholdingTaxAmount: z.number().min(0),
});

export const documentSchema = z.object({
  documentNo: z.string().min(8, 'Número do documento deve ter no mínimo 8 caracteres'),
  atcud: z.string().optional(),
  documentStatus: documentStatusEnum,
  documentCancelReason: z.enum(['I', 'N']).optional(),
  rejectedDocumentNo: z.string().optional(),
  hash: z.string().optional(),
  hashControl: z.string().optional(),
  period: z.string().optional(),
  jwsDocumentSignature: z.string().min(1),
  documentDate: z.string(),
  documentType: documentTypeEnum,
  eacCode: z.string().min(1, 'Código CAE é obrigatório'),
  systemEntryDate: z.string(),
  transactionDate: z.string().optional(),
  customerCountry: z.string().length(2).default('AO'),
  customerTaxID: z.string()
    .min(9, 'NIF do cliente deve ter no mínimo 9 dígitos')
    .max(15, 'NIF do cliente deve ter no máximo 15 dígitos'),
  companyName: z.string().min(1, 'Nome da empresa é obrigatório'),
  companyAddress: z.string().optional(),
  companyCity: z.string().optional(),
  companyPostalCode: z.string().optional(),
  companyCountry: z.string().optional(),
  billingAddress: z.string().optional(),
  shipToAddress: z.string().optional(),
  lines: z.array(productLineSchema)
    .max(1000, 'Máximo de 1000 linhas por documento')
    .optional(),
  paymentReceipt: paymentReceiptSchema.optional(),
  documentTotals: documentTotalsSchema,
  withholdingTaxList: z.array(withholdingTaxSchema).optional(),
}).superRefine((d, ctx) => {
  // AR/RC/RG são recibos e podem não ter lines, mas devem ter paymentReceipt
  const receiptTypes = ['AR','RC','RG'] as const
  if (receiptTypes.includes(d.documentType as any)) {
    if (!d.paymentReceipt) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Recibos (AR/RC/RG) requerem paymentReceipt' })
    }
    // Recibos não devem ter lines
    if (d.lines && d.lines.length > 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Recibos (AR/RC/RG) não devem ter linhas de produto' })
    }
  } else {
    // Outros documentos devem ter lines
    if (!d.lines || d.lines.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Documento requer pelo menos uma linha de produto' })
    }
  }
  // NC requer referenceInfo em pelo menos uma linha
  if (d.documentType === 'NC' && d.lines) {
    if (!d.lines.some(l => !!l.referenceInfo)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Nota de Crédito requer referência ao documento original' })
    }
  }
});

export const facturaSchema = z.object({
  schemaVersion: z.string().default('1.0'),
  submissionGUID: z.string().uuid('GUID inválido'),
  taxRegistrationNumber: z.string()
    .min(9, 'NIF do emissor deve ter no mínimo 9 dígitos')
    .max(15, 'NIF do emissor deve ter no máximo 15 dígitos'),
  submissionTimeStamp: z.string(),
  softwareInfo: softwareInfoSchema,
  documents: z.array(documentSchema)
    .min(1, 'Pelo menos um documento é obrigatório')
    .max(30, 'Máximo de 30 documentos por submissão'),
});

export type FacturaFormData = z.infer<typeof facturaSchema>;
export type DocumentFormData = z.infer<typeof documentSchema>;
export type ProductLineFormData = z.infer<typeof productLineSchema>;
