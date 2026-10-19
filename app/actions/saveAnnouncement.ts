'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export async function saveAnnouncementAction(formData: FormData) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorisé' }

  const title = formData.get('title') as string
  const content = formData.get('content') as string
  const verses = formData.get('verses') as string

  if (!title || !content) {
    return { error: 'Le titre et le message sont requis.' }
  }

  const { data: profile } = await supabase.from('user_profiles').select('church_id, role').eq('id', user.id).single()
  
  if (!profile?.church_id || (profile.role !== 'church_admin' && profile.role !== 'super_admin')) {
    return { error: 'Non autorisé pour cette église.' }
  }

  // 1. Désactiver les anciennes annonces
  await supabase
    .from('church_announcements')
    .update({ is_active: false })
    .eq('church_id', profile.church_id)

  // 2. Insérer la nouvelle annonce
  const { error } = await supabase.from('church_announcements').insert({
    church_id: profile.church_id,
    title,
    content,
    verses: verses || null,
    is_active: true,
    created_by: user.id
  })

  if (error) {
    console.error('Error saving announcement:', error)
    return { error: 'Erreur lors de la publication.' }
  }

  revalidatePath('/dashboard')
  revalidatePath('/member-dashboard')
  return { success: true }
}
