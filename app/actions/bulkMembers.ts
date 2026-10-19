'use server'

import { requireAuthz, ADMIN_ROLES, authzMessage } from '@/utils/authz'
import { revalidatePath } from 'next/cache'
import { logAudit } from './audit'

/**
 * Import d'un fichier Excel de membres.
 *
 * Avant : `churchId` venait du client et était appliqué tel quel. N'importe
 * quel utilisateur authentifié pouvait injecter des membres dans l'annuaire
 * d'une autre église en forgeant l'UUID. L'église est désormais dérivée du
 * profil serveur, l'argument client n'étant plus qu'une vérification.
 */
export async function bulkImportMembers(churchId: string, members: any[]) {
  try {
    const auth = await requireAuthz({
      roles: ADMIN_ROLES,
      requestedChurchId: churchId,
    })

    if (!auth.ok) return { success: false, error: authzMessage(auth) }

    if (!Array.isArray(members) || members.length === 0) {
      return { success: false, error: 'Aucun membre à importer.' }
    }

    // Plafond : un import massif non intentionnel verrouillerait la base.
    if (members.length > 5000) {
      return { success: false, error: 'Import limité à 5000 membres par lot.' }
    }

    const formattedMembers = members.map((m) => ({
      ...m,
      church_id: auth.profile.church_id,
      status: 'active',
    }))

    const { error } = await auth.supabase.from('members').insert(formattedMembers)

    if (error) {
      console.error('Supabase error bulk insert:', error)
      return { success: false, error: error.message }
    }

    await logAudit(
      'BULK_MEMBERS_IMPORT',
      `A importé ${members.length} membres via Excel.`
    )
    revalidatePath('/dashboard/members')

    return { success: true }
  } catch (err: any) {
    console.error('Bulk insert err:', err)
    return { success: false, error: err.message }
  }
}