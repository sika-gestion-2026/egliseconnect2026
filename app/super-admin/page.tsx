import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import ChurchesTable from './ChurchesTable'
import RealTimeClock from '@/components/RealTimeClock'

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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <h2 className="text-3xl font-serif">Tableau de Bord Global</h2>
          <RealTimeClock />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border-t-4 border-gold-500">
            <h3 className="text-lg font-medium text-gray-600 dark:text-gray-300">Total Églises</h3>
            <p className="text-4xl font-bold mt-2">{churches?.length || 0}</p>
          </div>
          {/* We will add more metrics here later */}
        </div>
        <ChurchesTable churches={churches || []} />
      </main>
    </div>
  )
}
