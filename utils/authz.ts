import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { verifyMemberSession } from '@/utils/memberSession'

/**
 * Garde-fou d'autorisation partagé par les Server Actions.
 *
 * Historique du problème : plusieurs actions recevaient `churchId` ou
 * `memberId` directement du client et l'utilisaient tel quel pour écrire. Un
 * membre authentifié pouvait donc viser l'église d'un autre tenant en
 * forgeant l'identifiant dans la requête — l'absence de vérification côté
 * serveur ne pouvait pas être compensée par la RLS, qui ne voit que le rôle et
 * l'église de l'appelant, pas l'identifiant demandé.
 *
 * La règle : l'identifiant d'église et de membre vient TOUJOURS du profil
 * serveur de l'appelant. Les arguments du client ne servent qu'à demander
 * « est-ce bien celui-là ? », jamais à décider « sur lequel écrire ».
 */

/** Rôles d'encadrement : peuvent administrer le contenu de leur église. */
export const ADMIN_ROLES = ['super_admin', 'church_admin', 'moderator'] as const

/** Rôles autorisés à manipuler les présences et le scanner. */
export const STAFF_ROLES = [
  'super_admin',
  'church_admin',
  'moderator',
  'dept_leader',
  'scanner',
] as const

export type AuthzProfile = {
  church_id: string | null
  role: string
  member_id: string | null
}

export type AuthzSuccess = {
  ok: true
  supabase: ReturnType<typeof createClient>
  profile: AuthzProfile
  /**
   * Identifiant de l'utilisateur Supabase authentifié, ou `null` pour une
   * session membre signée par HMAC (qui ne correspond à aucun compte Auth).
   *
   * Exposé parce que certaines colonnes d'audit (`church_services.created_by`)
   * référencent `auth.users.id`. Le profil ne contient pas cet identifiant ;
   * sans ce champ, chaque action devait refaire sa propre lecture de l'utilisateur.
   */
  userId: string | null
}

export type AuthzFailure = {
  ok: false
  error: string
  code: 'unauthenticated' | 'no_profile' | 'forbidden' | 'wrong_church' | 'wrong_member'
}

export type AuthzResult = AuthzSuccess | AuthzFailure

/**
 * Vérifie l'identité et le rôle de l'appelant.
 *
 * Deux modes d'authentification coexistent : la session Supabase (pasteurs,
 * encadrement) et la session membre signée par HMAC (téléphone + code église).
 * Les deux sont acceptées, sinon un fidèle connecté par téléphone verrait ses
 * propres actions refusées.
 *
 * @param opts.anyRole        Accepte tout rôle authentifié, y compris
 *                            `member`. À utiliser pour les actions osoires
 *                            (marquer ses notifications comme lues,
 *                            confirmer sa présence) qui ne manipulent que la
 *                            ligne du membre appelant ; `roles` est alors
 *                            ignoré.
 * @param opts.roles        Rôles acceptés (défaut : encadrement).
 * @opts.requestedChurchId Église visée par l'action. Si fourni, doit
 *                         correspondre à l'église du profil — c'est ce contrôle
 *                         qui bloque les écritures inter-égyses.
 * @opts.requestedMemberId Membre visé. Si fourni et que l'appelant n'est pas
 *                         un encadrement, il doit être son propre membre_id.
 */
export async function requireAuthz(opts: {
  anyRole?: boolean
  roles?: readonly string[]
  requestedChurchId?: string | null
  requestedMemberId?: string | null
  allowSelfService?: boolean
}): Promise<AuthzResult> {
  // `anyRole` est un booléen explicite plutôt qu'une liste de rôles : passer
  // `roles: null` donnerait un tableau de casts illisible, et `roles: []`
  // refuserait tout le monde — y compris le membre légitime.
  const anyRole = opts.anyRole === true
  const allowed = opts.roles ?? ADMIN_ROLES
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let profile: AuthzProfile
  let userId: string | null = null

  if (user) {
    userId = user.id

    const { data } = await supabase
      .from('user_profiles')
      .select('church_id, role, member_id')
      .eq('id', user.id)
      .maybeSingle()

    if (!data) {
      return { ok: false, error: 'Profil introuvable.', code: 'no_profile' }
    }

    profile = data as AuthzProfile
  } else {
    // Repli sur la session membre signée (HMAC), sans appel réseau.
    //
    // Elle est indispensable : /member-dashboard et /localisation sont
    // accessibles via téléphone + code église, sans compte Supabase. Sans ce
    // repli, un fidèle connecté par téléphone verrait ses propres actions
    // rejetées alors qu'il est légitime.
    const token = cookieStore.get('member_session')?.value
    const session = token ? verifyMemberSession(token) : null

    if (!session) {
      return { ok: false, error: 'Non connecté.', code: 'unauthenticated' }
    }

    // Une session membre ne porte aucun rôle d'encadrement : c'est par
    // définition un profil de fidèle, borné à sa propre ligne.
    profile = {
      church_id: session.church_id,
      role: 'member',
      member_id: session.member_id,
    }
  }

  const isSuperAdmin = profile.role === 'super_admin'

  if (!anyRole && !allowed.includes(profile.role)) {
    return {
      ok: false,
      error: "Vous n'avez pas les droits nécessaires pour cette action.",
      code: 'forbidden',
    }
  }

  // Cible d'église : le super_admin peut viser n'importe quelle église
  // (c'est son métier), tout autre rôle est cloisonné à la sienne.
  if (opts.requestedChurchId) {
    if (opts.requestedChurchId !== profile.church_id && !isSuperAdmin) {
      return {
        ok: false,
        error: "Vous n'avez pas accès à cette église.",
        code: 'wrong_church',
      }
    }
  }

  // Cible de membre : un fidèle ne peut écrire que sur sa propre ligne.
  if (opts.requestedMemberId) {
    const isAdmin = isSuperAdmin || (ADMIN_ROLES as readonly string[]).includes(profile.role)
    if (!isAdmin && opts.requestedMemberId !== profile.member_id) {
      return {
        ok: false,
        error: 'Vous ne pouvez modifier que votre propre profil.',
        code: 'wrong_member',
      }
    }
  }

  return { ok: true, supabase, profile, userId }
}

/** Message d'erreur uniformisé pour les Server Actions. */
export function authzMessage(result: AuthzFailure): string {
  switch (result.code) {
    case 'unauthenticated':
      return 'Session expirée, reconnectez-vous.'
    case 'wrong_church':
      return "Vous n'avez pas accès à cette église."
    case 'wrong_member':
      return 'Vous ne pouvez modifier que votre propre profil.'
    case 'no_profile':
      return 'Profil introuvable. Contactez un responsable.'
    default:
      return result.error
  }
}