'use server'

import { revalidatePath } from 'next/cache'
import { requireAuthz, authzMessage } from '@/utils/authz'
import { createAdminClient } from '@/utils/supabase/admin'

/**
 * Création d'un culte et envoi des rappels de masse.
 *
 * PROBLÈMES CORRIGÉS
 * ------------------
 *
 * 1. Fuite inter-églises dans `sendMassServiceReminder`.
 *    Le `serviceId` venait du client et était chargé via un client
 * `service_role`, qui contourne la RLS. Rien ne vérifiait que le culte visé
 *    appartenait à l'église de l'appelant : un modérateur, un administrateur
 *    d'église — n'importe quel encadrement — pouvait déclencher l'envoi des
 *    rappels pour un culte d'une AUTRE église, ou lire son nom, sa date et
 *    son contenu dans la réponse de l'action. Le rappel partait ensuite aux
 *    membres de sa propre église, avec un programme et une date qui n'étaient
 *    pas les leurs.
 *    Le correctif est le filtrage par `church_id` dans la requête : un culte
 *    d'un autre tenant devient simplement introuvable.
 *
 * 2. Encodage corrompu.
 *    Tous les messages d'erreur de ce fichier étaient illisibles :
 *    « Non autorisAc », « Aucune Acglise associAce », « rAccupAcration »,
 *    « prAcsence ». Les octets UTF-8 avaient été relus comme du Latin-1, si
 *    bien que l'utilisateur recevait « Non autorisAc � crAcer un culte. » à la
 *    place de « Non autorisé à créer un culte. ». C'est le seul endroit du
 *    projet où le texte était corrompu ; il est réécrit ici en UTF-8 valide.
 *
 * NOTE — CLIENT `service_role`
 * ----------------------------
 * l'objet est conservé pour ne pas modifier un comportement en production sans
 * pouvoir le tester : la RLS de `church_services` autorise `church_admin`, mais
 * rien ne garantit qu'elle autorise `moderator`, qui est accepté ici. En
 * contrepartie, le rôle et le `church_id` — issu du profil serveur, jamais du
 * formulaire — sont contrôlés explicitement, ce qui est le seul rempart réel
 * puisque la RLS est court-circuitée.
 */
/** Rôles d'encadrement autorisés à créer un culte ou envoyer des rappels. */
const SERVICE_ROLES = ['super_admin', 'church_admin', 'moderator'] as const

export async function createServiceAction(formData: FormData) {
  const authz = await requireAuthz({ roles: SERVICE_ROLES })
  if (!authz.ok) return { error: authzMessage(authz) }

  const { supabase, profile, userId } = authz

  if (!profile.church_id) {
    return { error: "Aucune église associée à votre compte." }
  }

  const name = (formData.get('name') as string | null)?.trim()
  const serviceDate = formData.get('service_date') as string | null
  const serviceTime = formData.get('service_time') as string | null
  const type = (formData.get('type') as string | null) || 'regular'

  if (!name || !serviceDate || !serviceTime) {
    return { error: 'Tous les champs sont requis.' }
  }

  // Contrôle du format avant la base : `church_services.service_date` est une
  // date et `service_time` une heure. Une valeur malformée était acceptée puis
  // tronquée par Postgres, ce qui produisait un culte affiché à une date
  // inattendue.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(serviceDate)) {
    return { error: 'Date de culte invalide.' }
  }

  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(serviceTime)) {
    return { error: 'Heure de culte invalide.' }
  }

  const adminClient = createAdminClient()
  const client = adminClient || supabase

  const { error } = await client.from('church_services').insert({
    // church_id vient du profil serveur : jamais du formulaire.
    church_id: profile.church_id,
    name,
    service_date: serviceDate,
    service_time: serviceTime,
    type,
    // `created_by` référence `auth.users.id`. Une session membre signée par
    // HMAC n'a pas de compte Auth : la colonne est alors laissée nulle plutôt
    // que renseignée avec un identifiant inexistant.
    created_by: userId,
  })

  if (error) {
    console.error("Création du culte impossible:", error)
    return { error: "Erreur lors de la création du culte." }
  }

  revalidatePath('/dashboard/attendance')
  return { success: true }
}

export async function sendMassServiceReminder(serviceId: string) {
  const authz = await requireAuthz({ roles: SERVICE_ROLES })
  if (!authz.ok) return { error: authzMessage(authz) }

  const { supabase, profile } = authz

  if (!profile.church_id) {
    return { error: "Aucune église associée à votre compte." }
  }

  if (!serviceId) {
    return { error: 'Culte non identifié.' }
  }

  const adminClient = createAdminClient()
  const client = adminClient || supabase

  // Filtre `church_id` INDISPENSABLE : c'est lui qui empêche l'usage
  // inter-égises. Sans lui, un identifiant forgé suffit à cibler le culte d'un
  // autre tenant, puisque le client `service_role` ne filtre rien.
  const { data: service, error: serviceError } = await client
    .from('church_services')
    .select('id, name, service_date, service_time')
    .eq('id', serviceId)
    .eq('church_id', profile.church_id)
    .maybeSingle()

  if (serviceError) {
    console.error('Rappel de masse: lecture du culte impossible:', serviceError)
    return { error: 'Erreur lors de la lecture du culte.' }
  }

  if (!service) {
    return { error: "Ce culte n'existe pas dans votre église." }
  }

  const { data: members, error: membersError } = await client
    .from('members')
    .select('id')
    .eq('church_id', profile.church_id)

  if (membersError) {
    console.error('Rappel de masse: lecture des membres impossible:', membersError)
    return { error: 'Erreur lors de la récupération des membres.' }
  }

  if (!members || members.length === 0) {
    return { error: 'Aucun membre trouvé.' }
  }

  // `toLocaleDateString` dépend de la locale du serveur : le format affiché
  // pouvait varier entre deux environnements. Le format français est fixé
  // explicitement.
  const dateFr = new Date(`${service.service_date}T00:00:00`).toLocaleDateString('fr-FR')
  const timeFr = service.service_time.slice(0, 5)

  const notifications = members.map((member) => ({
    recipient_member_id: member.id,
    type: 'service_reminder',
    title: 'Rappel de Culte',
    body: `N'oubliez pas le programme « ${service.name} » prévu le ${dateFr} à ${timeFr}. Merci de confirmer votre présence !`,
    is_read: false,
    church_id: profile.church_id,
    related_service_id: serviceId,
  }))

  const { error: notifError } = await client.from('notifications').insert(notifications)

  if (notifError) {
    console.error('Rappel de masse: écriture des notifications impossible:', notifError)
    return { error: "Erreur lors de l'envoi des rappels." }
  }

  return { success: true, count: members.length }
}
