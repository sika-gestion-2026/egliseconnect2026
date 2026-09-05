import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import Link from 'next/link'
import DirectoryClient from './DirectoryClient'
import ImportButtonWrapper from '@/components/ImportButtonWrapper'

export default async function MembersDirectory(props: { searchParams: Promise<{ page?: string, query?: string, group?: string }> }) {
  const searchParams = await props.searchParams
  const currentPage = Number(searchParams?.page) || 1
  const query = searchParams?.query || ''
  const groupBy = searchParams?.group || 'function'
  const limit = 50
  const offset = (currentPage - 1) * limit

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('user_profiles').select('church_id, role, member_id').eq('id', user?.id).single()

  if (profile?.role === 'scanner') {
    import('next/navigation').then(m => m.redirect('/dashboard/scanner'))
  }

  let dbQuery = supabase
    .from('members')
    .select('*, user_profiles(id, created_at, role)', { count: 'exact' })
    .eq('church_id', profile?.church_id)

  if (query) {
    dbQuery = dbQuery.or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,phone.ilike.%${query}%`)
  }

  // Si c'est un chef de département, on filtre uniquement sur son/ses département(s)
  let deptNames: string[] = []
  if (profile?.role === 'dept_leader' && profile.member_id) {
    const { data: leaderDepts } = await supabase
      .from('department_leaders')
      .select('church_departments(name)')
      .eq('member_id', profile.member_id)
    
    if (leaderDepts && leaderDepts.length > 0) {
      deptNames = leaderDepts.map(d => (d.church_departments as any)?.name).filter(Boolean)
      if (deptNames.length > 0) {
        const orConditions = deptNames.map(name => `functions.ilike.%${name}%`).join(',')
        dbQuery = dbQuery.or(orConditions)
      }
    } else {
      // S'il n'a aucun département assigné, il ne voit personne
      dbQuery = dbQuery.eq('id', '00000000-0000-0000-0000-000000000000')
    }
  }

  const { data: rawMembers, count } = await dbQuery
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
    
  // Ghost mode: Filter out super_admin
  const members = rawMembers?.filter(m => {
    if (m.user_profiles && m.user_profiles.length > 0) {
      return m.user_profiles[0].role !== 'super_admin'
    }
    return true
  }) || []
  
  const totalPages = Math.ceil((count || 0) / limit)

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* En-tête Ultra Premium Glassmorphism */}
      <div className="relative overflow-hidden rounded-3xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/60 dark:border-slate-700/50 shadow-2xl p-8 lg:p-10">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10 rounded-3xl">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[150%] bg-primary-400/20 dark:bg-primary-600/20 blur-[100px] rounded-full mix-blend-multiply dark:mix-blend-screen animate-blob"></div>
          <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[150%] bg-gold-400/20 dark:bg-gold-600/20 blur-[100px] rounded-full mix-blend-multiply dark:mix-blend-screen animate-blob animation-delay-2000"></div>
        </div>

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-bold uppercase tracking-wider mb-3">
              <span>👥</span> Base de données
            </div>
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 dark:text-white tracking-tight">
              Annuaire des <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-gold-500">Membres</span>
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-sm md:text-base mt-2 max-w-xl leading-relaxed">
              Consultez, recherchez et organisez la liste de toutes les personnes de votre église. Cliquez sur un membre pour voir son profil détaillé ou utiliser les actions rapides.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            {profile?.role !== 'dept_leader' && (
              <a
                href="/api/export-members"
                className="group px-5 py-2.5 bg-white/70 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-800 text-gray-700 dark:text-white rounded-xl font-bold border border-gray-200 dark:border-slate-600 transition-all shadow-sm hover:shadow-md flex items-center gap-2 text-sm backdrop-blur-md"
              >
                <svg className="text-gray-400 group-hover:text-primary-500 transition-colors" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Exporter CSV
              </a>
            )}
            {profile?.role !== 'dept_leader' && profile?.church_id && (
              <div className="group px-5 py-2.5 bg-white/70 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-800 text-gray-700 dark:text-white rounded-xl font-bold border border-gray-200 dark:border-slate-600 transition-all shadow-sm hover:shadow-md backdrop-blur-md">
                <ImportButtonWrapper churchId={profile.church_id} />
              </div>
            )}
            <Link 
              href="/dashboard/members/new" 
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/40 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              <span>+</span> Nouveau Membre
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Rapides */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-4 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xl">👥</div>
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{count || 0}</div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Affiché</div>
          </div>
        </div>
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-4 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center text-xl">✅</div>
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {members.filter(m => m.status === 'membre_actif' || m.status === 'member').length}
            </div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Actifs</div>
          </div>
        </div>
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-4 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xl">👋</div>
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {members.filter(m => m.status === 'visiteur_simple' || m.status === 'visiteur_occasionnel' || m.status === 'visitor').length}
            </div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Visiteurs</div>
          </div>
        </div>
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-4 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center text-xl">❤️</div>
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {members.filter(m => m.needs_support).length}
            </div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">En Suivi</div>
          </div>
        </div>
      </div>

      {/* Composant Client Interactif pour la recherche et le regroupement */}
      <DirectoryClient 
        initialMembers={members || []} 
        currentPage={currentPage}
        totalPages={totalPages}
        initialQuery={query}
        initialGroup={groupBy}
      />

    </div>
  )
}
