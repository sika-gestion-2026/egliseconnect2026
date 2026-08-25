import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import GrowthChart from './GrowthChart'
import QuartierChart from './QuartierChart'
import AnnouncementEditor from './AnnouncementEditor'
import RealTimeClock from '../components/RealTimeClock'

export default async function ChurchDashboard() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase.from('user_profiles').select('church_id, role').eq('id', user.id).single()
  
  if (!profile?.church_id) {
    redirect('/join-church')
  }

  if (profile.role === 'scanner') {
    redirect('/dashboard/scanner')
  }

  const { data: church } = await supabase.from('churches').select('*').eq('id', profile.church_id).single()

  const { count: membersCount } = await supabase
    .from('members')
    .select('*', { count: 'exact', head: true })
    .eq('church_id', profile.church_id)

  // Récupérer tous les membres pour calculer les absences et les anniversaires
  const { data: rawMembers } = await supabase
    .from('members')
    .select('id, first_name, last_name, phone, quartier, birth_date, photo_url, created_at, user_profiles(role)')
    .eq('church_id', profile.church_id)

  const allMembers = rawMembers?.filter(m => {
    if (m.user_profiles && m.user_profiles.length > 0) {
      return m.user_profiles[0].role !== 'super_admin'
    }
    return true
  }) || []

  // Radar des Absents : Récupérer le dernier pointage
  const { data: lastAttendance } = await supabase
    .from('attendances')
    .select('id, date')
    .eq('church_id', profile.church_id)
    .order('date', { ascending: false })
    .limit(1)
    .single()

  let absentees: any[] = []
  let presentCount = 0
  if (lastAttendance) {
    const { data: presentMembers } = await supabase
      .from('attendance_members')
      .select('member_id')
      .eq('attendance_id', lastAttendance.id)
    
    presentCount = presentMembers?.length || 0
    const presentIds = presentMembers?.map(p => p.member_id) || []

    absentees = (allMembers || []).filter(m => !presentIds.includes(m.id))
  }

  // Fetch active announcement
  const { data: activeAnnouncement } = await supabase
    .from('church_announcements')
    .select('*')
    .eq('church_id', profile.church_id)
    .eq('is_active', true)
    .single()

  // Calcul des anniversaires
  const today = new Date()
  const currentMonth = today.getMonth() // 0-11
  const currentDate = today.getDate()

  const todaysBirthdays: any[] = []
  const monthsBirthdays: any[] = []

  if (allMembers) {
    allMembers.forEach(m => {
      if (m.birth_date) {
        // bDate est au format YYYY-MM-DD
        const parts = m.birth_date.split('-')
        if (parts.length === 3) {
          const year = parseInt(parts[0], 10)
          const month = parseInt(parts[1], 10) - 1
          const day = parseInt(parts[2], 10)
          
          const ageTurning = today.getFullYear() - year

          if (month === currentMonth && day === currentDate) {
            todaysBirthdays.push({ ...m, ageTurning })
          } else if (month === currentMonth) {
            monthsBirthdays.push({ ...m, day })
          }
        }
      }
    })
  }

  // Nombre de quartiers/groupes distincts
  const quartiersCount = new Set((allMembers || []).map(m => m.quartier).filter(Boolean)).size

  // Visites planifiées
  const { count: visitsCount } = await supabase
    .from('members')
    .select('*', { count: 'exact', head: true })
    .eq('church_id', profile.church_id)
    .eq('visit_planned', true)

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-10 p-8 bg-white dark:bg-slate-800 rounded-xl shadow-sm border-t-4 border-primary-900">
        <div className="flex flex-col md:flex-row md:items-start gap-6 flex-1">
          <div className="flex-1">
            <h1 className="text-4xl font-serif text-primary-900 dark:text-gold-400 font-bold mb-2">{church?.name || 'Tableau de Bord'}</h1>
            <p className="text-gray-500 flex items-center gap-2 flex-wrap">
              <span className="bg-primary-100 text-primary-900 dark:bg-primary-900/30 dark:text-primary-200 px-3 py-1 rounded-md text-sm font-mono font-bold tracking-widest shadow-sm">
                CODE: {church?.code}
              </span>
              {church?.city && <span className="text-sm bg-gray-100 dark:bg-slate-700 px-3 py-1 rounded-md">• {church.city} {church.commune ? `- ${church.commune}` : ''} {church.quartier ? `(${church.quartier})` : ''}</span>}
            </p>
            {church?.vision && (
              <p className="italic text-gray-700 dark:text-gray-300 mt-4 font-serif text-lg border-l-4 border-gold-500 pl-4 bg-gray-50 dark:bg-slate-750/50 py-2 rounded-r-md">
                "{church.vision}"
              </p>
            )}
          </div>
          
          {(church?.leader_name || church?.leader_contact) && (
            <div className="bg-gray-50 dark:bg-slate-900 p-5 rounded-lg border border-gray-200 dark:border-slate-700 min-w-[250px] shadow-sm">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Responsabilité Pastorale</h3>
              {church?.leader_name && (
                <p className="font-serif text-lg font-bold text-primary-900 dark:text-gold-400 flex items-center gap-2 mb-1">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  {church.leader_name}
                </p>
              )}
              {church?.leader_contact && (
                <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                  {church.leader_contact}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 flex flex-col items-end gap-3">
          <RealTimeClock />
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border-t-4 border-gold-500">
          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Membres Actifs</h3>
          <p className="text-4xl font-bold mt-2 text-primary-900 dark:text-neutral-50">{membersCount || 0}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border-t-4 border-accent-500">
          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Présents (dernier culte)</h3>
          <p className="text-4xl font-bold mt-2 text-accent-900 dark:text-accent-500">{presentCount}</p>
          {lastAttendance && <p className="text-xs text-gray-400 mt-1">le {lastAttendance.date}</p>}
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border-t-4 border-blue-500">
          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Absents à suivre</h3>
          <p className="text-4xl font-bold mt-2 text-blue-900 dark:text-blue-500">{absentees.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border-t-4 border-purple-500">
          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Anniversaires (Ce mois)</h3>
          <p className="text-4xl font-bold mt-2 text-purple-900 dark:text-purple-500">{monthsBirthdays.length}</p>
        </div>
      </div>

      <div className="mb-8">
        <AnnouncementEditor initialAnnouncement={activeAnnouncement} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <GrowthChart dates={allMembers?.map(m => m.created_at).filter(Boolean) || []} />
        </div>
        <div className="lg:col-span-1">
          <QuartierChart members={allMembers} />
        </div>
      </div>
      
      {/* SECTION ANNIVERSAIRES */}
      {todaysBirthdays.length > 0 && (
        <div className="mb-10 bg-yellow-50/50 dark:bg-yellow-950/10 border border-yellow-200 dark:border-yellow-900/30 rounded-xl p-6 shadow-sm animate-fade-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-yellow-100 dark:bg-yellow-900/50 rounded-full text-yellow-600 dark:text-yellow-400 text-2xl">
              🎉
            </div>
            <div>
              <h2 className="text-xl font-bold text-yellow-800 dark:text-yellow-400 font-serif">Anniversaire(s) du jour !</h2>
              <p className="text-sm text-yellow-600 dark:text-yellow-300">
                Souhaitons un joyeux anniversaire à nos membres aujourd'hui !
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {todaysBirthdays.map(m => (
              <div key={m.id} className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-yellow-100 dark:border-yellow-900/50 shadow-sm flex items-center gap-3">
                {m.photo_url ? (
                  <img src={m.photo_url} alt="" className="w-12 h-12 rounded-full object-cover border border-yellow-500 flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center font-bold text-yellow-850 dark:text-yellow-350 text-lg flex-shrink-0">
                    {m.first_name[0]}{m.last_name[0]}
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white leading-tight">{m.first_name} {m.last_name}</h4>
                  <p className="text-xs text-gray-500 mt-1">Fête ses <span className="font-bold text-yellow-600">{m.ageTurning} ans</span> aujourd'hui !</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {monthsBirthdays.length > 0 && (
        <div className="mb-10 bg-blue-50/20 dark:bg-slate-800/20 border border-gray-150 dark:border-slate-700 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-serif font-bold text-primary-900 dark:text-gold-400 mb-4 flex items-center gap-2">
            🎂 Anniversaires de ce mois-ci ({new Date().toLocaleString('fr-FR', { month: 'long' })})
          </h3>
          <div className="flex flex-wrap gap-3">
            {monthsBirthdays.map(m => (
              <div key={m.id} className="bg-white dark:bg-slate-850 px-4 py-2.5 rounded-lg border border-gray-150 dark:border-slate-700 flex items-center gap-2 text-sm shadow-sm">
                <span>🎁</span>
                <span className="font-bold text-gray-800 dark:text-white">{m.first_name} {m.last_name}</span>
                <span className="text-gray-400 text-xs font-bold bg-gray-100 dark:bg-slate-750 px-2 py-0.5 rounded-md">Le {m.day}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION RADAR DES ABSENTS */}
      {lastAttendance && (
        <div className="mb-10 bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-full text-red-600 dark:text-red-400">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-red-800 dark:text-red-400 font-serif">Radar des Absents</h2>
              <p className="text-sm text-red-600 dark:text-red-300">
                {absentees.length} membre(s) absent(s) lors du dernier culte pointé le <strong>{lastAttendance.date}</strong>.
              </p>
            </div>
          </div>
          
          {absentees.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {absentees.map(absent => (
                <div key={absent.id} className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-red-100 dark:border-red-900/50 shadow-sm flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white">{absent.first_name} {absent.last_name}</h4>
                    {absent.quartier && <p className="text-xs text-gray-500 mt-1">Quartier: {absent.quartier}</p>}
                  </div>
                  {absent.phone ? (
                    <a href={`tel:${absent.phone}`} className="flex items-center gap-2 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/40 dark:text-red-300 rounded-md transition-colors text-sm font-medium">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                      Relancer
                    </a>
                  ) : (
                    <span className="text-xs text-gray-400 italic">Pas de numéro</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-green-700 bg-green-50 dark:bg-green-900/20 p-4 rounded-lg text-center">
              Tous les membres de l'église étaient présents !
            </div>
          )}
        </div>
      )}
      {/* FIN RADAR DES ABSENTS */}

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6">
        <h3 className="text-2xl font-serif mb-4 border-b pb-2 border-gray-200 dark:border-slate-700">Flux d'Édification</h3>
        <div className="p-6 bg-gradient-to-br from-primary-900 to-primary-500 text-white rounded-lg border border-gold-500 relative overflow-hidden shadow-inner">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            {/* SVG Vitrail decoration placeholder */}
            <svg width="100" height="100" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 22h20L12 2zm0 3.83L18.17 19H5.83L12 5.83z"/></svg>
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-gold-400 mb-3 block">Verset de la semaine</span>
          <p className="text-xl font-serif italic relative z-10">"Car là où deux ou trois sont assemblés en mon nom, je suis au milieu d'eux."</p>
          <p className="mt-4 text-sm text-gold-500 font-medium relative z-10">— Matthieu 18:20</p>
        </div>
      </div>
    </div>
  )
}
