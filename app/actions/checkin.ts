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

    // Supporte deux formats de scan :
    // 1. Pointage par QR Code du culte : "EGLISE_CONNECT_CHECKIN_{serviceId}" (le fidèle scanne l'affiche du culte)
    // 2. Pointage par QR Code du membre : UUID du membre (l'accueil scanne la carte du membre)
    const prefix = "EGLISE_CONNECT_CHECKIN_"
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(scannedText.trim())

    let serviceId: string
    let targetMemberId: string = profile.member_id

    if (scannedText.startsWith(prefix)) {
      serviceId = scannedText.substring(prefix.length)
      // Vérifier que le culte appartient à l'église de l'utilisateur
      const { data: service } = await supabase
        .from('church_services')
        .select('id')
        .eq('id', serviceId)
        .eq('church_id', profile.church_id)
        .single()

      if (!service) {
        return { success: false, error: "Culte introuvable ou n'appartient pas à votre église." }
      }
    } else if (isUuid) {
      // C'est la carte d'un membre scannée à l'accueil
      const scannedMemberId = scannedText.trim()
      const { data: member } = await supabase
        .from('members')
        .select('id, first_name, last_name, church_id')
        .eq('id', scannedMemberId)
        .single()

      if (!member || member.church_id !== profile.church_id) {
        return { success: false, error: "Membre introuvable ou n'appartient pas à cette église." }
      }
      targetMemberId = member.id

      // Trouver le culte actif du jour pour cette église
      const today = new Date().toISOString().split('T')[0]
      const { data: activeService } = await supabase
        .from('church_services')
        .select('id, name')
        .eq('church_id', profile.church_id)
        .eq('service_date', today)
        .order('service_time', { ascending: false })
        .limit(1)
        .single()

      if (!activeService) {
        return { success: false, error: "Aucun culte programmé aujourd'hui pour enregistrer le pointage." }
      }
      serviceId = activeService.id
    } else {
      return { success: false, error: "QR Code non reconnu. Scannez une carte de membre ou le code officiel d'un culte." }
    }

    const { error: declError } = await supabase
      .from('service_declarations')
      .upsert({
        service_id: serviceId,
        member_id: targetMemberId,
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
