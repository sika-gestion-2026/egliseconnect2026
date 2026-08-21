import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function ChurchDashboard() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase.from('user_profiles').select('church_id').eq('id', user.id).single()
  
  if (!profile?.church_id) {
    redirect('/join-church')
  }

  const { data: church } = await supabase.from('churches').select('*').eq('id', profile.church_id).single()

  const { count: membersCount } = await supabase
    .from('members')
    .select('*', { count: 'exact', head: true })
    .eq('church_id', profile.church_id)

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

    const { data: allMembers } = await supabase
      .from('members')
      .select('id, first_name, last_name, phone, quartier')
      .eq('church_id', profile.church_id)

    absentees = (allMembers || []).filter(m => !presentIds.includes(m.id))
  }

  // Nombre de quartiers/groupes distincts
  const { data: quartiersData } = await supabase
    .from('members')
    .select('quartier')
    .eq('church_id', profile.church_id)
    .not('quartier', 'is', null)
  const quartiersCount = new Set(quartiersData?.map(m => m.quartier).filter(Boolean)).size

  // Visites planifiées
  const { count: visitsCount } = await supabase
    .from('members')
    .select('*', { count: 'exact', head: true })
    .eq('church_id', profile.church_id)
    .eq('visit_planned', true)

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-10 p-8 bg-white dark:bg-slate-800 rounded-xl shadow-sm border-t-4 border-primary-900">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div>
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
          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Quartiers / Cellules</h3>
          <p className="text-4xl font-bold mt-2 text-primary-900 dark:text-neutral-50">{quartiersCount}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border-t-4 border-orange-500">
          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Visites Planifiées</h3>
          <p className="text-4xl font-bold mt-2 text-orange-600 dark:text-orange-400">{visitsCount || 0}</p>
        </div>
      </div>
      
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
