import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getUsuarioVIC } from '@/lib/auth'

// GET /api/vic/agendamentos?loja_id=...&data=2025-06-13
// Retorna agendamentos de uma loja em uma data (visão da atendente)
export async function GET(req: NextRequest) {
  const usuario = await getUsuarioVIC(req)
  if (!usuario) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const loja_id = searchParams.get('loja_id')
  const data    = searchParams.get('data')

  if (!loja_id || !data) {
    return NextResponse.json(
      { error: 'loja_id e data são obrigatórios' },
      { status: 400 }
    )
  }

  // Atendente só vê sua própria loja
  if (usuario.perfil === 'atendente' && usuario.loja_id !== loja_id) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const agendamentos = await sql`
    SELECT *
    FROM v_agendamentos_completo
    WHERE loja_id = ${loja_id}
      AND data = ${data}
    ORDER BY hora ASC
  `

  // Busca bloqueios do dia
  const bloqueios = await sql`
    SELECT hora FROM bloqueios_agenda
    WHERE loja_id = ${loja_id} AND data = ${data}
    ORDER BY hora ASC
  `

  return NextResponse.json({ agendamentos, bloqueios })
}

// POST /api/vic/agendamentos
// Rota semi-pública — o cliente cria o agendamento ao final do fluxo do voucher
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { voucher_token, loja_id, servico, data, hora } = body

  if (!voucher_token || !loja_id || !servico || !data || !hora) {
    return NextResponse.json(
      { error: 'voucher_token, loja_id, servico, data e hora são obrigatórios' },
      { status: 400 }
    )
  }

  // Valida o voucher
  const [voucher] = await sql`
    SELECT id, status, expira_em FROM vouchers
    WHERE token = ${voucher_token}
    LIMIT 1
  `

  if (!voucher) {
    return NextResponse.json({ error: 'Voucher não encontrado' }, { status: 404 })
  }

  if (voucher.status !== 'pendente') {
    return NextResponse.json(
      { error: `Voucher não está disponível (status: ${voucher.status})` },
      { status: 409 }
    )
  }

  if (new Date(voucher.expira_em) < new Date()) {
    return NextResponse.json({ error: 'Voucher expirado' }, { status: 410 })
  }

  // Verifica se horário está disponível (sem conflito e sem bloqueio)
  const [conflito] = await sql`
    SELECT id FROM agendamentos
    WHERE loja_id = ${loja_id}
      AND data = ${data}
      AND hora = ${hora}
      AND status NOT IN ('cancelado')
    LIMIT 1
  `

  if (conflito) {
    return NextResponse.json(
      { error: 'Horário já ocupado. Escolha outro horário.' },
      { status: 409 }
    )
  }

  const [bloqueio] = await sql`
    SELECT id FROM bloqueios_agenda
    WHERE loja_id = ${loja_id}
      AND data = ${data}
      AND (hora = ${hora} OR hora IS NULL)
    LIMIT 1
  `

  if (bloqueio) {
    return NextResponse.json(
      { error: 'Horário bloqueado pela loja.' },
      { status: 409 }
    )
  }

  // Cria o agendamento e atualiza o voucher
  const [agendamento] = await sql`
    INSERT INTO agendamentos (voucher_id, loja_id, servico, data, hora)
    VALUES (${voucher.id}, ${loja_id}, ${servico}, ${data}, ${hora})
    RETURNING *
  `

  await sql`
    UPDATE vouchers
    SET status = 'agendado', atualizado_em = NOW()
    WHERE id = ${voucher.id}
  `

  return NextResponse.json({ agendamento }, { status: 201 })
}
