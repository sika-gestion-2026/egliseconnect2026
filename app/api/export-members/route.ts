import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const EXPORT_ROLES = ['super_admin', 'church_admin', 'moderator']
const MAX_EXPORT_ROWS = 5000

export async function GET() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('church_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.church_id) {
    return NextResponse.json({ error: 'No church' }, { status: 403 })
  }

  if (!EXPORT_ROLES.includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: members } = await supabase
    .from('members')
    .select('first_name, last_name, phone, status, commune, quartier, profession')
    .eq('church_id', profile.church_id)
    .order('last_name', { ascending: true })
    .limit(MAX_EXPORT_ROWS)

  const headers = ['Prénom', 'Nom', 'Téléphone', 'Statut', 'Commune', 'Quartier', 'Profession']
  const rows = (members || []).map(m => [
    m.first_name || '',
    m.last_name || '',
    m.phone || '',
    m.status || '',
    m.commune || '',
    m.quartier || '',
    m.profession || '',
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))

  const csv = [headers.join(','), ...rows].join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="membres.csv"',
    },
  })
}
