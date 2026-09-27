import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import FinancesClient from './FinancesClient'

export const metadata = {
  title: 'Finances & Comptabilité | Eglise Connect',
  description: 'Gérez les entrées et sorties de votre église',
}

export default async function FinancesPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, church_id')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'church_admin' && profile.role !== 'super_admin')) {
    redirect('/dashboard') // Seuls les admins y ont accès
  }

  // Récupérer les finances
  const { data: finances } = await supabase
    .from('church_finances')
    .select('*, created_by_user:user_profiles!created_by(email)')
    .eq('church_id', profile.church_id)
    .order('date', { ascending: false })

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-serif text-primary-900 dark:text-gold-400 mb-2">
          Finances & Comptabilité
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Suivez les offrandes, les dîmes et contrôlez les dépenses de l'église.
        </p>
      </div>

      <FinancesClient initialData={finances || []} />
    </div>
  )
}
