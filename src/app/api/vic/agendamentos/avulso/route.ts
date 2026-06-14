export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getUsuarioVIC } from '@/lib/auth'

// POST /api/vic/agendamentos/avulso
// Agendamento direto pela loja, sem voucher
export async function POST(req: NextRequest) {
  const usuario = await getUsuarioVIC(req)
  if (!usuario) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  if (usuario.perfil === 'comercial') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { loja_id, cliente_nome, cliente_wpp, empresa_nome, servico, data, hora } = body

  if (!loja_id || !cliente_nome || !servico || !data || !hora) {
    return NextResponse.json(
      { error: 'loja_id, cliente_nome, servico, data e hora são obrigatórios' },
      { status: 400 }
    )
  }

  // Atendente só agenda na própria loja
  if (usuario.perfil === 'atendente' && usuario.loja_id !== String(loja_id)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  // Verificar conflito de horário
  const [conflito] = await sql`
    SELECT id FROM agendamentos
    WHERE loja_id = ${String(loja_id)}
      AND data = ${String(data)}
      AND hora = ${String(hora)}
      AND status NOT IN ('cancelado')
    LIMIT 1
  `

  if (conflito) {
    return NextResponse.json({ error: 'Horário já ocupado.' }, { status: 409 })
  }

  // Verificar bloqueio
  const [bloqueio] = await sql`
    SELECT id FROM bloqueios_agenda
    WHERE loja_id = ${String(loja_id)}
      AND data = ${String(data)}
      AND hora = ${String(hora)}
    LIMIT 1
  `

  if (bloqueio) {
    return NextResponse.json({ error: 'Horário bloqueado.' }, { status: 409 })
  }

  // Criar agendamento avulso — sem voucher_id, status confirmado
  const [agendamento] = await sql`
    INSERT INTO agendamentos (
      loja_id, servico, data, hora, status,
      cliente_nome_avulso, cliente_wpp_avulso, empresa_nome_avulso,
      criado_por
    ) VALUES (
      ${String(loja_id)},
      ${String(servico)},
      ${String(data)},
      ${String(hora)},
      'confirmado',
      ${String(cliente_nome)},
      ${cliente_wpp ? String(cliente_wpp) : null},
      ${empresa_nome ? String(empresa_nome) : null},
      ${usuario.id}
    )
    RETURNING *
  `

  return NextResponse.json({ agendamento }, { status: 201 })
}
