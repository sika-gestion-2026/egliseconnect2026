import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    if (!key) {
      return NextResponse.json({ error: 'Missing service role key' }, { status: 500 })
    }

    const supabase = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Simple query to keep the database awake
    const { data, error } = await supabase
      .from('churches')
      .select('id')
      .limit(1)

    if (error) throw error

    return NextResponse.json({ 
      success: true, 
      message: 'Supabase ping successful - database is awake',
      timestamp: new Date().toISOString()
    })
  } catch (err: any) {
    console.error("Keepalive Cron Error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
