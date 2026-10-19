'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function debugUserRole() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 'no user'
  
  const { data: profile } = await supabase.from('user_profiles').select('*').eq('id', user.id).single()
  return profile
}
