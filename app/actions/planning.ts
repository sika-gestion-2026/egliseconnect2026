'use server'

import { revalidatePath } from 'next/cache'
import { requireAuthz, authzMessage } from '@/utils/authz'
import { createAdminClient } from '@/utils/supabase/admin'

/**
 * Planning des services : assignations, rappels, confirmations de présence.
 *
 * VULNÉRABILITÉS CORRIGÉES
 * ------------------------
 * Ce fichier concentrait les défauts les plus graves de l'application. Toutes
 * ses actions écrivent avec la clé `service_role`, qui contourne intégralement
 * la RLS : la RLS ne pouvait donc rien compenser, et chaque identifiant reçu
 * du client devait être validé explicitement. Ce n'était pas le cas.
 *
 * 1. `rsvpService` — AUCUNE vérification d'authentification.
 *    N'importe quel visiteur, y compris sans session, pouvait appeler l'action
 *    avec un `memberId` ET un `serviceId` choisis à la main, et inscrire une
 *    présence ou une absence au registre d'un membre de n'importe quelle
 *    église. Ces écritures alimentent les statistiques de participation et le
 *    podium des champions : le classement était falsifiable, y compris depuis
 *    l'extérieur de l'application.
 *    Le `memberId` n'est plus un paramètre : il provient du profil serveur.
 *
 * 2. `markNotificationsRead` — AUCUNE vérification d'authentification.
 *    Endpoint non authentifié permettant de marquer comme lues des
 *    notifications arbitraires : n'importe quel identifiant, dans n'importe
 *    quelle église, pouvait être neutralisé, et une notification de sécurité
 *    pouvait ainsi être cachée à son destinataire. L'écriture est désormais
 *    restreinte aux notifications adressées au membre appelant.
 *
 * 3. `refuseAssignment` et `sendReminderNotification` — authentification
 *    vérifiée, mais AUCUN contrôle de rôle.
 *    Un simple fidèle pouvait déclencher des rappels ou faire désister les
 *    autres. `refuseAssignment` empiraent la chose : le motif était libre et
 *    l'église d'avertissement était lue depuis la LIGNE CIBLEÉE, donc
 *    choisie par l'appelant — ce qui permettait de déclencher une alerte chez
 *    les encadrants d'une autre église, à volonté.
 *
 * 4. Actions d'encadrement (`assignVolunteer`, `removeAssignment`,
 *    `updateAssignmentStatus`, `sendAllReminders`) — rôle vérifié, mais
 *    ÉGLISE NON VÉRIFIÉE.
 *    `serviceId` et `memberId` étaient utilisés tels quels : un responsable
 *    pouvait assigner un membre d'une église à un culte d'une autre, supprimer
 *    une assignation d'un autre tenant, ou envoyer des rappels pour un culte
 *    qui n'était pas le sien.
 *
 * 5. `service_assignments` n'a PAS de colonne `church_id`.
 *    `refuseAssignment` la sélectionnait pourtant directement. La requête
 *    échouait, `assignment` valait `null`, et les notifications d'encadrement
 *    n'étaient jamais envoyées : la fonction « désistement » était
 *    silencieusement inopérante côté notification. L'église est désormais
 *    déduite par jointure sur `church_services`, ce qui supprime au passage
 *    une dépendance à une colonne absente des migrations.
 *
 * 6. Statuts non validés à l'exécution.
 *    `updateAssignmentStatus` et `rsvpService` déclarent leur paramètre
 *    `status` en TypeScript, ce qui ne contraint rien à l'exécution : un
 *    client peut envoyer n'importe quelle chaîne. Le CHECK de la base rejetait
 *    alors l'écriture, et l'utilisateur voyait une erreur Postgres brute. Les
 *    valeurs sont désormais validées avant l'écriture.
 */

/** Encadrement autorisé à piloter le planning. */
const PLANNING_ROLES = [
  'super_admin',
  'church_admin',
  'moderator',
  'dept_leader',
] as const

/** Valeurs autorisées par le CHECK de `service_assignments.status`. */
const ASSIGNMENT_STATUSES = ['pending', 'present', 'absent', 'replaced'] as const

/** Valeurs autorisées par le CHECK de `service_declarations.status`. */
const RSVP_STATUSES = ['present', 'absent', 'late'] as const

/** Longueur maximale d'un motif de désistement. */
const MAX_REFUSAL_REASON = 500

/** Borne le nombre d'identifiants dans un seul appel `.in()`. */
const MAX_NOTIFICATION_IDS = 200

/** `service_date` + `service_time` → date lisible, sans dépendre de la locale. */
function formatServiceDate(date: string, time?: string | null): string {
  const parsed = new Date(`${date}T00:00:00`)
  const day = Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })

  return time ? `${day} à ${String(time).substring(0, 5)}` : day
}

/** Résout une relation imbriquée PostgREST, qui peut être objet ou tableau. */
function unwrap<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

type Client = ReturnType<typeof createAdminClient>

/**
 * Charge une assignation en résolvant l'église du culte associé.
 *
 * `church_services!inner` impose que la relation existe : une assignation dont
 * le culte aurait disparu n'est jamais renvoyée, ce qui évite de traiter une
 * ligne orpheline comme valide.
 *
 * `service_assignments` ne porte pas de colonne `church_id` : l'appartenance à
 * une église se déduit par `service_id → church_services.church_id`.
 */
async function loadAssignment(client: Client, assignmentId: string) {
  const query = client

  if (!query) return { error: 'Configuration serveur incomplète.' } as const

  const { data, error } = await query
    .from('service_assignments')
    .select(
      'id, member_id, role, status, service_id, members!member_id(first_name, last_name), church_services!inner(id, church_id, name, service_date, service_time)'
    )
    .eq('id', assignmentId)
    .maybeSingle()

  if (error) {
    console.error("Planning: lecture de l'assignation impossible:", error)
    return { error: 'Impossible de vérifier cette assignation.' } as const
  }

  if (!data) return { error: 'Assignation introuvable.' } as const

  const service = unwrap(data.church_services as any)
  if (!service) {
    return { error: 'Culte introuvable pour cette assignation.' } as const
  }

  return {
    assignment: data,
    member: unwrap(data.members as any),
    service,
    churchId: service.church_id as string,
  } as const
}

/**
 * Client utilisé pour les vérifications de périmètre : `service_role` en
 * priorité.
 *
 * Ces contrôles portent sur des identifiants reçus du client, or la RLS ne peut
 * pas y répondre pour une session membre signée par HMAC (téléphone + code
 * église) : il n'y a alors aucun `auth.uid()`, donc aucune ligne n'est visible
 * et `get_user_church_id()` renvoie NULL. Interroger `authz.supabase` ici
 * reviendrait à refuser systématiquement le membre connecté par téléphone —
 * alors qu'il est légitime.
 *
 * La clé `service_role` contourne la RLS, ce qui est ici sans danger : l'église
 * de référence est celle du profil déjà validé, et c'est exactement ce que ces
 * deux fonctions vérifient.
 */
function scopedClient(supabase: any) {
  return createAdminClient() || supabase
}

/**
 * Vérifie qu'un service appartient bien à l'église de l'appelant.
 *
 * Sans ce filtre, un `serviceId` forgé suffisait à cibler le culte d'un autre
 * tenant : l'écriture se faisait par `service_role`, donc sans aucun filtrage.
 */
async function assertServiceInChurch(
  supabase: any,
  churchId: string,
  serviceId: string
): Promise<{ ok: true; service: any } | { ok: false; error: string }> {
  const { data: service, error } = await scopedClient(supabase)
    .from('church_services')
    .select('id, church_id, name, service_date, service_time')
    .eq('id', serviceId)
    .eq('church_id', churchId)
    .maybeSingle()

  if (error) {
    console.error('Planning: lecture du culte impossible:', error)
    return { ok: false, error: 'Impossible de vérifier ce culte.' }
  }

  if (!service) {
    return { ok: false, error: "Ce culte n'appartient pas à votre église." }
  }

  return { ok: true, service }
}

/** Vérifie qu'un membre appartient bien à l'église de l'appelant. */
async function assertMemberInChurch(
  supabase: any,
  churchId: string,
  memberId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error } = await scopedClient(supabase)
    .from('members')
    .select('id')
    .eq('id', memberId)
    .eq('church_id', churchId)
    .maybeSingle()

  if (error) {
    console.error('Planning: lecture du membre impossible:', error)
    return { ok: false, error: 'Impossible de vérifier ce membre.' }
  }

  if (!data) return { ok: false, error: "Ce membre n'appartient pas à votre église." }

  return { ok: true }
}

/**
 * Autorise l'accès à une assignation.
 *
 * Deux cas légitimes : le membre assigné lui-même (il peut décliner), ou un
 * encadrement de la même église (pour corriger une erreur de saisie). Le
 * super_admin, dont le périmètre est global, n'est pas borné par l'église.
 */
function canTouchAssignment(
  profile: { role: string; member_id: string | null; church_id: string | null },
  assignmentMemberId: string,
  assignmentChurchId: string
): boolean {
  if (profile.role === 'super_admin') return true

  if (
    (PLANNING_ROLES as readonly string[]).includes(profile.role) &&
    profile.church_id === assignmentChurchId
  ) {
    return true
  }

  return (
    profile.member_id === assignmentMemberId &&
    profile.church_id === assignmentChurchId
  )
}

/** Affecte un membre à un rôle de service, puis l'avertit. */
export async function assignVolunteer(
  serviceId: string,
  memberId: string,
  role: string
) {
  const authz = await requireAuthz({ roles: PLANNING_ROLES })
  if (!authz.ok) return { error: authzMessage(authz) }

  const { supabase, profile, userId } = authz
  if (!profile.church_id) {
    return { error: "Vous n'êtes rattaché à aucune église." }
  }

  if (!serviceId || !memberId || !role?.trim()) {
    return { error: 'Service, membre et rôle sont requis.' }
  }

  const churchId = profile.church_id

  // Le culte ET le membre doivent appartenir à l'église de l'appelant. Sans
  // ces deux contrôles, l'assignation créait un lien entre deux tenants.
  const serviceCheck = await assertServiceInChurch(supabase, churchId, serviceId)
  if (!serviceCheck.ok) return { error: serviceCheck.error }

  const memberCheck = await assertMemberInChurch(supabase, churchId, memberId)
  if (!memberCheck.ok) return { error: memberCheck.error }

  const { service } = serviceCheck
  const cleanRole = role.trim()

  const client = createAdminClient()
  if (!client) return { error: 'Configuration serveur incomplète.' }

  const { data: assignment, error } = await client
    .from('service_assignments')
    .insert({
      service_id: serviceId,
      member_id: memberId,
      role: cleanRole,
      status: 'present',
      created_by: userId,
    })
    .select()
    .single()

  if (error) {
    // 23505 : unique_violation sur UNIQUE(service_id, member_id, role)
    if (error.code === '23505') {
      return { error: 'Ce membre est déjà assigné à ce rôle pour ce culte.' }
    }
    console.error("Planning: affectation impossible:", error)
    return { error: "L'affectation n'a pas pu être enregistrée." }
  }

  const { error: notificationError } = await client.from('notifications').insert({
    recipient_member_id: memberId,
    church_id: churchId,
    type: 'assignment',
    title: `🙏 Vous êtes assigné(e) comme ${cleanRole}`,
    body: `Vous avez été assigné(e) au rôle « ${cleanRole} » pour le culte « ${service.name} » du ${formatServiceDate(service.service_date, service.service_time)}. Confirmez votre présence dans votre espace membre.`,
    related_service_id: serviceId,
    related_assignment_id: assignment?.id ?? null,
  })

  // L'assignation EST enregistrée : un échec de la notification ne doit pas
  // laisser croire à l'utilisateur que l'opération a été annulée. On journalise
  // sans retourner d'erreur.
  if (notificationError) {
    console.error("Planning: notification d'affectation impossible:", notificationError)
  }

  revalidatePath('/dashboard/planning')
  revalidatePath('/member-dashboard/planning')
  revalidatePath('/member-dashboard')
  return { success: true, assignment }
}

/** Retire une assignation et prévient le membre concerné. */
export async function removeAssignment(assignmentId: string) {
  const authz = await requireAuthz({ roles: PLANNING_ROLES })
  if (!authz.ok) return { error: authzMessage(authz) }

  const { profile } = authz
  if (!assignmentId) return { error: 'Assignation non identifiée.' }

  const client = createAdminClient()
  if (!client) return { error: 'Configuration serveur incomplète.' }

  // Propriété vérifiée AVANT toute écriture ou notification.
  const loaded = await loadAssignment(client, assignmentId)
  if ('error' in loaded) return { error: loaded.error }

  const { assignment, service, churchId } = loaded
  if (!canTouchAssignment(profile, assignment.member_id, churchId)) {
    return { error: "Vous n'avez pas accès à cette assignation." }
  }

  const { error: notificationError } = await client.from('notifications').insert({
    recipient_member_id: assignment.member_id,
    church_id: churchId,
    type: 'removal',
    title: 'ℹ️ Assignation annulée',
    body: `Votre assignation au rôle « ${assignment.role} » pour le culte « ${service.name} » du ${formatServiceDate(service.service_date, service.service_time)} a été annulée.`,
    related_service_id: assignment.service_id,
  })

  if (notificationError) {
    console.error('Planning: notification de retrait impossible:', notificationError)
  }

  // Écriture par `id` uniquement : l'appartenance à l'église vient d'être
  // validée, la RLS étant court-circuitée.
  const { error } = await client
    .from('service_assignments')
    .delete()
    .eq('id', assignmentId)

  if (error) {
    console.error("Planning: suppression de l'assignation impossible:", error)
    return { error: "L'assignation n'a pas pu être retirée." }
  }

  revalidatePath('/dashboard/planning')
  revalidatePath('/member-dashboard/planning')
  revalidatePath('/member-dashboard')
  return { success: true }
}

/**
 * Change le statut d'une assignation, éventuellement avec un remplaçant.
 *
 * `anyRole` : l'écran « mon planning » du membre (`MemberPlanningClient.tsx`)
 * lui permet de se déclarer présent, absent, ou de désigner un remplaçant. Un
 * filtre par rôle l'aurait bloqué. L'autorisation réelle n'est pas le rôle mais
 * le LIEN : le membre assigné lui-même, ou un encadrement de la même église —
 * ce que vérifie `canTouchAssignment`, plus précis qu'une liste de rôles.
 */
export async function updateAssignmentStatus(
  assignmentId: string,
  status: string,
  replacementMemberId?: string
) {
  const authz = await requireAuthz({ anyRole: true })
  if (!authz.ok) return { error: authzMessage(authz) }

  const { supabase, profile } = authz
  if (!assignmentId) return { error: 'Assignation non identifiée.' }

  if (!(ASSIGNMENT_STATUSES as readonly string[]).includes(status)) {
    return { error: 'Statut invalide.' }
  }

  const client = createAdminClient()
  if (!client) return { error: 'Configuration serveur incomplète.' }

  const loaded = await loadAssignment(client, assignmentId)
  if ('error' in loaded) return { error: loaded.error }

  const { assignment, churchId } = loaded
  if (!canTouchAssignment(profile, assignment.member_id, churchId)) {
    return { error: "Vous n'avez pas accès à cette assignation." }
  }

  const patch: Record<string, unknown> = { status }

  if (status === 'replaced') {
    if (!replacementMemberId) {
      return { error: 'Désignez le membre qui assure le remplacement.' }
    }

    const memberCheck = await assertMemberInChurch(
      supabase,
      churchId,
      replacementMemberId
    )
    if (!memberCheck.ok) return { error: memberCheck.error }

    patch.replacement_member_id = replacementMemberId
  } else {
    patch.replacement_member_id = null
  }

  const { error } = await client
    .from('service_assignments')
    .update(patch)
    .eq('id', assignmentId)

  if (error) {
    console.error('Planning: mise à jour du statut impossible:', error)
    return { error: "Le statut n'a pas pu être modifié." }
  }

  revalidatePath('/dashboard/planning')
  revalidatePath('/member-dashboard/planning')
  return { success: true }
}

/**
 * Marque comme lues les notifications adressées au membre appelant.
 *
 * `anyRole` : chaque membre doit pouvoir vider sa propre cloche, y compris via
 * la session téléphone + code église (HMAC), qui porte le rôle `member`.
 *
 * `.eq('recipient_member_id', …)` est la seule garantie possible ici. Sans
 * elle, l'action acceptait des identifiants forgés et écrivait avec
 * `service_role` : c'était un endpoint non authentifié capable de faire
 * disparaître n'importe quelle notification, y compris un avis de sécurité.
 */
export async function markNotificationsRead(notificationIds: string[]) {
  const authz = await requireAuthz({ anyRole: true })
  if (!authz.ok) return { error: authzMessage(authz) }

  if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
    return { success: true }
  }

  // `.in()` est traduit en une longue clause `IN (…)`. Sans plafond, un client
  // pouvait envoyer des milliers d'identifiants dans un seul appel.
  const ids = notificationIds
    .filter((id): id is string => typeof id === 'string' && id.length > 0)
    .slice(0, MAX_NOTIFICATION_IDS)

  if (ids.length === 0) return { success: true }

  const client = createAdminClient() || authz.supabase

  // `member_id` absent : aucune ligne ne peut correspondre, ce qui est le
  // comportement voulu plutôt qu'un `.eq(..., null)` silencieux.
  const { error } = await client
    .from('notifications')
    .update({ is_read: true })
    .in('id', ids)
    .eq('recipient_member_id', authz.profile.member_id ?? '__none__')

  if (error) {
    console.error('Planning: marquage des notifications impossible:', error)
    return { error: 'Impossible de marquer les notifications comme lues.' }
  }

  revalidatePath('/member-dashboard')
  return { success: true }
}

/**
 * Le membre concerné décline le service qui lui est assigné.
 *
 * Le `reason` est borné en longueur et l'église d'avertissement vient du
 * CULTE — validé contre le profil de l'appelant — et non de la ligne ciblée
 * comme auparavant.
 */
export async function refuseAssignment(assignmentId: string, reason: string) {
  const authz = await requireAuthz({ anyRole: true })
  if (!authz.ok) return { error: authzMessage(authz) }

  const { profile } = authz
  if (!assignmentId) return { error: 'Assignation non identifiée.' }

  const cleanReason = String(reason ?? '')
    .trim()
    .slice(0, MAX_REFUSAL_REASON)

  const client = createAdminClient()
  if (!client) return { error: 'Configuration serveur incomplète.' }

  const loaded = await loadAssignment(client, assignmentId)
  if ('error' in loaded) return { error: loaded.error }

  const { assignment, member, service, churchId } = loaded

  // Sans ce test, n'importe quel visiteur pouvait faire désister les autres et
  // déclencher une alerte chez des responsables qu'il choisissait.
  if (!canTouchAssignment(profile, assignment.member_id, churchId)) {
    return { error: "Vous n'avez pas accès à cette assignation." }
  }

  const { error } = await client
    .from('service_assignments')
    .update({ status: 'absent', refusal_reason: cleanReason || null })
    .eq('id', assignmentId)

  if (error) {
    console.error('Planning: refus impossible:', error)
    return { error: 'Erreur lors du refus.' }
  }

  const { data: admins } = await client
    .from('user_profiles')
    .select('member_id')
    .eq('church_id', churchId)
    .in('role', ['super_admin', 'church_admin', 'moderator', 'dept_leader'])
    .not('member_id', 'is', null)

  if (admins && admins.length > 0) {
    const memberName = member
      ? `${member.first_name} ${member.last_name}`
      : 'Un ouvrier'

    const motif = cleanReason ? ` Motif : ${cleanReason}` : ''

    const { error: notificationError } = await client.from('notifications').insert(
      admins.map((a: any) => ({
        recipient_member_id: a.member_id,
        church_id: churchId,
        type: 'removal',
        title: '⚠️ Désistement au Planning',
        body: `${memberName} a décliné son service de ${assignment.role} pour le culte « ${service.name} » du ${formatServiceDate(service.service_date, service.service_time)}.${motif}`,
        is_read: false,
      }))
    )

    if (notificationError) {
      console.error(
        'Planning: notification de désistement impossible:',
        notificationError
      )
    }
  }

  revalidatePath('/dashboard/planning')
  revalidatePath('/member-dashboard/planning')
  revalidatePath('/member-dashboard')
  return { success: true }
}

/** Envoie un rappel manuel à un membre pour son service à venir. */
export async function sendReminderNotification(assignmentId: string) {
  const authz = await requireAuthz({ roles: PLANNING_ROLES })
  if (!authz.ok) return { error: authzMessage(authz) }

  const { profile } = authz
  if (!assignmentId) return { error: 'Assignation non identifiée.' }

  const client = createAdminClient()
  if (!client) return { error: 'Configuration serveur incomplète.' }

  const loaded = await loadAssignment(client, assignmentId)
  if ('error' in loaded) return { error: loaded.error }

  const { assignment, service, churchId } = loaded
  if (!canTouchAssignment(profile, assignment.member_id, churchId)) {
    return { error: "Vous n'avez pas accès à cette assignation." }
  }

  const { error } = await client.from('notifications').insert({
    recipient_member_id: assignment.member_id,
    church_id: churchId,
    // 'assignment' et non 'reminder' : 'reminder' ne fait pas partie des types
    // acceptés par la contrainte CHECK de `notifications.type`.
    type: 'assignment',
    title: `🔔 RAPPEL 30 MIN : Service de ${assignment.role}`,
    body: `Le culte « ${service.name} » approche à grands pas ! Soyez prêt(e) pour votre service de ${assignment.role} dans environ 30 minutes.`,
    related_service_id: assignment.service_id,
    related_assignment_id: assignmentId,
  })

  if (error) {
    console.error("Planning: rappel impossible:", error)
    return { error: "Erreur lors de l'envoi du rappel." }
  }

  return { success: true }
}

/** Envoie un rappel à tous les membres assignés à un culte. */
export async function sendAllReminders(serviceId: string) {
  const authz = await requireAuthz({ roles: PLANNING_ROLES })
  if (!authz.ok) return { error: authzMessage(authz) }

  const { supabase, profile } = authz
  if (!profile.church_id) return { error: "Vous n'êtes rattaché à aucune église." }

  const serviceCheck = await assertServiceInChurch(
    supabase,
    profile.church_id,
    serviceId
  )
  if (!serviceCheck.ok) return { error: serviceCheck.error }

  const { service } = serviceCheck

  const { data: assignments, error: assignmentsError } = await supabase
    .from('service_assignments')
    .select('id, member_id, role')
    .eq('service_id', serviceId)

  if (assignmentsError) {
    console.error('Planning: lecture des assignations impossible:', assignmentsError)
    return { error: 'Erreur lors de la lecture des assignations.' }
  }

  if (!assignments || assignments.length === 0) {
    return { error: 'Aucun ouvrier à rappeler.' }
  }

  const client = createAdminClient() || supabase

  const { error } = await client.from('notifications').insert(
    assignments.map((a) => ({
      recipient_member_id: a.member_id,
      church_id: profile.church_id,
      type: 'assignment',
      title: '🔔 ALERTE : Culte dans 30 Minutes !',
      body: `C'est presque l'heure ! Préparez-vous pour votre service de ${a.role} pour le culte « ${service.name} » du ${formatServiceDate(service.service_date, service.service_time)}.`,
      related_service_id: serviceId,
      related_assignment_id: a.id,
    }))
  )

  if (error) {
    console.error('Planning: rappels groupés impossibles:', error)
    return { error: "Erreur lors de l'envoi des rappels." }
  }

  return { success: true, count: assignments.length }
}

/**
 * Le membre confirme SA présence ou SA absence à un culte.
 *
 * CHANGEMENT DE SIGNATURE
 * -----------------------
 * `memberId` a été retiré des paramètres. Il venait du client et était écrit
 * avec `service_role`, sans aucune authentification : n'importe quel visiteur
 * pouvait déclarer une présence au nom de n'importe quel membre, dans
 * n'importe quelle église. Ces écritures remontent dans le podium des champions
 * et dans les taux de participation — le classement était falsifiable.
 *
 * L'identité vient désormais du profil serveur. `NotificationBell.tsx` a été
 * mis à jour : il n'a plus de `memberId` à transmettre.
 *
 * `anyRole` : un membre doit pouvoir répondre pour lui-même, y compris via la
 * session téléphone + code église (HMAC).
 */
export async function rsvpService(serviceId: string, status: string) {
  const authz = await requireAuthz({ anyRole: true })
  if (!authz.ok) return { error: authzMessage(authz) }

  const memberId = authz.profile.member_id
  if (!memberId) {
    return { error: 'Profil membre introuvable. Veuillez vous reconnecter.' }
  }

  if (!(RSVP_STATUSES as readonly string[]).includes(status)) {
    return { error: 'Réponse invalide.' }
  }

  return writeRsvp(authz.supabase, memberId, serviceId, status)
}

/**
 * Variante d'encadrement : déclare une réponse pour un membre de son église.
 *
 * Volontairement distincte de `rsvpService` : l'identité déclarée est un
 * choix explicite du code serveur, jamais un paramètre fourni par le client.
 * `requestedMemberId` empêche un encadrement de viser un membre d'un autre
 * tenant, et `assertServiceInChurch` fait de même pour le culte.
 */
export async function rsvpServiceForMember(
  memberId: string,
  serviceId: string,
  status: string
) {
  const authz = await requireAuthz({
    roles: PLANNING_ROLES,
    requestedMemberId: memberId,
  })
  if (!authz.ok) return { error: authzMessage(authz) }

  const { supabase, profile } = authz
  if (!profile.church_id) return { error: "Vous n'êtes rattaché à aucune église." }

  if (!(RSVP_STATUSES as readonly string[]).includes(status)) {
    return { error: 'Réponse invalide.' }
  }

  const serviceCheck = await assertServiceInChurch(supabase, profile.church_id, serviceId)
  if (!serviceCheck.ok) return { error: serviceCheck.error }

  const memberCheck = await assertMemberInChurch(supabase, profile.church_id, memberId)
  if (!memberCheck.ok) return { error: memberCheck.error }

  return writeRsvp(supabase, memberId, serviceId, status)
}

/**
 * Écriture commune aux deux RSVP, après validation de l'identité et de l'église.
 *
 * `onConflict` porte sur UNIQUE(service_id, member_id) : répondre deux fois au
 * même culte met à jour la déclaration au lieu d'en créer une seconde.
 */
async function writeRsvp(
  supabase: any,
  memberId: string,
  serviceId: string,
  status: string
) {
  const client = createAdminClient() || supabase

  const { error } = await client
    .from('service_declarations')
    .upsert(
      { service_id: serviceId, member_id: memberId, status },
      { onConflict: 'service_id,member_id' }
    )

  if (error) {
    console.error('Planning: RSVP impossible:', error)
    return { error: 'Erreur lors de la confirmation.' }
  }

  revalidatePath('/dashboard/attendance')
  revalidatePath('/member-dashboard')
  return { success: true }
}
