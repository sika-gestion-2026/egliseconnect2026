import { redirect } from 'next/navigation'
import { requireAuthz } from '@/utils/authz'
import { createAdminClient } from '@/utils/supabase/admin'
import PublicPlanningClient from './PublicPlanningClient'

export const dynamic = 'force-dynamic'

export default async function PublicPlanningPage() {
  const authz = await requireAuthz({ anyRole: true })
  if (!authz.ok || !authz.profile.church_id) {
    redirect('/login?space=member')
  }

  const client = createAdminClient()
  if (!client) {
    return <div className="p-8">Configuration serveur manquante. Contactez l&apos;administrateur.</div>
  }

  const churchId = authz.profile.church_id
  const today = new Date().toISOString().split('T')[0]
  const nextMonth = new Date()
  nextMonth.setDate(nextMonth.getDate() + 30)
  const nextMonthStr = nextMonth.toISOString().split('T')[0]

  const { data: events } = await client
    .from('church_services')
    .select('*')
    .eq('church_id', churchId)
    .gte('service_date', today)
    .lte('service_date', nextMonthStr)
    .order('service_date', { ascending: true })

  const eventIds = events?.map((e) => e.id) || []
  const { data: assignments } = eventIds.length
    ? await client
        .from('service_assignments')
        .select('*, members(first_name, last_name, photo_url)')
        .in('service_id', eventIds)
    : { data: [] }

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
