import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import PdfReportClient from '@/app/dashboard/reports/PdfReportClient'

export default async function ReportsDashboard() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('user_profiles').select('church_id').eq('id', user.id).single()
  if (!profile?.church_id) redirect('/join-church')

  // Fetch church info
  const { data: church } = await supabase.from('churches').select('*').eq('id', profile.church_id).single()

  // Fetch all members
  const { data: members } = await supabase
    .from('members')
    .select('*')
    .eq('church_id', profile.church_id)

  const membersCount = members?.length || 0

  // Fetch last attendance
  const { data: lastAttendance } = await supabase
    .from('attendances')
    .select('id, date')
    .eq('church_id', profile.church_id)
    .order('date', { ascending: false })
    .limit(1)
    .single()

  let presentCount = 0
  let absentees = 0

  if (lastAttendance) {
    const { count } = await supabase
      .from('attendance_members')
      .select('*', { count: 'exact', head: true })
      .eq('attendance_id', lastAttendance.id)
    
    presentCount = count || 0
    absentees = membersCount - presentCount
  }

  // Calculate birthdays this month
  const currentMonth = new Date().getMonth()
  const birthdays = members?.filter(m => {
    if (!m.birth_date) return false
    const parts = m.birth_date.split('-')
    if (parts.length === 3) {
      return (parseInt(parts[1], 10) - 1) === currentMonth
    }
    return false
  }).length || 0

  const reportData = {
    churchName: church?.name || 'Église Connect',
    membersCount,
    presentCount,
    absentees,
    birthdays,
    lastAttendanceDate: lastAttendance?.date || 'Aucun culte récent',
    generatedAt: new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
      <div className="flex justify-between items-end">
        <div>
          <Link href="/dashboard" className="text-sm font-bold text-gray-400 hover:text-gray-900 dark:hover:text-white mb-2 inline-block">← Retour</Link>
          <h1 className="text-3xl font-serif text-primary-900 dark:text-gold-400 font-bold">Rapports & Statistiques</h1>
          <p className="text-gray-500 mt-1">Générez un rapport PDF contenant les statistiques vitales de l'église.</p>
        </div>
      </div>

      <PdfReportClient reportData={reportData} />
    </div>
  )
}
