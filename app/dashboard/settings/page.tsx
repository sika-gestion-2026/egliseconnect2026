import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export default async function SettingsPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('user_profiles').select('church_id').eq('id', user?.id).single()
  const { data: church } = await supabase.from('churches').select('*').eq('id', profile?.church_id).single()

  async function updateChurch(formData: FormData) {
    'use server'
    const cs = await cookies()
    const sb = createClient(cs)
    const { data: { user: u } } = await sb.auth.getUser()
    const { data: p } = await sb.from('user_profiles').select('church_id').eq('id', u?.id).single()

    await sb.from('churches').update({
      name: formData.get('name'),
      vision: formData.get('vision'),
      city: formData.get('city'),
      commune: formData.get('commune'),
      quartier: formData.get('quartier'),
      leader_name: formData.get('leader_name'),
      leader_contact: formData.get('leader_contact'),
    }).eq('id', p?.church_id)

    revalidatePath('/dashboard/settings')
    revalidatePath('/dashboard')
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-serif text-primary-900 dark:text-gold-400">Paramètres de l'Église</h1>
        <p className="text-gray-500 mt-2">Modifiez les informations de votre église.</p>
      </div>

      {/* Info Code (lecture seule) */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6 flex items-center gap-4">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-500 flex-shrink-0"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        <div>
          <p className="text-sm font-bold text-blue-800 dark:text-blue-300">Code d'accès de l'église (non modifiable)</p>
          <p className="text-2xl font-mono font-bold text-primary-900 dark:text-gold-400 tracking-widest mt-1">{church?.code}</p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Partagez ce code avec vos membres pour qu'ils rejoignent cet espace.</p>
        </div>
      </div>

      <form action={updateChurch} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border-t-4 border-primary-900 p-8 space-y-6">
        <h2 className="text-xl font-bold text-primary-900 dark:text-gold-400 pb-2 border-b dark:border-slate-700">Informations Générales</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold mb-1">Nom de l'Église</label>
            <input name="name" defaultValue={church?.name || ''} required className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Ville</label>
            <input name="city" defaultValue={church?.city || ''} className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Commune</label>
            <input name="commune" defaultValue={church?.commune || ''} className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Quartier</label>
            <input name="quartier" defaultValue={church?.quartier || ''} className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-primary-500" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold mb-1">Vision de l'Église</label>
          <textarea name="vision" defaultValue={church?.vision || ''} rows={3} className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-primary-500" placeholder="Ex: Connectés à Dieu, unis entre nous..."></textarea>
        </div>

        <h2 className="text-xl font-bold text-primary-900 dark:text-gold-400 pb-2 border-b dark:border-slate-700 pt-4">Responsable Pastoral</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold mb-1">Nom du Responsable</label>
            <input name="leader_name" defaultValue={church?.leader_name || ''} className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-primary-500" placeholder="Pasteur Jean Dupont" />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Contact (Tel/Email)</label>
            <input name="leader_contact" defaultValue={church?.leader_contact || ''} className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-primary-500" placeholder="+243 999 999 999" />
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t dark:border-slate-700">
          <button type="submit" className="px-8 py-3 bg-primary-900 hover:bg-primary-500 text-white font-bold rounded-md shadow-md transition-colors flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
            Enregistrer les modifications
          </button>
        </div>
      </form>
    </div>
  )
}
