import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import GodModeFAB from './GodModeFAB'

export async function GodModeWrapper() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()

  if (user?.email !== 'munokolive@gmail.com') return null

  return <GodModeFAB userEmail={user.email} />
}
