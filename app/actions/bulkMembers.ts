'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { logAudit } from './audit'

export async function bulkImportMembers(churchId: string, members: any[]) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Add church_id to all members
    const formattedMembers = members.map(m => ({
      ...m,
      church_id: churchId,
      status: 'active'
    }))

    const { error } = await supabase
      .from('members')
      .insert(formattedMembers)

    if (error) {
      console.error('Supabase error bulk insert:', error)
      return { success: false, error: error.message }
    }

    await logAudit('BULK_MEMBERS_IMPORT', `A importé ${members.length} membres via Excel.`)
    revalidatePath('/dashboard/members')
    
    return { success: true }
  } catch (err: any) {
    console.error('Bulk insert err:', err)
    return { success: false, error: err.message }
  }
}
