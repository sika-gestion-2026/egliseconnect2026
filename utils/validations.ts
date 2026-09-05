import { z } from 'zod'

export const memberSchema = z.object({
  first_name: z.string().min(2, 'Le prénom doit contenir au moins 2 caractères'),
  last_name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  phone: z.string().regex(/^\+?[0-9\s\-]+$/, 'Format de téléphone invalide').optional().or(z.literal('')),
  birth_date: z.string().optional().or(z.literal('')),
  gender: z.enum(['M', 'F']).optional(),
  status: z.enum(['membre_actif', 'visiteur_simple', 'visiteur_occasionnel', 'nouveau_converti', 'baptise', 'non_baptise']).optional(),
})

export const churchSchema = z.object({
  name: z.string().min(3, 'Le nom de l\'église doit contenir au moins 3 caractères'),
  code: z.string().length(6, 'Le code doit contenir 6 caractères').regex(/^[A-Z0-9]+$/, 'Le code doit être alphanumérique'),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
})

// Validation helper function
export function validateData<T>(schema: z.ZodType<T>, data: unknown) {
  const result = schema.safeParse(data)
  if (!result.success) {
    const errorMessages = result.error.issues.map((err: z.ZodIssue) => `${err.path.join('.')}: ${err.message}`).join(', ')
    return { success: false, error: errorMessages }
  }
  return { success: true, data: result.data }
}
