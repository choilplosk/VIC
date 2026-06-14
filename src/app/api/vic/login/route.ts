export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function POST(req: NextRequest) {
  const { email, senha } = await req.json()

  if (!email || !senha) {
    return NextResponse.json({ error: 'Email e senha obrigatórios' }, { status: 400 })
  }

  // Verifica se o usuário existe e a senha confere
  const [usuario] = await sql`
    SELECT id, nome, perfil::text AS perfil, senha_hash
    FROM usuarios_vic
    WHERE email = ${email} AND ativo = TRUE
    LIMIT 1
  `

  if (!usuario) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 401 })
  }

  // Verificação simples de senha (texto direto por ora — pode adicionar bcrypt depois)
  if (usuario.senha_hash && usuario.senha_hash !== senha) {
    return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 })
  }

  const perfilRoutes: Record<string, string> = {
    coordenadora: '/vic/dashboard',
    atendente:    '/vic/agenda',
    comercial:    '/vic/gerar',
  }
  const dest = perfilRoutes[String(usuario.perfil)] || '/vic/agenda'

  const response = NextResponse.json({ ok: true, dest })
  response.cookies.set('user_email', email, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/',
  })
  return response
}
