'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export async function memberLogoutAction() {
  const cookieStore = await cookies();

  // Clear the custom member session cookie
  cookieStore.delete('member_session');
  // Clear the profile hint cookie (display data)
  cookieStore.delete('profile_hint');

  // Also sign out from Supabase Auth if the user was logged in via that method
  const supabase = createClient(cookieStore);
  await supabase.auth.signOut();

  redirect('/login?space=member');
}
