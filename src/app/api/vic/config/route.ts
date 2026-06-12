import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getUsuarioVIC, temPermissao } from '@/lib/auth'

// GET /api/vic/config
// Retorna todas as configurações (tiers + sistema + lojas)
export async function GET(req: NextRequest) {
  const usuario = await getUsuarioVIC(req)
  if (!usuario) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const tiers = await sql`
    SELECT * FROM configuracoes_tier ORDER BY
      CASE nivel
        WHEN 'bronze'   THEN 1
        WHEN 'prata'    THEN 2
        WHEN 'ouro'     THEN 3
        WHEN 'diamante' THEN 4
      END
  `

  const [sistema] = await sql`SELECT * FROM configuracoes_sistema WHERE id = 1`

  const lojas = await sql`
    SELECT id, nome, bairro, endereco, tipo, whatsapp, ativa
    FROM lojas ORDER BY tipo, bairro, nome
  `

  return NextResponse.json({ tiers, sistema, lojas })
}

// PATCH /api/vic/config/tiers
// Atualiza configuração de um nível (apenas coordenadora)
export async function PATCH(req: NextRequest) {
  const usuario = await getUsuarioVIC(req)
  if (!usuario) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  if (!temPermissao(usuario, 'coordenadora')) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const body = await req.json()
  const { tipo } = body // 'tier' | 'sistema' | 'loja'

  if (tipo === 'tier') {
    const { nivel, valor_minimo, duracao_minutos, servicos } = body
    const [updated] = await sql`
      UPDATE configuracoes_tier
      SET valor_minimo    = ${valor_minimo},
          duracao_minutos = ${duracao_minutos},
          servicos        = ${servicos},
          atualizado_em   = NOW()
      WHERE nivel = ${nivel}
      RETURNING *
    `
    return NextResponse.json({ tier: updated })
  }

  if (tipo === 'sistema') {
    const { validade_dias, aviso_expiracao_dias, reagendamentos_max } = body
    const [updated] = await sql`
      UPDATE configuracoes_sistema
      SET validade_dias        = ${validade_dias},
          aviso_expiracao_dias = ${aviso_expiracao_dias},
          reagendamentos_max   = ${reagendamentos_max},
          atualizado_em        = NOW()
      WHERE id = 1
      RETURNING *
    `
    return NextResponse.json({ sistema: updated })
  }

  if (tipo === 'loja') {
    const { loja_id, ativa, whatsapp } = body
    const [updated] = await sql`
      UPDATE lojas
      SET ativa         = ${ativa},
          whatsapp      = ${whatsapp ?? null},
          atualizado_em = NOW()
      WHERE id = ${loja_id}
      RETURNING *
    `
    return NextResponse.json({ loja: updated })
  }

  return NextResponse.json({ error: 'tipo inválido' }, { status: 400 })
}
