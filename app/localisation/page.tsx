import GlobalMapWrapper from '@/components/GlobalMapWrapper';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import Link from 'next/link';

export const metadata = {
  title: 'Réseau des Églises | Eglise Connect',
  description: 'Découvrez toutes les églises du réseau.',
};

export default async function LocalisationPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Try to get the church from user profile or session
  const { data: { user } } = await supabase.auth.getUser();
  let userMemberId = null;
  let targetChurchId = null;
  let userPhotoUrl = null;
  let userName = null;

  if (user) {
    const { data: profile } = await supabase.from('user_profiles').select('church_id, member_id').eq('id', user.id).single();
    if (profile?.church_id) targetChurchId = profile.church_id;
    // Use the member_id from profile, not user.id (they are different!)
    if (profile?.member_id) {
      userMemberId = profile.member_id;
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
  const { data: allChurches, error: churchesError } = await supabase
    .from('churches')
    .select('id, name, latitude, longitude, logo_url, city, commune, status')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .eq('status', 'active');
    
  if (churchesError) console.error("Error fetching churches:", churchesError);

  const validChurches = allChurches || [];
  
  // Fetch members with GPS coordinates (for the proximity radar)
  // We wrap in try-catch in case latitude/longitude columns don't exist yet on members table
  let otherMembers: any[] = [];
  try {
    const { data: membersWithLocation, error: membersError } = await supabase
      .from('members')
      .select('id, first_name, last_name, photo_url, role, latitude, longitude, church_id')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);
      
    if (membersError) {
      console.warn("Could not fetch member locations. If columns missing, please add latitude/longitude to members table.", membersError);
    } else if (membersWithLocation) {
      // Filter out current user
      otherMembers = membersWithLocation.filter(m => m.id !== userMemberId);
    }
  } catch (err) {
    console.warn("Exception fetching member locations", err);
  }

  return (
    <div className="relative w-full h-[calc(100vh-80px)] overflow-hidden bg-slate-900 animate-fade-in">
      
      {/* Floating Control Panel (Glassmorphism) */}
      <div className="absolute top-6 left-0 right-0 z-10 px-4 md:px-8 pointer-events-none">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">

          
          {/* Main Title Card */}
          <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 p-6 rounded-3xl shadow-2xl pointer-events-auto flex flex-col relative overflow-hidden transform hover:scale-[1.02] transition-transform duration-300 group">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary-500/20 rounded-full blur-3xl group-hover:bg-primary-500/30 transition-colors"></div>
            
            <div className="flex items-center gap-3 mb-2 relative z-10">
              <span className="flex h-4 w-4 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500"></span>
              </span>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Réseau des Églises</h1>
            </div>
            
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium relative z-10 max-w-xs">
              Vision globale de l'écosystème EgliseConnect. Cliquez sur un repère pour interagir.
            </p>
          </div>

          {/* Stats Badges */}
          <div className="flex gap-4 pointer-events-auto">
            <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 px-6 py-4 rounded-3xl shadow-2xl flex flex-col items-center justify-center min-w-[140px] transform hover:scale-[1.05] transition-all">
              <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500 mb-1">Assemblées Actives</span>
              <span className="text-3xl font-black text-primary-600 dark:text-gold-400 drop-shadow-sm">
                {validChurches.length}
              </span>
            </div>
            
            <Link href="/dashboard" className="bg-primary-600/90 hover:bg-primary-500 backdrop-blur-xl border border-primary-400/30 px-6 py-4 rounded-3xl shadow-xl shadow-primary-600/20 flex flex-col items-center justify-center transition-all group hover:scale-[1.05]">
              <span className="text-white text-sm font-bold flex items-center gap-2">
                Retour
                <svg className="transform group-hover:translate-x-1 transition-transform" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
              </span>
            </Link>
          </div>

        </div>
      </div>

      {/* Decorative gradient shadows overlaid on map edges */}
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-slate-900/40 to-transparent z-[5] pointer-events-none"></div>
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-900/60 to-transparent z-[5] pointer-events-none"></div>

      {/* Map Container (Full Screen) */}
      <div className="w-full h-full relative z-0">
        <GlobalMapWrapper 
          churches={validChurches} 
          userChurchId={targetChurchId} 
          userPhotoUrl={userPhotoUrl}
          userName={userName || 'Moi'}
          userMemberId={userMemberId}
          otherMembers={otherMembers}
        />
      </div>
    </div>
  );
}
