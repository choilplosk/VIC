import { sql } from '@/lib/db'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const email = cookieStore.get('user_email')?.value
  if (!email) redirect('/login')

  const [usuario] = await sql`
    SELECT id, nome, perfil FROM usuarios_vic
    WHERE email = ${email} AND ativo = TRUE LIMIT 1
  `

  if (!usuario) redirect('/login')
  if (usuario.perfil !== 'coordenadora') redirect('/vic/agenda')

  const periodo = 30

  // KPIs
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
        NULLIF(COUNT(*) FILTER (
          WHERE criado_em >= NOW() - (${periodo} || ' days')::INTERVAL
        ), 0) * 100, 1
      ) AS taxa_conversao
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
        NULLIF(COUNT(a.id) FILTER (
          WHERE a.criado_em >= NOW() - (${periodo} || ' days')::INTERVAL
        ), 0) * 100, 1
      ) AS taxa_conv
    FROM lojas l
    LEFT JOIN agendamentos a ON l.id = a.loja_id
    WHERE l.tipo = 'vic' AND l.ativa = TRUE
    GROUP BY l.id, l.nome, l.bairro
    ORDER BY agendamentos DESC
  `

  // Distribuição por tier
  const tiers = await sql`
    SELECT nivel, COUNT(*) AS total
    FROM vouchers
    WHERE criado_em >= NOW() - (${periodo} || ' days')::INTERVAL
    GROUP BY nivel
  `

  // Agendamentos recentes
  const recentes = await sql`
    SELECT * FROM v_agendamentos_completo
    WHERE criado_em >= NOW() - (${periodo} || ' days')::INTERVAL
    ORDER BY criado_em DESC LIMIT 10
  `

  // Evolução semanal
  const evolucao = await sql`
    SELECT
      TO_CHAR(DATE_TRUNC('week', criado_em), 'DD/MM') AS semana,
      COUNT(*) AS vouchers,
      COUNT(*) FILTER (WHERE status IN ('agendado','utilizado')) AS agendamentos
    FROM vouchers
    WHERE criado_em >= NOW() - INTERVAL '28 days'
    GROUP BY DATE_TRUNC('week', criado_em)
    ORDER BY DATE_TRUNC('week', criado_em) ASC
  `

  return (
    <DashboardClient
      usuario={{ id: String(usuario.id), nome: String(usuario.nome), perfil: String(usuario.perfil) }}
      kpisIniciais={{
        vouchers_emitidos:      Number(kpis?.vouchers_emitidos ?? 0),
        agendamentos_realizados: Number(kpis?.agendamentos_realizados ?? 0),
        vouchers_expirados:     Number(kpis?.vouchers_expirados ?? 0),
        taxa_conversao:         Number(kpis?.taxa_conversao ?? 0),
      }}
      lojasIniciais={lojas.map(l => ({
        id:          String(l.id),
        nome:        String(l.nome),
        bairro:      String(l.bairro),
        agendamentos: Number(l.agendamentos ?? 0),
        taxa_conv:   Number(l.taxa_conv ?? 0),
      }))}
      tiersIniciais={tiers.map(t => ({
        nivel: String(t.nivel),
        total: Number(t.total),
      }))}
      recentesIniciais={recentes.map(r => ({
        agendamento_id:     String(r.agendamento_id),
        cliente_nome:       String(r.cliente_nome),
        empresa_nome:       r.empresa_nome ? String(r.empresa_nome) : null,
        servico:            String(r.servico),
        nivel:              String(r.nivel),
        agendamento_status: String(r.agendamento_status),
        data:               r.data ? String(r.data).slice(0,10) : undefined,
        hora:               r.hora ? String(r.hora).slice(0,5) : undefined,
        voucher_status:     String(r.voucher_status),
        loja_nome:          String(r.loja_nome),
        loja_bairro:        String(r.loja_bairro),
        criado_em:          String(r.criado_em),
      }))}
      evolucaoIniciais={evolucao.map(e => ({
        semana:      String(e.semana),
        vouchers:    Number(e.vouchers),
        agendamentos: Number(e.agendamentos),
      }))}
      periodoInicial={periodo}
    />
  )
}
