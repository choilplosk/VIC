import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

// GET /api/vic/lojas/[id]/slots?data=2025-06-13
// Rota PÚBLICA — retorna horários disponíveis para o cliente agendar
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
  const [hIni, mIni] = (horario.hora_inicio as string).split(':').map(Number)
  const [hFim, mFim] = (horario.hora_fim as string).split(':').map(Number)
  const intervalo = horario.intervalo_min as number

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

  const horasOcupadas = new Set([
    ...ocupados.map((r: { hora: string }) => r.hora.slice(0, 5)),
    ...bloqueios.map((r: { hora: string | null }) => r.hora ? r.hora.slice(0, 5) : '__dia__'),
  ])

  const diaBloqueado = horasOcupadas.has('__dia__')

  const resultado = slots.map(hora => ({
    hora,
    disponivel: !diaBloqueado && !horasOcupadas.has(hora)
  }))

  return NextResponse.json({ slots: resultado })
}
