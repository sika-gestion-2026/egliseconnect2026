import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import CommunicationsClient from './CommunicationsClient'

export default async function Communications() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('user_profiles').select('church_id').eq('id', user.id).single()

  const { data: members } = await supabase
    .from('members')
    .select('quartier, phone')
    .eq('church_id', profile?.church_id || '')

  const quartiers = Array.from(new Set(members?.map(m => m.quartier).filter(Boolean) as string[]))

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-serif text-primary-900 dark:text-gold-400">Communications (SMS)</h1>
        <p className="text-gray-500 mt-2">Envoyez des messages ciblés à vos membres par SMS.</p>
      </div>
      <CommunicationsClient members={members || []} quartiers={quartiers} />
    </div>
  )
}
