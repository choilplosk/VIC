'use client'

import { useState } from 'react'
import styles from './dashboard.module.css'

interface Usuario { id: string; nome: string }

interface KPIs {
  vouchers_emitidos: number; agendamentos_realizados: number
  vouchers_expirados: number; taxa_conversao: number
}

interface LojaStats {
  id: string; nome: string; bairro: string; agendamentos: number; taxa_conv: number
}

interface TierStats { nivel: string; total: number }

interface Recente {
  agendamento_id: string; cliente_nome: string; empresa_nome: string | null
  servico: string; nivel: string; agendamento_status: string; voucher_status: string
  loja_nome: string; loja_bairro: string; criado_em: string
}

interface Evolucao { semana: string; vouchers: number; agendamentos: number }

interface Props {
  usuario: Usuario
  kpisIniciais: KPIs; lojasIniciais: LojaStats[]
  tiersIniciais: TierStats[]; recentesIniciais: Recente[]
  evolucaoIniciais: Evolucao[]; periodoInicial: number
}

const TIER_LABEL: Record<string, string> = {
  bronze: 'Bronze', prata: 'Prata', ouro: 'Ouro', diamante: 'Diamante'
}

const TIER_STYLE: Record<string, { bg: string; color: string }> = {
  bronze:   { bg: '#fdf3e6', color: '#854F0B' },
  prata:    { bg: '#f5f5f5', color: '#5F5E5A' },
  ouro:     { bg: '#fdf8ee', color: '#854F0B' },
  diamante: { bg: '#eef4fb', color: '#185FA5' },
}

const STATUS_LABEL: Record<string, string> = {
  pendente: 'Aguardando', agendado: 'Agendado',
  utilizado: 'Utilizado', expirado: 'Expirado', cancelado: 'Cancelado',
  aguardando: 'Aguardando', confirmado: 'Confirmado',
  concluido: 'Concluído', nao_compareceu: 'Não compareceu',
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  agendado:  { bg: '#edf7f2', color: '#085041' },
  confirmado: { bg: '#edf7f2', color: '#085041' },
  concluido: { bg: '#eef4fb', color: '#185FA5' },
  pendente:  { bg: '#fdf8ee', color: '#854F0B' },
  aguardando: { bg: '#fdf8ee', color: '#854F0B' },
  expirado:  { bg: '#f5f5f5', color: '#999' },
  cancelado: { bg: '#f5f5f5', color: '#999' },
  nao_compareceu: { bg: '#fff0f0', color: '#c0392b' },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export default function DashboardClient({
  usuario, kpisIniciais, lojasIniciais, tiersIniciais,
  recentesIniciais, evolucaoIniciais, periodoInicial
}: Props) {
  const [periodo, setPeriodo]   = useState(periodoInicial)
  const [kpis, setKpis]         = useState(kpisIniciais)
  const [lojas, setLojas]       = useState(lojasIniciais)
  const [tiers, setTiers]       = useState(tiersIniciais)
  const [recentes, setRecentes] = useState(recentesIniciais)
  const [evolucao, setEvolucao] = useState(evolucaoIniciais)
  const [loading, setLoading]   = useState(false)

  async function trocarPeriodo(p: number) {
    if (p === periodo) return
    setPeriodo(p)
    setLoading(true)
    const res  = await fetch(`/api/vic/dashboard?periodo=${p}`)
    const data = await res.json()
    setKpis({
      vouchers_emitidos:       Number(data.kpis?.vouchers_emitidos ?? 0),
      agendamentos_realizados: Number(data.kpis?.agendamentos_realizados ?? 0),
      vouchers_expirados:      Number(data.kpis?.vouchers_expirados ?? 0),
      taxa_conversao:          Number(data.kpis?.taxa_conversao_pct ?? 0),
    })
    setLojas((data.lojas ?? []).map((l: Record<string, unknown>) => ({
      id: String(l.id), nome: String(l.nome), bairro: String(l.bairro),
      agendamentos: Number(l.agendamentos ?? 0), taxa_conv: Number(l.taxa_conv_pct ?? 0),
    })))
    setTiers((data.tiers ?? []).map((t: Record<string, unknown>) => ({
      nivel: String(t.nivel), total: Number(t.total),
    })))
    setRecentes((data.recentes ?? []).slice(0, 10).map((r: Record<string, unknown>) => ({
      agendamento_id: String(r.agendamento_id), cliente_nome: String(r.cliente_nome),
      empresa_nome: r.empresa_nome ? String(r.empresa_nome) : null,
      servico: String(r.servico), nivel: String(r.nivel),
      agendamento_status: String(r.agendamento_status),
      voucher_status: String(r.voucher_status),
      loja_nome: String(r.loja_nome), loja_bairro: String(r.loja_bairro),
      criado_em: String(r.criado_em),
    })))
    setEvolucao((data.evolucao ?? []).map((e: Record<string, unknown>) => ({
      semana: String(e.semana), vouchers: Number(e.vouchers), agendamentos: Number(e.agendamentos),
    })))
    setLoading(false)
  }

  const maxAgend = Math.max(...lojas.map(l => l.agendamentos), 1)
  const totalTiers = tiers.reduce((s, t) => s + t.total, 0)
  const maxEv = Math.max(...evolucao.map(e => e.vouchers), 1)
  const iniciais = usuario.nome.split(' ').map(n => n[0]).slice(0, 2).join('')

  return (
    <div className={styles.root}>

      {/* TOPBAR */}
      <div className={styles.topbar}>
        <div className={styles.topbarLeft}>
          <span className={styles.brand}>VIC <em>·</em> Studio boti</span>
          <span className={styles.tag}>Coordenação</span>
        </div>
        <div className={styles.topbarUser}>
          <div className={styles.avatar}>{iniciais}</div>
          {usuario.nome.split(' ')[0]}
        </div>
      </div>

      <div className={styles.body}>

        {/* HEADER */}
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Visão geral · todas as lojas</h1>
            <p className={styles.pageSub}>O Boticário Niterói · {lojas.length} lojas VIC ativas</p>
          </div>
          <div className={styles.periodBtns}>
            {[7, 30, 90].map(p => (
              <button
                key={p}
                className={`${styles.periodBtn} ${periodo === p ? styles.periodBtnActive : ''}`}
                onClick={() => trocarPeriodo(p)}
              >
                {p} dias
              </button>
            ))}
          </div>
        </div>

        {loading && <div className={styles.loadingBar} />}

        {/* KPIS */}
        <div className={styles.kpis}>
          <KpiCard label="Vouchers emitidos"      value={kpis.vouchers_emitidos}      delta="+18%" up />
          <KpiCard label="Agendamentos realizados" value={kpis.agendamentos_realizados} delta="+12%" up />
          <KpiCard label="Taxa de conversão"       value={`${kpis.taxa_conversao}%`}  delta="-3pp" up={false} />
          <KpiCard label="Vouchers expirados"      value={kpis.vouchers_expirados}     delta="+5"   up={false} />
        </div>

        {/* MID */}
        <div className={styles.mid}>

          {/* RANKING LOJAS */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>🏪 Agendamentos por loja</div>
            {lojas.map(l => (
              <div key={l.id} className={styles.lojaRow}>
                <div className={styles.lojaInfo}>
                  <p className={styles.lojaNome}>{l.nome}</p>
                </div>
                <div className={styles.barWrap}>
                  <div className={styles.barFill} style={{ width: `${(l.agendamentos / maxAgend) * 100}%` }} />
                </div>
                <span className={styles.lojaCount}>{l.agendamentos}</span>
                <span className={styles.lojaConv}>{l.taxa_conv}%</span>
              </div>
            ))}
          </div>

          {/* TIERS + GRÁFICO */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>💎 Distribuição por nível</div>
            <div className={styles.tierGrid}>
              {['bronze','prata','ouro','diamante'].map(n => {
                const t = tiers.find(x => x.nivel === n)
                const total = t?.total ?? 0
                const pct = totalTiers > 0 ? Math.round(total / totalTiers * 100) : 0
                const s = TIER_STYLE[n]
                return (
                  <div key={n} className={styles.tierCard} style={{ background: s.bg }}>
                    <p className={styles.tierName} style={{ color: s.color }}>{TIER_LABEL[n]}</p>
                    <p className={styles.tierVal}>{total}</p>
                    <p className={styles.tierPct}>{pct}% do total</p>
                  </div>
                )
              })}
            </div>

            <div className={styles.chartTitle}>📊 Agendamentos por semana</div>
            <div className={styles.chartWrap}>
              {evolucao.map((e, i) => {
                const hV = Math.round((e.vouchers / maxEv) * 100)
                const hA = Math.round((e.agendamentos / maxEv) * 100)
                return (
                  <div key={i} className={styles.barCol}>
                    <span className={styles.barValTop}>{e.agendamentos}</span>
                    <div className={styles.barOuter} style={{ height: `${hV}px` }}>
                      <div className={styles.barInner} style={{ height: `${hA}px` }} />
                    </div>
                    <span className={styles.barLabel}>{e.semana}</span>
                  </div>
                )
              })}
            </div>
          </div>

        </div>

        {/* RECENTES */}
        <div className={styles.card} style={{ marginBottom: '1.5rem' }}>
          <div className={styles.cardTitle}>⏱ Agendamentos recentes · todas as lojas</div>
          {recentes.length === 0 ? (
            <p className={styles.empty}>Nenhum agendamento no período.</p>
          ) : (
            recentes.map(r => {
              const ts = STATUS_STYLE[r.agendamento_status] ?? STATUS_STYLE.pendente
              const tn = TIER_STYLE[r.nivel] ?? TIER_STYLE.bronze
              return (
                <div key={r.agendamento_id} className={styles.recenteRow}>
                  <div className={styles.recenteAvatar}>
                    {r.cliente_nome.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                  </div>
                  <div className={styles.recenteInfo}>
                    <p className={styles.recenteNome}>{r.cliente_nome}</p>
                    <p className={styles.recenteMeta}>{r.empresa_nome ?? 'Sem empresa'} · {r.servico}</p>
                  </div>
                  <span className={styles.recenteLoja}>{r.loja_nome}</span>
                  <span className={styles.pill} style={{ background: tn.bg, color: tn.color }}>
                    {TIER_LABEL[r.nivel]}
                  </span>
                  <span className={styles.pill} style={{ background: ts.bg, color: ts.color }}>
                    {STATUS_LABEL[r.agendamento_status]}
                  </span>
                </div>
              )
            })
          )}
        </div>

      </div>
    </div>
  )
}

function KpiCard({ label, value, delta, up }: { label: string; value: string | number; delta: string; up: boolean }) {
  return (
    <div className={styles.kpi}>
      <p className={styles.kpiLabel}>{label}</p>
      <p className={styles.kpiVal}>{value}</p>
      <p className={styles.kpiDelta} style={{ color: up ? '#3d8a65' : '#E24B4A' }}>
        {up ? '↑' : '↓'} {delta}
      </p>
    </div>
  )
}
