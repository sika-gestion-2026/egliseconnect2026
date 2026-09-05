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
      {/* Premium Header */}
      <div className="relative mb-12 rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-900 via-primary-800 to-indigo-900 p-8 sm:p-10 text-white shadow-2xl">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay pointer-events-none"></div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary-500 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
        
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
          <div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-2">Planning & Ouvriers</h1>
            <p className="text-primary-100 text-lg font-medium opacity-90 max-w-xl">
              Gérez les plannings des équipes (Louange, Accueil, Technique) pour vos cultes et événements.
            </p>
          </div>
        </div>
      </div>

      <PlanningClient 
        events={events || []} 
        assignments={assignments || []} 
        members={members || []} 
      />
    </div>
  )
}
