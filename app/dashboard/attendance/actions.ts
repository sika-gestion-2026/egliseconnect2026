'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

const ATTENDANCE_ROLES = ['super_admin', 'church_admin', 'moderator', 'dept_leader']

export async function saveAttendance(date: string, presentMemberIds: string[]) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('church_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.church_id) return { error: 'No church found' }

  // Garde de rôle : un simple fidèle ne doit pas pouvoir générer le pointage.
  if (!ATTENDANCE_ROLES.includes(profile.role)) {
    return { error: "Vous n'êtes pas autorisé à enregistrer le pointage." }
  }

  // Ne conserver que les membres réellement rattachés à cette église
  // (empêche d'injecter des UUID de membres d'une autre église).
  const requestedIds = Array.from(new Set(presentMemberIds.filter(Boolean)))
  let validMemberIds: string[] = []

  if (requestedIds.length > 0) {
    const { data: validMembers, error: validErr } = await supabase
      .from('members')
      .select('id')
      .eq('church_id', profile.church_id)
      .in('id', requestedIds)

    if (validErr) return { error: validErr.message }
    validMemberIds = (validMembers ?? []).map(m => m.id)
  }

  // 1. Create or get attendance record for this date (upsert to avoid race conditions)
  const { data: attendance, error: upsertError } = await supabase
    .from('attendances')
    .upsert(
      { church_id: profile.church_id, date },
      { onConflict: 'church_id,date' }
    )
    .select('id')
    .single()

  if (upsertError || !attendance) {
    return { error: upsertError?.message || 'Échec de création du pointage' }
  }

  // 2. Clear existing attendance members for this date
  await supabase
    .from('attendance_members')
    .delete()
    .eq('attendance_id', attendance.id)

  // 3. Insert new attendance members
  if (validMemberIds.length > 0) {
    const inserts = validMemberIds.map(id => ({
      attendance_id: attendance.id,
      member_id: id
    }))
    
    const { error: insertError } = await supabase
      .from('attendance_members')
      .insert(inserts)
      
    if (insertError) return { error: insertError.message }
  }

  // 4. Mettre à jour le statut du membre (par exemple pour dire "a assisté récemment")
  // Facultatif, mais pratique pour un affichage rapide
  
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/attendance')
  
  return { success: true }
}
