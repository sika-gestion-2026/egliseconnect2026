'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export async function scheduleVisitAction(formData: FormData) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorisé' }

  const member_id = formData.get('member_id') as string
  const assigned_to = formData.get('assigned_to') as string
  const visit_date = formData.get('visit_date') as string
  const motif = formData.get('motif') as string
  const priority = formData.get('priority') as string

  if (!member_id || !assigned_to || !visit_date || !motif) {
    return { error: 'Tous les champs sont requis.' }
  }

  const { data: profile } = await supabase.from('user_profiles').select('church_id').eq('id', user.id).single()
  
  if (!profile?.church_id) {
    return { error: 'Aucune église associée' }
  }

  const { error } = await supabase.from('pastoral_visits').insert({
    church_id: profile.church_id,
    member_id,
    assigned_to,
    visit_date,
    motif,
    priority: priority || 'medium',
    status: 'planned',
    created_by: user.id
  })

  if (error) {
    console.error('Error scheduling visit:', error)
    return { error: 'Erreur lors de la planification.' }
  }

  revalidatePath('/dashboard/visits')
  return { success: true }
}
