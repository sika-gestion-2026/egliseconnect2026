'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function searchMembersAction(query: string) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: user } = await supabase.auth.getUser()
    if (!user.user) return { success: false, error: 'Non autorisé' }

    const { data, error } = await supabase
      .from('members')
      .select('id, first_name, last_name, photo_url, quartier')
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
      .limit(10)

    if (error) throw error

    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
