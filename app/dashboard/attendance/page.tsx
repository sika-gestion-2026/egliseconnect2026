import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import Link from 'next/link'
import CreateServiceForm from './CreateServiceForm'
import ScheduleSettings from './ScheduleSettings'

export default async function ServicesPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('user_profiles').select('church_id').eq('id', user?.id).single()

  // Fetch services
  const { data: services } = await supabase
    .from('church_services')
    .select('*, service_declarations(count)')
    .eq('church_id', profile?.church_id)
    .order('service_date', { ascending: false })

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-end mb-8 border-b pb-4 dark:border-slate-700">
        <div>
          <h1 className="text-3xl font-serif text-primary-900 dark:text-gold-400 font-bold">Cultes & Présences</h1>
          <p className="text-gray-500 text-sm mt-1">Planifiez les cultes et suivez les RSVP de vos membres.</p>
        </div>
        <div className="flex items-center gap-4">
          <ScheduleSettings />
          <CreateServiceForm />
        </div>
      </div>
      
      {services && services.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service: any) => (
            <Link href={`/dashboard/attendance/${service.id}`} key={service.id}>
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-md transition-shadow hover:border-gold-300 group cursor-pointer h-full flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className={`px-3 py-1.5 rounded-lg text-center min-w-[60px] ${service.type === 'special' ? 'bg-gold-100 text-gold-700 dark:bg-gold-900/30 dark:text-gold-400' : 'bg-primary-50 text-primary-900 dark:bg-primary-900/30 dark:text-primary-300'}`}>
                    <span className="block text-2xl font-bold font-serif leading-none">
                      {new Date(service.service_date).getDate()}
                    </span>
                    <span className="block text-[10px] uppercase font-bold mt-1">
                      {new Date(service.service_date).toLocaleString('fr-FR', { month: 'short' })}
                    </span>
                  </div>
                  <span className="text-xs font-mono bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded text-gray-600 dark:text-gray-300 flex items-center gap-1">
                    {service.type === 'special' && <span>🌟</span>}
                    {service.service_time.substring(0, 5)}
                  </span>
                </div>
                
                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2 group-hover:text-primary-600 dark:group-hover:text-gold-400 transition-colors">
                  {service.name}
                </h3>
                
                <div className="mt-auto pt-4 border-t border-gray-100 dark:border-slate-700 flex justify-between items-center text-sm">
                  <span className="text-gray-500 flex items-center gap-1">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    {service.service_declarations?.[0]?.count || 0} Réponses
                  </span>
                  <span className="text-primary-600 font-medium group-hover:underline">Voir détails &rarr;</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-gray-300 dark:border-slate-700">
          <p className="text-gray-500 mb-4">Aucun culte planifié pour le moment.</p>
        </div>
      )}
    </div>
  )
}
