import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'

export default async function MemberDetailPage({ params }: { params: { id: string } }) {
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
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard/members" className="text-sm text-primary-500 hover:underline flex items-center gap-1">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
          Retour à l'Annuaire
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Colonne gauche : Profil */}
        <div className="md:col-span-1 space-y-4">
          {/* Carte Identité */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border-t-4 border-primary-900 p-6 text-center">
            <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center text-primary-900 dark:text-gold-400 text-3xl font-bold mx-auto mb-4">
              {member.first_name?.[0]}{member.last_name?.[0]}
            </div>
            <h1 className="text-2xl font-serif font-bold text-primary-900 dark:text-gold-400">{member.first_name} {member.last_name}</h1>
            {member.phone && (
              <a href={`tel:${member.phone}`} className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-full text-sm font-bold transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                Appeler
              </a>
            )}
          </div>

          {/* Localisation */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Localisation</h3>
            <div className="space-y-2 text-sm">
              {member.city && <p><span className="font-medium">Ville :</span> {member.city}</p>}
              {member.commune && <p><span className="font-medium">Commune :</span> {member.commune}</p>}
              {member.quartier && <p><span className="font-medium">Quartier :</span> {member.quartier}</p>}
              {!member.city && !member.commune && !member.quartier && <p className="text-gray-400 italic">Non renseignée</p>}
            </div>
          </div>

          {/* Statut Visite */}
          {member.visit_planned && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
              <p className="text-sm font-bold text-blue-700 dark:text-blue-300 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
                Visite Pastorale Planifiée
              </p>
            </div>
          )}
        </div>

        {/* Colonne droite */}
        <div className="md:col-span-2 space-y-4">
          {/* Historique de présence */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              Historique de Présence
            </h2>
            {attendanceHistory && attendanceHistory.length > 0 ? (
              <div className="space-y-2">
                {attendanceHistory.map((a: any, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-md bg-green-50 dark:bg-green-900/20">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-sm font-medium">Présent(e) le {a.attendances?.date}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 italic text-sm">Aucun culte pointé pour ce membre.</p>
            )}
          </div>

          {/* Notes Pastorales */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
              Notes Pastorales Privées
            </h2>
            <form action={updateNotes} className="space-y-4">
              <textarea
                name="pastoral_notes"
                defaultValue={member.pastoral_notes || ''}
                rows={4}
                className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 text-sm"
                placeholder="Notes confidentielles sur ce membre (visites, situation, prières...)..."
              ></textarea>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="needs_support"
                  id="needs_support"
                  defaultChecked={member.needs_support}
                  className="w-4 h-4 accent-primary-900"
                />
                <label htmlFor="needs_support" className="text-sm font-medium">Ce membre nécessite un accompagnement pastoral</label>
              </div>
              <div className="flex justify-end">
                <button type="submit" className="px-6 py-2 bg-primary-900 hover:bg-primary-500 text-white font-bold rounded-md shadow-sm transition-colors text-sm flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline></svg>
                  Sauvegarder
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
