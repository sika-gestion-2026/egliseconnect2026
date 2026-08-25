'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

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

  // Check role and redirect
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: profile } = await supabase.from('user_profiles').select('role, church_id, first_name, last_name, avatar_url').eq('id', user.id).single()
    
    let churchLogo = ''
    if (profile?.church_id) {
       const { data: c } = await supabase.from('churches').select('logo_url').eq('id', profile.church_id).single()
       churchLogo = c?.logo_url || ''
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

    return { 
      success: true, 
      redirectUrl, 
      profile: {
        first_name: profile?.first_name || '',
        last_name: profile?.last_name || '',
        photo_url: profile?.avatar_url || '',
        church_logo: churchLogo
      }
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

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/update-password`,
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
