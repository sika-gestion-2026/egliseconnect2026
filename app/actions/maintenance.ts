'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key || key === 'METTEZ_VOTRE_CLE_SERVICE_ROLE_ICI') return null
  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

export async function purgeOldServices() {
  const client = createAdminClient()
  if (!client) return { success: false, error: 'No admin client' }

  try {
    // Calcul de la date d'il y a 7 jours
    const dateLimit = new Date()
    dateLimit.setDate(dateLimit.getDate() - 7)
    const dateStr = dateLimit.toISOString().split('T')[0]

    // Suppression en cascade: si un church_services est supprimé, 
    // les service_assignments liés sont également supprimés par PostgreSQL
    const { data, error } = await client
      .from('church_services')
      .delete()
      .lt('service_date', dateStr)

    if (error) {
      console.error('Error purging old services:', error)
      return { success: false, error }
    }

    // Delete read notifications older than 7 days
    const dateLimitNotif = new Date()
    dateLimitNotif.setDate(dateLimitNotif.getDate() - 7)
    await client
      .from('notifications')
      .delete()
      .lt('created_at', dateLimitNotif.toISOString())
      .eq('is_read', true)

    return { success: true, deleted: data }
  } catch (err) {
    console.error('Exception purging old services:', err)
    return { success: false, error: err }
  }
}
