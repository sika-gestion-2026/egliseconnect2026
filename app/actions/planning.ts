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
    .select('church_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || !['super_admin', 'church_admin', 'moderator', 'dept_leader'].includes(profile.role)) {
    return { error: 'Non autorisé à assigner des rôles.' }
  }

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

  const { data: profileForCheck } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  if (!profileForCheck || !['super_admin', 'church_admin', 'moderator', 'dept_leader'].includes(profileForCheck.role)) {
    return { error: 'Non autorisé à retirer une assignation.' }
  }

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

  const { data: profileForCheck } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  if (!profileForCheck || !['super_admin', 'church_admin', 'moderator', 'dept_leader'].includes(profileForCheck.role)) {
    return { error: 'Non autorisé à modifier le statut.' }
  }

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

  // Fetch assignment details for notification
  const { data: assignment } = await client
    .from('service_assignments')
    .select('church_id, role, member_id, members!member_id(first_name, last_name)')
    .eq('id', assignmentId)
    .single()

  const { error } = await client
    .from('service_assignments')
    .update({ status: 'absent', refusal_reason: reason })
    .eq('id', assignmentId)

  if (error) {
    console.error("refuse error", error)
    return { error: 'Erreur lors du refus' }
  }

  // Notify admins
  if (assignment && assignment.church_id) {
    const { data: admins } = await client
      .from('user_profiles')
      .select('member_id')
      .eq('church_id', assignment.church_id)
      .in('role', ['super_admin', 'church_admin', 'moderator', 'dept_leader'])
      .not('member_id', 'is', null)
    
    if (admins && admins.length > 0) {
      const memberName = assignment.members ? `${(assignment.members as any).first_name} ${(assignment.members as any).last_name}` : 'Un ouvrier'
      
      const adminNotifs = admins.map(a => ({
        recipient_member_id: a.member_id,
        church_id: assignment.church_id,
        type: 'removal', // using existing icon mapping for alert
        title: '⚠️ Désistement au Planning',
        body: `${memberName} a décliné son service de ${assignment.role}. Motif : ${reason}`,
        is_read: false
      }))

      await client.from('notifications').insert(adminNotifs)
    }
  }

  revalidatePath('/dashboard/planning')
  revalidatePath('/member-dashboard/planning')
  revalidatePath('/member-dashboard')
  return { success: true }
}

// Send a manual reminder notification
export async function sendReminderNotification(assignmentId: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorisé' }

  // Fetch assignment, service, and member details
  const { data: assignment } = await supabase
    .from('service_assignments')
    .select('member_id, role, service_id, church_services(name, service_date, service_time)')
    .eq('id', assignmentId)
    .single()

  if (!assignment) return { error: 'Assignation non trouvée' }

  const svc = assignment.church_services as any
  const { data: profile } = await supabase.from('user_profiles').select('church_id').eq('id', user.id).single()
  
  if (svc && profile?.church_id) {
    const adminClient = createAdminClient()
    const client = adminClient || supabase

    const dateFormatted = new Date(svc.service_date + 'T00:00:00').toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long'
    })
    const timeFormatted = svc.service_time?.substring(0, 5)

    // Insert reminder notification
    const { error } = await client.from('notifications').insert({
      recipient_member_id: assignment.member_id,
      church_id: profile.church_id,
      type: 'assignment', // changed from 'reminder' to avoid check constraint error
      title: `🔔 RAPPEL 30 MIN : Service de ${assignment.role}`,
      body: `Le culte "${svc.name}" approche à grands pas ! Soyez prêt(e) pour votre service de ${assignment.role} dans environ 30 minutes.`,
      related_service_id: assignment.service_id,
      related_assignment_id: assignmentId
    })

    if (error) {
      console.error("Reminder error", error)
      return { error: 'Erreur lors de l\'envoi du rappel' }
    }
  }

  return { success: true }
}

// Send reminder to all assigned workers for a service
export async function sendAllReminders(serviceId: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorisé' }

  const { data: profile } = await supabase.from('user_profiles').select('church_id, role').eq('id', user.id).single()
  if (!profile || !['super_admin', 'church_admin', 'moderator', 'dept_leader'].includes(profile.role)) {
    return { error: 'Non autorisé' }
  }

  // Fetch all assignments for this service
  const { data: assignments } = await supabase
    .from('service_assignments')
    .select('id, member_id, role, church_services(name, service_date, service_time)')
    .eq('service_id', serviceId)

  if (!assignments || assignments.length === 0) return { error: 'Aucun ouvrier à rappeler.' }

  const svc = assignments[0].church_services as any
  const dateFormatted = new Date(svc.service_date + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long'
  })
  const timeFormatted = svc.service_time?.substring(0, 5)

  const adminClient = createAdminClient()
  const client = adminClient || supabase

  const notifications = assignments.map(a => ({
    recipient_member_id: a.member_id,
    church_id: profile.church_id,
    type: 'assignment',
    title: `🔔 ALERTE : Culte dans 30 Minutes !`,
    body: `C'est presque l'heure ! Préparez-vous pour votre service de ${a.role} pour le culte "${svc.name}".`,
    related_service_id: serviceId,
    related_assignment_id: a.id
  }))

  const { error } = await client.from('notifications').insert(notifications)

  if (error) {
    console.error("Bulk reminder error", error)
    return { error: 'Erreur lors de l\'envoi des rappels' }
  }

  return { success: true }
}

// RSVP to a service (Present / Absent)
export async function rsvpService(serviceId: string, status: 'present' | 'absent', memberId: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const adminClient = createAdminClient()
  const client = adminClient || supabase

  // Upsert the declaration
  const { error } = await client
    .from('service_declarations')
    .upsert({
      service_id: serviceId,
      member_id: memberId,
      status: status
    }, { onConflict: 'service_id,member_id' })

  if (error) {
    console.error("RSVP error", error)
    return { error: 'Erreur lors de la confirmation' }
  }

  revalidatePath('/dashboard/attendance')
  revalidatePath('/member-dashboard')
  return { success: true }
}
