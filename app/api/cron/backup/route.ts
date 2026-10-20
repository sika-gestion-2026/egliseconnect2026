import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyCronRequest } from '@/utils/cronAuth'

export const dynamic = 'force-dynamic'

const CRITICAL_TABLES = [
  'churches',
  'members',
  'user_profiles',
  'church_departments',
  'church_services',
  'attendances',
  'attendance_members',
  'service_assignments',
  'church_finances',
  'mutual_members',
  'notifications',
  'pastoral_visits',
  'member_notes',
  'contents'
] as const

export async function GET(request: Request) {
  try {
    if (!verifyCronRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!

    if (!key) {
      return NextResponse.json({ error: 'Missing service role key' }, { status: 500 })
    }

    const supabase = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const backupPayload: Record<string, any[]> = {}
    for (const table of CRITICAL_TABLES) {
      try {
        const { data } = await supabase.from(table).select('*')
        backupPayload[table] = data || []
      } catch {
        backupPayload[table] = []
      }
    }

    const totalChurches = backupPayload['churches']?.length || 0
    const totalMembers = backupPayload['members']?.length || 0

    const { data: savedBackup, error: insertError } = await supabase
      .from('system_backups')
      .insert({
        backup_type: 'auto',
        description: 'Sauvegarde automatique automatique quotidienne (Fenêtre 48h)',
        data_payload: backupPayload,
        total_churches: totalChurches,
        total_members: totalMembers
      })
      .select('id, created_at')
      .single()

    if (insertError) {
      throw insertError
    }

    // Prune backups older than 7 days
    try {
      await supabase.rpc('cleanup_old_backups')
    } catch {}

    return NextResponse.json({
      success: true,
      backupId: savedBackup?.id,
      timestamp: new Date().toISOString()
    })
  } catch (err: any) {
    console.error("Auto Backup Cron Error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
