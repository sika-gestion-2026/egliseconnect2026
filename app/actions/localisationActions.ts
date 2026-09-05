'use server';

import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function updateMemberLocation(memberId: string, latitude: number, longitude: number) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  try {
    const { error } = await supabase
      .from('members')
      .update({ latitude, longitude })
      .eq('id', memberId);
      
    if (error) {
      console.error('Error updating member location:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (err) {
    console.error('Exception updating member location:', err);
    return { success: false };
  }
}
