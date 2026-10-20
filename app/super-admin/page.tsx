import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import ChurchesTable from './ChurchesTable'
import RealTimeClock from '@/components/RealTimeClock'
import Link from 'next/link'
import { enterChurchAction } from './actions'
import LogoutConfirmButton from '@/components/LogoutConfirmButton'
import SuperAdminBackupWidget from '@/components/SuperAdminBackupWidget'
import { getRecentBackupsAction } from '@/app/actions/backupRestore'

export default async function SuperAdminDashboard() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()

  if (profile?.role !== 'super_admin') {
    redirect('/dashboard')
  }

  const { data: churches, count: totalChurches } = await supabase
    .from('churches')
    .select('*', { count: 'exact' })
    .limit(1000)
    .order('created_at', { ascending: false })

  const churchList = churches || []

  const { count: totalMembers } = await supabase
    .from('members')
    .select('*', { count: 'exact', head: true })

  const { count: totalAttendances } = await supabase
    .from('attendances')
    .select('*', { count: 'exact', head: true })

  const { data: stats } = await supabase
    .from('church_stats')
    .select('church_id, member_count, attendance_count')

  const statsByChurch: Record<string, { member_count: number; attendance_count: number }> = {}
  for (const s of stats || []) {
    statsByChurch[s.church_id] = s
  }

  const activeChurches = churchList.filter(c => c.status === 'active').length

  const { backups } = await getRecentBackupsAction()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="bg-primary-900 border-b-2 border-gold-500 py-4 px-8 flex justify-between items-center text-white">
        <h1 className="text-2xl font-serif text-gold-400">
          Église Connect <span className="text-sm font-sans text-gray-300 ml-2">Super Admin</span>
        </h1>
        <LogoutConfirmButton variant="superadmin" userName="Super Admin" />
      </header>

      <main className="p-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-serif">Tableau de Bord Global</h2>
            <p className="text-sm text-gray-500 mt-1">
              Bienvenue, Super Admin. Vous avez accès à toutes les églises du réseau.
            </p>
          </div>
          <RealTimeClock />
        </div>

        {/* Coffre-fort & Restauration en 1 Clic (Fenêtre 48h) */}
        <SuperAdminBackupWidget initialBackups={backups || []} />

        {/* Statistiques globales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-md border-t-4 border-gold-500">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Églises</h3>
                <p className="text-4xl font-bold mt-2">{churchList.length}</p>
              </div>
              <span className="text-4xl">⛪</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-md border-t-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Églises Actives</h3>
                <p className="text-4xl font-bold mt-2 text-green-600 dark:text-green-400">{activeChurches}</p>
              </div>
              <span className="text-4xl">✅</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-md border-t-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Membres Total</h3>
                <p className="text-4xl font-bold mt-2 text-blue-600 dark:text-blue-400">{totalMembers}</p>
              </div>
              <span className="text-4xl">👥</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-md border-t-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pointages</h3>
                <p className="text-4xl font-bold mt-2 text-purple-600 dark:text-purple-400">
                  {totalAttendances ?? 0}
                </p>
              </div>
              <span className="text-4xl">📋</span>
            </div>
          </div>
        </div>

        {/* Grille de cartes d'églises */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-serif text-primary-900 dark:text-gold-400">
              🗺️ Toutes les Églises
            </h3>
            <Link
              href="/super-admin/churches/new"
              className="px-5 py-2.5 bg-primary-900 text-white rounded-xl text-sm font-bold hover:bg-primary-800 transition-colors shadow-md flex items-center gap-2"
            >
              <span className="text-lg leading-none">+</span> Nouvelle Église
            </Link>
          </div>

          {churchList.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center shadow-md">
              <p className="text-5xl mb-4">🏛️</p>
              <p className="text-gray-500 text-lg">Aucune église n&apos;a encore été créée.</p>
              <p className="text-gray-400 text-sm mt-1">Commencez par créer la première église du réseau.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {churchList.map((church) => {
                const churchStats = statsByChurch[church.id]
                const members = churchStats?.member_count ?? 0
                const attendances = churchStats?.attendance_count ?? 0
                const isActive = church.status === 'active'
                return (
                  <div
                    key={church.id}
                    className="group relative bg-white dark:bg-slate-800 rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 dark:border-slate-700 hover:-translate-y-1"
                  >
                    {/* Bandeau supérieur */}
                    <div className={`h-1.5 ${isActive ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gradient-to-r from-red-400 to-red-500'}`} />

                    <div className="p-6">
                      {/* En-tête de la carte */}
                      <div className="flex items-start gap-4 mb-4">
                        <div className="flex-shrink-0">
                          {church.logo_url ? (
                            <img
                              src={church.logo_url}
                              alt={church.name}
                              className="w-14 h-14 rounded-xl object-cover border-2 border-gold-500 shadow-md"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900 dark:to-primary-800 flex items-center justify-center text-primary-700 dark:text-gold-400 text-xl font-bold border-2 border-gold-500 shadow-md">
                              {church.name?.substring(0, 2).toUpperCase() || 'E'}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-lg text-gray-900 dark:text-white truncate">{church.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-mono font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-2 py-0.5 rounded">
                              {church.code}
                            </span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              isActive
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                              {isActive ? 'Active' : 'Suspendue'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Localisation */}
                      {(church.city || church.quartier) && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-1.5">
                          <span>📍</span>
                          {[church.city, church.commune, church.quartier].filter(Boolean).join(' · ')}
                        </p>
                      )}

                      {/* Statistiques */}
                      <div className="grid grid-cols-2 gap-3 mb-5">
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
                          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{members}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Membres</p>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3 text-center">
                          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{attendances}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Pointages</p>
                        </div>
                      </div>

                      {/* Boutons d'action */}
                      <div className="flex gap-2">
                        <form action={enterChurchAction} className="flex-1">
                          <input type="hidden" name="churchId" value={church.id} />
                          <button
                            type="submit"
                            className="w-full px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                          >
                            🚪 Entrer
                          </button>
                        </form>
                        <Link
                          href={`/super-admin/churches/${church.id}`}
                          className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                          title="Gérer l'église"
                        >
                          ⚙️
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Tableau détaillé pour la gestion */}
        <div className="border-t border-gray-200 dark:border-slate-700 pt-8">
          <h3 className="text-2xl font-serif text-primary-900 dark:text-gold-400 mb-6">
            📋 Gestion Détaillée
          </h3>
          <ChurchesTable churches={churchList} />
        </div>
      </main>
    </div>
  )
}
