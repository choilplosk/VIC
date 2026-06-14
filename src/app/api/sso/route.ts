import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

// v2
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
      const sql = neon(process.env.DATABASE_URL!)

      // Perfil padrão apenas para novos usuários — nunca sobrescreve usuários existentes
      const perfilMap: Record<string, string> = {
        gerente: 'coordenadora',
        admin:   'coordenadora',
        loja:    'atendente',
      }
      const perfilPadrao = perfilMap[data.perfil] || 'atendente'

      // Cria usuário se não existir; se já existir, apenas atualiza nome e ativo
      // NUNCA sobrescreve o perfil de usuários existentes
      await sql`
        INSERT INTO usuarios_vic (email, nome, perfil, ativo)
        VALUES (${data.email}, ${data.name || data.email}, ${perfilPadrao}, true)
        ON CONFLICT (email) DO UPDATE SET
          nome       = EXCLUDED.nome,
          ativo      = true,
          atualizado_em = NOW()
      `

      // Lê o perfil real do banco (pode ter sido alterado manualmente)
      const [usuario] = await sql`
        SELECT perfil::text AS perfil FROM usuarios_vic
        WHERE email = ${data.email} AND ativo = TRUE
        LIMIT 1
      `

      const perfil = String(usuario?.perfil ?? perfilPadrao)

      const perfilRoutes: Record<string, string> = {
        coordenadora: '/vic/dashboard',
        atendente:    '/vic/agenda',
        comercial:    '/vic/gerar',
      }
      const dest = perfilRoutes[perfil] || '/vic/agenda'

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
