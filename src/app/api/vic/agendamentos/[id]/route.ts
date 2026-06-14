export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getUsuarioVIC } from '@/lib/auth'

// PATCH /api/vic/agendamentos/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const usuario = await getUsuarioVIC(req)
  if (!usuario) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  if (usuario.perfil === 'comercial') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { id } = await params
  const body   = await req.json()
  const { status, observacoes } = body

  const statusValidos = ['aguardando', 'confirmado', 'concluido', 'cancelado', 'nao_compareceu']
  if (!statusValidos.includes(status)) {
    return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
  }

  const [agendamento] = await sql`
    UPDATE agendamentos
    SET status = ${status},
        observacoes = COALESCE(${observacoes ?? null}, observacoes),
        atualizado_em = NOW()
    WHERE id = ${id}
    RETURNING *
  `

  if (!agendamento) {
    return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 })
  }

  if (status === 'cancelado') {
    const [cfg] = await sql`SELECT reagendamentos_max FROM configuracoes_sistema WHERE id = 1`
    const max = cfg?.reagendamentos_max ?? 1

    await sql`
      UPDATE vouchers v
      SET status = CASE
        WHEN (
          SELECT reagendamentos FROM agendamentos WHERE id = ${id}
        ) < ${max} OR ${max} = 0
        THEN 'pendente'
        ELSE 'cancelado'
      END,
      atualizado_em = NOW()
      WHERE id = ${agendamento.voucher_id}
    `

    await sql`
      UPDATE agendamentos
      SET reagendamentos = reagendamentos + 1
      WHERE id = ${id}
    `
  }

  if (status === 'concluido') {
    await sql`
      UPDATE vouchers
      SET status = 'utilizado', atualizado_em = NOW()
      WHERE id = ${agendamento.voucher_id}
    `
  }

  return NextResponse.json({ agendamento })
}
