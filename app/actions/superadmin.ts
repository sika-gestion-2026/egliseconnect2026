'use server'

import { createAdminClient } from '@/utils/supabase/admin'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function infiltrateChurch(churchId: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Vérifier qu'il est super admin
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // Autorisation basée sur le rôle en base uniquement.
  // La version précédente acceptait aussi un email en dur, ce qui ouvrait une
  // porte de contournement dès lors qu'un compte existait avec cet email.
  if (profile?.role !== 'super_admin') {
    return { success: false, error: 'Non autorisé' }
  }

  // Mettre à jour le church_id du profil
  const adminSb = createAdminClient()
  if (!adminSb) {
    return { success: false, error: 'Configuration serveur manquante' }
  }

  const { error } = await adminSb.from('user_profiles').update({ church_id: churchId }).eq('id', user.id)

  if (error) {
    console.error('Erreur infiltration:', error)
    return { success: false, error: 'Impossible d\'entrer dans cette église' }
  }

  // revalidatePath est désormais importé en ESM (voir en haut du fichier).
  revalidatePath('/dashboard', 'layout');
  revalidatePath('/super-admin', 'layout');
  return { success: true }
}

export async function deleteChurch(churchId: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Non authentifié' }
  }

  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  
  // Bug corrigé : la condition précédente combinait role ET email, ce qui
// refusait un vrai super_admin dont l'email ne contenait pas 'munokolive',
// tout en acceptant quiconque possédait cet email sans aucun rôle.
  if (profile?.role !== 'super_admin') {
    return { success: false, error: 'Non autorisé' }
  }

  const { error } = await supabase.from('churches').delete().eq('id', churchId)

  if (error) {
    return { success: false, error: 'Erreur de suppression: ' + error.message }
  }

  // revalidatePath importé en ESM en haut de fichier.
  revalidatePath('/super-admin')
  return { success: true }
}
