'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function registerPastorAction(formData: FormData) {
  try {
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
      return { error: 'L\'email et le mot de passe sont requis.' }
    }

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // 1. Vérifier si l'email existe bien en tant que leader d'une église avant même de tenter l'inscription
    const { data: emailExists, error: rpcCheckError } = await supabase.rpc('check_pastor_email_exists', {
      p_email: email
    });

    if (rpcCheckError || !emailExists) {
      return { error: 'Cet email n\'est associé à aucune église. Veuillez contacter l\'administrateur.' }
    }

    // 2. Créer l'utilisateur dans Supabase Auth
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (signUpError) {
      // Si l'utilisateur existe déjà, ce n'est pas grave, on peut continuer avec la connexion
      if (signUpError.status !== 422) { // 422 == User already registered
        return { error: 'Erreur lors de l\'inscription : ' + signUpError.message }
      }
    }

    // 3. Auto-confirmer l'email (bypass confirmation link)
    const { error: rpcConfirmError } = await supabase.rpc('auto_confirm_pastor', { p_email: email });
    if (rpcConfirmError) {
      console.error("Erreur auto_confirm_pastor:", rpcConfirmError);
    }

    // 4. Se connecter pour établir la session (nécessaire pour la suite)
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      return { error: 'Erreur lors de la connexion automatique : ' + signInError.message }
    }

    // 5. Lier le pasteur à son église (met à jour user_profiles)
    const { data: rpcLinkSuccess, error: rpcLinkError } = await supabase.rpc('link_pastor_to_church', { p_email: email });
    
    if (rpcLinkError || !rpcLinkSuccess) {
      console.error("Erreur link_pastor_to_church:", rpcLinkError);
      return { error: 'Compte créé mais erreur lors de l\'affectation à l\'église.' }
    }

    return { success: true, redirectUrl: '/dashboard' }
    
  } catch (error) {
    console.error('Erreur inattendue registerPastorAction:', error)
    return { error: 'Une erreur inattendue est survenue.' }
  }
}
