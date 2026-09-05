'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key || key === 'METTEZ_VOTRE_CLE_SERVICE_ROLE_ICI') return null
  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

export async function createServiceAction(formData: FormData) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const name = formData.get('name') as string
  const service_date = formData.get('service_date') as string
  const service_time = formData.get('service_time') as string
  const type = (formData.get('type') as string) || 'regular'

  if (!name || !service_date || !service_time) {
    return { error: 'Tous les champs sont requis.' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorisé' }

  const { data: profile } = await supabase.from('user_profiles').select('church_id, role').eq('id', user.id).single()
  if (!profile?.church_id) return { error: 'Aucune église associée.' }

  if (!['super_admin', 'church_admin', 'moderator'].includes(profile.role)) {
    return { error: 'Non autorisé à créer un culte.' }
  }

  // Use admin client to bypass RLS
  const adminClient = createAdminClient()
  const client = adminClient || supabase

  const { error } = await client.from('church_services').insert({
    church_id: profile.church_id,
    name,
    service_date,
    service_time,
    type,
    created_by: user.id
  })

  if (error) return { error: 'Erreur: ' + error.message }

  revalidatePath('/dashboard/attendance')
  return { success: true }
}

export async function sendMassServiceReminder(serviceId: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorisé' }

  const { data: profile } = await supabase.from('user_profiles').select('church_id, role').eq('id', user.id).single()
  if (!profile?.church_id) return { error: 'Aucune église associée.' }

  if (!['super_admin', 'church_admin', 'moderator'].includes(profile.role)) {
    return { error: 'Non autorisé à envoyer des rappels.' }
  }

  // Use admin client to bypass RLS
  const adminClient = createAdminClient()
  const client = adminClient || supabase

  // Get service details
  const { data: service, error: serviceError } = await client
    .from('church_services')
    .select('*')
    .eq('id', serviceId)
    .single()

  if (serviceError || !service) return { error: 'Culte introuvable.' }

  // Get all members of the church
  const { data: members, error: membersError } = await client
    .from('members')
    .select('id')
    .eq('church_id', profile.church_id)

  if (membersError) return { error: 'Erreur lors de la récupération des membres.' }
  if (!members || members.length === 0) return { error: 'Aucun membre trouvé.' }

  // Create notifications
  const notifications = members.map(member => ({
    recipient_member_id: member.id,
    type: 'service_reminder',
    title: 'Rappel de Culte',
    body: `N'oubliez pas le programme "${service.name}" prévu le ${new Date(service.service_date).toLocaleDateString('fr-FR')} à ${service.service_time.substring(0, 5)}. Merci de confirmer votre présence !`,
    is_read: false,
    church_id: profile.church_id,
    related_service_id: serviceId
  }))

  const { error: notifError } = await client
    .from('notifications')
    .insert(notifications)

  if (notifError) return { error: 'Erreur lors de l\'envoi des rappels: ' + notifError.message }

  return { success: true, count: members.length }
}
