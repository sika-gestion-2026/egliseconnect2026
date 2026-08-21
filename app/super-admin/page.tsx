import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export default async function SuperAdminDashboard() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase.from('user_profiles').select('*').eq('id', user.id).single()

  if (profile?.role !== 'super_admin') {
    redirect('/dashboard') // Or some unauthorized page
  }

  const { data: churches } = await supabase.from('churches').select('*')

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="bg-primary-900 border-b-2 border-gold-500 py-4 px-8 flex justify-between items-center text-white">
        <h1 className="text-2xl font-serif text-gold-400">Église Connect <span className="text-sm font-sans text-gray-300 ml-2">Super Admin</span></h1>
        <form action="/auth/signout" method="post">
          <button className="text-sm text-gray-200 hover:text-white">Déconnexion</button>
        </form>
      </header>
      <main className="p-8 max-w-7xl mx-auto">
        <h2 className="text-3xl font-serif mb-8">Tableau de Bord Global</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border-t-4 border-gold-500">
            <h3 className="text-lg font-medium text-gray-600 dark:text-gray-300">Total Églises</h3>
            <p className="text-4xl font-bold mt-2">{churches?.length || 0}</p>
          </div>
          {/* We will add more metrics here later */}
        </div>
        <div className="mt-10">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-2xl font-serif">Liste des Églises</h3>
            <a href="/super-admin/churches/new" className="px-4 py-2 bg-primary-900 text-white rounded-md text-sm font-medium hover:bg-primary-500 transition-colors shadow-sm">
              + Nouvelle Église
            </a>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 dark:bg-slate-700 text-sm uppercase text-gray-600 dark:text-gray-300">
                  <th className="px-6 py-4 font-medium">Code</th>
                  <th className="px-6 py-4 font-medium">Nom</th>
                  <th className="px-6 py-4 font-medium">Ville</th>
                  <th className="px-6 py-4 font-medium">Statut</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {churches?.map((church) => (
                  <tr key={church.id} className="hover:bg-gray-50 dark:hover:bg-slate-750">
                    <td className="px-6 py-4 font-mono text-sm">{church.code}</td>
                    <td className="px-6 py-4 font-medium text-primary-900 dark:text-gold-400">{church.name}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{church.city}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${church.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                        {church.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-sm text-accent-500 hover:text-accent-900 font-medium">Gérer</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
