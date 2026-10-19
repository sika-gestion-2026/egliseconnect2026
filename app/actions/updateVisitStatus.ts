'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export async function updateVisitStatusAction(visitId: string, status: string) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    
    // Check auth
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Non autorisé' }
    }

    const { error } = await supabase
      .from('pastoral_visits')
      .update({ status })
      .eq('id', visitId)

    if (error) {
      console.error('Error updating visit status:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/dashboard/visits')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Erreur inattendue' }
  }
}
