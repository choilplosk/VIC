'use client'

import { useState, useCallback } from 'react'
import styles from './agenda.module.css'

interface Usuario {
  id: string; nome: string; perfil: string
  loja_id: string; loja_nome: string; loja_bairro: string; loja_wpp: string | null
}

interface Loja { id: string; nome: string; bairro: string }

interface Agendamento {
  agendamento_id: string; data: string; hora: string
  servico: string; agendamento_status: string
  cliente_nome: string; cliente_wpp: string; nivel: string
  produtos: string[]; empresa_nome: string | null
  loja_nome: string; loja_wpp: string | null; comercial_nome: string | null
}

interface Stats { total: number; confirmados: number; concluidos: number; faltas: number }

interface Props {
  usuario: Usuario; todasLojas: Loja[]
  agendamentosIniciais: Agendamento[]; bloqueiosIniciais: string[]
  statsIniciais: Stats; dataInicial: string
}

const HOURS = ['09:00','09:30','10:00','10:30','11:00','11:30','12:00',
               '12:30','13:00','13:30','14:00','14:30','15:00','15:30',
               '16:00','16:30','17:00','17:30']

const TIER_COLOR: Record<string, string> = {
  bronze: '#CD7F32', prata: '#9a9a9a', ouro: '#C9A96E', diamante: '#4a90c4'
}

const TIER_BG: Record<string, string> = {
  bronze: '#fdf3e6', prata: '#f5f5f5', ouro: '#fdf8ee', diamante: '#eef4fb'
}

const STATUS_OPTS = [
  { value: 'aguardando',      label: 'Aguardando' },
  { value: 'confirmado',      label: 'Confirmado' },
  { value: 'concluido',       label: 'Concluído' },
  { value: 'cancelado',       label: 'Cancelado' },
  { value: 'nao_compareceu',  label: 'Não compareceu' },
]

function formatDate(iso: string) {
  const d = new Date(iso + 'T12:00:00')
  const dias = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado']
  const meses = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
  return `${dias[d.getDay()]}, ${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`
}

export default function AgendaClient({
  usuario, todasLojas, agendamentosIniciais,
  bloqueiosIniciais, statsIniciais, dataInicial
}: Props) {
  const [data, setData]               = useState(dataInicial)
  const [lojaId, setLojaId]           = useState(usuario.loja_id)
  const [agendamentos, setAgendamentos] = useState(agendamentosIniciais)
  const [bloqueios, setBloqueios]     = useState<string[]>(bloqueiosIniciais)
  const [stats, setStats]             = useState(statsIniciais)
  const [detalhe, setDetalhe]         = useState<Agendamento | null>(null)
  const [bloqueioMode, setBloqueioMode] = useState(false)
  const [loadingData, setLoadingData] = useState(false)

  const lojaAtual = todasLojas.find(l => l.id === lojaId) ?? { id: lojaId, nome: usuario.loja_nome, bairro: usuario.loja_bairro }

  const carregar = useCallback(async (novaData: string, novaLoja: string) => {
    setLoadingData(true)
    const [ag, bl] = await Promise.all([
      fetch(`/api/vic/agendamentos?loja_id=${novaLoja}&data=${novaData}`).then(r => r.json()),
      fetch(`/api/vic/agendamentos?loja_id=${novaLoja}&data=${novaData}`).then(r => r.json()),
    ])
    setAgendamentos((ag.agendamentos ?? []).map((a: Record<string, unknown>) => ({
      ...a,
      hora: String(a.hora).slice(0, 5),
    })))
    setBloqueios((bl.bloqueios ?? []).map((b: Record<string, unknown>) => String(b.hora ?? '').slice(0, 5)))
    setDetalhe(null)
    setLoadingData(false)
  }, [])

  function navDay(dir: number) {
    const d = new Date(data + 'T12:00:00')
    d.setDate(d.getDate() + dir)
    const nova = d.toISOString().split('T')[0]
    setData(nova)
    carregar(nova, lojaId)
  }

  function trocarLoja(id: string) {
    setLojaId(id)
    carregar(data, id)
  }

  async function atualizarStatus(id: string, status: string) {
    await fetch(`/api/vic/agendamentos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setAgendamentos(prev => prev.map(a =>
      a.agendamento_id === id ? { ...a, agendamento_status: status } : a
    ))
    if (detalhe?.agendamento_id === id) {
      setDetalhe(prev => prev ? { ...prev, agendamento_status: status } : null)
    }
    setStats(prev => ({ ...prev }))
  }

  async function toggleBloqueio(hora: string) {
    if (!bloqueioMode) return
    const bloqueado = bloqueios.includes(hora)
    if (bloqueado) {
      await fetch(`/api/vic/horarios/bloqueios?loja_id=${lojaId}&data=${data}&hora=${hora}`, { method: 'DELETE' })
      setBloqueios(prev => prev.filter(h => h !== hora))
    } else {
      await fetch('/api/vic/horarios/bloqueios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loja_id: lojaId, data, hora }),
      })
      setBloqueios(prev => [...prev, hora])
    }
  }

  function wppConfirmar(ag: Agendamento) {
    const num = (ag.loja_wpp ?? '').replace(/\D/g, '')
    if (!num) return
    const msg = encodeURIComponent(
      `Olá, ${ag.cliente_nome}! Confirmamos seu agendamento no Studio Boti para ${ag.hora}. Serviço: ${ag.servico}. Aguardamos você! 🌿`
    )
    window.open(`https://wa.me/55${num}?text=${msg}`, '_blank')
  }

  const agPorHora: Record<string, Agendamento> = {}
  agendamentos.forEach(a => { agPorHora[a.hora] = a })

  return (
    <div className={styles.root}>

      {/* TOPBAR */}
      <div className={styles.topbar}>
        <div className={styles.topbarLeft}>
          <span className={styles.brand}>VIC <em>·</em> Studio boti</span>
          {usuario.perfil === 'coordenadora' ? (
            <select className={styles.lojaSelect} value={lojaId} onChange={e => trocarLoja(e.target.value)}>
              {todasLojas.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
            </select>
          ) : (
            <span className={styles.lojaTag}>{lojaAtual.nome}</span>
          )}
        </div>
        <div className={styles.topbarUser}>
          <div className={styles.avatar}>
            {usuario.nome.split(' ').map(n => n[0]).slice(0, 2).join('')}
          </div>
          {usuario.nome.split(' ')[0]}
        </div>
      </div>

      <div className={styles.body}>

        {/* STATS */}
        <div className={styles.statsGrid}>
          <div className={styles.stat}><p className={styles.statLabel}>Hoje</p><p className={styles.statVal}>{stats.total}</p></div>
          <div className={styles.stat}><p className={styles.statLabel}>Confirmados</p><p className={styles.statVal}>{stats.confirmados}</p></div>
          <div className={styles.stat}><p className={styles.statLabel}>Concluídos</p><p className={styles.statVal}>{stats.concluidos}</p></div>
          <div className={styles.stat}><p className={styles.statLabel}>Faltas</p><p className={styles.statVal}>{stats.faltas}</p></div>
        </div>

        {/* CONTROLES */}
        <div className={styles.controls}>
          <div className={styles.dateNav}>
            <button className={styles.navBtn} onClick={() => navDay(-1)}>‹</button>
            <span className={styles.dateLabel}>{formatDate(data)}</span>
            <button className={styles.navBtn} onClick={() => navDay(1)}>›</button>
          </div>
          <button
            className={`${styles.blockBtn} ${bloqueioMode ? styles.blockBtnOn : ''}`}
            onClick={() => setBloqueioMode(m => !m)}
          >
            {bloqueioMode ? '🔓 Clique no horário para bloquear' : '🔒 Bloquear horário'}
          </button>
        </div>

        {/* GRID DE HORÁRIOS */}
        <div className={styles.gridWrap}>
          {loadingData && <div className={styles.loading}>Carregando...</div>}
          <div className={styles.grid}>
            <div className={styles.timeCol}>
              {HOURS.map(h => <div key={h} className={styles.timeSlot}>{h}</div>)}
            </div>
            <div className={styles.slotsCol}>
              {HOURS.map(h => {
                const ag = agPorHora[h]
                const bloqueado = bloqueios.includes(h)
                return (
                  <div
                    key={h}
                    className={`${styles.slot} ${bloqueado && !ag ? styles.slotBloqueado : ''} ${bloqueioMode && !ag ? styles.slotClickable : ''}`}
                    onClick={() => !ag && toggleBloqueio(h)}
                  >
                    {ag && (
                      <div
                        className={styles.event}
                        style={{ background: TIER_BG[ag.nivel], borderLeftColor: TIER_COLOR[ag.nivel] }}
                        onClick={e => { e.stopPropagation(); setDetalhe(ag) }}
                      >
                        <p className={styles.eventNome}>{ag.cliente_nome}</p>
                        <p className={styles.eventSvc}>{ag.servico}</p>
                        {ag.empresa_nome && <p className={styles.eventEmp}>{ag.empresa_nome}</p>}
                      </div>
                    )}
                    {bloqueado && !ag && (
                      <span className={styles.bloqueadoLabel}>Bloqueado</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* PAINEL DE DETALHE */}
        {detalhe && (
          <div className={styles.detalhe}>
            <div className={styles.detalheHeader}>
              <h3 className={styles.detalheTitle}>{detalhe.cliente_nome}</h3>
              <button className={styles.closeBtn} onClick={() => setDetalhe(null)}>✕</button>
            </div>

            <div className={styles.detalheRows}>
              <DetalheRow label="Empresa"   value={detalhe.empresa_nome ?? '—'} />
              <DetalheRow label="Serviço"   value={detalhe.servico} />
              <DetalheRow label="Horário"   value={detalhe.hora} />
              <DetalheRow label="WhatsApp"  value={detalhe.cliente_wpp} />
              <DetalheRow label="Comercial" value={detalhe.comercial_nome ?? '—'} />
              <div className={styles.detalheRow}>
                <span className={styles.detalheKey}>Nível</span>
                <span className={styles.tierPill} style={{ background: TIER_BG[detalhe.nivel], color: TIER_COLOR[detalhe.nivel] }}>
                  {detalhe.nivel.charAt(0).toUpperCase() + detalhe.nivel.slice(1)}
                </span>
              </div>
              <div className={styles.detalheRow} style={{ alignItems: 'flex-start' }}>
                <span className={styles.detalheKey}>Produtos</span>
                <div className={styles.prodList}>
                  {detalhe.produtos.map((p, i) => (
                    <span key={i} className={styles.prodTag}>{p}</span>
                  ))}
                </div>
              </div>
              <div className={styles.detalheRow}>
                <span className={styles.detalheKey}>Status</span>
                <select
                  className={styles.statusSelect}
                  value={detalhe.agendamento_status}
                  onChange={e => atualizarStatus(detalhe.agendamento_id, e.target.value)}
                >
                  {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            <div className={styles.detalheActions}>
              <button className={styles.wppBtn} onClick={() => wppConfirmar(detalhe)}>
                💬 Confirmar pelo WhatsApp
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

function DetalheRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.detalheRow}>
      <span className={styles.detalheKey}>{label}</span>
      <span className={styles.detalheVal}>{value}</span>
    </div>
  )
}
