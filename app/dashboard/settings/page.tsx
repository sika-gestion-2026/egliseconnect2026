import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import SettingsClient from './SettingsClient'

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
      leader_name: formData.get('leader_name'),
      logo_url: finalLogoUrl,
    }).eq('id', p?.church_id)

    revalidatePath('/dashboard/settings')
    revalidatePath('/dashboard')
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Info Code (lecture seule) */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-blue-100 uppercase tracking-widest mb-1">Code d'accès de l'église</p>
          <p className="text-4xl font-mono font-bold tracking-widest drop-shadow-md">{church?.code}</p>
          <p className="text-sm text-blue-100 mt-2">Partagez ce code avec vos membres pour qu'ils rejoignent cet espace via l'application.</p>
        </div>
        <div className="hidden md:block opacity-20 hover:opacity-40 transition-opacity">
          <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
        </div>
      </div>

      <SettingsClient church={church} updateChurchAction={updateChurch} />
      
    </div>
  )
}
