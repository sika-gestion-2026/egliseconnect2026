'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { verifyMemberSession } from '@/utils/memberSession'

export async function updateMemberProfile(formData: FormData) {
  const cookieStore = await cookies()
  const memberSession = cookieStore.get('member_session')?.value
  
  if (!memberSession) {
    return { error: 'Session invalide ou expirée.' }
  }
  
  let targetChurchId = null;
  let targetMemberId = null;
  
  const session = verifyMemberSession(memberSession);
  if (!session) {
    return { error: 'Session invalide ou expirée. Veuillez vous reconnecter.' }
  }
  targetChurchId = session.church_id;
  targetMemberId = session.member_id;
  
  if (!targetChurchId || !targetMemberId) {
    return { error: 'Session invalide.' }
  }

  const supabase = createClient(cookieStore)

  // Extract form data
  const firstName = formData.get('first_name') as string
  const lastName = formData.get('last_name') as string
  const email = formData.get('email') as string
  const phone = formData.get('phone') as string
  const birthDate = formData.get('birth_date') as string
  const commune = formData.get('commune') as string
  const quartier = formData.get('quartier') as string
  const profession = formData.get('profession') as string
  const existingPhotoUrl = formData.get('existing_photo_url') as string
  const photoFile = formData.get('photo_file') as File | null

  if (!firstName || !lastName) {
    return { error: 'Le nom et le prénom sont obligatoires.' }
  }
  
  let finalPhotoUrl = existingPhotoUrl;

  // Handle photo upload if a new file is provided
  if (photoFile && photoFile.size > 0) {
    // Derive extension from MIME type for reliability
    const mimeToExt: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
    };
    const fileExt = mimeToExt[photoFile.type] || photoFile.name.split('.').pop() || 'jpg';
    const fileName = `${targetChurchId}/${targetMemberId}-${Date.now()}.${fileExt}`;
    
    // Delete old photo from storage to avoid orphan files accumulating
    if (existingPhotoUrl && existingPhotoUrl.includes('/logos/')) {
      try {
        // Extract the path after '/logos/' from the public URL
        const oldPath = existingPhotoUrl.split('/logos/').pop();
        if (oldPath) {
          await supabase.storage.from('logos').remove([decodeURIComponent(oldPath)]);
        }
      } catch (e) {
        // Non-blocking: if deletion fails, we still proceed with the upload
        console.warn('Could not delete old photo:', e);
      }
    }

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('logos')
      .upload(fileName, photoFile, {
        cacheControl: '3600',
        upsert: true
      });
      
    if (uploadError) {
      console.error('Erreur upload photo:', uploadError);
      return { error: 'Erreur lors du téléchargement de la photo.' };
    }
    
    if (uploadData) {
      const { data: publicUrlData } = supabase.storage
        .from('logos')
        .getPublicUrl(uploadData.path);
        
      if (publicUrlData) {
        finalPhotoUrl = publicUrlData.publicUrl;
      }
    }
  }

  // Call the secure RPC function to bypass RLS for members updating their own profile
  const { data, error } = await supabase.rpc('update_member_profile_secure', {
    p_member_id: targetMemberId,
    p_church_id: targetChurchId,
    p_first_name: firstName,
    p_last_name: lastName,
    p_phone: phone || null,
    p_email: email || null,
    p_birth_date: birthDate || null,
    p_commune: commune || null,
    p_quartier: quartier || null,
    p_profession: profession || null,
    p_photo_url: finalPhotoUrl || null
  })

  if (error) {
    return { error: 'Erreur lors de la mise à jour du profil.' }
  }
  
  if (data?.error) {
    return { error: data.error }
  }

  revalidatePath('/member-dashboard')
  revalidatePath(`/dashboard/members/${targetMemberId}`)
  
  return { success: true }
}
