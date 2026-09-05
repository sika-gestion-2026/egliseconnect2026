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
  let backLink = '/dashboard';

  if (user) {
    const { data: profile } = await supabase.from('user_profiles').select('church_id, member_id, role').eq('id', user.id).single();
    if (profile?.church_id) targetChurchId = profile.church_id;
    if (profile?.member_id) {
      userMemberId = profile.member_id;
      const { data: member } = await supabase.from('members').select('photo_url, first_name, last_name').eq('id', profile.member_id).single();
      if (member?.photo_url) userPhotoUrl = member.photo_url;
      if (member) userName = `${member.first_name || ''} ${member.last_name || ''}`.trim();
      if (profile.role === 'member') backLink = '/member-dashboard';
    }
  }

  if (!userMemberId) {
    const memberSession = cookieStore.get("member_session")?.value;
    if (memberSession) {
      const { verifyMemberSession } = await import('@/utils/memberSession');
      const session = verifyMemberSession(memberSession);
      if (session) {
        targetChurchId = session.church_id;
        userMemberId = session.member_id;
        backLink = '/member-dashboard';
        
        const { data: member } = await supabase.from('members').select('photo_url, first_name, last_name').eq('id', userMemberId).single();
        if (member?.photo_url) userPhotoUrl = member.photo_url;
        if (member) userName = `${member.first_name || ''} ${member.last_name || ''}`.trim();
      }
    }
  }

  // Redirect unauthenticated visitors — the map shows sensitive GPS data
  if (!targetChurchId && !userMemberId) {
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
    <div className="w-full h-[calc(100vh-80px)] flex flex-col bg-slate-900 animate-fade-in overflow-hidden">
      
      {/* Header Panel (Now at the top, not floating) */}
      <div className="w-full px-4 py-4 md:px-8 bg-slate-900 border-b border-slate-800 z-10 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          
          {/* Main Title Card */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 relative z-10">
              <span className="flex h-4 w-4 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500"></span>
              </span>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Réseau des Églises</h1>
            </div>
            
            <p className="text-slate-400 text-sm font-medium hidden lg:block max-w-xs">
              Vision globale de l'écosystème.
            </p>
          </div>

          {/* Stats Badges */}
          <div className="flex gap-4">
            <div className="bg-slate-800 border border-slate-700 px-4 py-2 md:px-6 md:py-3 rounded-2xl flex flex-col items-center justify-center min-w-[120px]">
              <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">Assemblées Actives</span>
              <span className="text-2xl font-black text-gold-400 drop-shadow-sm">
                {validChurches.length}
              </span>
            </div>
            
            <Link href={backLink} className="bg-primary-600/90 hover:bg-primary-500 border border-primary-400/30 px-4 py-2 md:px-6 md:py-3 rounded-2xl flex flex-col items-center justify-center transition-all group hover:scale-[1.05]">
              <span className="text-white text-sm font-bold flex items-center gap-2">
                Retour
                <svg className="transform group-hover:translate-x-1 transition-transform" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
              </span>
            </Link>
          </div>

        </div>
      </div>

      {/* Map Container (Takes remaining height) */}
      <div className="w-full flex-1 relative z-0">
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
