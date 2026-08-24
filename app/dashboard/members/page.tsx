import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import Link from 'next/link'
import DirectoryClient from './DirectoryClient'

export default async function MembersDirectory() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('user_profiles').select('church_id').eq('id', user?.id).single()

  const { data: rawMembers } = await supabase
    .from('members')
    .select('*, user_profiles(id, created_at, role)')
    .eq('church_id', profile?.church_id)
    .order('created_at', { ascending: false })
    
  // Ghost mode: Filter out super_admin
  const members = rawMembers?.filter(m => {
    if (m.user_profiles && m.user_profiles.length > 0) {
      return m.user_profiles[0].role !== 'super_admin'
    }
    return true
  }) || []

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div>
          <h1 className="text-3xl font-serif text-primary-900 dark:text-gold-400 font-bold">Annuaire des Membres</h1>
          <p className="text-gray-500 text-sm mt-1">Consultez, recherchez et organisez la liste des personnes de votre communauté.</p>
        </div>
        <div className="flex gap-2">
          <a
            href="/api/export-members"
            className="px-4 py-2 bg-white dark:bg-slate-800 text-primary-900 dark:text-white rounded-md font-medium border border-gray-300 dark:border-slate-600 hover:bg-gray-50 transition-colors shadow-sm flex items-center gap-2 text-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Exporter CSV
          </a>
          <Link 
            href="/dashboard/members/new" 
            className="px-4 py-2 bg-primary-900 text-white rounded-md font-bold border border-gold-500 hover:bg-primary-500 transition-all shadow-sm"
          >
            + Ajouter un membre
          </Link>
        </div>
      </div>

      {/* Composant Client Interactif pour la recherche et le regroupement */}
      <DirectoryClient initialMembers={members || []} />

    </div>
  )
}
