import { NextRequest } from 'next/server'
import { sql } from './db'

export interface UsuarioVIC {
  id: string
  email: string
  nome: string
  perfil: 'comercial' | 'atendente' | 'coordenadora'
  loja_id: string | null
}

export async function getUsuarioVIC(req: NextRequest): Promise<UsuarioVIC | null> {
  // Header do portal SSO tem prioridade
  let email = req.headers.get('x-user-email')

  // Cookie do login próprio do VIC
  if (!email) {
    email = req.cookies.get('user_email')?.value ?? null
  }

  if (!email) return null

  const rows = await sql`
    SELECT id, email, nome, perfil::text AS perfil, loja_id::text AS loja_id
    FROM usuarios_vic
    WHERE email = ${email} AND ativo = TRUE
    LIMIT 1
  `

  if (rows.length === 0) return null

  return rows[0] as UsuarioVIC
}

export function temPermissao(
  usuario: UsuarioVIC,
  perfilMinimo: 'comercial' | 'atendente' | 'coordenadora'
): boolean {
  const hierarquia = { comercial: 1, atendente: 2, coordenadora: 3 }
  return hierarquia[usuario.perfil] >= hierarquia[perfilMinimo]
}
