'use server'

import { revalidatePath } from 'next/cache'
import { requireAuthz, ADMIN_ROLES, STAFF_ROLES, authzMessage } from '@/utils/authz'

/**
 * Module « Enfants ».
 *
 * Aucune de ces actions ne vérifiait l'appelant, alors que la table contient
 * des données sensibles (allergies, notes médicales, téléphone des parents).
 * `parent_id` venait du client : un utilisateur authentifié pouvait rattacher
 * un enfant à un parent d'une autre église, ou lire les enfants de n'importe
 * quelle famille en devinant un UUID.
 *
 * Chaque action passe désormais par `requireAuthz`, et les requêtes sont
 * bornées à l'église de l'appelant.
 */

export async function getKidsByParent(parentId: string) {
  const auth = await requireAuthz({
    roles: ADMIN_ROLES,
    requestedMemberId: parentId,
  })
  if (!auth.ok) throw new Error(authzMessage(auth))

  const { data, error } = await auth.supabase
    .from('kids')
    .select('*')
    .eq('parent_id', parentId)

  if (error) throw new Error(error.message)
  return data
}

export async function getAllKids() {
  const auth = await requireAuthz({ roles: ADMIN_ROLES })
  if (!auth.ok) throw new Error(authzMessage(auth))

  // La table `kids` ne porte aucune colonne d'église : le rattachement passe par
  // parent_id -> members.church_id, ce que les policies RLS appliquent déjà
  // (« Members can view kids in their church »). Aucun filtre supplémentaire
  // n'est nécessaire ici, et aucun filtre sur une colonne inexistante non plus.
  const { data, error } = await auth.supabase
    .from('kids')
    .select(`
      *,
      parent:members!inner(id, first_name, last_name, email, phone)
    `)
    .order('first_name', { ascending: true })

  if (error) throw new Error(error.message)
  return data
}

export async function addKid(data: {
  parent_id: string
  first_name: string
  last_name: string
  date_of_birth?: string
  allergies?: string
  medical_notes?: string
}) {
  const auth = await requireAuthz({
    roles: ADMIN_ROLES,
    requestedMemberId: data.parent_id,
  })
  if (!auth.ok) throw new Error(authzMessage(auth))

  if (!data.first_name?.trim() || !data.last_name?.trim()) {
    throw new Error('Le prénom et le nom de l’enfant sont obligatoires.')
  }

  // Le parent doit réellement appartenir à l'église de l'appelant : sans ce
  // contrôle, un parent_id d'une autre église aurait été accepté.
  const { data: parent } = await auth.supabase
    .from('members')
    .select('id')
    .eq('id', data.parent_id)
    .eq('church_id', auth.profile.church_id)
    .maybeSingle()

  if (!parent) throw new Error('Parent introuvable dans votre église.')

  const { data: result, error } = await auth.supabase
    .from('kids')
    .insert([
      {
        parent_id: data.parent_id,
        first_name: data.first_name.trim(),
        last_name: data.last_name.trim(),
        date_of_birth: data.date_of_birth || null,
        allergies: data.allergies?.trim() || null,
        medical_notes: data.medical_notes?.trim() || null,
      },
    ])
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/kids')
  return result
}

function generateSecurityCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const random = new Uint8Array(4)
  // crypto plutôt que Math.random : ce code sert de preuve de remise de l'enfant.
  crypto.getRandomValues(random)
  return Array.from(random, (b) => chars[b % chars.length]).join('')
}

export async function checkInKid(
  kidId: string,
  serviceId: string,
  checkedInBy: string
) {
  const auth = await requireAuthz({ roles: STAFF_ROLES })
  if (!auth.ok) throw new Error(authzMessage(auth))

  const { data: existingCheckin } = await auth.supabase
    .from('kids_checkins')
    .select('*')
    .eq('kid_id', kidId)
    .eq('service_id', serviceId)
    .is('checked_out_at', null)
    .maybeSingle()

  if (existingCheckin) {
    throw new Error('Enfant déjà pointé pour ce culte')
  }

  const securityCode = generateSecurityCode()

  const { data, error } = await auth.supabase
    .from('kids_checkins')
    .insert([
      {
        kid_id: kidId,
        service_id: serviceId,
        security_code: securityCode,
        // Colonne = UUID REFERENCES members(id) : on n'utilise plus l'argument
        // client, qui était une chaîne libre et violait la clé étrangère.
        checked_in_by: auth.profile.member_id,
      },
    ])
    .select(`
      *,
      kid:kids(first_name, last_name, parent:members(first_name, last_name, phone))
    `)
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/kids')
  return data
}

export async function checkOutKid(
  checkinId: string,
  securityCode: string,
  checkedOutBy: string
) {
  const auth = await requireAuthz({ roles: STAFF_ROLES })
  if (!auth.ok) throw new Error(authzMessage(auth))

  const { data: checkin, error: checkError } = await auth.supabase
    .from('kids_checkins')
    .select('*')
    .eq('id', checkinId)
    .maybeSingle()

  if (checkError) throw new Error(checkError.message)
  if (!checkin) throw new Error('Pointage introuvable')

  // Comparaison à temps constant : le code est une preuve de remise, sa
  // longueur réduite le rend devinable par timing.
  const expected = (checkin.security_code ?? '').toUpperCase()
  const provided = (securityCode ?? '').toUpperCase()
  const mismatch =
    expected.length !== provided.length ||
    (() => {
      let diff = 0
      for (let i = 0; i < expected.length; i++) {
        diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i)
      }
      return diff !== 0
    })()

  if (mismatch) {
    throw new Error('Code de sécurité invalide')
  }

  const { data, error } = await auth.supabase
    .from('kids_checkins')
    .update({
      checked_out_at: new Date().toISOString(),
      checked_out_by: auth.profile.member_id,
    })
    .eq('id', checkinId)
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/kids')
  return data
}

export async function getActiveCheckins(serviceId?: string) {
  const auth = await requireAuthz({ roles: STAFF_ROLES })
  if (!auth.ok) throw new Error(authzMessage(auth))

  let query = auth.supabase
    .from('kids_checkins')
    .select(`
      *,
      kid:kids(id, first_name, last_name, allergies, medical_notes, parent:members(id, first_name, last_name, phone)),
      service:church_services(id, name, service_date)
    `)
    .is('checked_out_at', null)
    .order('checked_in_at', { ascending: false })

  if (serviceId) {
    query = query.eq('service_id', serviceId)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)
  return data
}

export async function getChurchServices() {
  const auth = await requireAuthz({ roles: STAFF_ROLES })
  if (!auth.ok) throw new Error(authzMessage(auth))

  const { data, error } = await auth.supabase
    .from('church_services')
    .select('id, name, service_date')
    .eq('church_id', auth.profile.church_id)
    .order('service_date', { ascending: false })
    .limit(10)

  if (error) throw new Error(error.message)

  // Map 'name' to 'title' and 'service_date' to 'date' for UI compatibility
  return (data ?? []).map((s) => ({
    id: s.id,
    title: s.name,
    date: s.service_date,
  }))
}