import { z, ZodError } from 'zod';
import { facturaSchema, FacturaFormData } from './facturaSchema';
import { seriesSchema } from './seriesSchema';
import { loginSchema } from './authSchema';

// -----------------------------
// Schemas de Request (AGT)
// -----------------------------

export const registarFacturaRequest = facturaSchema;

export const obterEstadoRequest = z.object({
  schemaVersion: z.string().default('1.0.0'),
  taxRegistrationNumber: z.string().min(9).max(15),
  requestID: z.string().min(1),
  jwsSignature: z.string().optional(),
});

export const listarFacturasRequest = z.object({
  schemaVersion: z.string().default('1.0.0'),
  taxRegistrationNumber: z.string().min(9).max(15),
  startDate: z.string(), // YYYY-MM-DD
  endDate: z.string(),   // YYYY-MM-DD
  jwsSignature: z.string().optional(),
  softwareInfo: z.any().optional(),
}).superRefine((d, ctx) => {
  try {
    const sd = new Date(d.startDate);
    const ed = new Date(d.endDate);
    if (isNaN(sd.getTime()) || isNaN(ed.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'startDate/endDate inválidos' });
      return;
    }
    const diff = (ed.getTime() - sd.getTime()) / (1000 * 60 * 60 * 24);
    if (diff < 0 || diff > 45) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Intervalo entre startDate e endDate deve ser entre 0 e 45 dias' });
    }
  } catch (e) {}
});

export const consultarFacturaRequest = z.object({
  schemaVersion: z.string().default('1.0.0'),
  taxRegistrationNumber: z.string().min(9).max(15),
  documentNo: z.string().min(1),
  jwsSignature: z.string().optional(),
  softwareInfo: z.any().optional(),
});

export const solicitarSerieRequest = z.object({
  schemaVersion: z.string().default('1.0.0'),
  taxRegistrationNumber: z.string().min(9).max(15),
  expectedInitialDate: z.string().optional(),
  invoicingMethod: z.enum(['FEPC', 'FESF', 'SF']).optional(),
  seriesType: z.string().optional(),
  documentClassification: z.string().optional(),
  typePrinter: z.string().optional(),
  jwsSignature: z.string().optional(),
  softwareInfo: z.any().optional(),
});

export const listarSeriesRequest = z.object({
  schemaVersion: z.string().default('1.0.0'),
  taxRegistrationNumber: z.string().min(9).max(15),
  seriesCode: z.string().optional(),
  seriesYear: z.number().int().optional(),
  documentType: z.string().optional(),
  seriesStatus: z.enum(['A', 'U', 'F']).optional(),
  jwsSignature: z.string().optional(),
  softwareInfo: z.any().optional(),
});

export const validarDocumentoRequest = z.object({
  schemaVersion: z.string().default('1.0.0'),
  taxRegistrationNumber: z.string().min(9).max(15),
  documentNo: z.string().min(1),
  emitterTaxRegistrationNumber: z.string().min(9).max(15),
  action: z.enum(['C','R']),
  rejectionReason: z.string().optional(),
  jwsSignature: z.string().optional(),
  softwareInfo: z.any().optional(),
});

// -----------------------------
// Utilitário: converter ZodError → errorList AGT
// -----------------------------

export function zodToErrorList(e: ZodError) {
  const list = e.issues.map((issue, idx) => {
    const path = issue.path && issue.path.length ? issue.path.join('.') : 'payload';
    const message = issue.message || 'Erro de validação';
    return {
      idError: `EVAL${String(idx + 1).padStart(3, '0')}`,
      descriptionError: `${path}: ${message}`,
    };
  });
  return list;
}

// Re-export utilitites
export { seriesSchema, loginSchema };

export type RegistarFacturaRequest = z.infer<typeof registarFacturaRequest>;
export type ObterEstadoRequest = z.infer<typeof obterEstadoRequest>;
export type ListarFacturasRequest = z.infer<typeof listarFacturasRequest>;
export type ConsultarFacturaRequest = z.infer<typeof consultarFacturaRequest>;
export type SolicitarSerieRequest = z.infer<typeof solicitarSerieRequest>;
export type ListarSeriesRequest = z.infer<typeof listarSeriesRequest>;
export type ValidarDocumentoRequest = z.infer<typeof validarDocumentoRequest>;
