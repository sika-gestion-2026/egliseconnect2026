'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export async function toggleModeratorRoleAction(memberId: string, roleName: string, isAssigned: boolean) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non autorisé' }

    const { data: profile } = await supabase.from('user_profiles').select('church_id, role').eq('id', user.id).single()
    
    if (!profile?.church_id || (profile.role !== 'church_admin' && profile.role !== 'super_admin')) {
      return { error: 'Permissions insuffisantes' }
    }

    // 1. Chercher si le département (rôle) existe déjà pour cette église
    let { data: department } = await supabase
      .from('church_departments')
      .select('id')
      .eq('church_id', profile.church_id)
      .eq('name', roleName)
      .maybeSingle()

    // 2. S'il n'existe pas, on le crée
    if (!department) {
      const { data: newDept, error: insertError } = await supabase
        .from('church_departments')
        .insert({
          church_id: profile.church_id,
          name: roleName,
          description: `Département généré automatiquement pour le rôle: ${roleName}`
        })
        .select('id')
        .single()
        
      if (insertError) throw insertError
      department = newDept
    }

    if (!department) return { error: 'Erreur lors de la récupération du rôle' }

    // 3. Assigner ou désassigner le membre
    if (isAssigned) {
      // Assigner
      const { error: assignError } = await supabase
        .from('department_leaders')
        .upsert({ 
          department_id: department.id, 
          member_id: memberId 
        }, { onConflict: 'department_id, member_id' })
        
      if (assignError) throw assignError
    } else {
      // Désassigner
      const { error: removeError } = await supabase
        .from('department_leaders')
        .delete()
        .match({ 
          department_id: department.id, 
          member_id: memberId 
        })
        
      if (removeError) throw removeError
    }

    revalidatePath('/dashboard/team')
    return { success: true }
  } catch (error: any) {
    console.error('Erreur toggleModeratorRoleAction:', error)
    return { error: error.message || 'Une erreur inattendue est survenue' }
  }
}
