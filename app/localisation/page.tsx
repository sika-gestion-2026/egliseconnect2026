import GlobalMapWrapper from '@/components/GlobalMapWrapper';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export const metadata = {
  title: 'Réseau des Églises | Eglise Connect',
  description: 'Découvrez toutes les églises du réseau.',
};

export default async function LocalisationPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Try to get the church from user profile or session
  const { data: { user } } = await supabase.auth.getUser();
  let targetChurchId = null;
  let userPhotoUrl = null;
  let userName = null;

  if (user) {
    const { data: profile } = await supabase.from('user_profiles').select('church_id, member_id').eq('id', user.id).single();
    if (profile?.church_id) targetChurchId = profile.church_id;
    // Use the member_id from profile, not user.id (they are different!)
    if (profile?.member_id) {
      const { data: member } = await supabase.from('members').select('photo_url, first_name, last_name').eq('id', profile.member_id).single();
      if (member?.photo_url) userPhotoUrl = member.photo_url;
      if (member) userName = `${member.first_name || ''} ${member.last_name || ''}`.trim();
    }
  }

  if (!targetChurchId) {
    const memberSession = cookieStore.get("member_session")?.value;
    if (memberSession) {
      const { verifyMemberSession } = await import('@/utils/memberSession');
      const session = verifyMemberSession(memberSession);
      if (session) targetChurchId = session.church_id;
    }
  }

  // Redirect unauthenticated visitors — the map shows sensitive GPS data
  if (!targetChurchId) {
    const { redirect } = await import('next/navigation');
    redirect('/login');
  }

  // Fetch ALL churches with GPS coordinates
  const { data: allChurches } = await supabase
    .from('churches')
    .select('id, name, latitude, longitude, logo_url, city, commune, status')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .eq('status', 'active');

  const validChurches = allChurches || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 md:p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gold-400 mb-2">Réseau des Églises</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Découvrez toutes les églises connectées au réseau. Cliquez sur une église pour voir sa position ou y aller.
              </p>
            </div>
            <div className="bg-primary-50 dark:bg-slate-700 px-4 py-2 rounded-lg border border-primary-100 dark:border-slate-600">
              <span className="font-bold text-primary-900 dark:text-gold-400 text-lg">{validChurches.length}</span> <span className="text-sm text-gray-600 dark:text-gray-300">églises sur la carte</span>
            </div>
          </div>
          
          <GlobalMapWrapper 
            churches={validChurches} 
            userChurchId={targetChurchId} 
            userPhotoUrl={userPhotoUrl}
            userName={userName || 'Moi'}
          />
        </div>
      </div>
    </div>
  );
}
