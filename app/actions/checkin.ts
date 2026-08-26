'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export async function processCheckinScan(scannedText: string) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Non connecté" }

    // Fetch member ID from user_profiles
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('member_id, church_id')
      .eq('id', user.id)
      .single()

    if (!profile || !profile.member_id) {
      return { success: false, error: "Profil membre introuvable" }
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

    // Update service_declarations to present
    const { error: declError } = await supabase
      .from('service_declarations')
      .upsert({
        service_id: serviceId,
        member_id: profile.member_id,
        status: 'present',
        church_id: profile.church_id
      }, { onConflict: 'service_id,member_id' })

    if (declError) throw declError;

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
