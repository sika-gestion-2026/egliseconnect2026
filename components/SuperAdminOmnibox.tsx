import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { SuperAdminOmniboxClient } from './SuperAdminOmniboxClient'

export async function SuperAdminOmnibox() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'super_admin') {
    return <SuperAdminOmniboxClient />
  }

  return null
}
