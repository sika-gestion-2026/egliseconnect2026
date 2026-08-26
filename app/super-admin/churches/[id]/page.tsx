import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import DeleteChurchButton from '@/components/DeleteChurchButton'
import LocationPicker from '@/components/LocationPicker'

export default async function ManageChurchPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const churchId = params.id
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // 1. Vérifier si l'utilisateur est connecté et est un Super Admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'super_admin') {
    redirect('/dashboard')
  }

  // 2. Récupérer les détails de l'église
  const { data: church } = await supabase
    .from('churches')
    .select('*')
    .eq('id', churchId)
    .single()

  if (!church) {
    redirect('/super-admin')
  }

  // 3. Récupérer les statistiques de cette église
  const { count: membersCount } = await supabase
    .from('members')
    .select('*', { count: 'exact', head: true })
    .eq('church_id', churchId)

  const { count: attendancesCount } = await supabase
    .from('attendances')
    .select('*', { count: 'exact', head: true })
    .eq('church_id', churchId)

  const { data: moderators } = await supabase
    .from('user_profiles')
    .select('email, role')
    .eq('church_id', churchId)

  // 4. Server Action pour mettre à jour l'église
  async function saveChurchDetails(formData: FormData) {
    'use server'
    const cs = await cookies()
    const sb = createClient(cs)

    const name = formData.get('name') as string
    const status = formData.get('status') as string
    const city = formData.get('city') as string
    const commune = formData.get('commune') as string
    const quartier = formData.get('quartier') as string
    const vision = formData.get('vision') as string
    const leaderName = formData.get('leader_name') as string
    const leaderContact = formData.get('leader_contact') as string
    const lat = formData.get('latitude')
    const lng = formData.get('longitude')

    let finalLogoUrl = church.logo_url
    const logoFile = formData.get('logo_file') as File

    if (logoFile && logoFile.size > 0) {
      const fileExt = logoFile.name.split('.').pop()
      // eslint-disable-next-line react-hooks/purity
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
      
      const { data: uploadData, error: uploadError } = await sb.storage
        .from('logos')
        .upload(fileName, logoFile)
        
      if (!uploadError && uploadData) {
        const { data: publicUrlData } = sb.storage.from('logos').getPublicUrl(uploadData.path)
        finalLogoUrl = publicUrlData.publicUrl
      }
    }

    const { error } = await sb
      .from('churches')
      .update({
        name,
        status,
        city,
        commune,
        quartier,
        vision,
        logo_url: finalLogoUrl,
        leader_name: leaderName,
        leader_contact: leaderContact,
        latitude: lat ? parseFloat(lat as string) : null,
        longitude: lng ? parseFloat(lng as string) : null,
      })
      .eq('id', churchId)

    if (!error) {
      revalidatePath('/super-admin')
      revalidatePath(`/super-admin/churches/${churchId}`)
      revalidatePath('/dashboard')
      revalidatePath('/super-admin')
      redirect('/super-admin')
    }
  }

  // 5. Server Action pour supprimer l'église
  async function deleteChurchAction() {
    'use server'
    const cs = await cookies()
    const sb = createClient(cs)

    // Revérifier les permissions
    const { data: { user } } = await sb.auth.getUser()
    const { data: profile } = await sb.from('user_profiles').select('role').eq('id', user?.id).single()
    
    // Sécurité maximale : Seul l'email contenant munokolive peut supprimer une église
    if (profile?.role !== 'super_admin' || !user?.email?.includes('munokolive')) {
      redirect('/dashboard')
    }

    const { error } = await sb.from('churches').delete().eq('id', churchId)

    if (!error) {
      revalidatePath('/super-admin')
      redirect('/super-admin')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* En-tête */}
        <div className="flex items-center justify-between border-b pb-4 dark:border-slate-700">
          <div className="flex items-center gap-4">
            <Link href="/super-admin" className="text-gray-500 hover:text-primary-900 transition-colors">
              &larr; Retour
            </Link>
            <div>
              <h1 className="text-3xl font-serif font-bold text-primary-900 dark:text-gold-400">
                Gérer {church.name}
              </h1>
              <p className="text-sm text-gray-500">
                Identifiant : <span className="font-mono">{church.id}</span>
              </p>
            </div>
          </div>
          
          {/* Badge de statut */}
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
              church.status === 'active' 
                ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300' 
                : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
            }`}>
              Statut : {church.status}
            </span>
          </div>
        </div>

        {/* Statistiques rapides */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-150 dark:border-slate-700">
            <h3 className="text-sm text-gray-500 font-semibold uppercase">Membres</h3>
            <p className="text-3xl font-bold mt-2 text-primary-900 dark:text-gold-400">{membersCount || 0}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-150 dark:border-slate-700">
            <h3 className="text-sm text-gray-500 font-semibold uppercase">Pointages</h3>
            <p className="text-3xl font-bold mt-2 text-primary-900 dark:text-gold-400">{attendancesCount || 0}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-150 dark:border-slate-700">
            <h3 className="text-sm text-gray-500 font-semibold uppercase">Code d'accès</h3>
            <p className="text-2xl font-mono font-bold mt-2 text-primary-900 dark:text-gold-400 tracking-wider">
              {church.code}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-150 dark:border-slate-700">
            <h3 className="text-sm text-gray-500 font-semibold uppercase">Équipe Admin</h3>
            <p className="text-3xl font-bold mt-2 text-primary-900 dark:text-gold-400">{moderators?.length || 0}</p>
          </div>
        </div>

        {/* Formulaire & Collaborateurs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Formulaire de modification */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border p-8 space-y-6">
            <h3 className="text-xl font-serif font-bold text-primary-900 dark:text-gold-400 border-b pb-2 dark:border-slate-700">
              Modifier les Informations
            </h3>
            
            <form action={saveChurchDetails} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-1">Nom de l'Église</label>
                  <input 
                    name="name" 
                    defaultValue={church.name} 
                    required 
                    className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Statut</label>
                  <select 
                    name="status" 
                    defaultValue={church.status} 
                    className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700"
                  >
                    <option value="active">Actif</option>
                    <option value="suspended">Suspendu / Gelé</option>
                  </select>
                </div>
              </div>

              {/* Logo actuel & upload */}
              <div className="space-y-2 border-t pt-4 dark:border-slate-700">
                <label className="block text-sm font-medium">Logo de l'église</label>
                <div className="flex items-center gap-4">
                  {church.logo_url ? (
                    <img 
                      src={church.logo_url} 
                      alt="Logo actuel" 
                      className="w-16 h-16 rounded-full object-cover border-2 border-gold-500" 
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center text-xl">
                      ⛪
                    </div>
                  )}
                  <div className="flex-1">
                    <input 
                      name="logo_file" 
                      type="file" 
                      accept="image/*" 
                      className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700 text-sm" 
                    />
                    <p className="text-xs text-gray-500 mt-1">Sélectionnez une nouvelle image pour remplacer le logo actuel.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4 dark:border-slate-700">
                <div>
                  <label className="block text-sm font-medium mb-1">Ville</label>
                  <input name="city" defaultValue={church.city || ''} className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Commune</label>
                  <input name="commune" defaultValue={church.commune || ''} className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Quartier</label>
                  <input name="quartier" defaultValue={church.quartier || ''} className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Vision / Slogan</label>
                <textarea 
                  name="vision" 
                  defaultValue={church.vision || ''} 
                  rows={3} 
                  className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700"
                ></textarea>
              </div>

              <div className="border-t pt-4 dark:border-slate-700">
                <h4 className="text-md font-bold mb-4 text-primary-900 dark:text-gold-400">Localisation GPS (Carte)</h4>
                <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-xl border dark:border-slate-700/50 shadow-inner">
                  <LocationPicker 
                    initialLat={church.latitude} 
                    initialLng={church.longitude} 
                    churchLogoUrl={church.logo_url}
                    // Optional: userPhotoUrl pour le super admin, on peut ignorer ou mettre une icone par défaut
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 dark:border-slate-700">
                <div>
                  <label className="block text-sm font-medium mb-1">Nom du Responsable Pastoral</label>
                  <input name="leader_name" defaultValue={church.leader_name || ''} className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Contact (Tel/Email)</label>
                  <input name="leader_contact" defaultValue={church.leader_contact || ''} className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700" />
                </div>
              </div>

              <div className="flex justify-end gap-4 border-t pt-4 dark:border-slate-700">
                <Link 
                  href="/super-admin" 
                  className="px-6 py-2 border rounded-md hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Annuler
                </Link>
                <button 
                  type="submit" 
                  className="px-6 py-2 bg-primary-900 hover:bg-primary-500 text-white rounded-md font-bold transition-colors"
                >
                  Enregistrer les modifications
                </button>
              </div>
            </form>
          </div>

          {/* Collaborateurs & Accès */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border p-6 h-fit space-y-4">
            <h3 className="text-lg font-serif font-bold text-primary-900 dark:text-gold-400 border-b pb-2 dark:border-slate-700">
              Administrateurs & Modérateurs
            </h3>
            <p className="text-xs text-gray-500">
              Liste des personnes ayant accès à cet espace d'église.
            </p>
            <div className="space-y-3">
              {moderators?.map((mod, i) => (
                <div key={i} className="p-3 bg-gray-50 dark:bg-slate-900 rounded-lg border flex flex-col gap-1">
                  <span className="font-semibold text-sm truncate">{mod.email}</span>
                  <span className="text-xs px-2 py-0.5 w-fit rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {mod.role === 'church_admin' ? 'Pasteur/Admin' : 'Collaborateur'}
                  </span>
                </div>
              ))}
              {(!moderators || moderators.length === 0) && (
                <p className="text-sm text-gray-500 italic text-center py-4">
                  Aucun administrateur associé.
                </p>
              )}
            </div>
          </div>

        </div>

        {/* Zone Rouge - Suppression */}
        <div className="mt-12 bg-red-50 dark:bg-red-950/20 rounded-xl shadow-sm border border-red-200 dark:border-red-900/50 p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-bold text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                Zone de Danger : Suppression de l'Église
              </h3>
              <p className="text-sm text-red-600 dark:text-red-300">
                Attention : la suppression d'une église est <strong>définitive et irréversible</strong>. Cela supprimera également tous les membres, les profils administrateurs locaux et les données de pointage qui y sont attachés.
              </p>
            </div>
            <form action={deleteChurchAction}>
              <DeleteChurchButton churchName={church.name} />
            </form>
          </div>
        </div>

      </div>
    </div>
  )
}
