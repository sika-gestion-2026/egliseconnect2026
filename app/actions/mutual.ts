'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { logAudit } from './audit'
import { revalidatePath } from 'next/cache'

export async function addMutualMember(churchId: string, memberId: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  
  const { error } = await supabase
    .from('mutual_members')
    .insert({ church_id: churchId, member_id: memberId })
    
  if (error) {
    return { success: false, error: error.message }
  }
  
  revalidatePath('/dashboard/mutuelle')
  return { success: true }
}

export async function addMultipleMutualMembers(churchId: string, memberIds: string[]) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  
  if (!memberIds.length) return { success: true }

  const payload = memberIds.map(id => ({ church_id: churchId, member_id: id }))

  const { error } = await supabase
    .from('mutual_members')
    .insert(payload)
    
  if (error) {
    return { success: false, error: error.message }
  }
  
  revalidatePath('/dashboard/mutuelle')
  return { success: true }
}

export async function removeMutualMember(mutualMemberId: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  
  const { error } = await supabase
    .from('mutual_members')
    .delete()
    .eq('id', mutualMemberId)
    
  if (error) {
    return { success: false, error: error.message }
  }
  
  revalidatePath('/dashboard/mutuelle')
  return { success: true }
}

export async function addMutualTransaction(churchId: string, memberId: string | null, type: 'contribution' | 'expense', amount: number, motive: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { error } = await supabase
    .from('mutual_transactions')
    .insert({
      church_id: churchId,
      member_id: memberId,
      type,
      amount,
      motive,
      recorded_by: user.id
    })
    
  if (error) {
    return { success: false, error: error.message }
  }
  
  revalidatePath('/dashboard/mutuelle')
  revalidatePath('/dashboard/mutuelle')
  return { success: true }
}

export async function removeMutualTransaction(transactionId: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  
  const { error } = await supabase
    .from('mutual_transactions')
    .delete()
    .eq('id', transactionId)
    
  if (error) {
    return { success: false, error: error.message }
  }
  
  await logAudit('MUTUELLE_TX_REMOVED', `A supprimé une transaction (ID: ${transactionId}) de la mutuelle.`)
  
  revalidatePath('/dashboard/mutuelle')
  return { success: true }
}
