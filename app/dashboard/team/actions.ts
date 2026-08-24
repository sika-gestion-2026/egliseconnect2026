'use server'

import { createClient } from '@/utils/supabase/server'
import { createClient as createSimpleClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export async function addTeamMember(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'L\'adresse email et le mot de passe sont requis.' }
  }

  // 1. Obtenir les cookies du pasteur pour authentifier ses droits
  const cookieStore = await cookies()
  const pastorSupabase = createClient(cookieStore)

  const { data: { user: pastorUser } } = await pastorSupabase.auth.getUser()
  if (!pastorUser) return { error: 'Non authentifié.' }

  const { data: profile } = await pastorSupabase
    .from('user_profiles')
    .select('role, church_id')
    .eq('id', pastorUser.id)
    .single()

  if (profile?.role !== 'church_admin' || !profile?.church_id) {
    return { error: 'Seul le pasteur principal peut ajouter des collaborateurs.' }
  }

  // 2. Créer le compte dans Supabase Auth à l'aide d'un client simple (sans cookies)
  // Cela évite de déconnecter la session du pasteur en cours
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  const anonSupabase = createSimpleClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  })

  const { data: signUpData, error: signUpError } = await anonSupabase.auth.signUp({
    email,
    password,
  })

  if (signUpError) {
    return { error: signUpError.message }
  }

  const newUserId = signUpData.user?.id
  if (!newUserId) {
    return { error: 'Erreur lors de la création de l\'utilisateur.' }
  }

  // 3. Associer le nouveau modérateur à l'église via la fonction SQL SECURITY DEFINER
  const { error: rpcError } = await pastorSupabase.rpc('create_moderator_profile', {
    moderator_id: newUserId,
    moderator_email: email,
    target_church_id: profile.church_id
  })

  if (rpcError) {
    return { error: rpcError.message }
  }

  revalidatePath('/dashboard/team')
  return { success: true }
}

export async function removeTeamMember(moderatorId: string) {
  const cookieStore = await cookies()
  const pastorSupabase = createClient(cookieStore)

  const { data: { user: pastorUser } } = await pastorSupabase.auth.getUser()
  if (!pastorUser) return { error: 'Non authentifié.' }

  const { data: profile } = await pastorSupabase
    .from('user_profiles')
    .select('role, church_id')
    .eq('id', pastorUser.id)
    .single()

  if (profile?.role !== 'church_admin' || !profile?.church_id) {
    return { error: 'Seul le pasteur principal peut révoquer des collaborateurs.' }
  }

  // Empêcher de s'auto-supprimer
  if (moderatorId === pastorUser.id) {
    return { error: 'Vous ne pouvez pas supprimer votre propre compte.' }
  }

  // Retirer le modérateur de l'église (on réinitialise son rôle et son église)
  const { error: updateError } = await pastorSupabase
    .from('user_profiles')
    .update({ church_id: null, role: 'member' })
    .eq('id', moderatorId)
    .eq('church_id', profile.church_id)

  if (updateError) {
    return { error: updateError.message }
  }

  revalidatePath('/dashboard/team')
  return { success: true }
}
