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
      // Redireciona para /vic — a página raiz decide para onde ir baseada no perfil real do banco
      const response = NextResponse.redirect(new URL('/vic', req.url))
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
