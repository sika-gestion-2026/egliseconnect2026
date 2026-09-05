import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import GrowthChart from '@/components/dashboard/GrowthChart'
import QuartierChart from '@/components/dashboard/QuartierChart'
import AnnouncementEditor from '@/components/dashboard/AnnouncementEditor'
import RealTimeClock from '@/components/RealTimeClock'
import BirthdayConfetti from '@/components/dashboard/BirthdayConfetti'
import { calculateBirthdays, calculateAbsentees, Member } from '@/utils/dashboardMetrics'

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

  let absentees: Member[] = []
  let presentCount = 0
  if (lastAttendance) {
    const { data: presentMembers } = await supabase
      .from('attendance_members')
      .select('member_id')
      .eq('attendance_id', lastAttendance.id)
    
    presentCount = presentMembers?.length || 0
    const presentIds = presentMembers?.map(p => p.member_id) || []

    absentees = calculateAbsentees(allMembers as Member[], presentIds)
  }

  // Fetch active announcement
  const { data: activeAnnouncement } = await supabase
    .from('church_announcements')
    .select('*')
    .eq('church_id', profile.church_id)
    .eq('is_active', true)
    .single()

  const { todaysBirthdays, weeksBirthdays, monthsBirthdays } = calculateBirthdays(allMembers as Member[])

  // Nombre de quartiers/groupes distincts
  const quartiersCount = new Set((allMembers || []).map(m => m.quartier).filter(Boolean)).size

  // Visites planifiées
  const { count: visitsCount } = await supabase
    .from('members')
    .select('*', { count: 'exact', head: true })
    .eq('church_id', profile.church_id)
    .eq('visit_planned', true)

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {todaysBirthdays.length > 0 && <BirthdayConfetti />}
      
      {/* En-tête Ultra Premium Glassmorphism */}
      <div className="relative overflow-hidden rounded-3xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/60 dark:border-slate-700/50 shadow-2xl p-8 lg:p-10">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10 rounded-3xl">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[150%] bg-primary-400/20 dark:bg-primary-600/20 blur-[100px] rounded-full mix-blend-multiply dark:mix-blend-screen animate-blob"></div>
          <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[150%] bg-gold-400/20 dark:bg-gold-600/20 blur-[100px] rounded-full mix-blend-multiply dark:mix-blend-screen animate-blob animation-delay-2000"></div>
        </div>

        <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-8 relative z-10">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-bold uppercase tracking-wider mb-4 shadow-sm">
              <span>⛪</span> Église Connect
            </div>
            
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 dark:text-white tracking-tight mb-3">
              {church?.name || 'Tableau de Bord'}
            </h1>
            
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="flex items-center gap-1.5 bg-gray-100/80 dark:bg-slate-800/80 px-3 py-1.5 rounded-lg border border-gray-200/50 dark:border-slate-700/50 font-mono font-bold text-gray-700 dark:text-gray-300 shadow-sm backdrop-blur-sm">
                <span className="text-gray-400">CODE:</span> <span className="text-primary-600 dark:text-primary-400">{church?.code}</span>
              </span>
              {church?.city && (
                <span className="flex items-center gap-1.5 bg-gray-100/80 dark:bg-slate-800/80 px-3 py-1.5 rounded-lg border border-gray-200/50 dark:border-slate-700/50 text-gray-700 dark:text-gray-300 shadow-sm backdrop-blur-sm">
                  <span>📍</span> {church.city} {church.commune ? `- ${church.commune}` : ''} {church.quartier ? `(${church.quartier})` : ''}
                </span>
              )}
            </div>

            {church?.vision && (
              <div className="mt-6 relative">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-gold-400 to-primary-500 rounded-full"></div>
                <p className="italic text-gray-700 dark:text-gray-300 font-serif text-lg pl-5 leading-relaxed">
                  "{church.vision}"
                </p>
              </div>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-6">
            {(church?.leader_name || church?.leader_contact) && (
              <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-5 rounded-2xl border border-white/80 dark:border-slate-700/50 min-w-[250px] shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gold-400/10 rounded-full blur-xl group-hover:bg-gold-400/20 transition-all"></div>
                <h3 className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3 relative z-10">Responsabilité Pastorale</h3>
                {church?.leader_name && (
                  <p className="font-serif text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-700 to-primary-500 dark:from-gold-400 dark:to-gold-500 flex items-center gap-2 mb-2 relative z-10">
                    <span className="text-primary-600 dark:text-gold-400">👑</span>
                    {church.leader_name}
                  </p>
                )}
                {church?.leader_contact && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2 font-medium relative z-10">
                    <span className="text-gray-400">📞</span>
                    {church.leader_contact}
                  </p>
                )}
              </div>
            )}

            <div className="shrink-0 flex items-center justify-center bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-5 rounded-2xl border border-white/80 dark:border-slate-700/50 shadow-lg">
              <RealTimeClock />
            </div>
          </div>
        </div>
      </div>
      
      {/* Cartes de Statistiques Ultra Premium */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" style={{ perspective: '1000px' }}>
        <div className="group relative overflow-hidden bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-6 rounded-3xl border border-white/80 dark:border-slate-700/50 shadow-lg hover:shadow-[0_20px_40px_rgba(0,0,0,0.1)] hover:-translate-y-2 transition-all duration-500" style={{ transformStyle: 'preserve-3d' }}>
          <div className="absolute -right-6 -bottom-6 text-9xl opacity-[0.03] dark:opacity-[0.05] group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-500 pointer-events-none transform translate-z-[-20px]">👥</div>
          <div className="relative z-10 transform translate-z-[20px]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-lg shadow-inner">👥</div>
              <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Membres Actifs</h3>
            </div>
            <p className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400 dark:from-blue-400 dark:to-blue-300">
              {membersCount || 0}
            </p>
          </div>
        </div>
        
        <div className="group relative overflow-hidden bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-6 rounded-3xl border border-white/80 dark:border-slate-700/50 shadow-lg hover:shadow-[0_20px_40px_rgba(0,0,0,0.1)] hover:-translate-y-2 transition-all duration-500" style={{ transformStyle: 'preserve-3d' }}>
          <div className="absolute -right-6 -bottom-6 text-9xl opacity-[0.03] dark:opacity-[0.05] group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-500 pointer-events-none transform translate-z-[-20px]">✅</div>
          <div className="relative z-10 transform translate-z-[20px]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 flex items-center justify-center text-lg shadow-inner">✅</div>
              <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Présents</h3>
            </div>
            <p className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-green-400 dark:from-green-400 dark:to-green-300">
              {presentCount}
            </p>
            {lastAttendance && <p className="text-[10px] uppercase font-bold tracking-widest text-gray-400 mt-2 bg-gray-100 dark:bg-slate-800/80 inline-block px-2 py-1 rounded-md">Dernier culte: {lastAttendance.date}</p>}
          </div>
        </div>
        
        <div className="group relative overflow-hidden bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-6 rounded-3xl border border-white/80 dark:border-slate-700/50 shadow-lg hover:shadow-[0_20px_40px_rgba(0,0,0,0.1)] hover:-translate-y-2 transition-all duration-500" style={{ transformStyle: 'preserve-3d' }}>
          <div className="absolute -right-6 -bottom-6 text-9xl opacity-[0.03] dark:opacity-[0.05] group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-500 pointer-events-none transform translate-z-[-20px]">⚠️</div>
          <div className="relative z-10 transform translate-z-[20px]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex items-center justify-center text-lg shadow-inner">⚠️</div>
              <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Absents à suivre</h3>
            </div>
            <p className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-400 dark:from-red-400 dark:to-red-300">
              {absentees.length}
            </p>
          </div>
        </div>
        
        <div className="group relative overflow-hidden bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-6 rounded-3xl border border-white/80 dark:border-slate-700/50 shadow-lg hover:shadow-[0_20px_40px_rgba(0,0,0,0.1)] hover:-translate-y-2 transition-all duration-500" style={{ transformStyle: 'preserve-3d' }}>
          <div className="absolute -right-6 -bottom-6 text-9xl opacity-[0.03] dark:opacity-[0.05] group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-500 pointer-events-none transform translate-z-[-20px]">🎂</div>
          <div className="relative z-10 transform translate-z-[20px]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center text-lg shadow-inner">🎂</div>
              <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Anniversaires</h3>
            </div>
            <p className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-purple-400 dark:from-purple-400 dark:to-purple-300">
              {monthsBirthdays.length}
            </p>
            <p className="text-[10px] uppercase font-bold tracking-widest text-gray-400 mt-2 bg-gray-100 dark:bg-slate-800/80 inline-block px-2 py-1 rounded-md">Ce mois-ci</p>
          </div>
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
      
      {/* SECTION ANNIVERSAIRES DU JOUR */}
      {todaysBirthdays.length > 0 && (
        <div className="mb-10 relative overflow-hidden bg-yellow-400/10 dark:bg-yellow-900/10 backdrop-blur-xl border border-yellow-300/50 dark:border-yellow-500/20 rounded-3xl p-8 shadow-xl animate-in slide-in-from-bottom-4 duration-700">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-yellow-400/20 blur-3xl rounded-full pointer-events-none"></div>
          
          <div className="flex flex-col md:flex-row items-center md:items-start gap-4 mb-8 relative z-10 text-center md:text-left">
            <div className="p-4 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-2xl text-white text-3xl shadow-lg shadow-yellow-500/30 animate-bounce">
              🎉
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-yellow-700 dark:text-yellow-400 font-serif mb-1">Joyeux Anniversaire !</h2>
              <p className="text-yellow-600 dark:text-yellow-300 font-medium">
                C'est le jour spécial de ces membres aujourd'hui. N'hésitez pas à les célébrer !
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 relative z-10">
            {todaysBirthdays.map(m => (
              <div key={m.id} className="group bg-white/70 dark:bg-slate-800/70 p-5 rounded-2xl border border-yellow-200/50 dark:border-yellow-900/30 shadow-md hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center gap-4">
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full blur opacity-40 group-hover:opacity-75 transition duration-500"></div>
                  {m.photo_url ? (
                    <img src={m.photo_url} alt="" className="relative w-16 h-16 rounded-full object-cover border-2 border-white dark:border-slate-800" />
                  ) : (
                    <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center font-bold text-white text-xl border-2 border-white dark:border-slate-800">
                      {m.first_name[0]}{m.last_name[0]}
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-lg text-gray-900 dark:text-white leading-tight group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors">{m.first_name} {m.last_name}</h4>
                  <p className="text-sm font-bold text-yellow-600 dark:text-yellow-500 mt-1 flex items-center gap-1">
                    <span>🌟</span> {m.ageTurning} ans aujourd'hui !
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION AUTRES ANNIVERSAIRES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        
        {monthsBirthdays.length > 0 && (
          <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-white/60 dark:border-slate-700/50 rounded-3xl p-6 md:p-8 shadow-lg hover:shadow-xl transition-all duration-300">
            <h3 className="text-xl font-serif font-bold text-purple-700 dark:text-purple-400 mb-6 flex items-center gap-3">
              <span className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">🎂</span> 
              Ce mois-ci ({new Date().toLocaleString('fr-FR', { month: 'long' })})
            </h3>
            <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {monthsBirthdays.map(m => (
                <div key={m.id} className="group flex items-center justify-between bg-white/60 dark:bg-slate-800/60 p-3 rounded-xl border border-gray-100 dark:border-slate-700/50 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/40 dark:to-purple-800/40 flex items-center justify-center font-bold text-purple-700 dark:text-purple-300 text-sm">
                      {m.first_name[0]}{m.last_name[0]}
                    </div>
                    <span className="font-bold text-gray-800 dark:text-white group-hover:text-purple-700 dark:group-hover:text-purple-400 transition-colors">{m.first_name} {m.last_name}</span>
                  </div>
                  <span className="text-purple-700 dark:text-purple-300 text-xs font-bold bg-purple-100 dark:bg-purple-900/50 px-3 py-1.5 rounded-lg shadow-sm">
                    Le {m.day}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {weeksBirthdays.length > 0 && (
          <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-white/60 dark:border-slate-700/50 rounded-3xl p-6 md:p-8 shadow-lg hover:shadow-xl transition-all duration-300">
            <h3 className="text-xl font-serif font-bold text-indigo-700 dark:text-indigo-400 mb-6 flex items-center gap-3">
              <span className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">🎈</span> 
              Les 7 prochains jours
            </h3>
            <div className="flex flex-col gap-3">
              {weeksBirthdays.map(m => (
                <div key={m.id} className="group relative overflow-hidden bg-white/60 dark:bg-slate-800/60 p-4 rounded-xl border border-gray-100 dark:border-slate-700/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all flex items-center justify-between">
                  <div className="absolute top-0 right-0 w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-bl-full opacity-50 group-hover:scale-110 transition-transform"></div>
                  
                  <div className="flex items-center gap-3 relative z-10">
                    <span className="font-bold text-gray-800 dark:text-white group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">{m.first_name} {m.last_name}</span>
                    <span className="text-xs text-gray-500 font-medium bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-md">{m.ageTurning} ans</span>
                  </div>
                  
                  <div className="flex items-center gap-2 relative z-10">
                    <span className="text-xs text-gray-500">
                      {new Date(new Date().getFullYear(), m.birth_date ? parseInt(m.birth_date.split('-')[1])-1 : 0).toLocaleString('fr-FR', {month: 'short'})}
                    </span>
                    <span className="text-indigo-600 dark:text-indigo-400 text-lg font-black">
                      {m.day}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SECTION RADAR DES ABSENTS */}
      {lastAttendance && (
        <div className="mb-10 relative overflow-hidden bg-red-50/60 dark:bg-red-900/10 backdrop-blur-xl border border-red-200/60 dark:border-red-500/20 rounded-3xl p-6 md:p-8 shadow-lg transition-all">
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-400/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8 relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-red-400 to-red-600 rounded-2xl text-white shadow-lg shadow-red-500/30">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-red-700 dark:text-red-400 font-serif tracking-tight">Radar des Absents</h2>
                <p className="text-sm font-medium text-red-600/80 dark:text-red-300/80 mt-1">
                  Dernier culte pointé le <strong className="text-red-700 dark:text-red-300">{lastAttendance.date}</strong>
                </p>
              </div>
            </div>
            
            <div className="px-4 py-2 bg-red-100/80 dark:bg-red-900/40 rounded-xl border border-red-200 dark:border-red-800 flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              <span className="font-bold text-red-800 dark:text-red-300">{absentees.length} membre(s) à relancer</span>
            </div>
          </div>
          
          {absentees.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 relative z-10">
              {absentees.map(absent => (
                <div key={absent.id} className="group bg-white/70 dark:bg-slate-800/70 p-4 rounded-2xl border border-red-100 dark:border-red-900/50 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center font-bold text-red-600 dark:text-red-400 flex-shrink-0">
                      {absent.first_name[0]}{absent.last_name[0]}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white line-clamp-1">{absent.first_name} {absent.last_name}</h4>
                      {absent.quartier && <p className="text-xs text-gray-500 font-medium mt-0.5 line-clamp-1">📍 {absent.quartier}</p>}
                    </div>
                  </div>
                  
                  {absent.phone ? (
                    <a href={`tel:${absent.phone}`} className="flex items-center justify-center gap-2 w-full py-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-xl transition-colors text-sm font-bold border border-red-100 dark:border-red-900/30">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                      Appeler
                    </a>
                  ) : (
                    <div className="w-full py-2 bg-gray-50 dark:bg-slate-800 rounded-xl text-center text-xs text-gray-400 font-medium border border-gray-100 dark:border-slate-700">
                      Pas de numéro
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="relative overflow-hidden bg-gradient-to-r from-green-500/10 to-emerald-500/10 dark:from-green-500/20 dark:to-emerald-500/20 border border-green-200 dark:border-green-800 p-8 rounded-2xl text-center flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 text-3xl">
                🌟
              </div>
              <div>
                <h3 className="text-xl font-bold text-green-800 dark:text-green-300">Excellente nouvelle !</h3>
                <p className="text-green-600 dark:text-green-400/80 font-medium mt-1">Tous les membres de l'église étaient présents au dernier culte.</p>
              </div>
            </div>
          )}
        </div>
      )}
      {/* FIN RADAR DES ABSENTS */}

      <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-md rounded-3xl shadow-xl border border-white/80 dark:border-slate-700/50 p-6 md:p-8 relative overflow-hidden group">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl group-hover:bg-primary-500/20 transition-colors duration-500 pointer-events-none"></div>
        
        <div className="flex items-center gap-4 mb-8 relative z-10">
          <div className="p-3 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl text-white shadow-lg shadow-primary-500/30">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
          </div>
          <h3 className="text-2xl font-serif font-bold text-gray-900 dark:text-white">Flux d'Édification</h3>
        </div>

        <div className="p-8 md:p-10 bg-gradient-to-br from-primary-900 via-primary-800 to-primary-950 text-white rounded-2xl border border-gold-500/30 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 opacity-10 scale-150 -translate-y-10 translate-x-10 pointer-events-none">
            {/* Elegant cross background */}
            <svg width="200" height="200" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 22h20L12 2zm0 3.83L18.17 19H5.83L12 5.83z"/></svg>
          </div>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 mix-blend-overlay"></div>
          
          <div className="relative z-10 flex flex-col items-center text-center">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold-500/20 text-gold-300 text-xs font-bold uppercase tracking-widest border border-gold-500/30 mb-6">
              ✨ Verset de la semaine
            </span>
            <p className="text-2xl md:text-3xl lg:text-4xl font-serif italic text-white/95 leading-relaxed drop-shadow-md">
              "Car là où deux ou trois sont assemblés en mon nom, je suis au milieu d'eux."
            </p>
            <div className="w-16 h-1 bg-gradient-to-r from-transparent via-gold-500 to-transparent my-6 opacity-50"></div>
            <p className="text-lg md:text-xl text-gold-400 font-bold tracking-wide">
              Matthieu 18:20
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
