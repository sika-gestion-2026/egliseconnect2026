'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { getTodayLocalDateString } from '@/utils/date'

export type VisitSuggestion = {
  member_id: string
  first_name: string
  last_name: string
  phone: string | null
  photo_url: string | null
  quartier: string | null
  priority: 'high' | 'medium'
  motif: string
  absencesCount: number
}

export async function getVisitSuggestionsAction(): Promise<{ data?: VisitSuggestion[], error?: string }> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorisé' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('church_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.church_id) return { error: 'Aucune église associée' }

  if (profile.role !== 'church_admin' && profile.role !== 'super_admin' && profile.role !== 'moderator') {
    return { error: 'Permissions insuffisantes' }
  }

  const churchId = profile.church_id

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: recentServices } = await supabase
    .from('church_services')
    .select('id, service_date')
    .eq('church_id', churchId)
    .gte('service_date', thirtyDaysAgo.toISOString().split('T')[0])
    .lte('service_date', getTodayLocalDateString())
    .order('service_date', { ascending: false })

  if (!recentServices || recentServices.length === 0) {
    return { data: [] }
  }

  const serviceIds = recentServices.map(s => s.id)
  const serviceDateMap = new Map(recentServices.map(s => [s.id, s.service_date]))

  const { data: members } = await supabase
    .from('members')
    .select('id, first_name, last_name, phone, photo_url, quartier')
    .eq('church_id', churchId)

  if (!members) return { data: [] }

  const { data: declarations } = await supabase
    .from('service_declarations')
    .select('member_id, service_id, status, reason')
    .in('service_id', serviceIds)

  const declsByMember = new Map<string, typeof declarations>()
  for (const d of declarations || []) {
    const arr = declsByMember.get(d.member_id) || []
    arr.push(d)
    declsByMember.set(d.member_id, arr)
  }

  const CRITICAL_KEYWORDS = ['malade', 'maladie', 'hôpital', 'deuil', 'décès', 'accident']

  const suggestions: VisitSuggestion[] = []

  for (const member of members) {
    const memberDecls = declsByMember.get(member.id) || []

    const sortedDecls = [...memberDecls].sort((a, b) => {
      const dateA = serviceDateMap.get(a.service_id) || ''
      const dateB = serviceDateMap.get(b.service_id) || ''
      return dateB.localeCompare(dateA)
    })

    let consecutiveAbsences = 0
    let hasCriticalReason = false
    let criticalReasonText = ''

    for (const decl of sortedDecls) {
      if (decl.status === 'absent') {
        consecutiveAbsences++
        const reasonLower = (decl.reason || '').toLowerCase()
        if (CRITICAL_KEYWORDS.some(k => reasonLower.includes(k))) {
          hasCriticalReason = true
          criticalReasonText = decl.reason || 'Maladie / Urgence'
          break
        }
      } else {
        break
      }
    }

    if (hasCriticalReason) {
      suggestions.push({
        member_id: member.id,
        first_name: member.first_name,
        last_name: member.last_name,
        phone: member.phone,
        photo_url: member.photo_url,
        quartier: member.quartier,
        priority: 'high',
        motif: `Signalement: ${criticalReasonText}`,
        absencesCount: consecutiveAbsences,
      })
    } else if (consecutiveAbsences >= 3) {
      suggestions.push({
        member_id: member.id,
        first_name: member.first_name,
        last_name: member.last_name,
        phone: member.phone,
        photo_url: member.photo_url,
        quartier: member.quartier,
        priority: 'medium',
        motif: 'Absence prolongée (3+ cultes)',
        absencesCount: consecutiveAbsences,
      })
    }
  }

  const { data: activeVisits } = await supabase
    .from('pastoral_visits')
    .select('member_id')
    .eq('church_id', churchId)
    .eq('status', 'planned')

  const activeVisitMemberIds = new Set(activeVisits?.map(v => v.member_id) || [])

  const filteredSuggestions = suggestions
    .filter(s => !activeVisitMemberIds.has(s.member_id))
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority === 'high' ? -1 : 1
      return b.absencesCount - a.absencesCount
    })

  return { data: filteredSuggestions }
}
