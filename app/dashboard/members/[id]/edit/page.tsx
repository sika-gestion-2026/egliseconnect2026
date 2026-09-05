import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import PhotoUploadPreview from '@/components/PhotoUploadPreview'
import FormActions from '@/components/FormActions'
import { revalidatePath } from 'next/cache'

export default async function EditMember(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('user_profiles').select('church_id, role').eq('id', user?.id).single()
  
  if (!profile?.church_id && profile?.role !== 'super_admin') {
    redirect('/dashboard/members')
  }

  // Récupération du membre actuel
  let memberQuery = supabase
    .from('members')
    .select('*')
    .eq('id', params.id)
    
  if (profile?.role !== 'super_admin' && profile?.church_id) {
    memberQuery = memberQuery.eq('church_id', profile.church_id)
  }

  const { data: member, error } = await memberQuery.single()

  if (!member || error) {
    console.error("Member not found error:", error);
    notFound()
  }

  // Parse functions
  let functionsList: string[] = []
  if (member.functions) {
    try {
      functionsList = typeof member.functions === 'string' ? JSON.parse(member.functions) : member.functions
    } catch {
      functionsList = Array.isArray(member.functions) ? member.functions : []
    }
  }

  async function updateMember(formData: FormData) {
    'use server'
    
    const cs = await cookies()
    const sb = createClient(cs)

    const firstName = formData.get('first_name') as string
    const lastName = formData.get('last_name') as string
    const gender = formData.get('gender') as string
    const birthDate = formData.get('birth_date') as string || null
    const email = formData.get('email') as string || null
    const phone = formData.get('phone') as string || null
    
    const status = formData.get('status') as string
    const baptized = formData.get('baptized') === 'true'
    const baptismChurch = formData.get('baptism_church') as string || null
    const functions = formData.getAll('functions') as string[] // array of selected checkboxes
    
    const maritalStatus = formData.get('marital_status') as string
    const childrenCount = parseInt(formData.get('children_count') as string || '0', 10)
    const profession = formData.get('profession') as string || null
    const commune = formData.get('commune') as string || null
    const quartier = formData.get('quartier') as string || null
    const emergencyContact = formData.get('emergency_contact') as string || null
    
    const pastoralNotes = formData.get('pastoral_notes') as string || null
    const needsSupport = formData.get('needs_support') === 'on'
    
    // Upload de la photo si elle est fournie
    let finalPhotoUrl = member?.photo_url || null
    const photoFile = formData.get('photo_file') as File
    
    if (photoFile && photoFile.size > 0) {
      const fileExt = photoFile.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
      
      const { data: uploadData, error: uploadError } = await sb.storage
        .from('logos')
        .upload(`members/${fileName}`, photoFile)
        
      if (!uploadError && uploadData) {
        const { data: publicUrlData } = sb.storage.from('logos').getPublicUrl(uploadData.path)
        finalPhotoUrl = publicUrlData.publicUrl
      } else if (uploadError) {
        console.error("Erreur upload photo membre:", uploadError)
      }
    }
    
    let updateQuery = sb.from('members').update({
      first_name: firstName,
      last_name: lastName,
      gender,
      birth_date: birthDate,
      email,
      phone,
      status,
      baptized,
      baptism_church: baptismChurch,
      functions: JSON.stringify(functions),
      marital_status: maritalStatus,
      children_count: childrenCount,
      profession,
      commune,
      quartier,
      emergency_contact: emergencyContact,
      pastoral_notes: pastoralNotes,
      needs_support: needsSupport,
      photo_url: finalPhotoUrl
    }).eq('id', params.id);
    
    if (profile?.role !== 'super_admin' && profile?.church_id) {
      updateQuery = updateQuery.eq('church_id', profile.church_id);
    }
    
    const { error } = await updateQuery;
    
    if (!error) {
      revalidatePath(`/dashboard/members/${params.id}`)
      revalidatePath(`/dashboard/members`)
      redirect(`/dashboard/members/${params.id}`)
    }
  }

  const churchFunctions = [
    'Groupe musical (Chant/Instrument)',
    'Ancien de l\'église',
    'Service d\'ordre / Accueil',
    'Évangélisation & Mission',
    'Diacre / Diaconesse',
    'Protocole & Logistique',
    'Intercession / Prière',
    'Enseignement / École du dimanche',
    'Média / Sono / Communication',
    'Jeunesse',
    'Mutuelle'
  ]

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="mb-6 flex items-center gap-4">
        <Link href={`/dashboard/members/${params.id}`} className="text-gray-500 hover:text-primary-900 dark:hover:text-gold-400 font-bold transition-colors">
          &larr; Retour au profil
        </Link>
        <h1 className="text-2xl font-serif text-primary-900 dark:text-gold-400">Modifier {member.first_name} {member.last_name}</h1>
      </div>
      
      <form action={updateMember} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-8 border-t-4 border-gold-500 space-y-8">
        
        {/* Photo du membre */}
        <PhotoUploadPreview name="photo_file" defaultPhotoUrl={member.photo_url} />

        {/* Section 1: Identité */}
        <div className="space-y-4">
          <h3 className="font-serif text-lg border-b pb-2 text-primary-900 dark:text-gold-400 dark:border-slate-700 font-bold">1. Identité Générale</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1">Prénom <span className="text-accent-500">*</span></label>
              <input name="first_name" defaultValue={member.first_name} required type="text" className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700" placeholder="Ex: Christian" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nom <span className="text-accent-500">*</span></label>
              <input name="last_name" defaultValue={member.last_name} required type="text" className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700" placeholder="Ex: Munoko" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Sexe / Genre</label>
              <select name="gender" defaultValue={member.gender} className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700">
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date de naissance</label>
              <input name="birth_date" defaultValue={member.birth_date || ''} type="date" className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Téléphone (Appel direct)</label>
              <input name="phone" defaultValue={member.phone || ''} type="tel" className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700" placeholder="Ex: +225..." />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Adresse Email</label>
              <input name="email" defaultValue={member.email || ''} type="email" className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700" placeholder="Ex: nom@domaine.com" />
            </div>
          </div>
        </div>

        {/* Section 2: Statut Spirituel & Fonctions */}
        <div className="space-y-4">
          <h3 className="font-serif text-lg border-b pb-2 text-primary-900 dark:text-gold-400 dark:border-slate-700 font-bold">2. Vie Spirituelle & Fonctions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1">Statut dans l'Église</label>
              <select name="status" defaultValue={member.status} className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700">
                <option value="membre_actif">Membre Actif</option>
                <option value="visiteur_simple">Visiteur Simple</option>
                <option value="visiteur_occasionnel">Visiteur par Moments</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Baptisé(e) d'eau ?</label>
              <select name="baptized" defaultValue={member.baptized ? 'true' : 'false'} className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700">
                <option value="false">Non</option>
                <option value="true">Oui</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Nom de l'église de baptême (Si baptisé)</label>
              <input name="baptism_church" defaultValue={member.baptism_church || ''} type="text" className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700" placeholder="Ex: Église source de bénédictions" />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium mb-2">Départements / Rôles dans l'église (Cochez tout ce qui s'applique)</label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {churchFunctions.map((fn, idx) => (
                <label key={idx} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors cursor-pointer text-sm">
                  <input type="checkbox" name="functions" value={fn} defaultChecked={functionsList.includes(fn)} className="w-4 h-4 accent-primary-900" />
                  <span>{fn}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Section 3: Situation Personnelle */}
        <div className="space-y-4">
          <h3 className="font-serif text-lg border-b pb-2 text-primary-900 dark:text-gold-400 dark:border-slate-700 font-bold">3. Situation Personnelle & Professionnelle</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1">Situation matrimoniale</label>
              <select name="marital_status" defaultValue={member.marital_status || 'Célibataire'} className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700">
                <option value="Célibataire">Célibataire</option>
                <option value="Marié(e)">Marié(e)</option>
                <option value="Divorcé(e)">Divorcé(e)</option>
                <option value="Veuf(ve)">Veuf(ve)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nombre d'enfants</label>
              <input name="children_count" type="number" min={0} defaultValue={member.children_count || 0} className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Profession / Emploi</label>
              <input name="profession" defaultValue={member.profession || ''} type="text" className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700" placeholder="Ex: Comptable" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Commune</label>
              <input name="commune" defaultValue={member.commune || ''} type="text" className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700" placeholder="Ex: Cocody" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Quartier</label>
              <input name="quartier" defaultValue={member.quartier || ''} type="text" className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700" placeholder="Ex: Angré" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Contact d'urgence (Nom + Numéro)</label>
              <input name="emergency_contact" defaultValue={member.emergency_contact || ''} type="text" className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700" placeholder="Ex: Marie (Conjointe) +225..." />
            </div>
          </div>
        </div>

        {/* Section 4: Pastorale (Confidentielle) */}
        <div className="mb-8 p-6 bg-slate-50 dark:bg-slate-750 rounded-lg border border-gray-200 dark:border-slate-600">
          <h3 className="font-medium text-accent-950 dark:text-accent-400 mb-4 flex items-center gap-2 font-serif text-lg">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            Section Pastorale (Confidentiel)
          </h3>
          
          <div className="mb-4">
            <label className="flex items-center gap-3">
              <input name="needs_support" type="checkbox" defaultChecked={member.needs_support} className="w-5 h-5 text-accent-900 focus:ring-accent-500 border-gray-300 rounded" />
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Signaler un besoin d'accompagnement (Suivi prioritaire)
              </span>
            </label>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Notes Pastorales</label>
            <textarea name="pastoral_notes" defaultValue={member.pastoral_notes || ''} rows={4} className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700 focus:ring-primary-500 focus:border-primary-500" placeholder="Notes visibles uniquement par l'équipe pastorale..."></textarea>
          </div>
        </div>
        
        {/* Actions */}
        <FormActions cancelUrl={`/dashboard/members/${params.id}`} submitText="Enregistrer les modifications" />
        
      </form>
    </div>
  )
}
