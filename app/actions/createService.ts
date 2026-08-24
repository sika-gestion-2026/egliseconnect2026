'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export async function createServiceAction(formData: FormData) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const name = formData.get('name') as string
  const service_date = formData.get('service_date') as string
  const service_time = formData.get('service_time') as string
  const type = (formData.get('type') as string) || 'regular'

  if (!name || !service_date || !service_time) {
    return { error: 'Tous les champs sont requis.' }
  }

  // Obtenir l'utilisateur et son profil pour le church_id
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorisé' }

  const { data: profile } = await supabase.from('user_profiles').select('church_id').eq('id', user.id).single()
  
  if (!profile?.church_id) {
    return { error: 'Aucune église associée.' }
  }

  const { error } = await supabase.from('church_services').insert({
    church_id: profile.church_id,
    name,
    service_date,
    service_time,
    type,
    created_by: user.id
  })

  if (error) {
    return { error: 'Erreur lors de la création du culte: ' + error.message }
  }

  revalidatePath('/dashboard/attendance')
  return { success: true }
}
