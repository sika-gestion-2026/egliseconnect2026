'use server'

import { requireAuthz, authzMessage, ADMIN_ROLES } from '@/utils/authz'

export async function searchMembersAction(query: string) {
  try {
    const authz = await requireAuthz({ anyRole: true })
    if (!authz.ok) return { success: false, error: authzMessage(authz) }

    const { supabase, profile } = authz

    const trimmed = (query || '').trim()
    if (trimmed.length < 2) {
      return { success: true, data: [] }
    }

    const safeQuery = trimmed.replace(/[%;\\]/g, '')
    const pattern = `%${safeQuery}%`

    let dbQuery = supabase
      .from('members')
      .select('id, first_name, last_name, photo_url, quartier')
      .or(`first_name.ilike.${pattern},last_name.ilike.${pattern}`)
      .limit(10)

    if (profile.role !== 'super_admin' && profile.church_id) {
      dbQuery = dbQuery.eq('church_id', profile.church_id)
    }

    const { data, error } = await dbQuery

    if (error) throw error

    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
