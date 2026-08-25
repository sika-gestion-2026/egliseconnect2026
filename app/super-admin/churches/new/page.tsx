import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LocationPicker from '@/components/LocationPicker'

// Fonction utilitaire pour générer un code aléatoire à 5 caractères
function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export default async function NewChurch() {
  async function addChurch(formData: FormData) {
    'use server'
    
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user?.id).single()
    
    if (profile?.role !== 'super_admin') {
      redirect('/dashboard')
    }
    
    const name = formData.get('name') as string
    const city = formData.get('city') as string
    const commune = formData.get('commune') as string
    const quartier = formData.get('quartier') as string
    const vision = formData.get('vision') as string
    const leaderName = formData.get('leader_name') as string
    const leaderPhone = formData.get('leader_phone') as string
    const leaderEmail = formData.get('leader_email') as string
    const leaderContact = [leaderPhone, leaderEmail].filter(Boolean).join(' | ')
    
    let finalLogoUrl = null
    const logoFile = formData.get('logo_file') as File
    
    if (logoFile && logoFile.size > 0) {
      const fileExt = logoFile.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, logoFile)
        
      if (!uploadError && uploadData) {
        const { data: publicUrlData } = supabase.storage.from('logos').getPublicUrl(uploadData.path)
        finalLogoUrl = publicUrlData.publicUrl
      }
    }
    
    const code = generateCode()
    
    const { error } = await supabase.from('churches').insert({
      name,
      code,
      city,
      commune,
      quartier,
      vision,
      logo_url: finalLogoUrl,
      leader_name: leaderName,
      leader_contact: leaderContact,
      latitude: formData.get('latitude') ? parseFloat(formData.get('latitude') as string) : null,
      longitude: formData.get('longitude') ? parseFloat(formData.get('longitude') as string) : null
    })
    
    if (!error) {
      redirect('/super-admin')
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/super-admin" className="text-gray-500 hover:text-primary-900">
          &larr; Retour
        </Link>
        <h1 className="text-2xl font-serif text-primary-900 dark:text-gold-400">Créer une Église</h1>
      </div>
      
      <form action={addChurch} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-8 border-t-4 border-gold-500">
        
        <div className="mb-8 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
          <p className="text-sm text-primary-900 dark:text-primary-100 flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            Le code d'accès unique (5 caractères) sera <strong>généré automatiquement</strong> pour cette église lors de sa création.
          </p>
        </div>

        <h3 className="font-serif text-lg border-b pb-2 mb-4 dark:border-slate-700">Identité de l'église</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2">Nom de l'église <span className="text-accent-500">*</span></label>
            <input name="name" required type="text" className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700" placeholder="Ex: Église Source de Vie" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
              Uploader le Logo (Image)
            </label>
            <input name="logo_file" type="file" accept="image/*" className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-900 hover:file:bg-primary-100 cursor-pointer" />
          </div>
        </div>
        
        <div className="mb-8">
          <label className="block text-sm font-medium mb-2">Vision de l'église (Slogan ou Mission)</label>
          <textarea name="vision" rows={2} className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700" placeholder="Ex: Faire de toutes les nations des disciples..."></textarea>
        </div>
        
        <h3 className="font-serif text-lg border-b pb-2 mb-4 dark:border-slate-700">Responsabilité Pastorale</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              Responsable (Pasteur)
            </label>
            <input name="leader_name" type="text" className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700" placeholder="Ex: Pasteur Paul" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
              Téléphone
            </label>
            <input name="leader_phone" type="tel" className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700" placeholder="Ex: +243 81..." />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
              Adresse Email
            </label>
            <input name="leader_email" type="email" className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700" placeholder="Ex: pasteur@eglise.com" />
          </div>
        </div>

        <h3 className="font-serif text-lg border-b pb-2 mb-4 dark:border-slate-700">Localisation Précise</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div>
            <label className="block text-sm font-medium mb-2">Ville</label>
            <input name="city" type="text" className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700" placeholder="Ex: Kinshasa" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Commune</label>
            <input name="commune" type="text" className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700" placeholder="Ex: Gombe" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Quartier</label>
            <input name="quartier" type="text" className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700" placeholder="Ex: Socimat" />
          </div>
        </div>

        <h3 className="font-serif text-lg border-b pb-2 mb-4 dark:border-slate-700">Position sur la carte</h3>
        <div className="mb-8">
          <LocationPicker />
        </div>
        
        <div className="flex justify-end gap-4 mt-10">
          <button type="submit" className="px-8 py-3 bg-primary-900 text-white rounded-md font-bold text-lg hover:bg-primary-500 transition-colors shadow-lg">
            Créer l'espace Église
          </button>
        </div>
      </form>
    </div>
  )
}
