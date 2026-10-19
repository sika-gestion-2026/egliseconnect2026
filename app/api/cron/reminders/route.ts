import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { verifyCronRequest } from '@/utils/cronAuth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    if (!verifyCronRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!key || key === 'METTEZ_VOTRE_CLE_SERVICE_ROLE_ICI') {
      return NextResponse.json({ error: 'Missing service role key' }, { status: 500 })
    }

    const supabase = createSupabaseClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]

    const { data: services, error: servicesError } = await supabase
      .from('church_services')
      .select('id, name, service_date, service_time, church_id')
      .eq('service_date', todayStr)

    if (servicesError) throw servicesError

    const eligibleServices = (services || []).filter(service => {
      if (!service.service_time) return false
      const [hours, minutes] = service.service_time.split(':').map(Number)
      const serviceDateObj = new Date(now)
      serviceDateObj.setHours(hours, minutes, 0, 0)
      const diffMins = Math.floor((serviceDateObj.getTime() - now.getTime()) / 60000)
      return diffMins > 0 && diffMins <= 45
    })

    if (eligibleServices.length === 0) {
      return NextResponse.json({ success: true, remindersSent: 0 })
    }

    const eligibleServiceIds = eligibleServices.map(s => s.id)

    // Batch fetch all assignments for eligible services (single query)
    const { data: allAssignments, error: assignError } = await supabase
      .from('service_assignments')
      .select('id, member_id, role, service_id')
      .in('service_id', eligibleServiceIds)
      .in('status', ['present', 'pending'])

    if (assignError) throw assignError

    const assignmentsByService = new Map<string, typeof allAssignments>()
    for (const a of allAssignments || []) {
      const arr = assignmentsByService.get(a.service_id) || []
      arr.push(a)
      assignmentsByService.set(a.service_id, arr)
    }

    // Batch fetch existing notifications for eligible services (single query)
    const { data: existingNotifs } = await supabase
      .from('notifications')
      .select('related_service_id')
      .in('related_service_id', eligibleServiceIds)
      .like('title', '%RAPPEL AUTO%')

    const notifiedServiceIds = new Set((existingNotifs || []).map(n => n.related_service_id))

    let remindersSent = 0
    const allNotifications: Array<{
      recipient_member_id: string
      church_id: string
      type: string
      title: string
      body: string
      related_service_id: string
      related_assignment_id: string
      is_read: boolean
    }> = []

    for (const service of eligibleServices) {
      if (notifiedServiceIds.has(service.id)) continue

      const assignments = assignmentsByService.get(service.id)
      if (!assignments || assignments.length === 0) continue

      const [hours, minutes] = service.service_time!.split(':').map(Number)
      const serviceDateObj = new Date(now)
      serviceDateObj.setHours(hours, minutes, 0, 0)
      const diffMins = Math.floor((serviceDateObj.getTime() - now.getTime()) / 60000)
      const timeFormatted = service.service_time!.substring(0, 5)

      for (const a of assignments) {
        allNotifications.push({
          recipient_member_id: a.member_id,
          church_id: service.church_id,
          type: 'assignment',
          title: `RAPPEL AUTO : Culte dans ${diffMins} min !`,
          body: `C'est presque l'heure ! Préparez-vous pour votre service de ${a.role} pour le culte "${service.name}" qui débute à ${timeFormatted}.`,
          related_service_id: service.id,
          related_assignment_id: a.id,
          is_read: false
        })
      }
    }

    if (allNotifications.length > 0) {
      const { error: notifError } = await supabase.from('notifications').insert(allNotifications)
      if (!notifError) {
        remindersSent = allNotifications.length
      } else {
        console.error('Failed to insert notifications:', notifError)
      }
    }

    return NextResponse.json({ success: true, remindersSent })
  } catch (err: any) {
    console.error('Cron Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
