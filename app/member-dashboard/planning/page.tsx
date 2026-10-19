import { redirect } from 'next/navigation'
import { requireAuthz } from '@/utils/authz'
import { createAdminClient } from '@/utils/supabase/admin'
import MemberPlanningClient from './MemberPlanningClient'

/**
 * « Mon planning » du membre.
 *
 * BUG CORRIGÉ — CHEMIN DE CONNEXION PAR TÉLÉPHONE
 * ------------------------------------------------
 * La page résolvait l'identité par `supabase.auth.getUser()` seul. Un membre
 * connecté par téléphone + code église — le mode d'accès principal des fidèles,
 * celui pour lequel existent `authenticate_member` et le cookie `member_session`
 * — n'a aucun compte Supabase : `profile` valait `null` et la page affichait
 * « Profil non associé à un membre », sans jamais proposer le planning.
 *
 * `requireAuthz({ anyRole: true })` accepte les DEUX chemins
 * d'authentification et renvoie le même couple (église, membre) dans les deux
 * cas. Un membre doit en effet pouvoir gérer ses propres disponibilités quel
 * que soit son mode de connexion.
 *
 * Les lectures passent par un client `service_role` : il n'existe aucune
 * politique RLS `TO anon`, et toutes les politiques existantes s'appuient sur
 * `auth.uid()`, qui vaut NULL sans session Supabase. Un client lié à la session
 * ne renverrait donc aucune ligne pour un membre connecté par téléphone. Le
 * périmètre reste borné par l'EGISE et le MEMBRE issus de la session vérifiée,
 * jamais par un paramètre du client.
 */
export default async function MemberPlanningPage() {
  const authz = await requireAuthz({ anyRole: true })

  if (!authz.ok) {
    redirect('/login?space=member')
  }

  const { member_id: memberId, church_id: churchId } = authz.profile

  if (!memberId) {
    return (
      <div className="p-8">
        <p className="text-gray-500">
          Profil non associé à un membre. Contactez le responsable de votre église.
        </p>
      </div>
    )
  }

  // `createAdminClient()` n'est jamais nul ici : si la clé de service est
  // absente, la construction échoue bruyamment, ce qui est préférable à un
  // repli silencieux sur un client qui ne verrait aucune ligne.
  const client = createAdminClient()
  if (!client) {
    return (
      <div className="p-8">
        <p className="text-gray-500">
          Configuration serveur manquante. Contactez l'administrateur.
        </p>
      </div>
    )
  }

  // Assignations du membre, avec le culte associé.
  const { data: assignments } = await client
    .from('service_assignments')
    .select('*, church_services(*)')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false })

  // Seuls les cultes à venir ou du jour : une assignation passée n'a plus à
  // être confirmée, et la liste reste lisible sans.
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const upcomingAssignments =
    assignments?.filter(
      (a: any) =>
        a.church_services?.service_date && new Date(a.church_services.service_date) >= now
    ) ?? []

  // Membres de la même église, pour choisir un remplaçant.
  const { data: churchMembers } = await client
    .from('members')
    .select('id, first_name, last_name, photo_url')
    .eq('church_id', churchId ?? '')
    .neq('id', memberId)
    .order('first_name')

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-serif text-primary-900 dark:text-gold-400 font-bold mb-2">
          Mon Planning
        </h1>
        <p className="text-gray-500">
          Gérez vos disponibilités pour les prochains cultes et événements.
        </p>
      </div>

      <MemberPlanningClient
        assignments={upcomingAssignments}
        allMembers={churchMembers ?? []}
      />
    </div>
  )
}
