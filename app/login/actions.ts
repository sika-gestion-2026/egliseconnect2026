'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { cookies } from 'next/headers'
import { absoluteUrl } from '@/utils/siteUrl'

const SUPER_ADMIN_EMAIL = 'munokolive@gmail.com'

export async function login(formData: FormData) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const isSuperAdminEmail = user.email?.toLowerCase() === SUPER_ADMIN_EMAIL

    let profile = null
    let churchLogo = ''

    if (isSuperAdminEmail) {
      const adminSb = createAdminClient() || supabase
      const { data: existing } = await adminSb
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (!existing) {
        const { data: created } = await adminSb
          .from('user_profiles')
          .insert({ id: user.id, email: user.email, role: 'super_admin' })
          .select('*')
          .single()
        profile = created
      } else if (existing.role !== 'super_admin') {
        const { data: updated } = await adminSb
          .from('user_profiles')
          .update({ role: 'super_admin', email: user.email })
          .eq('id', user.id)
          .select('*')
          .single()
        profile = updated
      } else {
        profile = existing
      }

      if (profile?.church_id) {
        const { data: c } = await supabase.from('churches').select('logo_url').eq('id', profile.church_id).single()
        churchLogo = c?.logo_url || ''
      }
    } else {
      const { data: p } = await supabase
        .from('user_profiles')
        .select('role, church_id, first_name, last_name, avatar_url')
        .eq('id', user.id)
        .single()
      profile = p

      if (profile?.church_id) {
        const { data: c } = await supabase.from('churches').select('logo_url').eq('id', profile.church_id).single()
        churchLogo = c?.logo_url || ''
      }
    }

    revalidatePath('/', 'layout')

    let redirectUrl = '/member-dashboard'
    if (profile?.role === 'super_admin') {
      redirectUrl = '/super-admin'
    } else if (!profile?.church_id) {
      redirectUrl = '/join-church'
    } else if (profile?.role === 'church_admin') {
      redirectUrl = '/dashboard'
    }

    const profileData = {
      first_name: profile?.first_name || (isSuperAdminEmail ? 'Super' : ''),
      last_name: profile?.last_name || (isSuperAdminEmail ? 'Admin' : ''),
      photo_url: profile?.avatar_url || '',
      church_logo: churchLogo,
      role: 'admin',
      email: email
    }

    try {
      const hint = JSON.stringify(profileData)
      cookieStore.set('profile_hint', Buffer.from(hint).toString('base64'), {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 90,
        path: '/'
      })
    } catch (e) {}

    return {
      success: true,
      redirectUrl,
      profile: profileData
    }
  }
  return { error: 'Une erreur est survenue lors de la récupération du profil.' }
}

export async function signup(formData: FormData) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/', 'layout')
  redirect('/join-church')
}

export async function resetPassword(formData: FormData) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const email = formData.get('email') as string

  // L'URL de retour ne doit jamais pointer vers localhost en production :
  // le lien deviendrait inutilisable pour le destinataire. Voir utils/siteUrl.ts.
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: await absoluteUrl('/update-password'),
  })

  if (error) {
    redirect(`/forgot-password?error=${encodeURIComponent(error.message)}`)
  }

  redirect('/forgot-password?message=Check your email for the reset link.')
}

export async function updatePassword(formData: FormData) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const password = formData.get('password') as string

  const { error } = await supabase.auth.updateUser({
    password: password
  })

  if (error) {
    redirect(`/update-password?error=${encodeURIComponent(error.message)}`)
  }

  redirect('/login?message=Password updated successfully')
}
