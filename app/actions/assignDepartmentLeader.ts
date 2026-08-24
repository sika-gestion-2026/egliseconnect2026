'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export async function assignDepartmentLeaderAction(formData: FormData) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const department_id = formData.get('department_id') as string
  const member_id = formData.get('member_id') as string

  if (!department_id || !member_id) return { error: 'Le département et le membre sont requis.' }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorisé' }

  const { error } = await supabase.from('department_leaders').insert({
    department_id,
    member_id
  })

  if (error) {
    if (error.code === '23505') {
      return { error: 'Ce membre est déjà responsable de ce département.' }
    }
    return { error: 'Erreur lors de l\'assignation : ' + error.message }
  }

  revalidatePath('/dashboard/team')
  return { success: true }
}

export async function removeDepartmentLeaderAction(leaderId: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorisé' }

  const { error } = await supabase.from('department_leaders').delete().eq('id', leaderId)
  if (error) return { error: 'Erreur: ' + error.message }
  
  revalidatePath('/dashboard/team')
  return { success: true }
}
