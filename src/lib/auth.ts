import { NextRequest } from 'next/server'
import { sql } from './db'

export interface UsuarioVIC {
  id: string
  email: string
  nome: string
  perfil: 'comercial' | 'atendente' | 'coordenadora'
  loja_id: string | null
}

/**
 * Lê o token do portal (cookie ou header Authorization)
 * e retorna o usuário VIC correspondente.
 * Retorna null se não autenticado ou sem perfil VIC.
 */
export async function getUsuarioVIC(req: NextRequest): Promise<UsuarioVIC | null> {
  // O portal injeta o email do usuário autenticado via header após validar o token SSO
  const email = req.headers.get('x-user-email')

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
