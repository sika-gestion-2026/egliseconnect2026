'use server'

import { requireAuthz, ADMIN_ROLES, authzMessage } from '@/utils/authz'

/**
 * Configuration du fil d'edification de l'église.
 *
 * Avant : aucune authentification, et `churchId` fourni par le client. La
 * n'importe quel visiteur pouvait réécrire le verset affiché sur le site
 * public de n'importe quelle église.
 */
export async function updateEdificationFeed(
  churchId: string,
  mode: 'auto' | 'manual',
  text?: string,
  ref?: string
) {
  try {
    const auth = await requireAuthz({
      roles: ADMIN_ROLES,
      requestedChurchId: churchId,
    })

    if (!auth.ok) return { success: false, error: authzMessage(auth) }

    // En mode manuel, un texte est obligatoire : sinon l'écran affiche un
    // cadre vide sur la page d'accueil de l'église.
    if (mode === 'manual' && !text?.trim()) {
      return {
        success: false,
        error: 'Saisissez un verset ou une citation à afficher.',
      }
    }

    const { error } = await auth.supabase
      .from('churches')
      .update({
        edification_mode: mode,
        custom_verse_text: mode === 'manual' ? text!.trim() : null,
        custom_verse_ref: mode === 'manual' ? ref?.trim() || null : null,
      })
      .eq('id', auth.profile.church_id)

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    console.error('Error updating edification feed:', error)
    return { success: false, error: error.message }
  }
}