import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic' // Ensure it runs dynamically

export async function GET(request: Request) {
  try {
    // We use the service role key to bypass RLS in the cron job
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!key || key === 'METTEZ_VOTRE_CLE_SERVICE_ROLE_ICI') {
      return NextResponse.json({ error: 'Missing service role key' }, { status: 500 })
    }

    const supabase = createSupabaseClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Get current date and time
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    
    // We want to find services that are starting in the next 45 minutes
    const futureTime = new Date(now.getTime() + 45 * 60000)
    
    const { data: services, error: servicesError } = await supabase
      .from('church_services')
      .select('id, name, service_date, service_time, church_id')
      .eq('service_date', todayStr)

    if (servicesError) throw servicesError

    let remindersSent = 0

    for (const service of services || []) {
      if (!service.service_time) continue;

      // Construct a Date object for the service time
      const [hours, minutes] = service.service_time.split(':').map(Number)
      const serviceDateObj = new Date(now)
      serviceDateObj.setHours(hours, minutes, 0, 0)

      // Time difference in minutes
      const diffMs = serviceDateObj.getTime() - now.getTime()
      const diffMins = Math.floor(diffMs / 60000)

      // If the service is between 15 and 45 minutes from now, send reminders
      if (diffMins > 0 && diffMins <= 45) {
        
        // Fetch assignments for this service
        const { data: assignments } = await supabase
          .from('service_assignments')
          .select('id, member_id, role')
          .eq('service_id', service.id)
          .in('status', ['present', 'pending']) // Only to those who didn't explicitly refuse

        if (!assignments || assignments.length === 0) continue;

        // Verify we haven't already sent reminders for this service today
        // We look for a recent notification with the same related_service_id
        const { data: existingNotifs } = await supabase
          .from('notifications')
          .select('id')
          .eq('related_service_id', service.id)
          .like('title', '%RAPPEL AUTO%')
          .limit(1)

        if (existingNotifs && existingNotifs.length > 0) {
          // Already sent for this service
          continue;
        }

        const timeFormatted = service.service_time.substring(0, 5)

        // Create notifications
        const notifications = assignments.map(a => ({
          recipient_member_id: a.member_id,
          church_id: service.church_id,
          type: 'assignment',
          title: `⏳ RAPPEL AUTO : Culte dans ${diffMins} min !`,
          body: `C'est presque l'heure ! Préparez-vous pour votre service de ${a.role} pour le culte "${service.name}" qui débute à ${timeFormatted}.`,
          related_service_id: service.id,
          related_assignment_id: a.id,
          is_read: false
        }))

        const { error: notifError } = await supabase.from('notifications').insert(notifications)
        if (!notifError) {
          remindersSent += notifications.length
        } else {
          console.error("Failed to insert notifications:", notifError)
        }
      }
    }

    return NextResponse.json({ success: true, remindersSent })
  } catch (err: any) {
    console.error("Cron Error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
