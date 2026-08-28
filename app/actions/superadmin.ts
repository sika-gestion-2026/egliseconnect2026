'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

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

  if (profile?.role !== 'super_admin' && user.email !== 'munokolive@gmail.com') {
    throw new Error('Non autorisé')
  }

  // Mettre à jour le church_id du profil
  const { error } = await supabase
    .from('user_profiles')
    .update({ church_id: churchId })
    .eq('id', user.id)

  if (error) {
    console.error('Erreur infiltration:', error)
    throw new Error('Impossible d\'entrer dans cette église')
  }

  redirect('/dashboard')
}

export async function deleteChurch(churchId: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Non authentifié')
  }

  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  
  if ((profile?.role !== 'super_admin' && user.email !== 'munokolive@gmail.com') || !user.email?.includes('munokolive')) {
    throw new Error('Non autorisé')
  }

  const { error } = await supabase.from('churches').delete().eq('id', churchId)

  if (error) {
    throw new Error('Erreur de suppression: ' + error.message)
  }
}
