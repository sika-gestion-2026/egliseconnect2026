'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function updateEdificationFeed(churchId: string, mode: 'auto' | 'manual', text?: string, ref?: string) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
      .from('churches')
      .update({
        edification_mode: mode,
        custom_verse_text: text || null,
        custom_verse_ref: ref || null
      })
      .eq('id', churchId)

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    console.error('Error updating edification feed:', error)
    return { error: error.message }
  }
}
