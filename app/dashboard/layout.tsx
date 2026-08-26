import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import Sidebar from '@/components/Sidebar'
import { ScannerIcon, DashboardIcon, DirectoryIcon, AttendanceIcon, VisitIcon, LocationIcon, PhoneIcon, SettingsIcon } from '@/components/Icons'
import { purgeOldServices } from '@/app/actions/maintenance'

interface NavItem {
  name: string
  href: string
  icon: React.ReactNode
}
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // Trigger silent purge
  purgeOldServices().catch(console.error)

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase.from('user_profiles').select('*, churches(*)').eq('id', user.id).single()

  if (!profile) {
    redirect('/join-church')
  }

  if (profile.role === 'super_admin' && !profile.church_id) {
    redirect('/super-admin')
  }

  const church = profile.churches
  
  let navItems: NavItem[] = []

  const scannerIcon = <ScannerIcon />
  const dashIcon = <DashboardIcon />
  const dirIcon = <DirectoryIcon />
  const attIcon = <AttendanceIcon />
  const visitIcon = <VisitIcon />
  const locIcon = <LocationIcon />

  if (profile.role === 'scanner') {
    navItems = [
      { name: 'Scanner QR', href: '/dashboard/scanner', icon: scannerIcon }
    ]
  } else if (profile.role === 'dept_leader') {
    navItems = [
      { name: 'Tableau de bord', href: '/dashboard', icon: dashIcon },
      { name: 'Mon Département', href: '/dashboard/members', icon: dirIcon },
      { name: 'Planning & Ouvriers', href: '/dashboard/planning', icon: attIcon },
      { name: 'Scanner QR', href: '/dashboard/scanner', icon: scannerIcon }
    ]
  } else if (profile.role === 'moderator') {
    navItems = [
      { name: 'Tableau de bord', href: '/dashboard', icon: dashIcon },
      { name: 'Annuaire', href: '/dashboard/members', icon: dirIcon },
      { name: 'Cultes & Pointages', href: '/dashboard/attendance', icon: attIcon },
      { name: 'Planning & Ouvriers', href: '/dashboard/planning', icon: attIcon },
      { name: 'Scanner QR', href: '/dashboard/scanner', icon: scannerIcon },
      { name: 'Suivi Pastoral & Visites', href: '/dashboard/visits', icon: visitIcon },
      { name: 'Localisation', href: '/localisation', icon: locIcon }
    ]
  } else {
    // Admin or Super Admin
    navItems = [
      { name: 'Tableau de bord', href: '/dashboard', icon: dashIcon },
      { name: 'Annuaire', href: '/dashboard/members', icon: dirIcon },
      { name: 'Cultes & Pointages', href: '/dashboard/attendance', icon: attIcon },
      { name: 'Planning & Ouvriers', href: '/dashboard/planning', icon: attIcon },
      { name: 'Scanner QR', href: '/dashboard/scanner', icon: scannerIcon },
      { name: 'Suivi Pastoral & Visites', href: '/dashboard/visits', icon: visitIcon },
      { name: 'Localisation', href: '/localisation', icon: locIcon }
    ]

    if (profile.role === 'church_admin' || profile.role === 'super_admin') {
      navItems.push({ 
        name: 'Flux d\'Édification', 
        href: '/dashboard/edification', 
        icon: <AttendanceIcon /> 
      })



      navItems.push({ 
        name: 'Communications (SMS)', 
        href: '/dashboard/communications/sms', 
        icon: <PhoneIcon /> 
      })

      navItems.push({ 
        name: 'Rapports PDF', 
        href: '/dashboard/reports', 
        icon: <AttendanceIcon /> 
      })
      navItems.push({ 
        name: 'Équipe & Modérateurs', 
        href: '/dashboard/team', 
        icon: dirIcon 
      })
    }
  }

  navItems.push({ 
    name: 'Paramètres', 
    href: '/dashboard/settings', 
    icon: <SettingsIcon /> 
  })

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background text-foreground">
      <div className="print:hidden h-full">
        <Sidebar churchName={church?.name || 'Mon Église'} logoUrl={church?.logo_url} navItems={navItems} userEmail={user.email || ''} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden print:overflow-visible">
        {/* We can place a top header here if needed */}
        <header className="bg-white/80 dark:bg-background/80 backdrop-blur-md border-b dark:border-white/10 shadow-sm p-4 flex justify-end items-center sticky top-0 z-10 print:hidden">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            Connecté en tant que <span className="font-medium text-primary-900 dark:text-gold-400">
              {profile.role === 'super_admin' ? 'Super Admin (Mode Fantôme)' : user.email}
            </span>
          </div>
        </header>
        
        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-8 print:p-0 print:overflow-visible">
          {children}
        </main>
      </div>
    </div>
  )
}
