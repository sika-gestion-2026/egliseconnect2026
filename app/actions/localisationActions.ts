'use server'

import { requireAuthz, authzMessage } from '@/utils/authz'

/**
 * Un fidèle a le droit de partager SA position (c'est le principe de la carte) ;
 * `requestedMemberId` fait que requireAuthz n'autorise ce 'member' que si
 * member_id === son propre member_id. L'encadrement garde la vision globale.
 */
const LOCATION_ROLES = [
  'super_admin',
  'church_admin',
  'moderator',
  'member',
] as const

/**
 * Met à jour la position GPS d'un membre.
 *
 * Avant : aucune authentification, et `memberId` fourni par le client. Tout
 * visiteur pouvait réécrire les coordonnées de n'importe quel membre de
 * n'importe quelle église. Un fidèle ne peut désormais écrire que la sienne.
 */
export async function updateMemberLocation(
  memberId: string,
  latitude: number,
  longitude: number
) {
  try {
    const auth = await requireAuthz({
      roles: LOCATION_ROLES,
      requestedMemberId: memberId,
    })

    if (!auth.ok) return { success: false, error: authzMessage(auth) }

    // Garde-fou de plausibilité : latitudes hors [-90, 90] ou longitudes hors
    // [-180, 180] sont des saisies erronées ou des tentatives de pollution.
    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return { success: false, error: 'Coordonnées invalides.' }
    }

    const { error } = await auth.supabase
      .from('members')
      .update({ latitude, longitude })
      .eq('id', memberId)
      // Filtre d'église : ne jamais sortir du tenant de l'appelant, même si
      // memberId correspondait par malchance à un autre profil.
      .eq('church_id', auth.profile.church_id)

    if (error) {
      console.error('Error updating member location:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('Exception updating member location:', err)
    return { success: false, error: 'Mise à jour impossible.' }
  }
}