'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { requireAuthz, STAFF_ROLES, authzMessage } from '@/utils/authz'

export async function createDepartmentAction(formData: FormData) {
  const name = (formData.get('name') as string | null)?.trim()
  const description = (formData.get('description') as string | null)?.trim() || null

  if (!name) return { error: 'Le nom du département est requis.' }
  if (name.length > 120) return { error: 'Le nom du département est trop long.' }

  // Garde de rôle explicite.
  //
  // Cette action ne vérifiait que « êtes-vous connecté ? ». La seule barrière
  // restante était la RLS sur `church_departments`, qui était DÉSACTIVÉE — donc
  // n'importe quel compte authentifié pouvait créer un département dans une
  // église qui n'est pas la sienne, via l'API REST.
  //
  // `requireAuthz` contrôle le rôle ET fournit l'église du profil : le
  // `church_id` inséré vient du serveur, jamais du formulaire.
  const authz = await requireAuthz({ roles: STAFF_ROLES })
  if (!authz.ok) return { error: authzMessage(authz) }

  // Un `super_admin` supervise le réseau : son profil peut n'être rattaché à
  // aucune église. Un département appartient obligatoirement à une église, donc
  // il n'y a rien où le rattacher. `church_id` vient du profil, jamais du
  // formulaire : accepter une valeur fournie par le client rouvrirait la
  // création inter-églises que ce garde-fou vient de fermer.
  if (!authz.profile.church_id) {
    return {
      error: "Aucun département ne peut être créé depuis un compte sans église rattachée.",
    }
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { error } = await supabase.from('church_departments').insert({
    church_id: authz.profile.church_id,
    name,
    description
  })

  if (error) {
    // 23505 = violation d'unicité : un département de même nom existe déjà
    // dans cette église. Message métier, pas lapgsql brute.
    if (error.code === '23505') {
      return { error: 'Ce département existe déjà.' }
    }
    console.error('[createDepartment] Échec de la création', error.message)
    return { error: "Le département n'a pas pu être créé." }
  }

  revalidatePath('/dashboard/team')
  return { success: true }
}
