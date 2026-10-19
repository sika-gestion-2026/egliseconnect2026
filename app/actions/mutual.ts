'use server'

import { revalidatePath } from 'next/cache'
import { requireAuthz, authzMessage } from '@/utils/authz'
import { logAudit } from './audit'

const MUTUAL_ROLES = ['super_admin', 'church_admin', 'mutual_manager'] as const

export async function addMutualMember(churchId: string, memberId: string) {
  const authz = await requireAuthz({ roles: MUTUAL_ROLES, requestedChurchId: churchId, requestedMemberId: memberId })
  if (!authz.ok) return { success: false, error: authzMessage(authz) }

  const { supabase, profile } = authz
  const effectiveChurchId = profile.church_id ?? churchId

  const { error } = await supabase
    .from('mutual_members')
    .insert({ church_id: effectiveChurchId, member_id: memberId })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/mutuelle')
  return { success: true }
}

export async function addMultipleMutualMembers(churchId: string, memberIds: string[]) {
  const authz = await requireAuthz({ roles: MUTUAL_ROLES, requestedChurchId: churchId })
  if (!authz.ok) return { success: false, error: authzMessage(authz) }

  if (!memberIds.length) return { success: true }

  const { supabase, profile } = authz
  const effectiveChurchId = profile.church_id ?? churchId

  const payload = memberIds.map(id => ({ church_id: effectiveChurchId, member_id: id }))

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
  const authz = await requireAuthz({ roles: MUTUAL_ROLES })
  if (!authz.ok) return { success: false, error: authzMessage(authz) }

  const { supabase } = authz

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
  const authz = await requireAuthz({ roles: MUTUAL_ROLES, requestedChurchId: churchId })
  if (!authz.ok) return { success: false, error: authzMessage(authz) }

  const { supabase, profile, userId } = authz
  const effectiveChurchId = profile.church_id ?? churchId

  if (amount <= 0) {
    return { success: false, error: 'Le montant doit être supérieur à 0.' }
  }

  if (type === 'expense') {
    const { data: txns } = await supabase
      .from('mutual_transactions')
      .select('type, amount')
      .eq('church_id', effectiveChurchId)

    const balance = (txns || []).reduce((sum, t) => {
      return sum + (t.type === 'contribution' ? t.amount : -t.amount)
    }, 0)

    if (balance < amount) {
      return { success: false, error: 'Solde insuffisant pour cette dépense.' }
    }
  }

  const { error } = await supabase
    .from('mutual_transactions')
    .insert({
      church_id: effectiveChurchId,
      member_id: memberId,
      type,
      amount,
      motive,
      recorded_by: userId,
    })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/mutuelle')
  return { success: true }
}

export async function removeMutualTransaction(transactionId: string) {
  const authz = await requireAuthz({ roles: MUTUAL_ROLES })
  if (!authz.ok) return { success: false, error: authzMessage(authz) }

  const { supabase } = authz

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
