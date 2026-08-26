import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import PlanningClient from './PlanningClient'

export const dynamic = 'force-dynamic'

export default async function PlanningPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('user_profiles').select('church_id, role').eq('id', user?.id).single()

  // Fetch upcoming services/events
  const { data: events } = await supabase
    .from('church_services')
    .select('*')
    .eq('church_id', profile?.church_id)
    .gte('service_date', new Date().toISOString().split('T')[0])
    .order('service_date', { ascending: true })

  // Fetch all assignments for these events
  const eventIds = events?.map(e => e.id) || []
  const { data: assignments } = await supabase
    .from('service_assignments')
    .select('*, members(first_name, last_name, photo_url), replacement_member_id')
    .in('service_id', eventIds)

  // Fetch all active members to assign
  const { data: members } = await supabase
    .from('members')
    .select('id, first_name, last_name, photo_url')
    .eq('church_id', profile?.church_id)
    .order('first_name')

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-serif text-primary-900 dark:text-gold-400 font-bold">Planning & Ouvriers</h1>
        <p className="text-gray-500 mt-2">Gérez les plannings des équipes (Louange, Accueil, Technique) pour vos cultes et événements.</p>
      </div>

      <PlanningClient 
        events={events || []} 
        assignments={assignments || []} 
        members={members || []} 
      />
    </div>
  )
}
