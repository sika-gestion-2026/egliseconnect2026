import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function ServiceDetailPage({ params }: { params: Promise<{ serviceId: string }> }) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const resolvedParams = await params
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('user_profiles').select('church_id').eq('id', user.id).single()
  
  // Fetch service details
  const { data: service } = await supabase
    .from('church_services')
    .select('*')
    .eq('id', resolvedParams.serviceId)
    .eq('church_id', profile?.church_id)
    .single()

  if (!service) redirect('/dashboard/attendance')

  // Fetch declarations
  const { data: declarations } = await supabase
    .from('service_declarations')
    .select('*, members(first_name, last_name, phone, photo_url)')
    .eq('service_id', service.id)
    .order('updated_at', { ascending: false })

  const presents = declarations?.filter(d => d.status === 'present') || []
  const absents = declarations?.filter(d => d.status === 'absent') || []
  const lates = declarations?.filter(d => d.status === 'late') || []

  const reasonLabels: Record<string, string> = {
    sick: 'Maladie',
    travel: 'Voyage',
    work: 'Travail / Études',
    emergency: 'Urgence familiale',
    other: 'Autre'
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <Link href="/dashboard/attendance" className="text-sm font-medium text-gray-500 hover:text-primary-600 mb-4 inline-block flex items-center gap-2">
          &larr; Retour aux cultes
        </Link>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-gray-200 dark:border-slate-700 pb-6">
          <div>
            <h1 className="text-4xl font-serif text-primary-900 dark:text-gold-400 font-bold">{service.name}</h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 mt-2 flex items-center gap-3">
              <span className="flex items-center gap-1"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> {new Date(service.service_date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              <span className="flex items-center gap-1"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> {service.service_time.substring(0, 5)}</span>
            </p>
          </div>
          <div className="bg-gray-100 dark:bg-slate-800 px-4 py-2 rounded-lg text-center">
            <span className="block text-2xl font-bold text-gray-900 dark:text-white">{declarations?.length || 0}</span>
            <span className="text-xs uppercase font-bold text-gray-500">Réponses (RSVP)</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-green-50 dark:bg-green-900/10 p-6 rounded-xl border-t-4 border-green-500 shadow-sm">
          <h3 className="text-green-800 dark:text-green-400 font-bold flex items-center gap-2 text-lg"><span className="text-2xl">✅</span> Seront Présents</h3>
          <p className="text-4xl font-black text-green-700 dark:text-green-500 mt-3">{presents.length}</p>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/10 p-6 rounded-xl border-t-4 border-orange-500 shadow-sm">
          <h3 className="text-orange-800 dark:text-orange-400 font-bold flex items-center gap-2 text-lg"><span className="text-2xl">⏳</span> Seront en Retard</h3>
          <p className="text-4xl font-black text-orange-700 dark:text-orange-500 mt-3">{lates.length}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/10 p-6 rounded-xl border-t-4 border-red-500 shadow-sm">
          <h3 className="text-red-800 dark:text-red-400 font-bold flex items-center gap-2 text-lg"><span className="text-2xl">❌</span> Seront Absents</h3>
          <p className="text-4xl font-black text-red-700 dark:text-red-500 mt-3">{absents.length}</p>
        </div>
      </div>

      {/* Details Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
        {/* Absences (Priority for Pastoral Care) */}
        <div>
          <h2 className="text-2xl font-serif text-gray-900 dark:text-white mb-6 border-b border-gray-200 dark:border-slate-700 pb-2">Suivi Pastoral (Absences)</h2>
          {absents.length > 0 ? (
            <div className="space-y-4">
              {absents.map((d: any) => (
                <div key={d.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-red-100 dark:border-red-900/30 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      {d.members.photo_url ? (
                        <img src={d.members.photo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500">{d.members.first_name[0]}{d.members.last_name[0]}</div>
                      )}
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white">{d.members.first_name} {d.members.last_name}</h4>
                        {d.members.phone && <a href={`tel:${d.members.phone}`} className="text-xs text-blue-600 hover:underline">{d.members.phone}</a>}
                      </div>
                    </div>
                    <span className="bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 text-xs px-2 py-1 rounded font-bold uppercase">
                      {reasonLabels[d.reason] || d.reason}
                    </span>
                  </div>
                  {d.notes && (
                    <div className="mt-3 p-3 bg-gray-50 dark:bg-slate-900 rounded-lg text-sm italic text-gray-600 dark:text-gray-300 border-l-2 border-red-300">
                      "{d.notes}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic">Aucune absence déclarée pour le moment.</p>
          )}
        </div>

        {/* Retards */}
        <div>
          <h2 className="text-2xl font-serif text-gray-900 dark:text-white mb-6 border-b border-gray-200 dark:border-slate-700 pb-2">Retards Signalés</h2>
          {lates.length > 0 ? (
            <div className="space-y-4">
              {lates.map((d: any) => (
                <div key={d.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-orange-100 dark:border-orange-900/30 shadow-sm flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center font-bold text-orange-700 text-xs">{d.members.first_name[0]}{d.members.last_name[0]}</div>
                    <h4 className="font-bold text-gray-900 dark:text-white">{d.members.first_name} {d.members.last_name}</h4>
                  </div>
                  {d.notes && <p className="text-sm text-gray-600 dark:text-gray-400 pl-11">"{d.notes}"</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic">Aucun retard signalé.</p>
          )}
        </div>
      </div>
    </div>
  )
}
