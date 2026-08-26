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

// Assign a member to a service role + send notification
export async function assignVolunteer(serviceId: string, memberId: string, role: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorisé' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('church_id')
    .eq('id', user.id)
    .single()

  const adminClient = createAdminClient()
  const client = adminClient || supabase

  // Insert assignment
  const { data: assignment, error } = await client
    .from('service_assignments')
    .insert({
      service_id: serviceId,
      member_id: memberId,
      role: role,
      status: 'present',
      created_by: user.id
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') { // 23505 is the PostgreSQL code for unique_violation
      return { error: 'Ce membre est déjà assigné à ce rôle pour ce culte.' }
    }
    console.error('Error assigning:', error)
    return { error: error.message }
  }

  // Fetch service info for notification
  const { data: service } = await supabase
    .from('church_services')
    .select('name, service_date, service_time')
    .eq('id', serviceId)
    .single()

  // Fetch member info for notification  
  const { data: member } = await supabase
    .from('members')
    .select('first_name, last_name')
    .eq('id', memberId)
    .single()

  if (service && member && profile?.church_id) {
    const dateFormatted = new Date(service.service_date + 'T00:00:00').toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long'
    })
    const timeFormatted = service.service_time?.substring(0, 5)

    // Send notification to the assigned member
    await client.from('notifications').insert({
      recipient_member_id: memberId,
      church_id: profile.church_id,
      type: 'assignment',
      title: `🙏 Vous êtes assigné(e) comme ${role}`,
      body: `Vous avez été assigné(e) au rôle "${role}" pour le culte "${service.name}" du ${dateFormatted} à ${timeFormatted}. Confirmez votre présence dans votre espace membre.`,
      related_service_id: serviceId,
      related_assignment_id: assignment?.id || null
    })
  }

  revalidatePath('/dashboard/planning')
  revalidatePath('/member-dashboard/planning')
  revalidatePath('/member-dashboard')
  return { success: true, assignment }
}

// Remove an assignment + notify member
export async function removeAssignment(assignmentId: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorisé' }

  // Fetch assignment before deleting
  const { data: existing } = await supabase
    .from('service_assignments')
    .select('member_id, role, service_id, church_services(name, service_date, service_time)')
    .eq('id', assignmentId)
    .single()

  const adminClient = createAdminClient()
  const client = adminClient || supabase

  // Notify the member of removal
  if (existing) {
    const svc = existing.church_services as any
    const { data: profile } = await supabase.from('user_profiles').select('church_id').eq('id', user.id).single()
    if (svc && profile?.church_id) {
      const dateFormatted = new Date(svc.service_date + 'T00:00:00').toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long'
      })
      await client.from('notifications').insert({
        recipient_member_id: existing.member_id,
        church_id: profile.church_id,
        type: 'removal',
        title: `ℹ️ Assignation annulée`,
        body: `Votre assignation au rôle "${existing.role}" pour le culte "${svc.name}" du ${dateFormatted} a été annulée.`,
        related_service_id: existing.service_id
      })
    }
  }

  const { error } = await client.from('service_assignments').delete().eq('id', assignmentId)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/planning')
  revalidatePath('/member-dashboard/planning')
  revalidatePath('/member-dashboard')
  return { success: true }
}

// Update assignment status
export async function updateAssignmentStatus(
  assignmentId: string,
  status: 'pending' | 'present' | 'absent' | 'replaced',
  replacementMemberId?: string
) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorisé' }

  const payload: any = { status }
  if (status === 'replaced' && replacementMemberId) {
    payload.replacement_member_id = replacementMemberId
  } else if (status !== 'replaced') {
    payload.replacement_member_id = null
  }

  const adminClient = createAdminClient()
  const client = adminClient || supabase

  const { error } = await client
    .from('service_assignments')
    .update(payload)
    .eq('id', assignmentId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/planning')
  revalidatePath('/member-dashboard/planning')
  return { success: true }
}

// Mark notifications as read
export async function markNotificationsRead(notificationIds: string[]) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const adminClient = createAdminClient()
  const client = adminClient || supabase

  await client
    .from('notifications')
    .update({ is_read: true })
    .in('id', notificationIds)

  revalidatePath('/member-dashboard')
  return { success: true }
}

// Refuse an assignment
export async function refuseAssignment(assignmentId: string, reason: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorisé' }

  const adminClient = createAdminClient()
  const client = adminClient || supabase

  const { error } = await client
    .from('service_assignments')
    .update({ status: 'absent', refusal_reason: reason })
    .eq('id', assignmentId)

  if (error) {
    console.error("refuse error", error)
    return { error: 'Erreur lors du refus' }
  }

  revalidatePath('/dashboard/planning')
  revalidatePath('/member-dashboard/planning')
  revalidatePath('/member-dashboard')
  return { success: true }
}
