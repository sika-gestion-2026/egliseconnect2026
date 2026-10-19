'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

/**
 * Vérifie que l'utilisateur authentifié a un rôle autorisé à pointer des membres.
 * Un simple fidèle ne doit pas pouvoir enregistrer ou effacer des présences.
 */
const ATTENDANCE_ROLES = ['super_admin', 'church_admin', 'moderator', 'dept_leader', 'scanner']

export async function processCheckinScan(scannedText: string) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Non connecté" }

    // Fetch member ID from user_profiles
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('member_id, church_id, role')
      .eq('id', user.id)
      .single()

    if (!profile || !profile.member_id) {
      return { success: false, error: "Profil membre introuvable" }
    }

    if (!ATTENDANCE_ROLES.includes(profile.role)) {
      return { success: false, error: "Vous n'êtes pas autorisé à pointer les présences." }
    }

    // Verify format: EGLISE_CONNECT_CHECKIN_{service_id}
    const prefix = "EGLISE_CONNECT_CHECKIN_"
    if (!scannedText.startsWith(prefix)) {
      return { success: false, error: "QR Code non reconnu. Scannez le QR Code officiel de l'église." }
    }

    const serviceId = scannedText.substring(prefix.length)

    // Check if service belongs to the church
    const { data: service } = await supabase
      .from('church_services')
      .select('id')
      .eq('id', serviceId)
      .eq('church_id', profile.church_id)
      .single()

    if (!service) {
      return { success: false, error: "Culte introuvable ou n'appartient pas à votre église." }
    }

    // Enregistre la présence dans `service_declarations`.
    //
    // Deux pièges corrigés ici :
    //
    // 1. `church_id` n'existe pas sur `service_declarations`. Son schéma passe
    //    par `member_id → members.church_id`. La colonne envoyée faisait échouer
    //    l'upsert ENTIER (PostgREST rejette la requête dès qu'un champ est
    //    inconnu), et l'appel est suivi d'un `throw` : le pointage de présence
    //    était cassé. L'église est déjà vérifiée ci-dessus, via le service.
    //
    // 2. L'`onConflict` exige une contrainte unique sur
    //    `(service_id, member_id)`, absente de toutes les migrations. Elle est
    //    créée par `20261005080000`. Sans elle, l'erreur est « there is no
    //    unique or exclusion constraint matching the ON CONFLICT
    //    specification ».
    const { error: declError } = await supabase
      .from('service_declarations')
      .upsert({
        service_id: serviceId,
        member_id: profile.member_id,
        status: 'present'
      }, { onConflict: 'service_id,member_id' })

    if (declError) {
      // Message exploitable plutôt qu'une exception avalée en « Une erreur est
      // survenue » : sans cela, un pointage cassé est indiscernable d'un
      // incident réseau pour l'utilisateur et pour l'exploitation.
      console.error('[checkin] Échec du pointage', declError.message)
      return { success: false, error: "Le pointage n'a pas pu être enregistré." }
    }

    // Additionally, if they are assigned to a role, update service_assignments to present
    await supabase
      .from('service_assignments')
      .update({ status: 'present' })
      .eq('service_id', serviceId)
      .eq('member_id', profile.member_id)

    revalidatePath('/dashboard/planning')
    revalidatePath('/member-dashboard')
    
    return { success: true }
  } catch (err: any) {
    console.error("Checkin scan error:", err)
    return { success: false, error: "Une erreur est survenue." }
  }
}
