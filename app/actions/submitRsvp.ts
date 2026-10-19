'use server'

import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { verifyMemberSession } from '@/utils/memberSession'

/**
 * Valeurs acceptées par la contrainte CHECK de `service_declarations.status`.
 * On les valide ici pour renvoyer un message clair, au lieu de laisser Postgres
 * rejeter l'insertion avec une erreur brute.
 */
const ALLOWED_STATUSES = ['present', 'absent', 'late'] as const

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

/** `YYYY-MM-DD` — refuse toute autre forme avant d'atteindre la base. */
function isIsoDate(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value))
  )
}

/** `HH:MM` ou `HH:MM:SS`, 00-23 / 00-59. */
function isIsoTime(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
  if (!m) return false
  const h = Number(m[1])
  const min = Number(m[2])
  const sec = m[3] === undefined ? 0 : Number(m[3])
  return h <= 23 && min <= 59 && sec <= 59
}

/** Normalise en `HH:MM:SS`, format attendu par `church_services.service_time`. */
function toServiceTime(value: string): string {
  const [h, m, s = '00'] = value.trim().split(':')
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}:${s.padStart(2, '0')}`
}

export async function submitRsvpAction(formData: FormData) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const admin = getAdmin()

  let serviceId = formData.get('service_id') as string
  const status = formData.get('status') as string
  const reason = formData.get('reason') as string
  const notes = formData.get('notes') as string

  if (!serviceId) {
    return { error: 'Culte manquant.' }
  }

  if (!ALLOWED_STATUSES.includes(status as (typeof ALLOWED_STATUSES)[number])) {
    return { error: 'Réponse invalide.' }
  }

  // --- 1. RÉSOUDRE L'IDENTITÉ (serveur uniquement, jamais le formulaire) ---
  let memberId: string | null = null
  let churchId: string | null = null

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('member_id, church_id')
      .eq('id', user.id)
      .maybeSingle()
    memberId = profile?.member_id || null
    churchId = profile?.church_id || null
  }

  // Repli sur la session membre signée (téléphone + code église).
  if (!memberId) {
    const memberSession = cookieStore.get('member_session')?.value
    const session = memberSession ? verifyMemberSession(memberSession) : null
    if (session) {
      memberId = session.member_id
      churchId = session.church_id
    }
  }

  if (!memberId || !churchId) {
    return { error: 'Profil membre introuvable. Veuillez vous reconnecter.' }
  }

  // --- 2. SERVICE RÉCURRENT VIRTUEL → matérialisation en base ----------------
  if (serviceId.startsWith('recurring-')) {
    const serviceDate = formData.get('service_date') as string
    const serviceTime = formData.get('service_time') as string
    const serviceName = formData.get('service_name') as string

    if (!isIsoDate(serviceDate) || !isIsoTime(serviceTime)) {
      return { error: 'Date ou heure de culte invalide.' }
    }

    const normalizedTime = toServiceTime(serviceTime)

    const { data: existing } = await admin
      .from('church_services')
      .select('id')
      .eq('church_id', churchId)
      .eq('service_date', serviceDate)
      .eq('service_time', normalizedTime)
      .maybeSingle()

    if (existing) {
      serviceId = existing.id
    } else {
      const { data: created, error: createError } = await admin
        .from('church_services')
        .insert({
          church_id: churchId,
          name: serviceName?.trim() || 'Culte',
          service_date: serviceDate,
          service_time: normalizedTime,
          type: 'regular',
        })
        .select('id')
        .single()

      if (createError || !created) {
        return { error: "Impossible de créer le service. Contactez l'administrateur." }
      }
      serviceId = created.id
    }
  }

  // --- 3. VÉRIFIER QUE LE CULTE APPARTIENT À L'ÉGLISE DE L'AUTEUR ----------
  //
  // POINT DE SÉCURITÉ ESSENTIEL.
  //
  // Les écritures ci-dessous passent par la clé service_role, qui contourne
  // intégralement la RLS. `service_id` venant du formulaire, rien ne vérifiait
  // que le culte visé appartenait à l'église de l'appelant : un membre pouvait
  // se déclarer présent sur un culte d'une AUTRE église, ce qui polluait ses
  // statistiques, le podium de présence et le taux de participation de ce
  // tenant. Ce contrôle ne peut pas être délégué à la RLS puisque la RLS est
  // justement court-circuitée ici.
  const { data: service, error: serviceError } = await admin
    .from('church_services')
    .select('id, church_id')
    .eq('id', serviceId)
    .maybeSingle()

  if (serviceError) {
    console.error('RSVP: lecture du culte impossible:', serviceError)
    return { error: 'Culte introuvable.' }
  }

  if (!service) {
    return { error: 'Culte introuvable.' }
  }

  if (service.church_id !== churchId) {
    return { error: "Ce culte n'appartient pas à votre église." }
  }

  // --- 4. ENREGISTRER LA DÉCLARATION ----------------------------------------
  const { data: existing } = await admin
    .from('service_declarations')
    .select('id')
    .eq('service_id', serviceId)
    .eq('member_id', memberId)
    .maybeSingle()

  const payload = {
    status,
    reason: reason?.trim() || null,
    notes: notes?.trim() || null,
  }

  const { error } = existing
    ? await admin.from('service_declarations').update(payload).eq('id', existing.id)
    : await admin.from('service_declarations').insert({
        ...payload,
        service_id: serviceId,
        member_id: memberId,
      })

  if (error) {
    console.error('RSVP error:', error)
    return { error: "Erreur lors de l'enregistrement de votre réponse." }
  }

  revalidatePath('/member-dashboard')
  revalidatePath('/dashboard/attendance')
  return { success: true }
}