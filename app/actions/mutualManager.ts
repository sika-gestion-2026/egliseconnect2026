'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export async function assignMutualManagerAction(userProfileId: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorisé' }

  // Check if current user is admin
  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin' && profile?.role !== 'church_admin') {
    return { error: 'Seul un administrateur peut nommer un gestionnaire de mutuelle.' }
  }

  // Update target user profile role
  const { error } = await supabase
    .from('user_profiles')
    .update({ role: 'mutual_manager' })
    .eq('id', userProfileId)

  if (error) {
    console.error('Erreur assignation:', error)
    return { error: 'Erreur lors de l\'assignation : ' + error.message }
  }

  revalidatePath('/dashboard/team')
  return { success: true }
}

export async function removeMutualManagerAction(userProfileId: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorisé' }

  // Only admin can remove
  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin' && profile?.role !== 'church_admin') {
    return { error: 'Non autorisé' }
  }

  // Revert role to 'member' (or whatever default role, typically 'member' or 'moderator')
  // For safety, let's set it to 'member'
  const { error } = await supabase
    .from('user_profiles')
    .update({ role: 'member' })
    .eq('id', userProfileId)

  if (error) return { error: 'Erreur: ' + error.message }
  
  revalidatePath('/dashboard/team')
  return { success: true }
}
