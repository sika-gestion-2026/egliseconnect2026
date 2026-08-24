'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export async function submitRsvpAction(formData: FormData) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const service_id = formData.get('service_id') as string
  const status = formData.get('status') as string // 'present', 'absent', 'late'
  const reason = formData.get('reason') as string
  const notes = formData.get('notes') as string

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorisé' }

  // Obtenir le profil et member_id
  const { data: profile } = await supabase.from('user_profiles').select('member_id').eq('id', user.id).single()
  
  if (!profile?.member_id) {
    return { error: 'Profil membre introuvable.' }
  }

  // Vérifier si une déclaration existe déjà
  const { data: existing } = await supabase
    .from('service_declarations')
    .select('id')
    .eq('service_id', service_id)
    .eq('member_id', profile.member_id)
    .single()

  let error;
  if (existing) {
    const res = await supabase.from('service_declarations').update({
      status,
      reason: reason || null,
      notes: notes || null
    }).eq('id', existing.id)
    error = res.error
  } else {
    const res = await supabase.from('service_declarations').insert({
      service_id,
      member_id: profile.member_id,
      status,
      reason: reason || null,
      notes: notes || null
    })
    error = res.error
  }

  if (error) {
    return { error: 'Erreur lors de l\'enregistrement de votre réponse.' }
  }

  revalidatePath('/member-dashboard')
  revalidatePath('/dashboard/attendance')
  return { success: true }
}
