import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export default async function VisitsPlanner() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('user_profiles').select('church_id').eq('id', user?.id).single()

  // Fetch members who need support or have a visit planned
  const { data: membersToVisit } = await supabase
    .from('members')
    .select('*')
    .eq('church_id', profile?.church_id)
    .or('needs_support.eq.true,visit_planned.eq.true')
    .order('last_name', { ascending: true })

  // Categorize
  const needsPlanning = membersToVisit?.filter(m => m.needs_support && !m.visit_planned) || []
  const planned = membersToVisit?.filter(m => m.visit_planned) || []

  // Server action to update visit status
  async function updateVisitStatus(formData: FormData) {
    'use server'
    const memberId = formData.get('member_id') as string
    const actionType = formData.get('action_type') as string
    
    const cs = await cookies()
    const sb = createClient(cs)
    
    if (actionType === 'plan') {
      await sb.from('members').update({ visit_planned: true }).eq('id', memberId)
    } else if (actionType === 'done') {
      // Done visiting -> clear both flags
      await sb.from('members').update({ visit_planned: false, needs_support: false }).eq('id', memberId)
    }
    
    revalidatePath('/dashboard/visits')
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-serif text-primary-900 dark:text-gold-400">Planificateur de Visites Pastorales</h1>
        <p className="text-gray-500 mt-2">Gérez les visites aux membres nécessitant un accompagnement.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Colonne 1: A Planifier */}
        <div className="bg-orange-50 dark:bg-orange-900/10 rounded-xl p-6 border border-orange-200 dark:border-orange-900/30">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-orange-900 dark:text-orange-400 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-500"></span>
              À Planifier
            </h2>
            <span className="bg-orange-200 text-orange-800 dark:bg-orange-900 dark:text-orange-200 text-xs font-bold px-2 py-1 rounded-full">{needsPlanning.length}</span>
          </div>

          <div className="space-y-4">
            {needsPlanning.length === 0 ? (
              <p className="text-sm text-orange-600 dark:text-orange-400 italic">Aucun membre en attente de visite.</p>
            ) : (
              needsPlanning.map(member => (
                <div key={member.id} className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-orange-100 dark:border-orange-900/50">
                  <h4 className="font-bold">{member.first_name} {member.last_name}</h4>
                  {member.pastoral_notes && <p className="text-sm text-gray-500 mt-2 italic">"{member.pastoral_notes}"</p>}
                  <div className="mt-4 pt-4 border-t border-orange-50 flex gap-2">
                    <form action={updateVisitStatus} className="w-full">
                      <input type="hidden" name="member_id" value={member.id} />
                      <input type="hidden" name="action_type" value="plan" />
                      <button className="w-full text-sm font-medium bg-orange-100 hover:bg-orange-200 text-orange-800 py-1.5 rounded-md transition-colors">
                        Mettre au planning &rarr;
                      </button>
                    </form>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Colonne 2: Planifiées */}
        <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl p-6 border border-blue-200 dark:border-blue-900/30">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-blue-900 dark:text-blue-400 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500"></span>
              Visites Programmées
            </h2>
            <span className="bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs font-bold px-2 py-1 rounded-full">{planned.length}</span>
          </div>

          <div className="space-y-4">
            {planned.length === 0 ? (
              <p className="text-sm text-blue-600 dark:text-blue-400 italic">Aucune visite programmée.</p>
            ) : (
              planned.map(member => (
                <div key={member.id} className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-blue-100 dark:border-blue-900/50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold">{member.first_name} {member.last_name}</h4>
                      <p className="text-xs text-gray-500 mt-1">{member.quartier || 'Quartier non renseigné'}</p>
                    </div>
                    {member.phone && (
                      <a href={`tel:${member.phone}`} className="p-2 bg-green-50 text-green-600 rounded-full hover:bg-green-100">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                      </a>
                    )}
                  </div>
                  <div className="mt-4 pt-4 border-t border-blue-50 flex gap-2">
                    <form action={updateVisitStatus} className="w-full">
                      <input type="hidden" name="member_id" value={member.id} />
                      <input type="hidden" name="action_type" value="done" />
                      <button className="w-full text-sm font-medium bg-green-600 hover:bg-green-500 text-white py-1.5 rounded-md transition-colors flex items-center justify-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        Marquer comme faite
                      </button>
                    </form>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
