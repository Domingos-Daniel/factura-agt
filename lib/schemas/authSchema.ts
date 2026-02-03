import { z } from 'zod';

export const loginSchema = z.object({
  nif: z.string()
    .min(1, 'Email ou NIF é obrigatório')
    .refine(
      (val) => {
        // Se contém @, valida como email
        if (val.includes('@')) {
          return z.string().email().safeParse(val).success;
        }
        // Caso contrário, valida como NIF (9-15 dígitos numéricos)
        return /^[0-9]{9,15}$/.test(val);
      },
      { message: 'Insira um email válido ou NIF com 9-15 dígitos' }
    ),
  password: z.string()
    .min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

export type LoginFormData = z.infer<typeof loginSchema>;
