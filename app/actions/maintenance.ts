'use server'

import { requireAuthz, authzMessage } from '@/utils/authz'

/**
 * Purge des cultes et notifications hors ancienneté.
 *
 * Cette action utilisait la clé service_role, qui contourne INTÉGRALEMENT la
 * RLS : elle voit et supprime toutes les églises, pas seulement celle de
 * l'appelant. Combinée à l'absence totale de vérification d'identité, la
 * Server Action était appelable par son URL : n'importe quel visiteur, même
 * non authentifié, pouvait déclencher la suppression de l'historique de toutes
 * les églises de l'installation.
 *
 * Correction : plus aucune clé de service. La suppression passe par le jeton
 * de l'appelant, donc la RLS redevient le véritable filet, et le rôle est
 * aligné sur ce que la RLS autorise réellement (la policy
 * `church_admin_manage_services` est en FOR ALL, mais aucun policy DELETE
 * n'existe pour `moderator` — l'inclure ici produirait un echec silencieux).
 */
const PURGE_ROLES = ['super_admin', 'church_admin'] as const

export async function purgeOldServices() {
  const auth = await requireAuthz({ roles: PURGE_ROLES })

  if (!auth.ok) {
    return { success: false, error: authzMessage(auth) }
  }

  const client = auth.supabase

  try {
    const dateLimit = new Date()
    dateLimit.setDate(dateLimit.getDate() - 7)
    const dateStr = dateLimit.toISOString().split('T')[0]

    // Suppression en cascade : un church_services supprimé emporte ses
    // service_assignments via la contrainte ON DELETE CASCADE.
    const { count, error } = await client
      .from('church_services')
      .delete({ count: 'exact' })
      .eq('church_id', auth.profile.church_id)
      .lt('service_date', dateStr)

    if (error) {
      console.error('Error purging old services:', error)
      return { success: false, error: error.message }
    }

    // Notifications déjà lues : nettoyage opportuniste, un échec ici ne doit
    // pas faire échouer la purge des cultes.
    const dateLimitNotif = new Date()
    dateLimitNotif.setDate(dateLimitNotif.getDate() - 7)
    await client
      .from('notifications')
      .delete()
      .eq('church_id', auth.profile.church_id)
      .lt('created_at', dateLimitNotif.toISOString())
      .eq('is_read', true)

    return { success: true, deleted: count ?? 0 }
  } catch (err: any) {
    console.error('Exception purging old services:', err)
    return { success: false, error: 'Purge impossible.' }
  }
}