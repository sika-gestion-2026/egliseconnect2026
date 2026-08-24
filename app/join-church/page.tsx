import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function JoinChurch(props: { searchParams: Promise<{ error?: string }> }) {
  const searchParams = await props.searchParams;
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase.from('user_profiles').select('church_id, role').eq('id', user.id).single()

  if (profile?.church_id) {
    redirect('/dashboard') // Déjà associé à une église
  }

  if (profile?.role === 'super_admin') {
    redirect('/super-admin')
  }

  async function linkChurch(formData: FormData) {
    'use server'
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const code = formData.get('code') as string

    // 1. Chercher l'église par son code (toujours en majuscules)
    const { data: church } = await supabase.from('churches').select('id').eq('code', code.trim().toUpperCase()).single()

    if (!church) {
      redirect('/join-church?error=Code invalide ou église introuvable')
    }

    // 2. Vérifier s'il y a déjà un Pasteur (church_admin) pour cette église
    const { data: existingAdmins, error: countError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('church_id', church.id)
      .eq('role', 'church_admin')

    const hasAdmin = existingAdmins && existingAdmins.length > 0
    const roleToAssign = hasAdmin ? 'member' : 'church_admin'

    // 3. Mettre à jour le profil
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ 
        church_id: church.id,
        role: roleToAssign
      })
      .eq('id', user.id)

    if (updateError) {
      redirect('/join-church?error=Erreur lors de l\'association: ' + updateError.message)
    }

    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 dark:bg-background p-4">
      <div className="w-full max-w-md p-8 bg-white dark:bg-slate-900 rounded-xl shadow-lg border-t-4 border-gold-500 text-center">
        <h1 className="text-3xl font-bold text-primary-900 dark:text-gold-400 font-serif mb-2">Rejoindre votre Église</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-8 text-sm">
          Saisissez le code d'accès à 5 caractères fourni par votre responsable.
        </p>

        {searchParams?.error && (
          <div className="mb-6 p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
            {searchParams.error}
          </div>
        )}

        <form action={linkChurch} className="space-y-6">
          <div>
            <input
              name="code"
              type="text"
              required
              maxLength={5}
              placeholder="Ex: SRCVI"
              className="w-full px-4 py-4 text-center text-2xl tracking-[0.5em] font-mono border rounded-lg uppercase dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
            />
          </div>

          <button
            type="submit"
            className="w-full px-4 py-3 text-white transition-colors rounded-md bg-primary-900 hover:bg-primary-500 font-medium shadow-sm"
          >
            Valider le code
          </button>
        </form>
        
        <div className="mt-6">
           <form action="/auth/signout" method="post">
            <button className="text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">Se déconnecter</button>
          </form>
        </div>
      </div>
    </div>
  )
}
