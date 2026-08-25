import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'

export default async function MemberDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('user_profiles').select('church_id').eq('id', user?.id).single()

  const { data: member } = await supabase
    .from('members')
    .select('*')
    .eq('id', params.id)
    .eq('church_id', profile?.church_id)
    .single()

  if (!member) notFound()

  // Calculer l'âge et vérifier si c'est son anniversaire aujourd'hui
  let age = null
  let isBirthdayToday = false
  if (member.birth_date) {
    const today = new Date()
    const birth = new Date(member.birth_date)
    age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    isBirthdayToday = today.getDate() === birth.getDate() && today.getMonth() === birth.getMonth()
  }

  // Parser la liste des fonctions
  let functionsList: string[] = []
  if (member.functions) {
    try {
      functionsList = typeof member.functions === 'string' ? JSON.parse(member.functions) : member.functions
    } catch {
      functionsList = Array.isArray(member.functions) ? member.functions : []
    }
  }

  // Historique de présence du membre
  const { data: attendanceHistory } = await supabase
    .from('attendance_members')
    .select('attendance_id, attendances(date)')
    .eq('member_id', params.id)
    .order('attendance_id', { ascending: false })
    .limit(10)

  async function updateNotes(formData: FormData) {
    'use server'
    const cs = await cookies()
    const sb = createClient(cs)
    await sb.from('members').update({
      pastoral_notes: formData.get('pastoral_notes'),
      needs_support: formData.get('needs_support') === 'on',
    }).eq('id', params.id)
    revalidatePath(`/dashboard/members/${params.id}`)
    revalidatePath('/dashboard/visits')
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="mb-2 flex items-center justify-between">
        <Link href="/dashboard/members" className="text-sm text-primary-500 hover:underline flex items-center gap-1 font-bold">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
          Retour à l'Annuaire
        </Link>
        <Link href={`/dashboard/members/${params.id}/edit`} className="text-sm bg-gold-500 hover:bg-gold-600 text-white px-3 py-1.5 rounded-md flex items-center gap-2 font-bold transition-colors shadow-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          Modifier la fiche
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Colonne gauche : Profil et Informations Personnelles */}
        <div className="space-y-6">
          
          {/* Carte Identité */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border-t-4 border-gold-500 p-6 text-center">
            {member.photo_url ? (
              <img 
                src={member.photo_url} 
                alt={`${member.first_name} ${member.last_name}`} 
                className="w-24 h-24 rounded-full object-cover border-2 border-gold-500 shadow-md mx-auto mb-4" 
              />
            ) : (
              <div className="w-24 h-24 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center text-primary-900 dark:text-gold-400 text-3xl font-bold mx-auto mb-4 border border-gold-500">
                {member.first_name?.[0]}{member.last_name?.[0]}
              </div>
            )}
            
            <h1 className="text-2xl font-serif font-bold text-primary-900 dark:text-gold-400">
              {member.first_name} {member.last_name}
            </h1>
            
            <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-bold">
              {member.status === 'member' ? 'Membre Actif' : 'Visiteur Régulier'}
            </p>

            {member.phone && (
              <a 
                href={`tel:${member.phone}`} 
                className="mt-4 w-full justify-center inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-md text-sm font-bold transition-all shadow-sm"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                Appeler : {member.phone}
              </a>
            )}
          </div>

          {/* Situation Personnelle & Contact */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 border-b pb-2 dark:border-slate-700">
              Détails Personnels
            </h3>
            <div className="space-y-3 text-sm">
              <p><span className="font-semibold text-gray-500">Genre :</span> {member.gender === 'M' ? 'Masculin' : member.gender === 'F' ? 'Féminin' : 'Non spécifié'}</p>
              {member.email && (
                <p>
                  <span className="font-semibold text-gray-500">Email :</span>{' '}
                  <a href={`mailto:${member.email}`} className="text-primary-600 hover:underline">{member.email}</a>
                </p>
              )}
              {member.birth_date && (
                <p>
                  <span className="font-semibold text-gray-500">Né(e) le :</span> {new Date(member.birth_date).toLocaleDateString('fr-FR')}{' '}
                  {age !== null && <span className="font-bold">({age} ans)</span>}
                </p>
              )}
              
              {isBirthdayToday && (
                <div className="p-3 bg-yellow-50 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300 rounded-lg font-bold text-xs flex items-center gap-1.5 animate-pulse border border-yellow-200">
                  🎉 C'est son anniversaire aujourd'hui !
                </div>
              )}
              
              <p><span className="font-semibold text-gray-500">Statut matrimonial :</span> {member.marital_status || 'Célibataire'}</p>
              <p><span className="font-semibold text-gray-500">Nombre d'enfants :</span> {member.children_count || 0}</p>
              {member.profession && <p><span className="font-semibold text-gray-500">Profession :</span> {member.profession}</p>}
              {member.emergency_contact && <p><span className="font-semibold text-gray-500">Contact d'urgence :</span> {member.emergency_contact}</p>}
            </div>
          </div>

          {/* Localisation */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 border-b pb-2 dark:border-slate-700">
              Localisation
            </h3>
            <div className="space-y-2 text-sm">
              <p><span className="font-semibold text-gray-500">Commune :</span> {member.commune || 'Non spécifiée'}</p>
              <p><span className="font-semibold text-gray-500">Quartier :</span> {member.quartier || 'Non spécifié'}</p>
            </div>
          </div>

        </div>

        {/* Colonne droite : Vie Spirituelle, Notes & Historique */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Vie Spirituelle & Départements */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 space-y-4">
            <h2 className="text-lg font-bold text-primary-900 dark:text-gold-400 border-b pb-2 dark:border-slate-700 font-serif">
              Vie Spirituelle & Départements
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <p><span className="font-semibold text-gray-500">Baptisé(e) d'eau :</span> {member.baptized ? 'Oui ✅' : 'Non ❌'}</p>
              {member.baptized && member.baptism_church && (
                <p><span className="font-semibold text-gray-500">Église de baptême :</span> {member.baptism_church}</p>
              )}
            </div>
            
            <div className="pt-2">
              <span className="font-semibold text-gray-500 text-sm block mb-2">Départements & Groupes de service :</span>
              {functionsList.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {functionsList.map((f, i) => (
                    <span 
                      key={i} 
                      className="px-3 py-1.5 bg-primary-50 text-primary-900 dark:bg-slate-700 dark:text-gold-400 rounded-lg text-xs font-semibold border border-primary-100 dark:border-slate-600"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-gray-400 italic text-sm">Aucun groupe de service assigné.</span>
              )}
            </div>
          </div>

          {/* Historique de présence */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-primary-900 dark:text-gold-400 font-serif">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              Historique des 10 dernières Présences
            </h2>
            {attendanceHistory && attendanceHistory.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {attendanceHistory.map((a: any, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-150">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                    <span className="text-sm font-semibold">Présent(e) le {new Date(a.attendances?.date).toLocaleDateString('fr-FR')}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 italic text-sm">Aucun culte pointé pour ce membre.</p>
            )}
          </div>

          {/* Notes Pastorales (Confidentiel) */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-accent-950 dark:text-accent-400 font-serif">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
              Suivi Pastoral & Confidentiel
            </h2>
            <form action={updateNotes} className="space-y-4">
              <textarea
                name="pastoral_notes"
                defaultValue={member.pastoral_notes || ''}
                rows={4}
                className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 text-sm"
                placeholder="Notes confidentielles sur ce membre..."
              ></textarea>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="needs_support"
                  id="needs_support"
                  defaultChecked={member.needs_support}
                  className="w-5 h-5 accent-primary-900"
                />
                <label htmlFor="needs_support" className="text-sm font-bold text-gray-700 dark:text-gray-200">
                  Ce membre nécessite un accompagnement pastoral (Suivi prioritaire)
                </label>
              </div>
              <div className="flex justify-end">
                <button type="submit" className="px-6 py-2 bg-primary-900 hover:bg-primary-500 text-white font-bold rounded-md shadow-sm transition-colors text-sm flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline></svg>
                  Sauvegarder les notes
                </button>
              </div>
            </form>
          </div>

        </div>

      </div>
    </div>
  )
}
