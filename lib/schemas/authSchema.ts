import { z } from 'zod';

export const loginSchema = z.object({
  nif: z.string()
    .min(9, 'NIF deve ter no mínimo 9 dígitos')
    .max(15, 'NIF deve ter no máximo 15 dígitos')
    .regex(/^[0-9]+$/, 'NIF deve conter apenas números'),
  password: z.string()
    .min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

export type LoginFormData = z.infer<typeof loginSchema>;
