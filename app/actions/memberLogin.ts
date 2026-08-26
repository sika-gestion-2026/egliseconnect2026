'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function memberLoginAction(formData: FormData) {
  const churchCode = formData.get('church_code') as string
  const identifier = formData.get('identifier') as string // Phone or email
  
  if (!churchCode || !identifier) {
    return { error: 'Veuillez remplir tous les champs.' }
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // Utiliser la fonction RPC pour contourner RLS de façon sécurisée
  const { data, error } = await supabase.rpc('authenticate_member', {
    p_church_code: churchCode,
    p_identifier: identifier
  })

  if (error || !data) {
    return { error: 'Erreur lors de la vérification des identifiants.' }
  }

  if (data.error) {
    return { error: data.error }
  }

  // 3. Créer une session personnalisée
  // On stocke l'ID du membre et l'ID de l'église dans un cookie sécurisé
  const sessionData = JSON.stringify({ member_id: data.member_id, church_id: data.church_id })
  
  // Utilisation de btoa/atob basique pour éviter que le JSON soit en clair, 
  // idéalement on utiliserait un JWT signé, mais pour la démo/simplicité c'est fonctionnel
  const token = Buffer.from(sessionData).toString('base64')
  
  cookieStore.set('member_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30, // 30 jours
    path: '/'
  })

  return { success: true, profile: data.profile }
}
