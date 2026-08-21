'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export async function saveAttendance(date: string, presentMemberIds: string[]) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase.from('user_profiles').select('church_id').eq('id', user.id).single()
  if (!profile?.church_id) return { error: 'No church found' }

  // 1. Create or get attendance record for this date
  let { data: attendance } = await supabase
    .from('attendances')
    .select('id')
    .eq('church_id', profile.church_id)
    .eq('date', date)
    .single()

  if (!attendance) {
    const { data: newAttendance, error: createError } = await supabase
      .from('attendances')
      .insert({ church_id: profile.church_id, date })
      .select('id')
      .single()
      
    if (createError) return { error: createError.message }
    attendance = newAttendance
  }

  // 2. Clear existing attendance members for this date
  await supabase
    .from('attendance_members')
    .delete()
    .eq('attendance_id', attendance.id)

  // 3. Insert new attendance members
  if (presentMemberIds.length > 0) {
    const inserts = presentMemberIds.map(id => ({
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
