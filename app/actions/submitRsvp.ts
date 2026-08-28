'use server'

import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { verifyMemberSession } from '@/utils/memberSession'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function submitRsvpAction(formData: FormData) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const admin = getAdmin()

  let service_id = formData.get('service_id') as string
  const status = formData.get('status') as string
  const reason = formData.get('reason') as string
  const notes = formData.get('notes') as string

  // --- 1. RÉSOUDRE LE MEMBER_ID ---
  // Essai 1 : membre connecté via Supabase Auth (email)
  let memberId: string | null = null
  let churchId: string | null = null

  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('member_id, church_id')
      .eq('id', user.id)
      .single()
    memberId = profile?.member_id || null
    churchId = profile?.church_id || null
  }

  // Essai 2 : membre connecté via phone+code (cookie member_session)
  if (!memberId) {
    const memberSession = cookieStore.get('member_session')?.value
    if (memberSession) {
      const session = verifyMemberSession(memberSession)
      if (session) {
        memberId = session.member_id
        churchId = session.church_id
      }
    }
  }

  if (!memberId) {
    return { error: 'Profil membre introuvable. Veuillez vous reconnecter.' }
  }

  // --- 2. CRÉER LE SERVICE EN DB SI C'EST UN SERVICE RÉCURRENT VIRTUEL ---
  if (service_id.startsWith('recurring-')) {
    const parts = service_id.split('-')
    // Format: recurring-{Day}-{weekOffset}
    // We need the service_date and service_time from the form
    const service_date = formData.get('service_date') as string
    const service_time = formData.get('service_time') as string
    const service_name = formData.get('service_name') as string

    if (!service_date || !service_time || !churchId) {
      return { error: 'Données de service manquantes pour créer l\'événement.' }
    }

    // Check if it already exists
    const { data: existing } = await admin
      .from('church_services')
      .select('id')
      .eq('church_id', churchId)
      .eq('service_date', service_date)
      .eq('service_time', service_time.length === 5 ? service_time + ':00' : service_time)
      .single()

    if (existing) {
      service_id = existing.id
    } else {
      // Create the service automatically
      const { data: created, error: createError } = await admin
        .from('church_services')
        .insert({
          church_id: churchId,
          name: service_name || 'Culte',
          service_date,
          service_time: service_time.length === 5 ? service_time + ':00' : service_time,
          type: 'regular',
        })
        .select('id')
        .single()

      if (createError || !created) {
        return { error: 'Impossible de créer le service. Contactez l\'administrateur.' }
      }
      service_id = created.id
    }
  }

  // --- 3. ENREGISTRER LA DÉCLARATION ---
  const { data: existing } = await admin
    .from('service_declarations')
    .select('id')
    .eq('service_id', service_id)
    .eq('member_id', memberId)
    .single()

  let error
  if (existing) {
    const res = await admin.from('service_declarations').update({
      status,
      reason: reason || null,
      notes: notes || null
    }).eq('id', existing.id)
    error = res.error
  } else {
    const res = await admin.from('service_declarations').insert({
      service_id,
      member_id: memberId,
      status,
      reason: reason || null,
      notes: notes || null
    })
    error = res.error
  }

  if (error) {
    console.error('RSVP error:', error)
    return { error: 'Erreur lors de l\'enregistrement de votre réponse.' }
  }

  revalidatePath('/member-dashboard')
  revalidatePath('/dashboard/attendance')
  return { success: true }
}
