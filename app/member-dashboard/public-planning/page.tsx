import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import PublicPlanningClient from './PublicPlanningClient'

export const dynamic = 'force-dynamic'

export default async function PublicPlanningPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('user_profiles').select('church_id').eq('id', user?.id).single()

  if (!profile?.church_id) {
    return <div className="p-8">Église non trouvée.</div>
  }

  // Fetch upcoming services (next 30 days for example)
  const today = new Date().toISOString().split('T')[0]
  const nextMonth = new Date()
  nextMonth.setDate(nextMonth.getDate() + 30)
  const nextMonthStr = nextMonth.toISOString().split('T')[0]

  const { data: events } = await supabase
    .from('church_services')
    .select('*')
    .eq('church_id', profile.church_id)
    .gte('service_date', today)
    .lte('service_date', nextMonthStr)
    .order('service_date', { ascending: true })

  // Fetch assignments for these events
  const eventIds = events?.map(e => e.id) || []
  const { data: assignments } = await supabase
    .from('service_assignments')
    .select('*, members(first_name, last_name, photo_url)')
    .in('service_id', eventIds)

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      <div className="mb-8 print:hidden">
        <h1 className="text-3xl font-serif text-primary-900 dark:text-gold-400 font-bold mb-2">Programme des Ouvriers</h1>
        <p className="text-gray-500">Consultez les assignations pour les cultes et événements à venir.</p>
      </div>
      <PublicPlanningClient events={events || []} assignments={assignments || []} />
    </div>
  )
}
