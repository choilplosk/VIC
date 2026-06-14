'use client'

import { useState, useCallback } from 'react'
import styles from './agenda.module.css'
import VicNav from '../VicNav'

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

const HOURS = [
  '09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30',
  '13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30',
  '17:00','17:30','18:00','18:30','19:00','19:30','20:00','20:30',
  '21:00','21:30','22:00'
]

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

function addDays(iso: string, n: number) {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

export default function AgendaClient({
  usuario, todasLojas, agendamentosIniciais,
  bloqueiosIniciais, statsIniciais, dataInicial
}: Props) {
  const [data, setData]                 = useState(dataInicial)
  const [lojaId, setLojaId]             = useState(usuario.loja_id)
  const [agendamentos, setAgendamentos] = useState(agendamentosIniciais)
  const [bloqueios, setBloqueios]       = useState<string[]>(bloqueiosIniciais)
  const [stats, setStats]               = useState(statsIniciais)
  const [detalhe, setDetalhe]           = useState<Agendamento | null>(null)
  const [bloqueioMode, setBloqueioMode] = useState(false)
  const [loadingData, setLoadingData]   = useState(false)

  // Reagendamento
  const [reagendando, setReagendando]   = useState(false)
  const [reData, setReData]             = useState('')
  const [reHora, setReHora]             = useState('')
  const [reLoading, setReLoading]       = useState(false)

  // Bloqueio de dia inteiro
  const [bloqueandoDia, setBloqueandoDia] = useState(false)
  const [modalBloquear, setModalBloquear] = useState(false)
  const [bloquearInicio, setBloquearInicio] = useState('')
  const [bloquearFim, setBloquearFim] = useState('')
  const [bloqueandoPeriodo, setBloqueandoPeriodo] = useState(false)

  const lojaAtual = todasLojas.find(l => l.id === lojaId) ?? {
    id: lojaId, nome: usuario.loja_nome, bairro: usuario.loja_bairro
  }

  const diaBloqueado = HOURS.every(h => bloqueios.includes(h))

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
    setReagendando(false)
    setLoadingData(false)
  }, [])

  function navDay(dir: number) {
    const nova = addDays(data, dir)
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

  async function toggleBloquearDia() {
    setBloqueandoDia(true)
    if (diaBloqueado) {
      // Desbloquear todos os horários do dia
      await fetch(`/api/vic/horarios/bloqueios?loja_id=${lojaId}&data=${data}&dia_inteiro=true`, { method: 'DELETE' })
      setBloqueios([])
    } else {
      // Bloquear todos os horários livres do dia
      const agPorHora = new Set(agendamentos.map(a => a.hora))
      const horasLivres = HOURS.filter(h => !agPorHora.has(h))
      await fetch('/api/vic/horarios/bloqueios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loja_id: lojaId, data, horas: horasLivres }),
      })
      setBloqueios(HOURS.filter(h => !agPorHora.has(h)))
    }
    setBloqueandoDia(false)
  }

  async function bloquearPeriodo() {
    if (!bloquearInicio || !bloquearFim) return
    setBloqueandoPeriodo(true)
    // Gera lista de datas entre inicio e fim
    const datas: string[] = []
    const cur = new Date(bloquearInicio + 'T12:00:00')
    const fim = new Date(bloquearFim + 'T12:00:00')
    while (cur <= fim) {
      datas.push(cur.toISOString().split('T')[0])
      cur.setDate(cur.getDate() + 1)
    }
    // Bloqueia cada dia
    for (const d of datas) {
      await fetch('/api/vic/horarios/bloqueios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loja_id: lojaId, data: d, horas: [] as string[], dia_inteiro: true }),
      })
    }
    setBloqueandoPeriodo(false)
    setModalBloquear(false)
    setBloquearInicio('')
    setBloquearFim('')
    if (datas.includes(data)) carregar(data, lojaId)
  }

  async function confirmarReagendamento() {
    if (!detalhe || !reData || !reHora) return
    setReLoading(true)
    await fetch(`/api/vic/agendamentos/${detalhe.agendamento_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: reData, hora: reHora, status: 'aguardando' }),
    })
    setReLoading(false)
    setReagendando(false)
    setReData('')
    setReHora('')
    carregar(data, lojaId)
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

      <VicNav perfil={usuario.perfil} nome={usuario.nome} />
      <div className={styles.lojaBar}>
        {usuario.perfil === 'coordenadora' ? (
          <select className={styles.lojaSelect} value={lojaId} onChange={e => trocarLoja(e.target.value)}>
            {todasLojas.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
          </select>
        ) : (
          <span className={styles.lojaTag}>{lojaAtual.nome}</span>
        )}
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
          <div className={styles.controlsRight}>
            <button
              className={`${styles.blockBtn} ${diaBloqueado ? styles.blockBtnDia : ''}`}
              onClick={toggleBloquearDia}
              disabled={bloqueandoDia}
            >
              {diaBloqueado ? '🔓 Desbloquear dia' : '📅 Bloquear este dia'}
            </button>
            <button
              className={styles.blockBtn}
              onClick={() => setModalBloquear(true)}
            >
              📆 Bloquear período
            </button>
            <button
              className={`${styles.blockBtn} ${bloqueioMode ? styles.blockBtnOn : ''}`}
              onClick={() => setBloqueioMode(m => !m)}
            >
              {bloqueioMode ? '🔓 Clique no horário para bloquear' : '🔒 Bloquear horário'}
            </button>
          </div>
        </div>

        <div className={styles.mainArea}>

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
                          className={`${styles.event} ${detalhe?.agendamento_id === ag.agendamento_id ? styles.eventSelected : ''}`}
                          style={{ background: TIER_BG[ag.nivel], borderLeftColor: TIER_COLOR[ag.nivel] }}
                          onClick={e => { e.stopPropagation(); setDetalhe(ag); setReagendando(false) }}
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
                <button className={styles.closeBtn} onClick={() => { setDetalhe(null); setReagendando(false) }}>✕</button>
              </div>

              <div className={styles.detalheRows}>
                <DetalheRow label="Empresa"   value={detalhe.empresa_nome ?? '—'} />
                <DetalheRow label="Serviço"   value={detalhe.servico} />
                <DetalheRow label="Horário"   value={`${data === dataInicial ? 'Hoje' : formatDate(detalhe.data)} · ${detalhe.hora}`} />
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
                <button
                  className={`${styles.reagendarBtn} ${reagendando ? styles.reagendarBtnOn : ''}`}
                  onClick={() => { setReagendando(r => !r); setReData(''); setReHora('') }}
                >
                  📅 {reagendando ? 'Cancelar reagendamento' : 'Reagendar'}
                </button>
              </div>

              {/* PAINEL DE REAGENDAMENTO */}
              {reagendando && (
                <div className={styles.reagendarWrap}>
                  <p className={styles.reagendarTitle}>Novo horário</p>
                  <div className={styles.reagendarFields}>
                    <div>
                      <label className={styles.reagendarLabel}>Data</label>
                      <input
                        type="date"
                        className={styles.reagendarInput}
                        value={reData}
                        min={dataInicial}
                        max={addDays(detalhe.data.slice(0, 10), 30)}
                        onChange={e => setReData(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={styles.reagendarLabel}>Horário</label>
                      <select
                        className={styles.reagendarInput}
                        value={reHora}
                        onChange={e => setReHora(e.target.value)}
                      >
                        <option value="">Selecione</option>
                        {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  </div>
                  <p className={styles.reagendarNota}>
                    Voucher válido até {new Date(addDays(detalhe.data.slice(0, 10), 30) + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                  <button
                    className={styles.reagendarConfirmar}
                    onClick={confirmarReagendamento}
                    disabled={!reData || !reHora || reLoading}
                  >
                    {reLoading ? 'Salvando...' : 'Confirmar reagendamento'}
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
      {modalBloquear && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:50,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'#fff',borderRadius:12,padding:24,width:340,boxShadow:'0 8px 32px rgba(0,0,0,0.18)'}}>
            <h3 style={{fontSize:15,fontWeight:500,color:'#111',marginBottom:16}}>Bloquear período</h3>
            <div style={{marginBottom:12}}>
              <label style={{fontSize:11,color:'#999',display:'block',marginBottom:4}}>Data inicial</label>
              <input type="date" className={styles.reagendarInput}
                value={bloquearInicio} onChange={e => setBloquearInicio(e.target.value)} />
            </div>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:11,color:'#999',display:'block',marginBottom:4}}>Data final</label>
              <input type="date" className={styles.reagendarInput}
                value={bloquearFim} min={bloquearInicio} onChange={e => setBloquearFim(e.target.value)} />
            </div>
            <p style={{fontSize:11,color:'#C9A96E',marginBottom:16}}>
              Todos os horários disponíveis neste período serão bloqueados.
            </p>
            <div style={{display:'flex',gap:8}}>
              <button className={styles.reagendarConfirmar}
                onClick={bloquearPeriodo}
                disabled={!bloquearInicio || !bloquearFim || bloqueandoPeriodo}
                style={{flex:1}}>
                {bloqueandoPeriodo ? 'Bloqueando...' : 'Confirmar'}
              </button>
              <button onClick={() => setModalBloquear(false)}
                style={{flex:1,background:'#fff',border:'1px solid #ddd',borderRadius:8,padding:10,cursor:'pointer',fontSize:13,color:'#666'}}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DetalheRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.detalheRow}>
      <span className={styles.detalheKey}>{label}</span>
      <span className={styles.detalheVal}>{value}</span>
      {modalBloquear && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:50,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'#fff',borderRadius:12,padding:24,width:340,boxShadow:'0 8px 32px rgba(0,0,0,0.18)'}}>
            <h3 style={{fontSize:15,fontWeight:500,color:'#111',marginBottom:16}}>Bloquear período</h3>
            <div style={{marginBottom:12}}>
              <label style={{fontSize:11,color:'#999',display:'block',marginBottom:4}}>Data inicial</label>
              <input type="date" className={styles.reagendarInput}
                value={bloquearInicio} onChange={e => setBloquearInicio(e.target.value)} />
            </div>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:11,color:'#999',display:'block',marginBottom:4}}>Data final</label>
              <input type="date" className={styles.reagendarInput}
                value={bloquearFim} min={bloquearInicio} onChange={e => setBloquearFim(e.target.value)} />
            </div>
            <p style={{fontSize:11,color:'#C9A96E',marginBottom:16}}>
              Todos os horários disponíveis neste período serão bloqueados.
            </p>
            <div style={{display:'flex',gap:8}}>
              <button className={styles.reagendarConfirmar}
                onClick={bloquearPeriodo}
                disabled={!bloquearInicio || !bloquearFim || bloqueandoPeriodo}
                style={{flex:1}}>
                {bloqueandoPeriodo ? 'Bloqueando...' : 'Confirmar'}
              </button>
              <button onClick={() => setModalBloquear(false)}
                style={{flex:1,background:'#fff',border:'1px solid #ddd',borderRadius:8,padding:10,cursor:'pointer',fontSize:13,color:'#666'}}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
