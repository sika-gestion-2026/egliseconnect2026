import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import AttendanceClient from './AttendanceClient'

export default async function AttendancePage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('user_profiles').select('church_id').eq('id', user?.id).single()

  const { data: members } = await supabase
    .from('members')
    .select('id, first_name, last_name')
    .eq('church_id', profile?.church_id)
    .order('last_name', { ascending: true })

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-3xl font-serif mb-8 text-primary-900 dark:text-gold-400">Pointage des Cultes</h1>
      
      <AttendanceClient members={members || []} />
    </div>
  )
}
