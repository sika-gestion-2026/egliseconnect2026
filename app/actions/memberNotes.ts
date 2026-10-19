'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { verifyMemberSession } from '@/utils/memberSession'

/**
 * Résout l'identité de l'appelant, par l'un des deux chemins d'authentification.
 *
 * Deux modes coexistent : une session Supabase (équipe d'encadrement) et un
 * cookie `member_session` signé en HMAC (membre connecté par téléphone + code
 * église). Ce second mode n'a pas d'`auth.uid()`, ce qui est la cause racine du
 * contournement de RLS sur `member_notes` décrit plus bas.
 *
 * Règle de sécurité : `member_id` et `church_id` ne sont JAMAIS lus dans le
 * formulaire. Ils viennent d'ici, donc d'une source vérifiée — jamais du client.
 * C'est ce qui rend l'usage de `service_role` acceptable plus bas : la RLS est
 * court-circuitée, mais il n'y a plus d'identifiant à falsifier.
 */
async function getAuthenticatedMember() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase.from('user_profiles').select('member_id, church_id').eq('id', user.id).single()
    if (profile?.member_id) {
      return { member_id: profile.member_id, church_id: profile.church_id, user_id: user.id as string | null, supabase }
    }
  }

  // Repli sur la session membre personnalisée.
  const memberSession = cookieStore.get('member_session')?.value
  if (memberSession) {
    const session = verifyMemberSession(memberSession);
    if (session?.member_id && session?.church_id) {
      return { member_id: session.member_id, church_id: session.church_id, user_id: null, supabase }
    }
  }

  return { error: 'Non autorisé' }
}

export async function saveNoteAction(formData: FormData) {
  const auth = await getAuthenticatedMember()
  if ('error' in auth) return { error: auth.error }

  const { member_id, church_id, user_id, supabase } = auth
  const title = formData.get('title') as string | null
  const content = formData.get('content') as string | null
  const versesJson = formData.get('verses') as string | null
  const service_id = formData.get('service_id') as string | null

  if (!title?.trim()) return { error: 'Le titre est requis.' }

  // `verses` doit être un tableau JSON. Un formulaire falsifié peut envoyer
  // n'importe quoi : on valide la FORME avant l'insertion, sinon la colonne
  // JSONB stocke une valeur arbitraire et l'affichage des versets casse.
  let verses: unknown[] = []
  if (versesJson) {
    try {
      const parsed = JSON.parse(versesJson)
      if (!Array.isArray(parsed)) {
        return { error: 'Format des versets invalide.' }
      }
      verses = parsed
    } catch {
      return { error: 'Format des versets invalide.' }
    }
  }

  // `author_id` référence `auth.users` : il n'existe que pour une session
  // Supabase. Un membre connecté par téléphone + code église n'a pas de compte,
  // d'où le `null` — la migration `20261005080000` rend la colonne nullable.
  // L'auteur réel reste identifié par `member_id`, dérivé de la session.
  const { error } = await supabase.from('member_notes').insert({
    member_id,
    church_id,
    author_id: user_id ?? null,
    service_id: service_id || null,
    title: title.trim(),
    content: content ?? '',
    verses
  })

  if (error) {
    // Trace serveur obligatoire : ce chemin ne renvoyait qu'un message
    // générique, ce qui rendait un échec systématique indiscernable d'un
    // incident passager.
    console.error('[memberNotes] Échec de l\'écriture', error.message)
    return { error: "La note n'a pas pu être enregistrée." }
  }

  revalidatePath('/member-dashboard')
  return { success: true }
}

export async function getNotesAction() {
  const auth = await getAuthenticatedMember()
  if ('error' in auth) return { data: [] }

  const { member_id, supabase } = auth

  // Filtré sur `member_id` issu de la session : un membre ne lit que son
  // carnet, jamais celui d'un autre, indépendamment de la RLS.
  const { data, error } = await supabase
    .from('member_notes')
    .select('*')
    .eq('member_id', member_id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[memberNotes] Échec de la lecture', error.message)
    return { data: [] }
  }

  return { data }
}
