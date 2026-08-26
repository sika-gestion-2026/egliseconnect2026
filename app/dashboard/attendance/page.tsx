import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import Link from 'next/link'
import CreateServiceForm from './CreateServiceForm'
import ScheduleSettings from './ScheduleSettings'
import { ServiceCardActions } from './ScheduleSettings'

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
    .order('service_date', { ascending: true })

  const today = new Date().toISOString().split('T')[0]

  const upcomingServices = (services || []).filter((s: any) => s.service_date >= today)
  const pastServices = (services || []).filter((s: any) => s.service_date < today)

  const closestServiceId = upcomingServices.length > 0 ? upcomingServices[0].id : null;

  const ServiceCard = ({ service, isPast = false, isClosest = false }: { service: any, isPast?: boolean, isClosest?: boolean }) => {
    const dateObj = new Date(service.service_date + 'T00:00:00')
    const dayName = dateObj.toLocaleDateString('fr-FR', { weekday: 'long' })
    const count = service.service_declarations?.[0]?.count || 0

    const typeConfig: Record<string, { emoji: string, bg: string, border: string }> = {
      regular: { emoji: '🙏', bg: 'bg-primary-50 dark:bg-primary-900/30', border: 'border-primary-100 dark:border-primary-800' },
      special: { emoji: '🌟', bg: 'bg-gold-50 dark:bg-gold-900/20', border: 'border-gold-200 dark:border-gold-800' },
      seminar: { emoji: '📚', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-100 dark:border-blue-800' },
      meeting: { emoji: '🤝', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-100 dark:border-purple-800' },
    }
    const cfg = typeConfig[service.type] || typeConfig.regular

    const monthColors = [
      'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-green-500',
      'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-blue-500',
      'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-pink-500'
    ];
    const monthIndex = dateObj.getMonth();
    const monthColorBg = isPast ? 'bg-gray-400' : monthColors[monthIndex];

    return (
      <div className={`relative rounded-xl border ${cfg.border} ${cfg.bg} ${isPast ? 'opacity-60 grayscale-[50%]' : 'hover:shadow-md hover:-translate-y-0.5 transition-all'} overflow-hidden group ${isClosest ? 'ring-2 ring-gold-500 shadow-lg' : ''}`}>
        {isClosest && (
          <div className="absolute top-0 right-0 bg-gold-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-lg shadow-sm z-10 flex items-center gap-1">
            <span className="animate-pulse">🔥</span> Prochain
          </div>
        )}
        
        {/* Edit/Delete controls */}
        {!isPast && (
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10 mt-6">
            <ServiceCardActions service={service} />
          </div>
        )}
        
        <Link href={`/dashboard/attendance/${service.id}`} className="flex p-4 gap-4 h-full">
          {/* Date Badge */}
          <div className="flex-shrink-0 text-center w-14">
            <div className={`${monthColorBg} rounded-xl shadow-sm border border-transparent p-2 text-white`}>
              <span className="block text-xs uppercase font-bold leading-none opacity-90">
                {dateObj.toLocaleString('fr-FR', { month: 'short' })}
              </span>
              <span className="block text-2xl font-black font-serif leading-tight">
                {dateObj.getDate()}
              </span>
              <span className="block text-[9px] uppercase font-bold mt-0.5 opacity-80">
                {dateObj.getFullYear()}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm">{cfg.emoji}</span>
              <span className="text-xs text-gray-500 capitalize">{dayName}</span>
              <span className="ml-auto text-xs font-mono bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-gray-100 dark:border-slate-700 text-gray-600 dark:text-gray-300">
                {service.service_time.substring(0, 5)}
              </span>
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white truncate group-hover:text-primary-600 dark:group-hover:text-gold-400 transition-colors">
              {service.name}
            </h3>
            <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
                {count} réponse{count > 1 ? 's' : ''}
              </span>
              {count > 0 && (
                <div className="flex-1 bg-gray-200 dark:bg-slate-700 rounded-full h-1.5 max-w-[80px]">
                  <div className="bg-primary-500 rounded-full h-1.5" style={{ width: `${Math.min(100, count * 10)}%` }}></div>
                </div>
              )}
            </div>
          </div>
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-end mb-8 border-b pb-4 dark:border-slate-700">
        <div>
          <h1 className="text-3xl font-serif text-primary-900 dark:text-gold-400 font-bold">Cultes & Présences</h1>
          <p className="text-gray-500 text-sm mt-1">
            {upcomingServices.length} culte(s) à venir · {pastServices.length} passé(s)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ScheduleSettings />
          <CreateServiceForm />
        </div>
      </div>

      {/* Upcoming Services */}
      {upcomingServices.length > 0 ? (
        <div className="mb-10">
          <h2 className="text-xs uppercase font-bold text-primary-600 dark:text-gold-400 tracking-widest mb-4 flex items-center gap-2">
            <span className="w-6 h-px bg-primary-300"></span> À Venir
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingServices.map((service: any) => (
              <ServiceCard key={service.id} service={service} isClosest={service.id === closestServiceId} />
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-20 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-gray-300 dark:border-slate-700 mb-10">
          <p className="text-5xl mb-4">📅</p>
          <p className="text-gray-600 dark:text-gray-400 font-bold mb-2">Aucun culte planifié</p>
          <p className="text-gray-500 text-sm">Cliquez sur "⚙️ Configurer & Générer" pour créer votre planning annuel automatiquement !</p>
        </div>
      )}

      {/* Past Services */}
      {pastServices.length > 0 && (
        <div>
          <h2 className="text-xs uppercase font-bold text-gray-400 tracking-widest mb-4 flex items-center gap-2">
            <span className="w-6 h-px bg-gray-300"></span> Passés
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pastServices.slice(0, 9).map((service: any) => (
              <ServiceCard key={service.id} service={service} isPast />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
