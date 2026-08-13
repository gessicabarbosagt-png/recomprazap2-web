import { NextRequest, NextResponse } from 'next/server'

const API_BASE = 'https://recomprazap2-api-production.up.railway.app/api/v1'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params

  try {
    const res = await fetch(`${API_BASE}/links-origem/r/${encodeURIComponent(slug)}`, {
      redirect: 'manual',
    })

    if (res.status === 302 || res.status === 301) {
      const location = res.headers.get('location')
      if (location) return NextResponse.redirect(location, { status: 302 })
    }

    if (!res.ok) {
      return new NextResponse('Link não encontrado', { status: 404 })
    }

    // Fallback: se a API retornar JSON com redirectUrl
    const data = await res.json().catch(() => null)
    if (data?.redirectUrl) {
      return NextResponse.redirect(data.redirectUrl, { status: 302 })
    }

    return new NextResponse('Link não encontrado', { status: 404 })
  } catch {
    return new NextResponse('Erro ao resolver link', { status: 500 })
  }
}
