import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import MemberDashboardClient from './MemberDashboardClient'

export default async function MemberDashboard() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  let memberData = null
  let nextService = null
  let currentRsvp = null
  
  const { data: { user } } = await supabase.auth.getUser()
  let profile = null
  
  if (user) {
    const { data } = await supabase.from('user_profiles').select('church_id, role, member_id').eq('id', user.id).single()
    profile = data
  }

  let targetChurchId = profile?.church_id
  let targetMemberId = profile?.member_id
  
  // Custom auth fallback (Phone + Church Code)
  if (!user || !targetChurchId) {
    const memberSession = cookieStore.get('member_session')?.value
    if (memberSession) {
      try {
        const decoded = JSON.parse(Buffer.from(memberSession, 'base64').toString('utf-8'))
        targetChurchId = decoded.church_id
        targetMemberId = decoded.member_id
      } catch (e) {
        // Invalid session
      }
    }
  }

  if (!targetChurchId || !targetMemberId) {
    redirect('/member-login')
  }

  const { data: church } = await supabase.from('churches').select('*').eq('id', targetChurchId).single()
  
  if (targetMemberId) {
    const { data } = await supabase.from('members').select('*').eq('id', targetMemberId).single()
    memberData = data

    // Fetch next service
    const { data: services } = await supabase
      .from('church_services')
      .select('*')
      .eq('church_id', targetChurchId)
      .gte('service_date', new Date().toISOString().split('T')[0])
      .order('service_date', { ascending: true })
      .limit(1)
    
    if (services && services.length > 0) {
      nextService = services[0]
      
      // Check if user already RSVP'd
      const { data: rsvp } = await supabase
        .from('service_declarations')
        .select('status')
        .eq('service_id', nextService.id)
        .eq('member_id', targetMemberId)
        .single()
      
      if (rsvp) currentRsvp = rsvp.status
    }
  }

  // Fetch Notes
  let initialNotes: any[] = []
  if (targetMemberId) {
    const { data: notes } = await supabase
      .from('member_notes')
      .select('*')
      .eq('member_id', targetMemberId)
      .order('created_at', { ascending: false })
    
    if (notes) initialNotes = notes
  }
    
  // Fetch Active Announcement
  let activeAnnouncement = null
  if (targetChurchId) {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data } = await supabase
      .from('church_announcements')
      .select('*')
      .eq('church_id', targetChurchId)
      .eq('is_active', true)
      .gte('created_at', sevenDaysAgo.toISOString())
      .single()
    activeAnnouncement = data
  }

  // Fetch led departments for the member
  let ledDepartments: any[] = []
  if (targetMemberId) {
    const { data } = await supabase
      .from('department_leaders')
      .select('department_id, church_departments(name, description)')
      .eq('member_id', targetMemberId)
    
    if (data && data.length > 0) {
      // Pour chaque département géré, récupérer les autres membres (optionnel, on le fera côté client via Server Action ou on charge tout ici)
      // On va juste passer les départements au client.
      ledDepartments = data.map(d => {
        const dept = Array.isArray(d.church_departments) ? d.church_departments[0] : d.church_departments
        return {
          id: d.department_id,
          name: dept?.name,
          description: dept?.description
        }
      })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background p-8 relative overflow-hidden">
      {/* White Label Background Logo */}
      {church?.logo_url && (
        <div 
          className="absolute inset-0 pointer-events-none opacity-5 dark:opacity-10 z-0 bg-no-repeat bg-center bg-fixed"
          style={{ backgroundImage: `url(${church.logo_url})`, backgroundSize: '70%', backgroundPosition: 'center' }}
        />
      )}
      
      <div className="max-w-4xl mx-auto relative z-10">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            {church?.logo_url ? (
              <img src={church.logo_url} alt="Logo" className="w-10 h-10 rounded-full shadow-md object-contain bg-white" />
            ) : (
              <span className="text-3xl">⛪</span>
            )}
            <h1 className="text-2xl font-serif text-primary-900 dark:text-gold-400 font-bold">
              {church?.name || 'Mon Église'}
            </h1>
          </div>
          <form action="/auth/signout" method="post">
            <button className="text-sm font-medium text-gray-500 hover:text-red-500 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-md shadow-sm border border-gray-200 dark:border-slate-700">Déconnexion</button>
          </form>
        </div>

        <MemberDashboardClient 
          church={church}
          memberData={memberData}
          nextService={nextService}
          currentRsvp={currentRsvp}
          initialNotes={initialNotes}
          activeAnnouncement={activeAnnouncement}
          ledDepartments={ledDepartments}
        />
      </div>
    </div>
  )
}
