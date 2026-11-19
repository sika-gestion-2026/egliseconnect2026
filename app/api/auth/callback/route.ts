import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
  const proto = request.headers.get('x-forwarded-proto') || 'https'
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (host ? `${proto}://${host}` : '')

  const targetUrl = code
    ? `${siteUrl}/auth/callback?code=${encodeURIComponent(code)}&next=${encodeURIComponent(next)}`
    : `${siteUrl}/auth/callback`

  return NextResponse.redirect(targetUrl)
}
