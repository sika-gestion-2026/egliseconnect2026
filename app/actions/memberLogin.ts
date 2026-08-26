'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { signMemberSession } from '@/utils/memberSession'

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

  // Create a signed, tamper-proof session token (HMAC-SHA256)
  const token = signMemberSession({ member_id: data.member_id, church_id: data.church_id })
  
  cookieStore.set('member_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30, // 30 jours
    path: '/'
  })

  return { success: true, profile: data.profile }
}
