'use server'

import { revalidatePath } from 'next/cache'
import { requireAuthz, authzMessage } from '@/utils/authz'
import { createAdminClient } from '@/utils/supabase/admin'

/**
 * Réglages de l'horaire de culte et gestion des cultes générés.
 *
 * VULNÉRABILITÉS CORRIGÉES
 * ------------------------
 * `updateServiceAction` et `deleteServiceAction` ne vérifiaient QU'UNE chose :
 * qu'un utilisateur était connecté. Elles écrivaient ensuite avec la clé
 * `service_role`, qui contourne intégralement la RLS, sur un `serviceId`
 * entièrement fourni par le client.
 *
 * Conséquence directe : n'importe quel compte authentifié — un simple fidèle
 * suffit — pouvait réécrire n'importe quel culte de n'importe quelle église, ou
 * le SUPPRIMER. Il suffisait de forger un identifiant UUID dans l'appel. Le
 * rôle n'était pas vérifié, l'église du culte n'était pas comparée à celle de
 * l'appelant, et aucune confirmation n'était demandée pour la suppression.
 *
 * `saveScheduleSettings` et `generateScheduleAction` étaient dans le même cas :
 * aucune vérification de rôle, donc un membre pouvait réécrire l'horaire de son
 * église et y générer des cultes.
 *
 * Autre défaut corrigé : la déduplication des cultes générés portait sur
 * `date + heure` sans le NOM du culte. Deux services différents programmés le
 * même jour à la même heure écrasaient donc le premier en silence.
 */

/** Encadrement autorisé à piloter l'horaire et les cultes. */
const SCHEDULE_ROLES = ['super_admin', 'church_admin', 'moderator'] as const

/** Lecture seule : tout membre de l'église doit voir l'horaire. */
const READ_ROLES = [
  'super_admin',
  'church_admin',
  'moderator',
  'mutual_manager',
  'dept_leader',
  'scanner',
  'member',
] as const

const dayMap: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
}

/** Plafond de génération : au-delà, la table enfle et la page se fige. */
const MAX_MONTHS = 12

/** Types de culte acceptés (colonne `church_services.type`). */
const SERVICE_TYPES = ['regular', 'special', 'prayer', 'conference'] as const

/** Modèles appliqués quand l'église n'a rien configuré. */
const DEFAULT_WORSHIP_DAYS = [
  { day: 'Thursday', start_time: '18:30', end_time: '20:30', name: 'Jeudi Solution' },
  {
    day: 'Sunday',
    start_time: '08:30',
    end_time: '11:30',
    name: "Culte d'Adoration Prophétique",
  },
]

function getNextDayOfWeek(date: Date, dayOfWeek: number) {
  const resultDate = new Date(date.getTime())
  resultDate.setDate(date.getDate() + (7 + dayOfWeek - date.getDay()) % 7)
  return resultDate
}

/**
 * Date au format `YYYY-MM-DD` EN HEURE LOCALE.
 *
 * `toISOString()` convertit en UTC : à UTC+1 ou +2 — le fuseau du Congo, où
 * cette application est déployée — minuit local tombe la veille à 22:00 ou
 * 23:00 UTC, et `split('T')[0]` renvoyait donc la date DU JOUR SUIVANT. Chaque
 * culte généré était programmé un jour trop tôt. On formate donc les
 * composantes locales directement.
 */
function toLocalIsoDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** `HH:MM` → `HH:MM:SS`, format attendu par `church_services.service_time`. */
function toSeconds(time: string): string {
  return time.length === 5 ? `${time}:00` : time
}

/** Valide un créneau `worship_days` reçu du client avant écriture. */
function validateWorshipDays(value: unknown): { ok: true; days: any[] } | { ok: false; error: string } {
  if (!Array.isArray(value)) {
    return { ok: false, error: "Le format des jours de culte est invalide." }
  }

  if (value.length > 7) {
    return { ok: false, error: 'Sept jours au maximum peuvent être configurés.' }
  }

  const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/

  for (const entry of value) {
    if (!entry || typeof entry !== 'object') {
      return { ok: false, error: 'Un créneau de culte est mal formé.' }
    }

    const { day, name, start_time: startTime, end_time: endTime } = entry as Record<string, unknown>

    if (typeof day !== 'string' || !(day in dayMap)) {
      return { ok: false, error: `Jour de semaine inconnu : ${String(day)}` }
    }

    if (typeof name !== 'string' || !name.trim()) {
      return { ok: false, error: 'Chaque créneau doit porter un nom.' }
    }

    if (name.length > 120) {
      return { ok: false, error: 'Le nom du culte est trop long (120 caractères maximum).' }
    }

    if (typeof startTime !== 'string' || !timeRe.test(startTime)) {
      return { ok: false, error: `Heure de début invalide pour « ${name} » (format attendu : HH:MM).` }
    }

    if (typeof endTime !== 'string' || !timeRe.test(endTime)) {
      return { ok: false, error: `Heure de fin invalide pour « ${name} » (format attendu : HH:MM).` }
    }

    if (endTime <= startTime) {
      return { ok: false, error: `L'heure de fin de « ${name} » doit suivre l'heure de début.` }
    }
  }

  return { ok: true, days: value }
}

/** Applique les valeurs par défaut si l'église n'a rien configuré. */
function resolveWorshipDays(stored: unknown): any[] {
  if (!Array.isArray(stored) || stored.length === 0) {
    return DEFAULT_WORSHIP_DAYS
  }

  const validated = validateWorshipDays(stored)
  // Un créneau corrompu en base ne doit pas rendre l'écran inutilisable : on
  // l'ignore et on retombe sur le modèle par défaut plutôt que d'échouer.
  return validated.ok ? validated.days : DEFAULT_WORSHIP_DAYS
}

export async function getScheduleSettings() {
  const authz = await requireAuthz({ roles: READ_ROLES })
  if (!authz.ok) return { error: authzMessage(authz) }

  const { supabase, profile } = authz
  if (!profile.church_id) return { error: 'Aucune église associée à votre compte.' }

  const { data: church } = await supabase
    .from('churches')
    .select('worship_days')
    .eq('id', profile.church_id)
    .maybeSingle()

  return { success: true, worshipDays: resolveWorshipDays(church?.worship_days) }
}

export async function saveScheduleSettings(worshipDays: unknown) {
  const authz = await requireAuthz({ roles: SCHEDULE_ROLES })
  if (!authz.ok) return { error: authzMessage(authz) }

  const { supabase, profile } = authz
  if (!profile.church_id) return { error: 'Aucune église associée à votre compte.' }

  // `worshipDays` arrivait en `any[]` et était écrit tel quel dans une colonne
  // JSONB : un membre pouvait y stocker n'importe quelle structure, que rien
  // ne relisait ensuite. La forme est désormais validée avant écriture.
  const validated = validateWorshipDays(worshipDays)
  if (!validated.ok) return { error: validated.error }

  const { error } = await supabase
    .from('churches')
    .update({ worship_days: validated.days })
    .eq('id', profile.church_id)

  if (error) {
    console.error("Enregistrement de l'horaire impossible:", error)
    return { error: "L'horaire n'a pas pu être enregistré." }
  }

  revalidatePath('/dashboard/planning')
  revalidatePath('/dashboard/settings')
  return { success: true }
}

export async function generateScheduleAction(months: number) {
  const authz = await requireAuthz({ roles: SCHEDULE_ROLES })
  if (!authz.ok) return { error: authzMessage(authz) }

  const { supabase, profile, userId } = authz
  if (!profile.church_id) return { error: 'Aucune église associée à votre compte.' }

  const churchId = profile.church_id

  // `months` venait du client sans être borné. Une valeur extravagante
  // produisait des dizaines de milliers d'insertions en une seule requête :
  // la table enfle et le tableau de bord devient inutilisable.
  const span = Number(months)
  if (!Number.isInteger(span) || span < 1 || span > MAX_MONTHS) {
    return { error: `Choisissez un nombre de mois entre 1 et ${MAX_MONTHS}.` }
  }

  const { data: church } = await supabase
    .from('churches')
    .select('worship_days')
    .eq('id', churchId)
    .maybeSingle()

  const defaults = resolveWorshipDays(church?.worship_days)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const endDate = new Date(today)
  endDate.setMonth(today.getMonth() + span)

  const rowsToInsert: Record<string, unknown>[] = []

  for (const def of defaults) {
    const dayNum = dayMap[def.day]
    if (dayNum === undefined) continue

    const currentDate = getNextDayOfWeek(today, dayNum)
    const rawTime: string = def.start_time ?? '09:00'

    while (currentDate <= endDate) {
      const dateString = toLocalIsoDate(currentDate)

      rowsToInsert.push({
        church_id: churchId,
        name: def.name || 'Culte',
        service_date: dateString,
        // Normalisé en `HH:MM:SS` : la variable `timeString` calculée
        // auparavant n'était jamais utilisée, si bien que les cultes créés ici
        // portaient `HH:MM` alors que le reste de l'application écrit
        // `HH:MM:SS`. Deux représentations de la même colonne rendaient la
        // déduplication ci-dessous incapable de reconnaître un doublon.
        service_time: toSeconds(rawTime),
        type: 'regular',
        created_by: userId,
      })

      currentDate.setDate(currentDate.getDate() + 7)
    }
  }

  if (rowsToInsert.length === 0) return { success: true, count: 0 }

  // Dédoublonnage sur date + heure + NOM.
  //
  // La clé omettait le nom : deux cultes différents le même jour à la même
  // heure se partageaient la même clé, et le second était silencieusement
  // écarté de la génération.
  const { data: existing } = await supabase
    .from('church_services')
    .select('name, service_date, service_time')
    .eq('church_id', churchId)

  const existingSet = new Set(
    (existing || []).map(
      (s: any) =>
        `${s.name}_${s.service_date}_${String(s.service_time).substring(0, 5)}`
    )
  )

  const newRows = rowsToInsert.filter(
    (row) =>
      !existingSet.has(
        `${row.name}_${row.service_date}_${String(row.service_time).substring(0, 5)}`
      )
  )

  if (newRows.length === 0) {
    return {
      success: true,
      count: 0,
      message: 'Tous les cultes existent déjà pour cette période.',
    }
  }

  const adminClient = createAdminClient()
  const client = adminClient || supabase

  const { error: insertError } = await client.from('church_services').insert(newRows)

  if (insertError) {
    console.error("Insert error:", insertError)
    return { error: `Erreur d'insertion: ${insertError.message}` }
  }

  revalidatePath('/dashboard/attendance')
  revalidatePath('/dashboard/planning')
  return { success: true, count: newRows.length }
}

export async function updateServiceAction(
  serviceId: string,
  data: {
    name?: string
    service_date?: string
    service_time?: string
    type?: string
  }
) {
  const authz = await requireAuthz({ roles: SCHEDULE_ROLES })
  if (!authz.ok) return { error: authzMessage(authz) }

  const { supabase, profile } = authz
  if (!profile.church_id) return { error: 'Aucune église associée à votre compte.' }

  if (!serviceId) return { error: 'Culte non identifié.' }

  // Recopie champ par champ dans un objet neuf.
  //
  // `data` venait du client et était passé tel quel à `update()`. Un
  // appelant pouvait donc non seulement réécrire les quatre champs du
  // formulaire, mais aussi injecter N'IMPORTE QUELLE colonne de
  // `church_services` : `church_id` pour déplacer un culte vers un autre
  // tenant, `created_by` pour réécrire l'audit. On ne retient que les champs
  // réellement éditables.
  const patch: Record<string, unknown> = {}

  if (typeof data.name === 'string') {
    const name = data.name.trim()
    if (!name) return { error: 'Le nom du culte est obligatoire.' }
    if (name.length > 120) return { error: 'Le nom du culte est trop long.' }
    patch.name = name
  }

  if (typeof data.service_date === 'string') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.service_date)) {
      return { error: 'Date de culte invalide (format attendu : AAAA-MM-JJ).' }
    }
    patch.service_date = data.service_date
  }

  if (typeof data.service_time === 'string') {
    if (!/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(data.service_time)) {
      return { error: 'Heure de culte invalide (format attendu : HH:MM).' }
    }
    patch.service_time = toSeconds(data.service_time)
  }

  if (typeof data.type === 'string') {
    if (!(SERVICE_TYPES as readonly string[]).includes(data.type)) {
      return { error: 'Type de culte invalide.' }
    }
    patch.type = data.type
  }

  if (Object.keys(patch).length === 0) {
    return { error: 'Aucune modification à enregistrer.' }
  }

  const adminClient = createAdminClient()
  const client = adminClient || supabase

  // `.eq('church_id', profile.church_id)` n'est pas décoratif : c'est lui qui
  // empêche la modification inter-églises, la RLS étant court-circuitée par le
  // client `service_role`. Un `serviceId` forgé ne cible donc plus rien.
  const { error } = await client
    .from('church_services')
    .update(patch)
    .eq('id', serviceId)
    .eq('church_id', profile.church_id)

  if (error) {
    console.error('Mise à jour du culte impossible:', error)
    return { error: 'Erreur: ' + error.message }
  }

  revalidatePath('/dashboard/attendance')
  revalidatePath('/dashboard/planning')
  return { success: true }
}

export async function deleteServiceAction(serviceId: string) {
  const authz = await requireAuthz({ roles: SCHEDULE_ROLES })
  if (!authz.ok) return { error: authzMessage(authz) }

  const { supabase, profile } = authz
  if (!profile.church_id) return { error: 'Aucune église associée à votre compte.' }

  if (!serviceId) return { error: 'Culte non identifié.' }

  const adminClient = createAdminClient()
  const client = adminClient || supabase

  const { error } = await client
    .from('church_services')
    .delete()
    .eq('id', serviceId)
    .eq('church_id', profile.church_id)

  if (error) {
    console.error('Suppression du culte impossible:', error)
    return { error: 'Erreur: ' + error.message }
  }

  revalidatePath('/dashboard/attendance')
  revalidatePath('/dashboard/planning')
  return { success: true }
}
