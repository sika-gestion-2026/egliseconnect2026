import { Metadata } from 'next'
import KidsClient from './kids-client'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Enfants (Écodim) | Église Connect',
  description: 'Pointage sécurisé et gestion des enfants',
}

export default async function KidsPage() {
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

  // Get current member info to pass as context
  const { data: currentMember } = await supabase.from('members').select('*').eq('auth_id', user.id).single()

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Pointage Enfants 🛡️</h1>
        <p className="text-slate-500 mt-1">Module de sécurité Écodim (Check-in / Check-out)</p>
      </div>
      
      <KidsClient currentMember={currentMember || { id: user.id }} />
    </div>
  )
}
