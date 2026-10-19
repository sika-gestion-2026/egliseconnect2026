'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

/**
 * Journalise une action dans le journal d'audit de sécurité.
 *
 * Répare un défaut silencieux : les colonnes `description` et `metadata` sont
 * ajoutées par la migration `20261005080000`. Tant qu'elle n'était pas
 * appliquée, l'insertion échouait (PostgREST rejette toute la requête dès qu'un
 * nom de champ est inconnu) et le journal d'audit — pourtant affiché dans
 * l'interface — ne contenait RIEN. Le `try`/`catch` masquait l'erreur.
 *
 * L'action et son contexte sont conservés intégralement : `metadata` peut
 * contenir des identifiants techniques (ID de membre, de service), qui
 * n'appartiennent pas à une phrase lisible par un administrateur.
 *
 * L'erreur est désormais journalisée AVANT d'être avalée : un journal d'audit
 * qui ne dit pas qu'il a échoué n'a aucune valeur.
 */
export async function logAudit(action_type: string, description: string, metadata?: unknown) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase.from('user_profiles').select('church_id').eq('id', user.id).single()

    const { error } = await supabase.from('audit_logs').insert({
      church_id: profile?.church_id ?? null,
      user_id: user.id,
      action_type,
      description,
      metadata: metadata ?? null
    })

    if (error) {
      // Une chaîne non-sérialisable dans `metadata` ferait échouer tout
      // l'insert ; on ne tente pas de deviner et on trace l'échec.
      console.error('[audit] Échec d\'écriture du journal d\'audit', { action_type, error: error.message })
    }
  } catch (err) {
    console.error('[audit] Erreur logAudit', err)
  }
}
