import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import MemberPlanningClient from './MemberPlanningClient'

export default async function MemberPlanningPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('user_profiles').select('member_id, church_id').eq('id', user?.id).single()

  if (!profile?.member_id) {
    return <div className="p-8">Profil non associé à un membre.</div>
  }

  // Fetch upcoming assignments for this member
  const { data: assignments } = await supabase
    .from('service_assignments')
    .select('*, church_services(*)')
    .eq('member_id', profile.member_id)
    .order('created_at', { ascending: false })

  // Filter only upcoming ones or all, here we just show all for simplicity
  const upcomingAssignments = assignments?.filter(a => new Date(a.church_services?.service_date) >= new Date()) || []

  // Fetch all members in the same church for replacement selection
  const { data: churchMembers } = await supabase
    .from('members')
    .select('id, first_name, last_name, photo_url')
    .eq('church_id', profile.church_id)
    .neq('id', profile.member_id)
    .order('first_name')

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-serif text-primary-900 dark:text-gold-400 font-bold mb-2">Mon Planning</h1>
        <p className="text-gray-500">Gérez vos disponibilités pour les prochains cultes et événements.</p>
      </div>

      <MemberPlanningClient assignments={upcomingAssignments} allMembers={churchMembers || []} />
    </div>
  )
}
