'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export async function switchChurchAction(code: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // 1. Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return { error: 'Non autorisé' }
  }

  // 2. Check if user is super_admin
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || profile?.role !== 'super_admin') {
    return { error: 'Accès refusé. Réservé au Super Admin.' }
  }

  // 3. If the code is "SUPER", reset the church_id to NULL (Global view)
  if (code.toUpperCase() === 'SUPER') {
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ church_id: null })
      .eq('id', user.id)

    if (updateError) {
      return { error: "Erreur lors de la réinitialisation de la vue." }
    }
    
    revalidatePath('/', 'layout')
    return { success: true, message: "Vue globale restaurée", redirectUrl: '/super-admin' }
  }

  // 4. Find the church by code
  const { data: church, error: churchError } = await supabase
    .from('churches')
    .select('id, name')
    .ilike('code', code.trim())
    .single()

  if (churchError || !church) {
    return { error: `Église avec le code "${code}" introuvable.` }
  }

  // 5. Update the super admin's church_id
  const { error: updateError } = await supabase
    .from('user_profiles')
    .update({ church_id: church.id })
    .eq('id', user.id)

  if (updateError) {
    return { error: 'Erreur lors du changement d\'église.' }
  }

  // 6. Revalidate cache
  revalidatePath('/', 'layout')
  
  return { 
    success: true, 
    message: `Téléportation réussie dans: ${church.name}`,
    redirectUrl: '/dashboard'
  }
}
