import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { sql } from './db'

export interface UsuarioVIC {
  id: string
  email: string
  nome: string
  perfil: 'comercial' | 'atendente' | 'coordenadora'
  loja_id: string | null
}

/**
 * Lê o email do usuário via header x-user-email (portal SSO)
 * ou via cookie user_email (login próprio do VIC).
 * Retorna null se não autenticado ou sem perfil VIC.
 */
export async function getUsuarioVIC(req: NextRequest): Promise<UsuarioVIC | null> {
  // Tenta header primeiro (portal SSO), depois cookie (login próprio)
  let email = req.headers.get('x-user-email')

  if (!email) {
    email = req.cookies.get('user_email')?.value ?? null
  }

  if (!email) return null

  const rows = await sql`
    SELECT id, email, nome, perfil, loja_id
    FROM usuarios_vic
    WHERE email = ${email}
      AND ativo = TRUE
    LIMIT 1
  `

  if (rows.length === 0) return null

  return rows[0] as UsuarioVIC
}

/**
 * Garante que o usuário tem o perfil mínimo exigido.
 * Ordem de permissão: coordenadora > atendente > comercial
 */
export function temPermissao(
  usuario: UsuarioVIC,
  perfilMinimo: 'comercial' | 'atendente' | 'coordenadora'
): boolean {
  const hierarquia = { comercial: 1, atendente: 2, coordenadora: 3 }
  return hierarquia[usuario.perfil] >= hierarquia[perfilMinimo]
}
