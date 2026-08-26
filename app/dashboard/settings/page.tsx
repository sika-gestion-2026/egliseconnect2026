import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import PhotoUploadPreview from '@/components/PhotoUploadPreview'
import FormActions from '@/components/FormActions'

export default async function SettingsPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('user_profiles').select('church_id').eq('id', user?.id).single()
  const { data: church } = await supabase.from('churches').select('*').eq('id', profile?.church_id).single()
  const { data: member } = await supabase.from('members').select('photo_url').eq('id', user?.id).single()

  async function updateChurch(formData: FormData) {
    'use server'
    const cs = await cookies()
    const sb = createClient(cs)
    const { data: { user: u } } = await sb.auth.getUser()
    const { data: p } = await sb.from('user_profiles').select('church_id').eq('id', u?.id).single()
    
    const { data: currentChurch } = await sb.from('churches').select('logo_url').eq('id', p?.church_id).single()

    let finalLogoUrl = currentChurch?.logo_url
    const logoFile = formData.get('logo_file') as File

    if (logoFile && logoFile.size > 0) {
      const fileExt = logoFile.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
      
      const { data: uploadData, error: uploadError } = await sb.storage
        .from('logos')
        .upload(fileName, logoFile)
        
      if (!uploadError && uploadData) {
        const { data: publicUrlData } = sb.storage.from('logos').getPublicUrl(uploadData.path)
        finalLogoUrl = publicUrlData.publicUrl
      }
    }

    await sb.from('churches').update({
      name: formData.get('name'),
      vision: formData.get('vision'),
      city: formData.get('city'),
      commune: formData.get('commune'),
      quartier: formData.get('quartier'),
      leader_name: formData.get('leader_name'),
      leader_contact: formData.get('leader_contact'),
      logo_url: finalLogoUrl,
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
        <PhotoUploadPreview 
          name="logo_file" 
          defaultPhotoUrl={church?.logo_url} 
          fallbackIcon="⛪" 
          title="Logo de l'église"
          description="Ajoutez le logo de l'église. Vous pouvez le prendre en photo si besoin !"
        />

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

        <FormActions submitText="Enregistrer les modifications" />
      </form>
    </div>
  )
}
