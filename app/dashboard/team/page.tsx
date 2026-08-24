import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import TeamDashboardClient from '@/app/dashboard/team/TeamDashboardClient'

export default async function TeamPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('user_profiles').select('church_id').eq('id', user.id).single()
  if (!profile?.church_id) return null

  // Fetch departments
  const { data: departments } = await supabase
    .from('church_departments')
    .select('*')
    .eq('church_id', profile.church_id)
    .order('name', { ascending: true })

  // Fetch department leaders
  const { data: leaders } = await supabase
    .from('department_leaders')
    .select('id, department_id, members(id, first_name, last_name, phone)')
    .order('assigned_at', { ascending: true })

  // Fetch all members to allow assignment
  const { data: members } = await supabase
    .from('members')
    .select('id, first_name, last_name, functions')
    .eq('church_id', profile.church_id)
    .order('first_name', { ascending: true })

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-serif text-primary-900 dark:text-gold-400 font-bold mb-2">Équipe & Modérateurs</h1>
      <p className="text-gray-500 mb-8">Créez des départements et assignez des responsables pour déléguer la gestion.</p>

      <TeamDashboardClient 
        departments={departments || []}
        leaders={leaders || []}
        members={members || []}
      />
    </div>
  )
}
