import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import MutuelleClient from './MutuelleClient'
import { startOfWeek, startOfMonth, startOfYear, isAfter } from 'date-fns'

export default async function MutuellePage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('user_profiles').select('*, churches(*)').eq('id', user.id).single()
  if (!profile || !profile.church_id) redirect('/dashboard')

  // Seuls les admins et gestionnaires de mutuelle y ont accès
  if (profile.role !== 'super_admin' && profile.role !== 'church_admin' && profile.role !== 'mutual_manager') {
    redirect('/dashboard')
  }

  const churchId = profile.church_id

  // 1. Fetch transactions
  const { data: transactions } = await supabase
    .from('mutual_transactions')
    .select('*, members(first_name, last_name)')
    .eq('church_id', churchId)
    .order('created_at', { ascending: false })

  // 2. Fetch mutual members
  const { data: mutualMembersData } = await supabase
    .from('mutual_members')
    .select('id, member_id, joined_at, members(first_name, last_name, photo_url)')
    .eq('church_id', churchId)

  // 3. Fetch all members (to add to mutuelle)
  const { data: allMembers } = await supabase
    .from('members')
    .select('id, first_name, last_name')
    .eq('church_id', churchId)

  const mutualMemberIds = new Set(mutualMembersData?.map(m => m.member_id) || [])
  const nonMutualMembers = allMembers?.filter(m => !mutualMemberIds.has(m.id)) || []

  // Calcul des statistiques
  const now = new Date()
  const startWk = startOfWeek(now, { weekStartsOn: 1 })
  const startMo = startOfMonth(now)
  const startYr = startOfYear(now)

  let totalWeek = 0
  let totalMonth = 0
  let totalYear = 0
  let totalExpenses = 0

  const memberTotals: Record<string, number> = {}

  if (transactions) {
    transactions.forEach(t => {
      const tDate = new Date(t.created_at)
      if (t.type === 'contribution') {
        if (isAfter(tDate, startWk)) totalWeek += Number(t.amount)
        if (isAfter(tDate, startMo)) totalMonth += Number(t.amount)
        if (isAfter(tDate, startYr)) totalYear += Number(t.amount)
        
        if (t.member_id) {
          memberTotals[t.member_id] = (memberTotals[t.member_id] || 0) + Number(t.amount)
        }
      } else if (t.type === 'expense') {
        totalExpenses += Number(t.amount)
      }
    })
  }

  const mutualMembers = mutualMembersData?.map(m => ({
    ...m,
    totalContributed: memberTotals[m.member_id] || 0
  })).sort((a: any, b: any) => {
    const nameA = `${a.members?.first_name} ${a.members?.last_name}`.toLowerCase()
    const nameB = `${b.members?.first_name} ${b.members?.last_name}`.toLowerCase()
    return nameA.localeCompare(nameB)
  }) || []

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-serif text-primary-900 dark:text-gold-400 font-bold">Mutuelle de l'Église</h1>
        <p className="text-gray-500 mt-1">Gérez les cotisations, suivez les fonds récoltés et les dépenses de votre mutuelle (0 transaction bancaire).</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Cotisations (Cette Semaine)</div>
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">{totalWeek.toLocaleString()} FCFA</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Cotisations (Ce Mois)</div>
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">{totalMonth.toLocaleString()} FCFA</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Cotisations (Cette Année)</div>
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">{totalYear.toLocaleString()} FCFA</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Dépenses</div>
          <div className="text-3xl font-bold text-red-600 dark:text-red-400">{totalExpenses.toLocaleString()} FCFA</div>
        </div>
      </div>

      <MutuelleClient 
        churchId={churchId}
        transactions={transactions || []}
        mutualMembers={mutualMembers}
        nonMutualMembers={nonMutualMembers}
      />
    </div>
  )
}
