import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import ScannerClient from './scanner-client';
import { getTodayLocalDateString } from '@/utils/date'

export const metadata = {
  title: 'Scanner QR | Église Connect',
}

export default async function ScannerPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('church_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role === 'member') {
    redirect('/member-dashboard')
  }

  // Find today's service for this church
  const today = getTodayLocalDateString()
  const { data: activeService } = await supabase
    .from('church_services')
    .select('id, name, service_time')
    .eq('church_id', profile.church_id)
    .gte('service_date', today)
    .order('service_date', { ascending: true })
    .limit(1)
    .single()

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-white mb-2">Scanner QR Code</h1>
      <p className="text-gray-500 mb-8">Scannez le code d'un membre pour valider sa présence instantanément.</p>

      {!activeService ? (
        <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-xl border border-amber-200 dark:border-amber-800 text-center">
          <p className="text-amber-800 dark:text-amber-400 font-bold mb-2">Aucun culte programmé aujourd'hui</p>
          <p className="text-amber-700/80 dark:text-amber-500/80 text-sm">Veuillez d'abord créer un culte ou un événement dans l'onglet "Cultes" pour pouvoir pointer les membres.</p>
        </div>
      ) : (
        <ScannerClient 
          serviceId={activeService.id} 
          serviceName={`${activeService.name} (${activeService.service_time})`} 
        />
      )}
    </div>
  )
}
