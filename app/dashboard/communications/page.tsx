import { createClient } from '@/utils/supabase/server'
import { normalizeFunctions } from '@/utils/memberFunctions'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import CommunicationsClient from './CommunicationsClient'

export default async function Communications() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('church_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.church_id) redirect('/join-church')

  // Données nécessaires au ciblage réel : quartier, fonctions et téléphone.
  const { data: members } = await supabase
    .from('members')
    .select('id, quartier, phone, functions')
    .eq('church_id', profile.church_id)

  const quartiers = Array.from(
    new Set((members?.map(m => m.quartier).filter(Boolean) ?? []) as string[])
  )

  // Absents du dernier culte : base d'un ciblage honnête, et non d'un pourcentage inventé.
  let absentMemberIds: string[] = []

  const { data: lastAttendance } = await supabase
    .from('attendances')
    .select('id')
    .eq('church_id', profile.church_id)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (lastAttendance) {
    const { data: presentRows } = await supabase
      .from('attendance_members')
      .select('member_id')
      .eq('attendance_id', lastAttendance.id)

    const presentIds = new Set((presentRows ?? []).map(p => p.member_id))
    absentMemberIds = (members ?? [])
      .filter(m => !presentIds.has(m.id))
      .map(m => m.id)
  }

  // Statistiques réelles du mois en cours (0 tant qu'aucun envoi n'a eu lieu).
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const { data: monthCampaigns } = await supabase
    .from('sms_campaigns')
    .select('id, status, sent_at')
    .eq('church_id', profile.church_id)
    .gte('created_at', monthStart.toISOString())

  const completedCampaigns = (monthCampaigns ?? []).filter(c => c.status === 'completed')

  let smsSentThisMonth = 0
  let deliveryRate: number | null = null

  if (completedCampaigns.length > 0) {
    const { data: recipientRows } = await supabase
      .from('sms_campaign_recipients')
      .select('campaign_id, status')
      .in('campaign_id', completedCampaigns.map(c => c.id))

    const delivered = (recipientRows ?? []).filter(r => r.status === 'delivered').length
    const resolved = (recipientRows ?? []).filter(
      r => r.status === 'delivered' || r.status === 'failed'
    ).length

    smsSentThisMonth = (recipientRows ?? []).filter(r => r.status !== 'queued').length
    // Null tant qu'aucun retour fournisseur n'existe : évite d'afficher un 0 % trompeur.
    deliveryRate = resolved > 0 ? (delivered / resolved) * 100 : null
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-serif text-primary-900 dark:text-gold-400">Communications (SMS)</h1>
        <p className="text-gray-500 mt-2">
          Préparez une campagne SMS ciblée. L'envoi nécessite la configuration d'un fournisseur.
        </p>
      </div>

      <CommunicationsClient
        members={(members ?? []).map(m => ({
          id: m.id,
          quartier: m.quartier,
          phone: m.phone,
          functions: normalizeFunctions(m.functions)
        }))}
        quartiers={quartiers}
        absentMemberIds={absentMemberIds}
        smsSentThisMonth={smsSentThisMonth}
        deliveryRate={deliveryRate}
        churchId={profile.church_id}
      />
    </div>
  )
}