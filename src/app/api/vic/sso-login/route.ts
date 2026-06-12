import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email')
  const perfil = searchParams.get('perfil') || 'atendente'

  if (!email) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  const perfilRoutes: Record<string, string> = {
    coordenadora: '/vic/dashboard',
    atendente:    '/vic/agenda',
    comercial:    '/vic/gerar',
  }
  const dest = perfilRoutes[perfil] || '/vic/agenda'

  const res = NextResponse.redirect(new URL(dest, req.url))
  res.cookies.set('user_email', email, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/',
  })
  return res
}
