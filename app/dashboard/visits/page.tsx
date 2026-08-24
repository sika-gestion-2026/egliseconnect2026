import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { getVisitSuggestionsAction } from '@/app/actions/getVisitSuggestions'
import VisitDashboardClient from '@/app/dashboard/visits/VisitDashboardClient'


export default async function PastoralVisitsPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('user_profiles').select('church_id').eq('id', user.id).single()
  if (!profile?.church_id) return null

  // Fetch planned visits
  const { data: plannedVisits } = await supabase
    .from('pastoral_visits')
    .select('id, visit_date, motif, priority, status, members(first_name, last_name, phone, quartier), user_profiles(first_name, last_name)')
    .eq('church_id', profile.church_id)
    .eq('status', 'planned')
    .order('visit_date', { ascending: true })

  // Fetch Team members (to assign visits to)
  const { data: team } = await supabase
    .from('user_profiles')
    .select('id, first_name, last_name, role')
    .eq('church_id', profile.church_id)

  // Fetch Suggestions from algorithm
  const { data: suggestions } = await getVisitSuggestionsAction()

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-serif text-primary-900 dark:text-gold-400 font-bold mb-2">Suivi Pastoral & Visites</h1>
        <p className="text-gray-500">Gérez les visites planifiées et laissez l'Assistant Pastoral vous suggérer les membres ayant besoin d'attention.</p>
      </div>

      <VisitDashboardClient 
        plannedVisits={plannedVisits || []} 
        suggestions={suggestions || []} 
        team={team || []}
      />
    </div>
  )
}
