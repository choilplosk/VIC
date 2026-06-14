export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const data = searchParams.get('data')

  if (!data) {
    return NextResponse.json({ error: 'data é obrigatória' }, { status: 400 })
  }

  const dataObj = new Date(data)
  const diaSemana = ['dom','seg','ter','qua','qui','sex','sab'][dataObj.getDay()]

  const [horario] = await sql`
    SELECT hora_inicio, hora_fim, intervalo_min
    FROM horarios_loja
    WHERE loja_id = ${id}
      AND dia = ${diaSemana}
      AND ativo = TRUE
    LIMIT 1
  `

  if (!horario) {
    return NextResponse.json({ slots: [] })
  }

  const slots: string[] = []
  const [hIni, mIni] = String(horario.hora_inicio).split(':').map(Number)
  const [hFim, mFim] = String(horario.hora_fim).split(':').map(Number)
  const intervalo = Number(horario.intervalo_min)
  void mFim

  let atual = hIni * 60 + mIni
  const fim  = hFim * 60 + mFim

  while (atual < fim) {
    const h = String(Math.floor(atual / 60)).padStart(2, '0')
    const m = String(atual % 60).padStart(2, '0')
    slots.push(`${h}:${m}`)
    atual += intervalo
  }

  const ocupados = await sql`
    SELECT hora::TEXT AS hora FROM agendamentos
    WHERE loja_id = ${id}
      AND data = ${data}
      AND status NOT IN ('cancelado')
  `

  const bloqueios = await sql`
    SELECT hora::TEXT AS hora FROM bloqueios_agenda
    WHERE loja_id = ${id}
      AND data = ${data}
  `

  const horasOcupadas = new Set<string>()
  for (const r of ocupados) {
    horasOcupadas.add(String(r.hora ?? '').slice(0, 5))
  }
  for (const r of bloqueios) {
    horasOcupadas.add(r.hora ? String(r.hora).slice(0, 5) : '__dia__')
  }

  const diaBloqueado = horasOcupadas.has('__dia__')

  const resultado = slots.map(hora => ({
    hora,
    disponivel: !diaBloqueado && !horasOcupadas.has(hora)
  }))

  return NextResponse.json({ slots: resultado })
}
