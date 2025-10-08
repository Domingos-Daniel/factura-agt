import { z } from 'zod';

export const documentTypeEnum = z.enum(['FT', 'FR', 'FA', 'NC', 'ND', 'AR', 'RC', 'RG']);
export const seriesStatusEnum = z.enum(['A', 'U', 'F']);

export const seriesSchema = z.object({
  seriesCode: z.string()
    .min(1, 'Código da série é obrigatório')
    .max(20, 'Código da série deve ter no máximo 20 caracteres')
    .regex(/^[A-Z0-9]+$/, 'Código deve conter apenas letras maiúsculas e números'),
  seriesYear: z.number()
    .int('Ano deve ser um número inteiro')
    .min(2020, 'Ano deve ser no mínimo 2020')
    .max(2099, 'Ano deve ser no máximo 2099'),
  documentType: documentTypeEnum,
  firstDocumentNumber: z.number()
    .int('Número inicial deve ser inteiro')
    .min(1, 'Número inicial deve ser no mínimo 1')
    .default(1),
  status: seriesStatusEnum.optional(),
});

export type SeriesFormData = z.infer<typeof seriesSchema>;
