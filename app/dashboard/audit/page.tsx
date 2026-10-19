import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default async function AuditPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('user_profiles').select('church_id, role').eq('id', user.id).single()
  if (!profile?.church_id) redirect('/dashboard')

  if (profile.role !== 'super_admin' && profile.role !== 'church_admin') {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <h1 className="text-3xl font-bold text-red-600 mb-4">Accès Refusé</h1>
        <p className="text-gray-500">Seul l'administrateur principal de l'église peut accéder au journal d'audit de sécurité.</p>
      </div>
    )
  }

  // `auth_users:user_id (email)` était une jointure INVALIDE : `user_id` est une
  // colonne de `audit_logs` qui référence `auth.users`, pas une relation
  // PostgREST. Le serveur répondait 400, donc `logs` valait `null` et le journal
  // d'audit s'affichait vide — sans le moindre message d'erreur.
  //
  // L'identité de l'acteur est résolue par la requête suivante, sur
  // `user_profiles`, dont `id` EST l'identifiant du compte utilisateur. Elle
  // porte `email`, ce qui suffit à identifier un auteur.
  const { data: logs } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('church_id', profile.church_id)
    .order('created_at', { ascending: false })
    .limit(100)

  // `full_name` n'est pas une colonne de `user_profiles` : les noms vivent dans
  // `members`. On lit donc `email` et `member_id`, et la page affiche l'e-mail —
  // un journal d'audit doit identifier un compte, pas un prénom susceptible
  // d'être mal saisi.
  const userNames: Record<string, string> = {}
  if (logs && logs.length > 0) {
    const userIds = [...new Set(logs.map(l => l.user_id).filter(Boolean))]
    if (userIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('user_profiles')
        .select('id, email')
        .in('id', userIds)

      profilesData?.forEach(p => {
        userNames[p.id] = p.email || 'Compte inconnu'
      })
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-serif text-primary-900 dark:text-gold-400 font-bold">Journal d'Audit de Sécurité</h1>
        <p className="text-gray-500 mt-1">Historique des 100 dernières actions sensibles réalisées sur l'application.</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
                <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Date & Heure</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Auteur</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Type d'Action</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Description Détaillée</th>
              </tr>
            </thead>
            <tbody>
              {logs?.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-500">Aucune action sensible enregistrée pour le moment.</td>
                </tr>
              ) : logs?.map((log: any) => (
                <tr key={log.id} className="border-b dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                  <td className="py-3 px-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(log.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                  </td>
                  <td className="py-3 px-4 text-sm font-medium">
                    {userNames[log.user_id] || 'Utilisateur inconnu'}
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <span className="px-2.5 py-1 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-md font-mono text-xs font-bold">
                      {log.action_type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                    {log.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
