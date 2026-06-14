export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getUsuarioVIC } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const usuario = await getUsuarioVIC(req)
  if (!usuario) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (usuario.perfil === 'comercial') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const body = await req.json()
  const { loja_id, data, hora, horas, motivo, dia_inteiro } = body

  if (!loja_id || !data) {
    return NextResponse.json({ error: 'loja_id e data são obrigatórios' }, { status: 400 })
  }

  if (usuario.perfil === 'atendente' && usuario.loja_id !== loja_id) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  // Bloqueio de dia inteiro — insere todos os horários possíveis (05:00 a 23:00 de 30 em 30)
  if (dia_inteiro || (Array.isArray(horas) && horas.length === 0)) {
    const todosHorarios: string[] = []
    for (let h = 5; h < 23; h++) {
      todosHorarios.push(`${String(h).padStart(2,'0')}:00`)
      todosHorarios.push(`${String(h).padStart(2,'0')}:30`)
    }

    // Se vieram horas específicas, usa elas; senão bloqueia tudo
    const horasParaBloquear: string[] = Array.isArray(horas) && horas.length > 0 ? horas : todosHorarios

    for (const h of horasParaBloquear) {
      await sql`
        INSERT INTO bloqueios_agenda (loja_id, data, hora, motivo)
        VALUES (${loja_id}, ${data}, ${h}, ${motivo ?? null})
        ON CONFLICT (loja_id, data, hora) DO NOTHING
      `
    }
    return NextResponse.json({ ok: true, bloqueados: horasParaBloquear.length }, { status: 201 })
  }

  // Bloqueio de horário único
  const [bloqueio] = await sql`
    INSERT INTO bloqueios_agenda (loja_id, data, hora, motivo)
    VALUES (${loja_id}, ${data}, ${hora ?? null}, ${motivo ?? null})
    ON CONFLICT (loja_id, data, hora) DO NOTHING
    RETURNING *
  `
  return NextResponse.json({ bloqueio }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const usuario = await getUsuarioVIC(req)
  if (!usuario) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (usuario.perfil === 'comercial') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const loja_id    = searchParams.get('loja_id')
  const data       = searchParams.get('data')
  const hora       = searchParams.get('hora')
  const dia_inteiro = searchParams.get('dia_inteiro')

  if (!loja_id || !data) {
    return NextResponse.json({ error: 'loja_id e data são obrigatórios' }, { status: 400 })
  }

  if (dia_inteiro === 'true') {
    // Remove todos os bloqueios do dia
    await sql`
      DELETE FROM bloqueios_agenda
      WHERE loja_id = ${loja_id} AND data = ${data}
    `
  } else {
    await sql`
      DELETE FROM bloqueios_agenda
      WHERE loja_id = ${loja_id}
        AND data = ${data}
        AND (hora = ${hora ?? null} OR (hora IS NULL AND ${hora ?? null} IS NULL))
    `
  }

  return NextResponse.json({ ok: true })
}
