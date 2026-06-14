export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getUsuarioVIC, temPermissao } from '@/lib/auth'

// GET /api/vic/dashboard?periodo=30
// Retorna métricas consolidadas de todas as lojas (coordenadora)
export async function GET(req: NextRequest) {
  const usuario = await getUsuarioVIC(req)
  if (!usuario) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  if (!temPermissao(usuario, 'coordenadora')) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const periodo = parseInt(searchParams.get('periodo') ?? '30')

  // KPIs principais
  const [kpis] = await sql`
    SELECT
      COUNT(*) FILTER (WHERE criado_em >= NOW() - (${periodo} || ' days')::INTERVAL)
        AS vouchers_emitidos,
      COUNT(*) FILTER (
        WHERE status IN ('agendado','utilizado')
          AND criado_em >= NOW() - (${periodo} || ' days')::INTERVAL
      ) AS agendamentos_realizados,
      COUNT(*) FILTER (
        WHERE status = 'expirado'
          AND criado_em >= NOW() - (${periodo} || ' days')::INTERVAL
      ) AS vouchers_expirados,
      ROUND(
        COUNT(*) FILTER (
          WHERE status IN ('agendado','utilizado')
            AND criado_em >= NOW() - (${periodo} || ' days')::INTERVAL
        )::NUMERIC /
        NULLIF(
          COUNT(*) FILTER (
            WHERE criado_em >= NOW() - (${periodo} || ' days')::INTERVAL
          ), 0
        ) * 100, 1
      ) AS taxa_conversao_pct
    FROM vouchers
  `

  // Ranking de lojas
  const lojas = await sql`
    SELECT
      l.id, l.nome, l.bairro,
      COUNT(a.id) FILTER (
        WHERE a.criado_em >= NOW() - (${periodo} || ' days')::INTERVAL
      ) AS agendamentos,
      ROUND(
        COUNT(a.id) FILTER (
          WHERE a.status IN ('confirmado','concluido')
            AND a.criado_em >= NOW() - (${periodo} || ' days')::INTERVAL
        )::NUMERIC /
        NULLIF(
          COUNT(a.id) FILTER (
            WHERE a.criado_em >= NOW() - (${periodo} || ' days')::INTERVAL
          ), 0
        ) * 100, 1
      ) AS taxa_conv_pct
    FROM lojas l
    LEFT JOIN agendamentos a ON l.id = a.loja_id
    WHERE l.tipo = 'vic' AND l.ativa = TRUE
    GROUP BY l.id, l.nome, l.bairro
    ORDER BY agendamentos DESC
  `

  // Distribuição por nível
  const tiers = await sql`
    SELECT nivel, COUNT(*) AS total
    FROM vouchers
    WHERE criado_em >= NOW() - (${periodo} || ' days')::INTERVAL
    GROUP BY nivel
    ORDER BY nivel
  `

  // Agendamentos recentes (últimos 10)
  const recentes = await sql`
    SELECT *
    FROM v_agendamentos_completo
    WHERE criado_em >= NOW() - (${periodo} || ' days')::INTERVAL
    ORDER BY criado_em DESC
    LIMIT 10
  `

  // Evolução semanal (últimas 4 semanas)
  const evolucao = await sql`
    SELECT
      DATE_TRUNC('week', criado_em) AS semana,
      COUNT(*) FILTER (WHERE status != 'expirado') AS vouchers,
      COUNT(*) FILTER (WHERE status IN ('agendado','utilizado')) AS agendamentos
    FROM vouchers
    WHERE criado_em >= NOW() - INTERVAL '28 days'
    GROUP BY semana
    ORDER BY semana ASC
  `

  return NextResponse.json({ kpis, lojas, tiers, recentes, evolucao })
}
