'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
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
    const admin = createAdminClient()
    if (!admin) {
      return { error: 'Configuration serveur manquante. Contactez l\'administrateur.' }
    }

    // La vérification et la confirmation passent par la clé serveur.
    // La clé publique du navigateur ne peut plus confirmer un email.
    const { data: emailExists, error: rpcCheckError } = await admin.rpc('check_pastor_email_exists', {
      p_email: email
    });

    if (rpcCheckError || !emailExists) {
      return { error: 'Cet email n\'est associé à aucune église. Veuillez contacter l\'administrateur.' }
    }

    const { error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (createError && !/already|registered|exists/i.test(createError.message)) {
      return { error: 'Erreur lors de l\'inscription : ' + createError.message }
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      return { error: 'Erreur lors de la connexion automatique : ' + signInError.message }
    }

    const { data: rpcLinkSuccess, error: rpcLinkError } = await admin.rpc('link_pastor_to_church', { p_email: email });
    
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
