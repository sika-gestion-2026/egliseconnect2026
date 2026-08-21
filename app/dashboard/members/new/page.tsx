import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function NewMember() {
  async function addMember(formData: FormData) {
    'use server'
    
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('user_profiles').select('church_id').eq('id', user?.id).single()
    
    const firstName = formData.get('first_name') as string
    const lastName = formData.get('last_name') as string
    const profession = formData.get('profession') as string
    const status = formData.get('status') as string
    const phone = formData.get('phone') as string
    const pastoralNotes = formData.get('pastoral_notes') as string
    const commune = formData.get('commune') as string
    const quartier = formData.get('quartier') as string
    const needsSupport = formData.get('needs_support') === 'on'
    
    if (profile?.church_id) {
      const { error } = await supabase.from('members').insert({
        church_id: profile.church_id,
        first_name: firstName,
        last_name: lastName,
        profession,
        status,
        phone,
        commune,
        quartier,
        pastoral_notes: pastoralNotes || null,
        needs_support: needsSupport
      })
      
      if (!error) {
        redirect('/dashboard/members')
      }
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/dashboard/members" className="text-gray-500 hover:text-primary-900 dark:hover:text-gold-400">
          &larr; Retour
        </Link>
        <h1 className="text-2xl font-serif text-primary-900 dark:text-gold-400">Nouvelle Fiche Membre</h1>
      </div>
      
      <form action={addMember} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-8 border-t-4 border-gold-500">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Prénom <span className="text-accent-500">*</span></label>
            <input name="first_name" required type="text" className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700 focus:ring-primary-500 focus:border-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Nom <span className="text-accent-500">*</span></label>
            <input name="last_name" required type="text" className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700 focus:ring-primary-500 focus:border-primary-500" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Statut</label>
            <select name="status" className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700 focus:ring-primary-500 focus:border-primary-500">
              <option value="visitor">Visiteur</option>
              <option value="member">Membre</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Téléphone (Appel direct)</label>
            <input name="phone" type="tel" className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700 focus:ring-primary-500 focus:border-primary-500" placeholder="Ex: +243..." />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Profession</label>
            <input name="profession" type="text" className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700 focus:ring-primary-500 focus:border-primary-500" />
          </div>
        </div>
        
        <h3 className="font-serif text-lg border-b pb-2 mb-4 mt-8 dark:border-slate-700">Adresse & Localisation</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Commune</label>
            <input name="commune" type="text" className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700 focus:ring-primary-500 focus:border-primary-500" placeholder="Ex: Limete" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Quartier</label>
            <input name="quartier" type="text" className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700 focus:ring-primary-500 focus:border-primary-500" placeholder="Ex: Résidentiel" />
          </div>
        </div>
        
        <div className="mb-8 p-6 bg-gray-50 dark:bg-slate-750 rounded-lg border border-gray-200 dark:border-slate-600">
          <h3 className="font-medium text-accent-900 dark:text-accent-500 mb-4 flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            Section Pastorale (Confidentiel)
          </h3>
          
          <div className="mb-4">
            <label className="flex items-center gap-3">
              <input name="needs_support" type="checkbox" className="w-5 h-5 text-accent-900 focus:ring-accent-500 border-gray-300 rounded" />
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Signaler un besoin d'accompagnement (Suivi prioritaire)
              </span>
            </label>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Notes Pastorales</label>
            <textarea name="pastoral_notes" rows={4} className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700 focus:ring-primary-500 focus:border-primary-500" placeholder="Notes visibles uniquement par l'équipe pastorale..."></textarea>
          </div>
        </div>
        
        <div className="flex justify-end gap-4">
          <Link href="/dashboard/members" className="px-6 py-2 border border-gray-300 dark:border-slate-600 rounded-md font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
            Annuler
          </Link>
          <button type="submit" className="px-6 py-2 bg-primary-900 hover:bg-primary-500 text-white font-medium rounded-md border border-gold-500 transition-colors shadow-sm">
            Enregistrer le membre
          </button>
        </div>
        
      </form>
    </div>
  )
}
