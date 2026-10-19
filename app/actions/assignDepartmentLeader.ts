'use server'

import { revalidatePath } from 'next/cache'
import { requireAuthz, ADMIN_ROLES, authzMessage } from '@/utils/authz'

/**
 * Attribution et retrait des responsables de département.
 *
 * VULNÉRABILITÉS CORRIGÉES
 * ------------------------
 * Les deux actions ne vérifiaient que « un utilisateur est-il connecté ? ».
 * Concrètement, n'importe quel compte authentifié disposant d'une ligne dans
 * `user_profiles` — donc un simple fidèle, un scanner, ou un responsable de
 * département lui-même — pouvait nommer des responsables dans son église, et
 * retirer ceux des autres responsables.
 *
 * `removeDepartmentLeaderAction` était plus grave : elle recevait un
 * `leaderId` forgé par le client et supprimait la ligne sans jamais vérifier à
 * quelle église appartenait le département visé. Le contrôle RLS ne pouvait
 * pas compenser : il raisonne sur le rôle et l'église de l'appelant, pas sur
 * l'identifiant demandé.
 *
 * Règle appliquée : le rôle est vérifié explicitement, et chaque identifiant
 * reçu du client est validé comme appartenant à l'église de l'appelant avant
 * toute écriture.
 */

/** La page /dashboard/team est réservée à l'encadrement. */
const TEAM_ROLES = ADMIN_ROLES

export async function assignDepartmentLeaderAction(formData: FormData) {
  const authz = await requireAuthz({ roles: TEAM_ROLES })
  if (!authz.ok) return { error: authzMessage(authz) }

  const departmentName = (formData.get('department_name') as string | null)?.trim()
  const memberId = (formData.get('member_id') as string | null)?.trim()

  if (!departmentName || !memberId) {
    return { error: 'Le département et le membre sont requis.' }
  }

  const { supabase, profile } = authz

  if (!profile.church_id) {
    return { error: "Vous n'êtes rattaché à aucune église." }
  }

  const churchId = profile.church_id

  // Le membre désigné doit appartenir à l'église de l'appelant. Sans ce
  // contrôle, un responsable pouvait nommer un membre d'une autre église —
  // le responsable affiché serait alors hors de sa communauté.
  const { data: targetMember, error: memberError } = await supabase
    .from('members')
    .select('id')
    .eq('id', memberId)
    .eq('church_id', churchId)
    .maybeSingle()

  if (memberError) {
    console.error('Affectation: lecture du membre impossible:', memberError)
    return { error: 'Impossible de vérifier le membre sélectionné.' }
  }

  if (!targetMember) {
    return { error: "Ce membre n'appartient pas à votre église." }
  }

  // Chercher ou créer le département, toujours borné à l'église de l'appelant.
  const { data: existingDepartment } = await supabase
    .from('church_departments')
    .select('id')
    .eq('church_id', churchId)
    .eq('name', departmentName)
    .maybeSingle()

  let departmentId = existingDepartment?.id ?? null

  if (!departmentId) {
    const { data: newDepartment, error: insertDepartmentError } = await supabase
      .from('church_departments')
      .insert({
        church_id: churchId,
        name: departmentName,
        description: `Département généré automatiquement pour le groupe: ${departmentName}`,
      })
      .select('id')
      .single()

    if (insertDepartmentError) {
      console.error('Affectation: création du département impossible:', insertDepartmentError)
      return { error: "Impossible de créer le département. Vérifiez que vous avez le droit de le faire." }
    }

    departmentId = newDepartment.id
  }

  const { error } = await supabase
    .from('department_leaders')
    .insert({ department_id: departmentId, member_id: memberId })

  if (error) {
    if (error.code === '23505') {
      return { error: 'Ce membre est déjà responsable de ce département.' }
    }
    console.error('Affectation: écriture impossible:', error)
    return { error: "Erreur lors de l'affectation du responsable." }
  }

  revalidatePath('/dashboard/team')
  return { success: true }
}

export async function removeDepartmentLeaderAction(leaderId: string) {
  const authz = await requireAuthz({ roles: TEAM_ROLES })
  if (!authz.ok) return { error: authzMessage(authz) }

  if (!leaderId) return { error: 'Responsable non identifié.' }

  const { supabase, profile } = authz

  if (!profile.church_id) {
    return { error: "Vous n'êtes rattaché à aucune église." }
  }

  // Le `leaderId` vient du client : on remonte jusqu'au département pour
  // vérifier l'église d'appartenance AVANT de supprimer. C'est le seul moyen
  // d'empêcher la suppression d'une ligne appartenant à un autre tenant.
  const { data: leader, error: lookupError } = await supabase
    .from('department_leaders')
    .select('id, department:church_departments!inner(id, church_id)')
    .eq('id', leaderId)
    .maybeSingle()

  if (lookupError) {
    console.error('Retrait: lecture du responsable impossible:', lookupError)
    return { error: 'Impossible de vérifier ce responsable.' }
  }

  if (!leader) {
    return { error: 'Responsable introuvable.' }
  }

  // `!inner` garantit un département ; on lecture tout de même la valeur.
  const department = Array.isArray(leader.department)
    ? leader.department[0]
    : leader.department

  if (!department || department.church_id !== profile.church_id) {
    return { error: "Vous n'avez pas accès à ce responsable." }
  }

  const { error } = await supabase.from('department_leaders').delete().eq('id', leaderId)

  if (error) {
    console.error('Retrait: suppression impossible:', error)
    return { error: "Erreur lors du retrait du responsable." }
  }

  revalidatePath('/dashboard/team')
  return { success: true }
}
