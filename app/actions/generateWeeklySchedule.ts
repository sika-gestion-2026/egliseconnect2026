'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

function getNextDayOfWeek(date: Date, dayOfWeek: number) {
  const resultDate = new Date(date.getTime())
  resultDate.setDate(date.getDate() + (7 + dayOfWeek - date.getDay()) % 7)
  return resultDate
}

const dayMap: Record<string, number> = {
  'Sunday': 0,
  'Monday': 1,
  'Tuesday': 2,
  'Wednesday': 3,
  'Thursday': 4,
  'Friday': 5,
  'Saturday': 6
}

export async function generateWeeklyScheduleAction() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorisé' }

  const { data: profile } = await supabase.from('user_profiles').select('church_id').eq('id', user.id).single()
  if (!profile?.church_id) return { error: 'Aucune église associée.' }

  // Get church defaults
  const { data: church } = await supabase.from('churches').select('worship_days').eq('id', profile.church_id).single()
  
  let defaults = church?.worship_days || []
  if (!Array.isArray(defaults) || defaults.length === 0) {
    // If no defaults, assume Sunday 09:30
    defaults = [{ day: 'Sunday', time: '09:30', name: 'Culte Dominical' }]
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  let createdCount = 0

  for (const def of defaults) {
    const dayNum = dayMap[def.day]
    if (dayNum !== undefined) {
      // Find the next occurrence of this day (or today if it's the same day)
      const nextDate = getNextDayOfWeek(new Date(), dayNum)
      const dateString = nextDate.toISOString().split('T')[0]

      // Check if it already exists (sans doublure)
      const { data: existing } = await supabase
        .from('church_services')
        .select('id')
        .eq('church_id', profile.church_id)
        .eq('service_date', dateString)
        .eq('service_time', def.time + ':00')
        .single()

      if (!existing) {
        const { error } = await supabase.from('church_services').insert({
          church_id: profile.church_id,
          name: def.name || 'Culte',
          service_date: dateString,
          service_time: def.time,
          type: 'regular',
          created_by: user.id
        })
        if (!error) createdCount++
      }
    }
  }

  revalidatePath('/dashboard/attendance')
  return { success: true, count: createdCount }
}
