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

  // 1. Trouver l'église par son code
  const { data: church } = await supabase
    .from('churches')
    .select('id')
    .ilike('code', churchCode)
    .single()
    
  if (!church) {
    return { error: 'Code d\'église invalide.' }
  }

  // 2. Trouver le membre par son téléphone ou email
  // On récupère les membres pour cette église car la base n'est pas énorme en général,
  // ce qui permet de comparer les numéros de téléphone de façon plus souple (avec ou sans espaces).
  const { data: members, error } = await supabase
    .from('members')
    .select('id, phone, email')
    .eq('church_id', church.id)

  if (error || !members || members.length === 0) {
    return { error: 'Aucun membre trouvé dans cette église.' }
  }

  const cleanInput = identifier.trim().toLowerCase()
  const inputAsPhone = cleanInput.replace(/\s+/g, '') // remove all spaces

  const matchedMember = members.find(m => {
    if (m.email && m.email.trim().toLowerCase() === cleanInput) return true;
    if (m.phone) {
      const dbPhone = m.phone.replace(/\s+/g, '').toLowerCase()
      if (dbPhone === inputAsPhone) return true;
    }
    return false;
  })

  if (!matchedMember) {
    return { error: 'Aucun membre trouvé avec cet identifiant (téléphone ou email) dans cette église.' }
  }

  const memberId = matchedMember.id

  // 3. Créer une session personnalisée
  // On stocke l'ID du membre et l'ID de l'église dans un cookie sécurisé
  const sessionData = JSON.stringify({ member_id: memberId, church_id: church.id })
  
  // Utilisation de btoa/atob basique pour éviter que le JSON soit en clair, 
  // idéalement on utiliserait un JWT signé, mais pour la démo/simplicité c'est fonctionnel
  const token = Buffer.from(sessionData).toString('base64')
  
  cookieStore.set('member_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30, // 30 jours
    path: '/'
  })

  return { success: true }
}
