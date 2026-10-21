import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import GrowthChart from '@/components/dashboard/GrowthChart'
import QuartierChart from '@/components/dashboard/QuartierChart'
import AnnouncementEditor from '@/components/dashboard/AnnouncementEditor'
import RealTimeClock from '@/components/RealTimeClock'
import dynamic from 'next/dynamic'
const BirthdayConfetti = dynamic(() => import('@/components/dashboard/BirthdayConfetti'), { ssr: false })
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

  const { data: rawMembers } = await supabase
    .from('members')
    .select('id, first_name, last_name, phone, quartier, birth_date, photo_url, created_at, user_profiles(role)')
    .eq('church_id', profile.church_id)
    .limit(5000)

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

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-12">
      {todaysBirthdays.length > 0 && <BirthdayConfetti />}
      
      {/* En-tête Glassmorphism Adapté Tous Écrans */}
      <div className="relative overflow-hidden rounded-3xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/80 dark:border-slate-700/50 shadow-xl p-6 sm:p-8 lg:p-10">
        {/* Gradients d'ambiance */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10 rounded-3xl">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[150%] bg-primary-400/20 dark:bg-primary-600/20 blur-[100px] rounded-full mix-blend-multiply dark:mix-blend-screen"></div>
          <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[150%] bg-gold-400/20 dark:bg-gold-600/20 blur-[100px] rounded-full mix-blend-multiply dark:mix-blend-screen"></div>
        </div>

        <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6 relative z-10">
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-100 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 text-xs font-bold uppercase tracking-wider mb-3 shadow-sm border border-primary-200/50 dark:border-primary-800/50">
              <span>⛪</span> Église Connect
            </div>
            
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-gray-900 dark:text-white tracking-tight mb-3 break-words">
              {church?.name || 'Tableau de Bord'}
            </h1>
            
            <div className="flex flex-wrap items-center gap-2.5 text-xs sm:text-sm">
              <span className="flex items-center gap-1.5 bg-white/80 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-gray-200/60 dark:border-slate-700/60 font-mono font-bold text-gray-700 dark:text-gray-300 shadow-sm backdrop-blur-sm">
                <span className="text-gray-400">CODE:</span> <span className="text-primary-600 dark:text-gold-400">{church?.code}</span>
              </span>
              {church?.city && (
                <span className="flex items-center gap-1.5 bg-white/80 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-gray-200/60 dark:border-slate-700/60 text-gray-700 dark:text-gray-300 shadow-sm backdrop-blur-sm">
                  <span>📍</span> {[church.city, church.commune, church.quartier].filter(Boolean).join(' • ')}
                </span>
              )}
            </div>

            {church?.vision && (
              <div className="mt-5 relative">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-gold-400 to-primary-500 rounded-full"></div>
                <p className="italic text-gray-700 dark:text-gray-300 font-serif text-base sm:text-lg pl-4 leading-relaxed">
                  &ldquo;{church.vision}&rdquo;
                </p>
              </div>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
            {(church?.leader_name || church?.leader_contact) && (
              <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/80 dark:border-slate-700/60 shadow-md relative overflow-hidden group">
                <h3 className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Responsabilité Pastorale</h3>
                {church?.leader_name && (
                  <p className="font-serif text-lg sm:text-xl font-bold text-primary-900 dark:text-gold-400 flex items-center gap-2">
                    <span>👑</span>
                    {church.leader_name}
                  </p>
                )}
                {church?.leader_contact && (
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2 font-medium mt-1">
                    <span className="text-gray-400">📞</span>
                    <a href={`tel:${church.leader_contact}`} className="hover:underline">{church.leader_contact}</a>
                  </p>
                )}
              </div>
            )}

            <div className="shrink-0 flex items-center justify-center bg-white/70 dark:bg-slate-800/70 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/80 dark:border-slate-700/60 shadow-md">
              <RealTimeClock />
            </div>
          </div>
        </div>
      </div>
      
      {/* 4 Cartes Métriques Clés */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/80 dark:border-slate-700/60 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-center gap-2 sm:gap-3 mb-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm sm:text-base shadow-inner">👥</div>
            <h3 className="text-[11px] sm:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Membres</h3>
          </div>
          <p className="text-3xl sm:text-4xl lg:text-5xl font-black text-blue-600 dark:text-blue-400">
            {membersCount || 0}
          </p>
          <p className="text-[10px] text-gray-400 font-medium mt-1">Total enregistrés</p>
        </div>
        
        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/80 dark:border-slate-700/60 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-center gap-2 sm:gap-3 mb-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm sm:text-base shadow-inner">✅</div>
            <h3 className="text-[11px] sm:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Présents</h3>
          </div>
          <p className="text-3xl sm:text-4xl lg:text-5xl font-black text-emerald-600 dark:text-emerald-400">
            {presentCount}
          </p>
          {lastAttendance ? (
            <p className="text-[10px] font-bold text-gray-400 mt-1 truncate">Culte du {lastAttendance.date}</p>
          ) : (
            <p className="text-[10px] text-gray-400 font-medium mt-1">Aucun culte pointé</p>
          )}
        </div>
        
        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/80 dark:border-slate-700/60 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-center gap-2 sm:gap-3 mb-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center text-sm sm:text-base shadow-inner">⚠️</div>
            <h3 className="text-[11px] sm:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Absents</h3>
          </div>
          <p className="text-3xl sm:text-4xl lg:text-5xl font-black text-red-600 dark:text-red-400">
            {absentees.length}
          </p>
          <p className="text-[10px] text-gray-400 font-medium mt-1">À contacter</p>
        </div>
        
        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/80 dark:border-slate-700/60 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-center gap-2 sm:gap-3 mb-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center text-sm sm:text-base shadow-inner">🎂</div>
            <h3 className="text-[11px] sm:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Anniversaires</h3>
          </div>
          <p className="text-3xl sm:text-4xl lg:text-5xl font-black text-purple-600 dark:text-purple-400">
            {monthsBirthdays.length}
          </p>
          <p className="text-[10px] text-gray-400 font-medium mt-1">Ce mois-ci</p>
        </div>
      </div>

      {/* Annonces */}
      <div>
        <AnnouncementEditor initialAnnouncement={activeAnnouncement} />
      </div>

      {/* Graphiques Croissance & Quartiers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <GrowthChart dates={allMembers?.map(m => m.created_at).filter(Boolean) || []} />
        </div>
        <div className="lg:col-span-1">
          <QuartierChart members={allMembers} />
        </div>
      </div>
      
      {/* SECTION ANNIVERSAIRES DU JOUR */}
      {todaysBirthdays.length > 0 && (
        <div className="relative overflow-hidden bg-gradient-to-r from-yellow-400/15 via-amber-400/10 to-yellow-500/15 dark:from-yellow-950/30 dark:to-amber-950/30 backdrop-blur-xl border border-yellow-300/60 dark:border-yellow-500/30 rounded-3xl p-6 sm:p-8 shadow-xl animate-in slide-in-from-bottom-4 duration-700">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-6 text-center sm:text-left">
            <div className="p-3.5 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-2xl text-white text-3xl shadow-lg shadow-yellow-500/30">
              🎉
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-yellow-800 dark:text-yellow-400 font-serif mb-1">Joyeux Anniversaire !</h2>
              <p className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-300 font-medium">
                C&apos;est le jour spécial de ces membres aujourd&apos;hui. N&apos;hésitez pas à les bénir et les célébrer !
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {todaysBirthdays.map(m => (
              <div key={m.id} className="bg-white/80 dark:bg-slate-800/80 p-4 rounded-2xl border border-yellow-200/60 dark:border-yellow-900/40 shadow-sm hover:shadow-md transition-all flex items-center gap-4">
                {m.photo_url ? (
                  <img src={m.photo_url} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-yellow-400 dark:border-yellow-500 flex-shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center font-bold text-white text-lg border-2 border-yellow-300 flex-shrink-0 shadow-inner">
                    {m.first_name?.[0]}{m.last_name?.[0]}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white truncate">{m.first_name} {m.last_name}</h4>
                  <p className="text-xs font-bold text-amber-600 dark:text-yellow-400 mt-0.5 flex items-center gap-1">
                    <span>🌟</span> {m.ageTurning} ans aujourd&apos;hui !
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION AUTRES ANNIVERSAIRES (Mois & 7 jours) */}
      {(monthsBirthdays.length > 0 || weeksBirthdays.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {monthsBirthdays.length > 0 && (
            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/80 dark:border-slate-700/60 rounded-3xl p-5 sm:p-7 shadow-md">
              <h3 className="text-lg sm:text-xl font-serif font-bold text-purple-800 dark:text-purple-400 mb-5 flex items-center gap-2.5">
                <span className="p-2 bg-purple-100 dark:bg-purple-950/50 rounded-xl text-base">🎂</span> 
                Ce mois-ci ({new Date().toLocaleString('fr-FR', { month: 'long' })})
              </h3>
              <div className="flex flex-col gap-2.5 max-h-[280px] overflow-y-auto pr-1">
                {monthsBirthdays.map(m => (
                  <div key={m.id} className="flex items-center justify-between bg-white/80 dark:bg-slate-800/80 p-3 rounded-xl border border-gray-100 dark:border-slate-700/60 hover:bg-purple-50/50 dark:hover:bg-purple-950/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/50 dark:to-purple-800/50 flex items-center justify-center font-bold text-purple-700 dark:text-purple-300 text-xs flex-shrink-0">
                        {m.first_name?.[0]}{m.last_name?.[0]}
                      </div>
                      <span className="font-bold text-xs sm:text-sm text-gray-800 dark:text-white truncate">{m.first_name} {m.last_name}</span>
                    </div>
                    <span className="text-purple-700 dark:text-purple-300 text-xs font-bold bg-purple-100/80 dark:bg-purple-950/80 px-2.5 py-1 rounded-lg">
                      Le {m.day}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {weeksBirthdays.length > 0 && (
            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/80 dark:border-slate-700/60 rounded-3xl p-5 sm:p-7 shadow-md">
              <h3 className="text-lg sm:text-xl font-serif font-bold text-indigo-800 dark:text-indigo-400 mb-5 flex items-center gap-2.5">
                <span className="p-2 bg-indigo-100 dark:bg-indigo-950/50 rounded-xl text-base">🎈</span> 
                Les 7 prochains jours
              </h3>
              <div className="flex flex-col gap-2.5">
                {weeksBirthdays.map(m => (
                  <div key={m.id} className="bg-white/80 dark:bg-slate-800/80 p-3 rounded-xl border border-gray-100 dark:border-slate-700/60 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-bold text-xs sm:text-sm text-gray-800 dark:text-white truncate">{m.first_name} {m.last_name}</span>
                      <span className="text-[11px] text-gray-500 font-medium bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-md">{m.ageTurning} ans</span>
                    </div>
                    <span className="text-indigo-600 dark:text-indigo-400 text-sm font-black bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-200/50 dark:border-indigo-800/50">
                      Jour {m.day}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION RADAR DES ABSENTS */}
      {lastAttendance && (
        <div className="relative overflow-hidden bg-red-50/70 dark:bg-red-950/20 backdrop-blur-xl border border-red-200/70 dark:border-red-500/30 rounded-3xl p-5 sm:p-8 shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl text-white shadow-md shadow-red-500/20">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-red-800 dark:text-red-400 font-serif tracking-tight">Radar des Absents</h2>
                <p className="text-xs sm:text-sm font-medium text-red-600/90 dark:text-red-300 mt-0.5">
                  Dernier culte pointé le <strong className="text-red-800 dark:text-red-200">{lastAttendance.date}</strong>
                </p>
              </div>
            </div>
            
            <div className="px-3.5 py-1.5 bg-red-100/90 dark:bg-red-950/60 rounded-xl border border-red-300/80 dark:border-red-800/80 flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </span>
              <span className="text-xs font-bold text-red-800 dark:text-red-300">{absentees.length} membre(s) à relancer</span>
            </div>
          </div>
          
          {absentees.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {absentees.map(absent => (
                <div key={absent.id} className="bg-white/85 dark:bg-slate-800/85 p-4 rounded-2xl border border-red-100 dark:border-red-900/50 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center font-bold text-red-700 dark:text-red-300 text-xs flex-shrink-0">
                      {absent.first_name?.[0]}{absent.last_name?.[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white truncate">{absent.first_name} {absent.last_name}</h4>
                      {absent.quartier && <p className="text-[11px] text-gray-500 font-medium truncate">📍 {absent.quartier}</p>}
                    </div>
                  </div>
                  
                  {absent.phone ? (
                    <a href={`tel:${absent.phone}`} className="flex items-center justify-center gap-1.5 w-full py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded-xl transition-colors text-xs font-bold border border-red-200/60 dark:border-red-900/60">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                      Appeler
                    </a>
                  ) : (
                    <div className="w-full py-2 bg-gray-50 dark:bg-slate-700/50 rounded-xl text-center text-[11px] text-gray-400 font-medium">
                      Pas de numéro
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gradient-to-r from-emerald-500/10 to-green-500/10 dark:from-emerald-950/40 dark:to-green-950/40 border border-emerald-200 dark:border-emerald-800/60 p-6 rounded-2xl text-center flex flex-col items-center justify-center gap-2">
              <span className="text-3xl">🌟</span>
              <h3 className="text-base font-bold text-emerald-800 dark:text-emerald-300">Excellente nouvelle !</h3>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Tous les membres de l&apos;église étaient présents au dernier culte.</p>
            </div>
          )}
        </div>
      )}

      {/* Flux d'Édification */}
      <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl shadow-lg border border-white/80 dark:border-slate-700/60 p-5 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl text-white shadow-md">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
          </div>
          <h3 className="text-xl sm:text-2xl font-serif font-bold text-gray-900 dark:text-white">Flux d&apos;Édification</h3>
        </div>

        <div className="p-6 sm:p-10 bg-gradient-to-br from-primary-950 via-primary-900 to-primary-950 text-white rounded-2xl border border-gold-500/40 relative overflow-hidden shadow-xl text-center">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gold-500/20 text-gold-300 text-xs font-bold uppercase tracking-wider border border-gold-500/40 mb-5">
            ✨ Verset de la semaine
          </span>
          <p className="text-xl sm:text-2xl lg:text-3xl font-serif italic text-white/95 leading-relaxed">
            &ldquo;Car là où deux ou trois sont assemblés en mon nom, je suis au milieu d&apos;eux.&rdquo;
          </p>
          <div className="w-12 h-0.5 bg-gold-400 mx-auto my-4 opacity-70"></div>
          <p className="text-base sm:text-lg text-gold-400 font-bold">
            Matthieu 18:20
          </p>
        </div>
      </div>
    </div>
  )
}
