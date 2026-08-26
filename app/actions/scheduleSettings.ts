'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

// Admin client qui bypasse TOUTES les règles de sécurité RLS
function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey || serviceRoleKey === 'METTEZ_VOTRE_CLE_SERVICE_ROLE_ICI') return null
  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

const dayMap: Record<string, number> = {
  'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
  'Thursday': 4, 'Friday': 5, 'Saturday': 6
}

function getNextDayOfWeek(date: Date, dayOfWeek: number) {
  const resultDate = new Date(date.getTime())
  resultDate.setDate(date.getDate() + (7 + dayOfWeek - date.getDay()) % 7)
  return resultDate
}

export async function getScheduleSettings() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorisé' }

  const { data: profile } = await supabase.from('user_profiles').select('church_id').eq('id', user.id).single()
  if (!profile?.church_id) return { error: 'Aucune église associée.' }

  const { data: church } = await supabase.from('churches').select('worship_days').eq('id', profile.church_id).single()
  
  let defaults = church?.worship_days || []
  if (!Array.isArray(defaults) || defaults.length === 0) {
    defaults = [
      { day: 'Thursday', start_time: '18:30', end_time: '20:30', name: 'Jeudi Solution' },
      { day: 'Sunday', start_time: '08:30', end_time: '11:30', name: "Culte d'Adoration Prophétique" }
    ]
  }

  return { success: true, worshipDays: defaults }
}

export async function saveScheduleSettings(worshipDays: any[]) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorisé' }

  const { data: profile } = await supabase.from('user_profiles').select('church_id').eq('id', user.id).single()
  if (!profile?.church_id) return { error: 'Aucune église associée.' }

  const { error } = await supabase.from('churches').update({ worship_days: worshipDays }).eq('id', profile.church_id)
  
  if (error) return { error: error.message }
  return { success: true }
}

export async function generateScheduleAction(months: number) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorisé' }

  const { data: profile } = await supabase.from('user_profiles').select('church_id, role').eq('id', user.id).single()
  if (!profile?.church_id) return { error: 'Aucune église associée.' }

  // Get worship days config
  const { data: church } = await supabase.from('churches').select('worship_days').eq('id', profile.church_id).single()
  
  let defaults = church?.worship_days || []
  if (!Array.isArray(defaults) || defaults.length === 0) {
    defaults = [
      { day: 'Thursday', start_time: '18:30', end_time: '20:30', name: 'Jeudi Solution' },
      { day: 'Sunday', start_time: '08:30', end_time: '11:30', name: "Culte d'Adoration Prophétique" }
    ]
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const endDate = new Date(today)
  endDate.setMonth(today.getMonth() + months)

  // Build list of all dates to insert
  const rowsToInsert: any[] = []
  const datesPerType: Record<string, string[]> = {}

  for (const def of defaults) {
    const dayNum = dayMap[def.day]
    if (dayNum === undefined) continue

    let currentDate = getNextDayOfWeek(today, dayNum)
    const rawTime = def.start_time || def.time || "09:00"
    const timeString = rawTime.length === 5 ? `${rawTime}:00` : rawTime

    datesPerType[def.name] = []

    while (currentDate <= endDate) {
      const dateString = currentDate.toISOString().split('T')[0]

      rowsToInsert.push({
        church_id: profile.church_id,
        name: def.name || 'Culte',
        service_date: dateString,
        service_time: rawTime,
        type: 'regular',
        created_by: user.id
      })
      
      datesPerType[def.name].push(dateString)
      currentDate.setDate(currentDate.getDate() + 7)
    }
  }

  if (rowsToInsert.length === 0) return { success: true, count: 0 }

  // Check existing to avoid duplicates
  const { data: existing } = await supabase
    .from('church_services')
    .select('service_date, service_time')
    .eq('church_id', profile.church_id)

  const existingSet = new Set(
    (existing || []).map((s: any) => `${s.service_date}_${s.service_time.substring(0, 5)}`)
  )

  const newRows = rowsToInsert.filter(row => {
    const key = `${row.service_date}_${row.service_time.substring(0, 5)}`
    return !existingSet.has(key)
  })

  if (newRows.length === 0) {
    return { success: true, count: 0, message: 'Tous les cultes existent déjà pour cette période.' }
  }

  // Use admin client (bypasses RLS with service_role key)
  let insertError: any = null
  const adminClient = createAdminClient()
  if (adminClient) {
    const { error } = await adminClient.from('church_services').insert(newRows)
    insertError = error
  } else {
    const { error } = await supabase.from('church_services').insert(newRows)
    insertError = error
  }

  if (insertError) {
    console.error("Insert error:", insertError)
    return { error: `Erreur d'insertion: ${insertError.message}` }
  }

  revalidatePath('/dashboard/attendance')
  revalidatePath('/dashboard/planning')
  return { success: true, count: newRows.length }
}

export async function updateServiceAction(serviceId: string, data: { name: string, service_date: string, service_time: string, type: string }) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorisé' }

  const adminClient = createAdminClient()
  const client = adminClient || supabase
  const { error } = await client.from('church_services').update(data).eq('id', serviceId)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/attendance')
  return { success: true }
}

export async function deleteServiceAction(serviceId: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorisé' }

  const adminClient = createAdminClient()
  const client = adminClient || supabase
  const { error } = await client.from('church_services').delete().eq('id', serviceId)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/attendance')
  return { success: true }
}
