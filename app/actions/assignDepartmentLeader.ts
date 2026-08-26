'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export async function assignDepartmentLeaderAction(formData: FormData) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const department_name = formData.get('department_name') as string
  const member_id = formData.get('member_id') as string

  if (!department_name || !member_id) return { error: 'Le département et le membre sont requis.' }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorisé' }

  const { data: profile } = await supabase.from('user_profiles').select('church_id').eq('id', user.id).single()
  if (!profile?.church_id) return { error: 'Profil introuvable' }

  // Chercher ou créer le département
  let { data: department } = await supabase
    .from('church_departments')
    .select('id')
    .eq('church_id', profile.church_id)
    .eq('name', department_name)
    .maybeSingle()

  if (!department) {
    const { data: newDept, error: insertDeptError } = await supabase
      .from('church_departments')
      .insert({
        church_id: profile.church_id,
        name: department_name,
        description: `Département généré automatiquement pour le groupe: ${department_name}`
      })
      .select('id')
      .single()
      
    if (insertDeptError) {
      console.error('Erreur création dept:', insertDeptError)
      return { error: 'Erreur création dept: ' + insertDeptError.message }
    }
    department = newDept
  }

  if (!department) return { error: 'Impossible de trouver ou créer le département.' }

  const { error } = await supabase.from('department_leaders').insert({
    department_id: department.id,
    member_id
  })

  if (error) {
    if (error.code === '23505') {
      return { error: 'Ce membre est déjà responsable de ce département.' }
    }
    console.error('Erreur assignation:', error)
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
