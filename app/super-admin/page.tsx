import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import ChurchesTable from './ChurchesTable'
import RealTimeClock from '@/components/RealTimeClock'
import Link from 'next/link'
import { ThemeToggle } from '@/components/ThemeToggle'
import LogoutConfirmButton from '@/components/LogoutConfirmButton'
import SuperAdminBackupWidget from '@/components/SuperAdminBackupWidget'
import { getRecentBackupsAction } from '@/app/actions/backupRestore'
import InfiltrateButton from '@/components/InfiltrateButton'

export default async function SuperAdminDashboard() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase.from('user_profiles').select('role, church_id').eq('id', user.id).single()

  if (profile?.role !== 'super_admin') {
    redirect('/dashboard')
  }

  // 1. Récupérer toutes les églises avec tri antéchronologique
  const { data: churches } = await supabase
    .from('churches')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1000)

  const churchList = churches || []

  // 2. Statistiques globales
  const { count: totalMembers } = await supabase
    .from('members')
    .select('*', { count: 'exact', head: true })

  const { count: totalAttendances } = await supabase
    .from('attendances')
    .select('*', { count: 'exact', head: true })

  const { count: totalAccounts } = await supabase
    .from('user_profiles')
    .select('*', { count: 'exact', head: true })

  const { data: stats } = await supabase
    .from('church_stats')
    .select('church_id, member_count, attendance_count')

  const statsByChurch: Record<string, { member_count: number; attendance_count: number }> = {}
  for (const s of stats || []) {
    statsByChurch[s.church_id] = s
  }

  const activeChurches = churchList.filter(c => (c.status || 'active') === 'active').length
  const suspendedChurches = churchList.filter(c => c.status === 'suspended').length

  // 3. Sauvegardes récentes pour le coffre-fort
  const { backups } = await getRecentBackupsAction()

  // 4. Activité récente du réseau (audit_logs)
  const { data: recentLogs } = await supabase
    .from('audit_logs')
    .select('id, action_type, description, created_at, church_id, churches(name)')
    .order('created_at', { ascending: false })
    .limit(6)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-foreground transition-colors duration-200">
      {/* Topbar Super Admin avec Thème & Session */}
      <header className="sticky top-0 z-40 bg-primary-950/95 dark:bg-slate-950/95 backdrop-blur-md border-b-2 border-gold-500/80 px-6 sm:px-8 py-3.5 flex justify-between items-center text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-gold-500 to-amber-300 flex items-center justify-center text-primary-950 font-black text-xl shadow-md border border-gold-400">
            EC
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-serif text-gold-400 font-bold leading-tight">
                Église Connect
              </h1>
              <span className="text-[10px] uppercase font-black tracking-wider bg-gold-500/20 text-gold-300 border border-gold-500/40 px-2 py-0.5 rounded-full">
                Super Admin
              </span>
            </div>
            <p className="text-[11px] text-gray-400 hidden sm:block">
              Supervision centrale multi-églises • Mode Racine
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-gray-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Réseau Opérationnel</span>
          </div>

          <div className="bg-white/10 rounded-xl p-1 border border-white/15">
            <ThemeToggle />
          </div>

          <LogoutConfirmButton variant="superadmin" userName={user.email || 'Super Admin'} />
        </div>
      </header>

      <main className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
        {/* Titre & Horloge Temps Réel */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm">
          <div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900 dark:text-white">
              Tour de Contrôle Universelle
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Vue consolidée de toutes les paroisses, des adhérents, des effectifs et de l&apos;intégrité système.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <RealTimeClock />
          </div>
        </div>

        {/* 1. Baromètre & KPI Métriques Clés */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 border-l-4 border-l-gold-500">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase text-gray-500 dark:text-gray-400">Total Églises</span>
                <p className="text-3xl font-black mt-1 text-gray-900 dark:text-white">{churchList.length}</p>
              </div>
              <span className="text-3xl p-2 bg-gold-50 dark:bg-gold-950/30 rounded-xl">🏛️</span>
            </div>
            <p className="text-[11px] text-gray-400 mt-2">Églises affiliées au réseau</p>
          </div>

          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase text-gray-500 dark:text-gray-400">Églises Actives</span>
                <p className="text-3xl font-black mt-1 text-emerald-600 dark:text-emerald-400">{activeChurches}</p>
              </div>
              <span className="text-3xl p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl">🟢</span>
            </div>
            <p className="text-[11px] text-gray-400 mt-2">
              {suspendedChurches > 0 ? `${suspendedChurches} en suspension` : '100% opérationnelles'}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 border-l-4 border-l-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase text-gray-500 dark:text-gray-400">Fidèles / Membres</span>
                <p className="text-3xl font-black mt-1 text-blue-600 dark:text-blue-400">{totalMembers ?? 0}</p>
              </div>
              <span className="text-3xl p-2 bg-blue-50 dark:bg-blue-950/30 rounded-xl">👥</span>
            </div>
            <p className="text-[11px] text-gray-400 mt-2">Inscrits dans les annuaires</p>
          </div>

          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 border-l-4 border-l-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase text-gray-500 dark:text-gray-400">Pointages Cultes</span>
                <p className="text-3xl font-black mt-1 text-purple-600 dark:text-purple-400">{totalAttendances ?? 0}</p>
              </div>
              <span className="text-3xl p-2 bg-purple-50 dark:bg-purple-950/30 rounded-xl">📋</span>
            </div>
            <p className="text-[11px] text-gray-400 mt-2">Présences validées</p>
          </div>

          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 border-l-4 border-l-amber-500 col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase text-gray-500 dark:text-gray-400">Comptes Utilisateurs</span>
                <p className="text-3xl font-black mt-1 text-amber-600 dark:text-amber-400">{totalAccounts ?? 0}</p>
              </div>
              <span className="text-3xl p-2 bg-amber-50 dark:bg-amber-950/30 rounded-xl">🔐</span>
            </div>
            <p className="text-[11px] text-gray-400 mt-2">Admins, modérateurs & staff</p>
          </div>
        </div>

        {/* 2. Sauvegardes & Restauration Système (Coffre-fort 48h) */}
        <SuperAdminBackupWidget initialBackups={backups || []} />

        {/* 3. Section Téléportation & Églises (Cartes immersives) */}
        <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-gray-100 dark:border-slate-700 gap-4">
            <div>
              <h3 className="text-xl sm:text-2xl font-serif font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span>🚪</span> Entrée Rapide dans les Églises
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Cliquez sur <strong>Entrer</strong> pour administrer immédiatement l&apos;église comme son pasteur/administrateur, ou <strong>Gérer</strong> pour modifier ses réglages.
              </p>
            </div>
            <Link
              href="/super-admin/churches/new"
              className="px-4 py-2.5 bg-gradient-to-r from-primary-900 to-primary-800 hover:from-primary-800 hover:to-primary-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 border border-gold-500/30"
            >
              <span>➕</span> Déployer une Église
            </Link>
          </div>

          {churchList.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-5xl mb-3">🏛️</p>
              <p className="text-gray-600 dark:text-gray-300 font-semibold text-base">Aucune église n&apos;est encore enregistrée.</p>
              <p className="text-gray-400 text-xs mt-1">Cliquez sur &quot;Déployer une Église&quot; pour démarrer.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
              {churchList.map((church) => {
                const churchStats = statsByChurch[church.id]
                const members = churchStats?.member_count ?? 0
                const attendances = churchStats?.attendance_count ?? 0
                const isActive = (church.status || 'active') === 'active'

                return (
                  <div
                    key={church.id}
                    className="relative bg-slate-50/50 dark:bg-slate-900/60 rounded-2xl border border-gray-200 dark:border-slate-700 hover:border-gold-500/50 dark:hover:border-gold-500/50 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between overflow-hidden group"
                  >
                    {/* Ruban de statut */}
                    <div className={`h-1.5 w-full ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />

                    <div className="p-5 flex-1">
                      <div className="flex items-start gap-3.5 mb-4">
                        {church.logo_url ? (
                          <img
                            src={church.logo_url}
                            alt={church.name}
                            className="w-12 h-12 rounded-xl object-cover border border-gray-200 dark:border-slate-600 bg-white shadow-sm flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-900 to-primary-750 text-gold-400 font-bold flex items-center justify-center text-lg border border-gold-500/40 shadow-sm flex-shrink-0">
                            {church.name?.substring(0, 2).toUpperCase() || 'EC'}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate group-hover:text-gold-500 transition-colors">
                            {church.name}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-primary-100 dark:bg-primary-950/60 text-primary-800 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
                              {church.code}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-400'}`}>
                              {isActive ? 'Active' : 'Suspendue'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Localisation */}
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-1.5 truncate">
                        <span>📍</span>
                        <span>{[church.city, church.commune, church.quartier].filter(Boolean).join(' • ') || 'Adresse non renseignée'}</span>
                      </p>

                      {/* Mini stats */}
                      <div className="grid grid-cols-2 gap-2 p-2.5 bg-white dark:bg-slate-800/80 rounded-xl border border-gray-100 dark:border-slate-700/80 text-center mb-4">
                        <div>
                          <p className="text-base font-black text-blue-600 dark:text-blue-400">{members}</p>
                          <p className="text-[10px] uppercase font-bold text-gray-400">Membres</p>
                        </div>
                        <div>
                          <p className="text-base font-black text-purple-600 dark:text-purple-400">{attendances}</p>
                          <p className="text-[10px] uppercase font-bold text-gray-400">Pointages</p>
                        </div>
                      </div>
                    </div>

                    {/* Boutons d'action clairs et fiables */}
                    <div className="p-4 pt-0 flex gap-2">
                      <div className="flex-1">
                        <InfiltrateButton churchId={church.id} />
                      </div>
                      <Link
                        href={`/super-admin/churches/${church.id}`}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 border border-gray-200 dark:border-slate-600"
                        title="Gérer les réglages de cette église"
                      >
                        ⚙️ Gérer
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 4. Journal d'Audit & Activités Récentes du Réseau */}
        {recentLogs && recentLogs.length > 0 && (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-serif font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span>🛡️</span> Dernières Activités de Sécurité & Audit
              </h3>
              <span className="text-xs text-gray-400">Traçabilité système en direct</span>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-slate-700">
              {recentLogs.map((log: any) => (
                <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 font-mono font-bold border border-primary-200/50 dark:border-primary-800/50">
                      {log.action_type}
                    </span>
                    <span className="text-gray-800 dark:text-gray-200 font-medium">
                      {log.description}
                    </span>
                    {log.churches?.name && (
                      <span className="text-gray-400 text-[11px]">
                        ({log.churches.name})
                      </span>
                    )}
                  </div>
                  <span className="text-gray-400 font-mono text-[11px] whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. Répertoire Détaillé avec recherche & pagination */}
        <ChurchesTable churches={churchList} />
      </main>
    </div>
  )
}
