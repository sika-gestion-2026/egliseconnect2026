'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export async function addTransaction(formData: FormData) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, church_id')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'church_admin' && profile?.role !== 'super_admin') {
    return { success: false, error: 'Non autorisé' }
  }

  const churchId = profile.church_id
  if (!churchId) return { success: false, error: 'Église non trouvée' }

  const type = formData.get('type') as 'income' | 'expense'
  const amount = parseFloat(formData.get('amount') as string)
  const category = formData.get('category') as string
  const motif = formData.get('motif') as string
  const dateStr = formData.get('date') as string
  
  if (!amount || amount <= 0) {
    return { success: false, error: 'Le montant doit être supérieur à zéro' }
  }

  // Vérification de la caisse pour les dépenses
  if (type === 'expense') {
    // Calculer le solde actuel
    const { data: transactions } = await supabase
      .from('church_finances')
      .select('type, amount')
      .eq('church_id', churchId)

    let solde = 0
    if (transactions) {
      solde = transactions.reduce((acc, curr) => {
        return curr.type === 'income' ? acc + Number(curr.amount) : acc - Number(curr.amount)
      }, 0)
    }

    if (amount > solde) {
      return { success: false, error: `Fonds insuffisants. Solde actuel: ${solde.toLocaleString('fr-FR')} FCFA` }
    }
  }

  const { error } = await supabase.from('church_finances').insert({
    church_id: churchId,
    type,
    amount,
    category,
    motif,
    date: new Date(dateStr).toISOString(),
    created_by: user.id
  })

  if (error) {
    console.error('Erreur transaction:', error)
    return { success: false, error: 'Erreur lors de l\'enregistrement' }
  }

  revalidatePath('/dashboard/finances')
  return { success: true }
}

export async function deleteTransaction(transactionId: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, church_id')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'church_admin' && profile?.role !== 'super_admin') {
    return { success: false, error: 'Non autorisé' }
  }

  // Vérifier d'abord si la suppression de cette entrée (si c'est une income) ne va pas rendre le solde négatif
  const { data: trx } = await supabase.from('church_finances').select('type, amount').eq('id', transactionId).single()
  
  if (trx?.type === 'income') {
    const { data: allTrx } = await supabase.from('church_finances').select('type, amount').eq('church_id', profile.church_id)
    if (allTrx) {
      const currentBalance = allTrx.reduce((acc, curr) => {
        return curr.type === 'income' ? acc + Number(curr.amount) : acc - Number(curr.amount)
      }, 0)
      if (currentBalance - Number(trx.amount) < 0) {
        return { success: false, error: 'Suppression impossible : le solde de la caisse deviendrait négatif' }
      }
    }
  }

  const { error } = await supabase.from('church_finances').delete().eq('id', transactionId)

  if (error) {
    return { success: false, error: 'Erreur de suppression' }
  }

  revalidatePath('/dashboard/finances')
  return { success: true }
}
