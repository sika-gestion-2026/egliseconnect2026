'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

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

  const { data: profile } = await supabase.from('user_profiles').select('church_id').eq('id', user.id).single()
  if (!profile?.church_id) return { error: 'Aucune église associée' }

  // 1. Fetch recent services (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  
  const { data: recentServices } = await supabase
    .from('church_services')
    .select('id, service_date')
    .eq('church_id', profile.church_id)
    .gte('service_date', thirtyDaysAgo.toISOString().split('T')[0])
    .lte('service_date', new Date().toISOString().split('T')[0])
    .order('service_date', { ascending: false })
    
  if (!recentServices || recentServices.length === 0) {
    return { data: [] }
  }

  const serviceIds = recentServices.map(s => s.id)

  // 2. Fetch all members for this church
  const { data: members } = await supabase
    .from('members')
    .select('id, first_name, last_name, phone, photo_url, quartier')
    .eq('church_id', profile.church_id)

  if (!members) return { data: [] }

  // 3. Fetch all declarations for these services
  const { data: declarations } = await supabase
    .from('service_declarations')
    .select('member_id, service_id, status, reason')
    .in('service_id', serviceIds)

  const suggestions: VisitSuggestion[] = []

  // 4. Algorithm implementation
  for (const member of members) {
    const memberDecls = declarations?.filter(d => d.member_id === member.id) || []
    
    // Sort declarations by service_date descending
    const sortedDecls = memberDecls.sort((a, b) => {
      const sA = recentServices.find(s => s.id === a.service_id)
      const sB = recentServices.find(s => s.id === b.service_id)
      return new Date(sB?.service_date || 0).getTime() - new Date(sA?.service_date || 0).getTime()
    })

    let consecutiveAbsences = 0
    let hasCriticalReason = false
    let criticalReasonText = ''

    for (const decl of sortedDecls) {
      if (decl.status === 'absent') {
        consecutiveAbsences++
        
        // Analyze reason
        const reasonLower = (decl.reason || '').toLowerCase()
        if (reasonLower.includes('malade') || reasonLower.includes('maladie') || reasonLower.includes('hôpital') || reasonLower.includes('deuil') || reasonLower.includes('décès') || reasonLower.includes('accident')) {
          hasCriticalReason = true
          criticalReasonText = decl.reason || 'Maladie / Urgence'
          break // Found a critical reason, no need to check further
        }
      } else {
        // If they were present or late, break the consecutive absence chain
        break
      }
    }

    // 5. Evaluate Priority
    if (hasCriticalReason) {
      suggestions.push({
        ...member,
        member_id: member.id,
        priority: 'high',
        motif: `Signalement: ${criticalReasonText}`,
        absencesCount: consecutiveAbsences
      })
    } else if (consecutiveAbsences >= 3) {
      suggestions.push({
        ...member,
        member_id: member.id,
        priority: 'medium',
        motif: 'Absence prolongée (3+ cultes)',
        absencesCount: consecutiveAbsences
      })
    }
  }

  // 6. Filter out members who already have a 'planned' visit
  const { data: activeVisits } = await supabase
    .from('pastoral_visits')
    .select('member_id')
    .eq('church_id', profile.church_id)
    .eq('status', 'planned')

  const activeVisitMemberIds = new Set(activeVisits?.map(v => v.member_id) || [])
  
  const filteredSuggestions = suggestions.filter(s => !activeVisitMemberIds.has(s.member_id))
  
  // Sort high priority first
  filteredSuggestions.sort((a, b) => {
    if (a.priority === 'high' && b.priority === 'medium') return -1
    if (a.priority === 'medium' && b.priority === 'high') return 1
    return b.absencesCount - a.absencesCount
  })

  return { data: filteredSuggestions }
}
