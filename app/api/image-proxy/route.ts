import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const imageUrl = searchParams.get('url')

  if (!imageUrl) {
    return new NextResponse('URL manquante', { status: 400 })
  }

  try {
    const parsed = new URL(imageUrl)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return new NextResponse('Protocole invalide', { status: 400 })
    }

    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Eglise-Connect Proxy)',
      },
    })

    if (!response.ok) {
      return new NextResponse(`Échec de récupération de l'image (${response.status})`, { status: response.status })
    }

    const contentType = response.headers.get('content-type') || 'image/png'
    const arrayBuffer = await response.arrayBuffer()

    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (err: any) {
    console.error('Erreur proxy image:', err)
    return new NextResponse('Erreur proxy image: ' + (err?.message || 'Inconnue'), { status: 500 })
  }
}
