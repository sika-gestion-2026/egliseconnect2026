'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export async function createDepartmentAction(formData: FormData) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const name = formData.get('name') as string
  const description = formData.get('description') as string

  if (!name) return { error: 'Le nom du département est requis.' }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorisé' }

  const { data: profile } = await supabase.from('user_profiles').select('church_id').eq('id', user.id).single()
  if (!profile?.church_id) return { error: 'Aucune église associée.' }

  const { error } = await supabase.from('church_departments').insert({
    church_id: profile.church_id,
    name,
    description
  })

  if (error) {
    if (error.code === '23505') {
      return { error: 'Ce département existe déjà.' }
    }
    return { error: 'Erreur lors de la création : ' + error.message }
  }

  revalidatePath('/dashboard/team')
  return { success: true }
}
