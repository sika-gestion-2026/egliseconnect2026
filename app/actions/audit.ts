'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function logAudit(action_type: string, description: string, metadata?: any) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase.from('user_profiles').select('church_id').eq('id', user.id).single()
    if (!profile?.church_id) return

    await supabase.from('audit_logs').insert({
      church_id: profile.church_id,
      user_id: user.id,
      action_type,
      description,
      metadata
    })
  } catch (err) {
    console.error('Erreur logAudit', err)
  }
}
