import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import Link from 'next/link'
import CreateServiceForm from './CreateServiceForm'
import ScheduleSettings from './ScheduleSettings'
import { ServiceCardActions } from './ScheduleSettings'
import MassReminderButton from './MassReminderButton'

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
      'from-red-500 to-rose-600', 'from-orange-500 to-amber-600', 'from-amber-400 to-orange-500', 'from-green-400 to-emerald-600',
      'from-emerald-400 to-teal-600', 'from-teal-400 to-cyan-600', 'from-cyan-400 to-blue-600', 'from-blue-500 to-indigo-600',
      'from-indigo-500 to-violet-600', 'from-violet-500 to-purple-600', 'from-purple-500 to-fuchsia-600', 'from-pink-500 to-rose-600'
    ];
    const monthIndex = dateObj.getMonth();
    const monthColorBg = isPast ? 'from-gray-400 to-gray-500' : monthColors[monthIndex];

    return (
      <div className={`relative rounded-3xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl ${isPast ? 'opacity-60 grayscale-[30%]' : 'hover:shadow-2xl hover:shadow-primary-500/10 hover:-translate-y-1 transition-all duration-300'} overflow-hidden group ${isClosest ? 'ring-2 ring-primary-500 shadow-xl shadow-primary-500/20' : ''}`}>
        
        {/* Glow effect for closest service */}
        {isClosest && (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-purple-500/10 pointer-events-none" />
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary-500/20 rounded-full blur-2xl pointer-events-none"></div>
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none"></div>
          </>
        )}

        {isClosest && (
          <div className="absolute top-0 right-0 bg-gradient-to-r from-primary-600 to-indigo-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-bl-2xl shadow-lg shadow-primary-500/30 z-10 flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            Prochain
          </div>
        )}
        
        {/* Edit/Delete controls */}
        {!isPast && (
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10 mt-8">
            <ServiceCardActions service={service} />
          </div>
        )}
        
        {/* Mass Reminder Button */}
        {!isPast && (
          <MassReminderButton serviceId={service.id} serviceName={service.name} />
        )}
        
        <Link href={`/dashboard/attendance/${service.id}`} className="flex p-5 gap-5 h-full items-center relative z-0">
          {/* Date Badge */}
          <div className="flex-shrink-0 text-center w-20">
            <div className={`bg-gradient-to-br ${monthColorBg} rounded-2xl shadow-lg shadow-black/5 border border-white/20 p-3 text-white transform group-hover:scale-105 transition-transform duration-300`}>
              <span className="block text-xs uppercase font-bold tracking-wider opacity-90 mb-1">
                {dateObj.toLocaleString('fr-FR', { month: 'short' })}
              </span>
              <span className="block text-3xl font-black tracking-tighter leading-none mb-1">
                {dateObj.getDate()}
              </span>
              <span className="block text-[10px] uppercase font-bold opacity-80 tracking-widest">
                {dateObj.getFullYear()}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 pb-6"> {/* Added padding bottom to make space for the button */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg bg-white/50 dark:bg-black/20 p-1.5 rounded-lg shadow-sm">{cfg.emoji}</span>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400 capitalize tracking-wide">{dayName}</span>
              <span className="ml-auto text-xs font-mono font-bold bg-white/80 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-gray-200/50 dark:border-slate-700/50 text-gray-700 dark:text-gray-300 shadow-sm backdrop-blur-sm">
                {service.service_time.substring(0, 5)}
              </span>
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors tracking-tight">
              {service.name}
            </h3>
            <div className="mt-3 flex items-center gap-3 text-xs text-gray-500 font-medium">
              <span className="flex items-center gap-1.5 bg-white/50 dark:bg-slate-800/50 px-2 py-1 rounded-md border border-gray-100 dark:border-slate-700">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
                {count} {count > 1 ? 'Confirmations' : 'Confirmation'}
              </span>
              {count > 0 && (
                <div className="flex-1 bg-gray-200 dark:bg-slate-700/50 rounded-full h-2 max-w-[100px] overflow-hidden shadow-inner">
                  <div className="bg-gradient-to-r from-primary-500 to-indigo-500 rounded-full h-full" style={{ width: `${Math.min(100, count * 5)}%` }}></div>
                </div>
              )}
            </div>
          </div>
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto pb-24">
      {/* Premium Header */}
      <div className="relative mb-12 rounded-3xl overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-indigo-900 p-8 sm:p-10 text-white shadow-2xl">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay pointer-events-none"></div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary-500 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
        
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
          <div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-2">Cultes & Présences</h1>
            <p className="text-primary-100 text-lg font-medium opacity-90 max-w-xl">
              Gérez les programmes, suivez les présences et relancez les membres facilement.
            </p>
            <div className="flex items-center gap-4 mt-6">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20">
                <span className="text-2xl">📅</span>
                <div>
                  <div className="text-xs text-primary-200 font-bold uppercase tracking-wider">À venir</div>
                  <div className="text-xl font-bold leading-none">{upcomingServices.length}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20">
                <span className="text-2xl">✅</span>
                <div>
                  <div className="text-xs text-primary-200 font-bold uppercase tracking-wider">Passés</div>
                  <div className="text-xl font-bold leading-none">{pastServices.length}</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
            <ScheduleSettings />
            <CreateServiceForm />
          </div>
        </div>
      </div>

      {/* Upcoming Services */}
      {upcomingServices.length > 0 ? (
        <div className="mb-16">
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
              <span className="bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 w-10 h-10 rounded-xl flex items-center justify-center">⏳</span>
              Programmes à Venir
            </h2>
            <div className="h-px bg-gradient-to-r from-gray-200 dark:from-slate-700 to-transparent flex-1"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingServices.map((service: any) => (
              <ServiceCard key={service.id} service={service} isClosest={service.id === closestServiceId} />
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-24 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl border border-dashed border-gray-300 dark:border-slate-700 mb-16 shadow-sm">
          <div className="w-24 h-24 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <p className="text-5xl">📅</p>
          </div>
          <p className="text-2xl font-black text-gray-900 dark:text-white tracking-tight mb-2">Aucun culte planifié</p>
          <p className="text-gray-500 max-w-md mx-auto">Cliquez sur "⚙️ Configurer & Générer" pour créer votre planning annuel automatiquement et commencer le suivi !</p>
        </div>
      )}

      {/* Past Services */}
      {pastServices.length > 0 && (
        <div>
          <div className="flex items-center gap-4 mb-8 opacity-70">
            <h2 className="text-lg font-black text-gray-500 dark:text-gray-400 tracking-tight flex items-center gap-3">
              <span className="bg-gray-100 dark:bg-slate-800 w-10 h-10 rounded-xl flex items-center justify-center">✅</span>
              Programmes Passés
            </h2>
            <div className="h-px bg-gradient-to-r from-gray-200 dark:from-slate-700 to-transparent flex-1"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pastServices.slice(0, 9).map((service: any) => (
              <ServiceCard key={service.id} service={service} isPast />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
