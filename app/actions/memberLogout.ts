'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export async function memberLogoutAction() {
  const cookieStore = await cookies();

  // Clear the custom member session cookie to effectively log out
  cookieStore.delete('member_session');
  // We keep the profile_hint cookie so that the user sees their avatar and name
  // for instant 1-click reconnect on the login page!

  // Also sign out from Supabase Auth if the user was logged in via that method
  const supabase = createClient(cookieStore);
  await supabase.auth.signOut();

  redirect('/login?space=member');
}
