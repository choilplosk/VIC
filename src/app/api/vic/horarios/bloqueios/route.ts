import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getUsuarioVIC } from '@/lib/auth'

// POST /api/vic/horarios/bloqueios
// Bloqueia um horário ou dia inteiro em uma loja
export async function POST(req: NextRequest) {
  const usuario = await getUsuarioVIC(req)
  if (!usuario) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  if (usuario.perfil === 'comercial') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const body = await req.json()
  const { loja_id, data, hora, motivo } = body

  if (!loja_id || !data) {
    return NextResponse.json({ error: 'loja_id e data são obrigatórios' }, { status: 400 })
  }

  // Atendente só bloqueia sua própria loja
  if (usuario.perfil === 'atendente' && usuario.loja_id !== loja_id) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const [bloqueio] = await sql`
    INSERT INTO bloqueios_agenda (loja_id, data, hora, motivo)
    VALUES (${loja_id}, ${data}, ${hora ?? null}, ${motivo ?? null})
    RETURNING *
  `

  return NextResponse.json({ bloqueio }, { status: 201 })
}

// DELETE /api/vic/horarios/bloqueios?loja_id=...&data=...&hora=...
export async function DELETE(req: NextRequest) {
  const usuario = await getUsuarioVIC(req)
  if (!usuario) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  if (usuario.perfil === 'comercial') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const loja_id = searchParams.get('loja_id')
  const data    = searchParams.get('data')
  const hora    = searchParams.get('hora')

  if (!loja_id || !data) {
    return NextResponse.json({ error: 'loja_id e data são obrigatórios' }, { status: 400 })
  }

  await sql`
    DELETE FROM bloqueios_agenda
    WHERE loja_id = ${loja_id}
      AND data = ${data}
      AND (hora = ${hora ?? null} OR (hora IS NULL AND ${hora ?? null} IS NULL))
  `

  return NextResponse.json({ ok: true })
}
