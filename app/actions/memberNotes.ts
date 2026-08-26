'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { verifyMemberSession } from '@/utils/memberSession'

// Helper function to authenticate either via Supabase Auth or Member Session
async function getAuthenticatedMember() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  
  if (user) {
    const { data: profile } = await supabase.from('user_profiles').select('member_id, church_id').eq('id', user.id).single()
    if (profile?.member_id) {
      return { member_id: profile.member_id, church_id: profile.church_id, supabase }
    }
  }

  // Fallback to custom member_session
  const memberSession = cookieStore.get('member_session')?.value
  if (memberSession) {
    const session = verifyMemberSession(memberSession);
    if (session?.member_id && session?.church_id) {
      return { member_id: session.member_id, church_id: session.church_id, supabase }
    }
  }
  
  return { error: 'Non autorisé' }
}

export async function saveNoteAction(formData: FormData) {
  const auth = await getAuthenticatedMember()
  if ('error' in auth) return { error: auth.error }

  const { member_id, church_id, supabase } = auth
  const title = formData.get('title') as string
  const content = formData.get('content') as string
  const versesJson = formData.get('verses') as string
  const service_id = formData.get('service_id') as string

  if (!title) return { error: 'Le titre est requis.' }

  let verses = []
  try {
    if (versesJson) verses = JSON.parse(versesJson)
  } catch(e) {}

  // Important: Si l'utilisateur est connecté via member_session (sans auth.uid()),
  // l'insertion échouera si RLS est actif pour member_notes et exige auth.uid().
  // La migration de member_notes permet 'auth.uid()' mais on va ajouter une policy 
  // plus ouverte pour l'instant ou bien on gère côté base. 
  // Pour éviter les blocages de RLS avec le cookie personnalisé sans compte Supabase,
  // nous désactiverons RLS pour member_notes dans cette démo, ou créerons une admin action.
  
  const { error } = await supabase.from('member_notes').insert({
    member_id,
    church_id,
    service_id: service_id || null,
    title,
    content,
    verses
  })

  if (error) {
    console.error('Note save error:', error)
    return { error: 'Erreur lors de la sauvegarde.' }
  }

  revalidatePath('/member-dashboard')
  return { success: true }
}

export async function getNotesAction() {
  const auth = await getAuthenticatedMember()
  if ('error' in auth) return { data: [] }

  const { member_id, supabase } = auth

  const { data, error } = await supabase
    .from('member_notes')
    .select('*')
    .eq('member_id', member_id)
    .order('created_at', { ascending: false })

  if (error) {
    return { data: [] }
  }

  return { data }
}
