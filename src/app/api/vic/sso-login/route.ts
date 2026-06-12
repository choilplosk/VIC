import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const ssoToken = searchParams.get('sso')

  if (!ssoToken) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  try {
    const res = await fetch('https://www.boticarioniteroi.com.br/api/sso/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: ssoToken }),
      cache: 'no-store',
    })
    const data = await res.json()

    if (data.valid && data.email) {
      const perfilMap: Record<string, string> = {
        admin:   'coordenadora',
        gerente: 'coordenadora',
        loja:    'atendente',
      }
      const vicPerfil = perfilMap[data.perfil] || 'atendente'

      const perfilRoutes: Record<string, string> = {
        coordenadora: '/vic/dashboard',
        atendente:    '/vic/agenda',
        comercial:    '/vic/gerar',
      }
      const dest = perfilRoutes[vicPerfil] || '/vic/agenda'

      const response = NextResponse.redirect(new URL(dest, req.url))
      response.cookies.set('user_email', data.email, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 8,
        path: '/',
      })
      return response
    }
  } catch (e) {
    console.error('SSO error:', e)
  }

  return NextResponse.redirect(new URL('/', req.url))
}
