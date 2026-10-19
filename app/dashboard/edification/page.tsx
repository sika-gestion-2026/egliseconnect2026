import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import EdificationClient from './EdificationClient'

export default async function EdificationPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('church_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.church_id) return null

  const { data: church } = await supabase
    .from('churches')
    .select('id, name, edification_mode, custom_verse_text, custom_verse_ref')
    .eq('id', profile.church_id)
    .single()

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-serif text-primary-900 dark:text-gold-400 font-bold mb-2">Flux d'Édification</h1>
        <p className="text-gray-500">Gérez le verset de la semaine qui s'affiche sur le tableau de bord des membres.</p>
      </div>

      <EdificationClient church={church} />
    </div>
  )
}
