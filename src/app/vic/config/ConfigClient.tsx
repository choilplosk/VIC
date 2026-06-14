'use client'

import { useState } from 'react'
import styles from './config.module.css'

interface Usuario { id: string; nome: string; perfil: string; loja_id: string | null }
interface Tier { nivel: string; valor_minimo: number; duracao_minutos: number; servicos: string[]; ativo: boolean }
interface Sistema { validade_dias: number; aviso_expiracao_dias: number; reagendamentos_max: number }
interface Loja { id: string; nome: string; bairro: string; endereco: string; tipo: string; whatsapp: string; ativa: boolean }
interface UsuarioVIC { id: string; nome: string; email: string; perfil: string; ativo: boolean; loja_nome: string | null }
interface Horario { loja_id: string; dia: string; hora_inicio: string; hora_fim: string; intervalo_min: number; ativo: boolean }

interface Props {
  usuario: Usuario
  tiersIniciais: Tier[]; sistemaInicial: Sistema
  lojasIniciais: Loja[]; usuariosIniciais: UsuarioVIC[]; horariosIniciais: Horario[]
}

const TIER_LABEL: Record<string, string> = { bronze:'Bronze', prata:'Prata', ouro:'Ouro', diamante:'Diamante' }
const TIER_COLOR: Record<string, string> = { bronze:'#CD7F32', prata:'#9a9a9a', ouro:'#C9A96E', diamante:'#4a90c4' }
const DIAS = ['seg','ter','qua','qui','sex','sab','dom']
const DIAS_LABEL: Record<string, string> = { seg:'Seg', ter:'Ter', qua:'Qua', qui:'Qui', sex:'Sex', sab:'Sáb', dom:'Dom' }
const PERFIS = ['admin','loja','comercial','atendente','coordenadora']

export default function ConfigClient({ usuario, tiersIniciais, sistemaInicial, lojasIniciais, usuariosIniciais, horariosIniciais }: Props) {
  const isAdmin = usuario.perfil === 'admin' || usuario.perfil === 'coordenadora'

  // Abas disponíveis por perfil
  const navItems = [
    ...(isAdmin ? [{ id: 'tiers',   icon: '💎', label: 'Níveis de serviço' }] : []),
    { id: 'horarios', icon: '⏰', label: 'Horários' },
    { id: 'lojas',    icon: '🏪', label: 'Lojas' },
    ...(isAdmin ? [
      { id: 'perfis',  icon: '👥', label: 'Perfis de acesso' },
      { id: 'sistema', icon: '⚙️', label: 'Voucher & sistema' },
    ] : []),
  ]

  const [painel, setPainel]       = useState(navItems[0].id)
  const [tiers, setTiers]         = useState<Tier[]>(tiersIniciais)
  const [sistema, setSistema]     = useState<Sistema>(sistemaInicial)
  const [lojas, setLojas]         = useState<Loja[]>(lojasIniciais)
  const [usuarios, setUsuarios]   = useState<UsuarioVIC[]>(usuariosIniciais)
  const [svcInputs, setSvcInputs] = useState<Record<string, string>>({})
  const [lojaHorario, setLojaHorario] = useState(
    isAdmin
      ? (lojasIniciais.find(l => l.tipo === 'vic')?.id ?? '')
      : (usuario.loja_id ?? '')
  )
  const [horarios, setHorarios]   = useState<Horario[]>(horariosIniciais)
  const [toast, setToast]         = useState('')
  const [saving, setSaving]       = useState(false)

  const iniciais = usuario.nome.split(' ').map(n => n[0]).slice(0, 2).join('')

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2800)
  }

  async function salvarTier(tier: Tier) {
    setSaving(true)
    await fetch('/api/vic/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'tier', nivel: tier.nivel, valor_minimo: tier.valor_minimo, duracao_minutos: tier.duracao_minutos, servicos: tier.servicos }),
    })
    setSaving(false)
    showToast(`Nível ${TIER_LABEL[tier.nivel]} salvo!`)
  }

  async function salvarSistema() {
    setSaving(true)
    await fetch('/api/vic/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'sistema', ...sistema }),
    })
    setSaving(false)
    showToast('Configurações salvas!')
  }

  async function salvarLoja(loja: Loja) {
    setSaving(true)
    await fetch('/api/vic/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'loja', loja_id: loja.id, ativa: loja.ativa, whatsapp: loja.whatsapp }),
    })
    setSaving(false)
    showToast('Loja atualizada!')
  }

  async function salvarPerfil(id: string, perfil: string) {
    setSaving(true)
    await fetch('/api/vic/usuarios', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, perfil }),
    })
    setUsuarios(prev => prev.map(u => u.id === id ? { ...u, perfil } : u))
    setSaving(false)
    showToast('Perfil atualizado!')
  }

  function updateTier(nivel: string, field: keyof Tier, value: unknown) {
    setTiers(prev => prev.map(t => t.nivel === nivel ? { ...t, [field]: value } : t))
  }

  function addSvc(nivel: string) {
    const v = (svcInputs[nivel] ?? '').trim()
    if (!v) return
    updateTier(nivel, 'servicos', [...(tiers.find(t => t.nivel === nivel)?.servicos ?? []), v])
    setSvcInputs(prev => ({ ...prev, [nivel]: '' }))
  }

  function removeSvc(nivel: string, idx: number) {
    const svcs = tiers.find(t => t.nivel === nivel)?.servicos ?? []
    updateTier(nivel, 'servicos', svcs.filter((_, i) => i !== idx))
  }

  function getHorarioLoja(dia: string) {
    return horarios.find(h => h.loja_id === lojaHorario && h.dia === dia)
  }

  async function salvarHorario(dia: string, campo: string, valor: string | number | boolean) {
    const atual = getHorarioLoja(dia)
    const novo: Horario = {
      loja_id:       lojaHorario,
      dia,
      hora_inicio:   atual?.hora_inicio ?? '09:00',
      hora_fim:      atual?.hora_fim ?? '22:00',
      intervalo_min: atual?.intervalo_min ?? 30,
      ativo:         atual?.ativo ?? true,
      [campo]:       valor,
    }
    setHorarios(prev => {
      const existe = prev.findIndex(h => h.loja_id === lojaHorario && h.dia === dia)
      if (existe >= 0) { const next = [...prev]; next[existe] = novo; return next }
      return [...prev, novo]
    })
    await fetch('/api/vic/horarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(novo),
    })
    showToast('Horário salvo!')
  }

  return (
    <div className={styles.root}>

      {/* TOPBAR */}
      <div className={styles.topbar}>
        <div className={styles.topbarLeft}>
          <span className={styles.brand}>VIC <em>·</em> Studio boti</span>
          <span className={styles.tag}>Configurações</span>
        </div>
        <div className={styles.topbarUser}>
          <div className={styles.avatar}>{iniciais}</div>
          {usuario.nome.split(' ')[0]}
          <span className={styles.perfilBadge}>{isAdmin ? 'Admin' : 'Loja'}</span>
        </div>
      </div>

      <div className={styles.layout}>

        {/* SIDEBAR */}
        <div className={styles.sidebar}>
          <p className={styles.sidebarLabel}>{isAdmin ? 'Sistema' : 'Minha loja'}</p>
          {navItems.map(n => (
            <button
              key={n.id}
              className={`${styles.navItem} ${painel === n.id ? styles.navActive : ''}`}
              onClick={() => setPainel(n.id)}
            >
              <span>{n.icon}</span> {n.label}
            </button>
          ))}
        </div>

        {/* CONTEÚDO */}
        <div className={styles.content}>

          {/* TIERS — só admin */}
          {painel === 'tiers' && isAdmin && (
            <>
              <h2 className={styles.panelTitle}>Níveis de serviço</h2>
              <p className={styles.panelSub}>Configure o valor mínimo de compra e os serviços de cada nível.</p>
              {tiers.map(t => (
                <div key={t.nivel} className={styles.card} style={{ borderTop: `3px solid ${TIER_COLOR[t.nivel]}` }}>
                  <div className={styles.tierHeader}>
                    <span style={{ color: TIER_COLOR[t.nivel], fontSize: '1.3rem' }}>◆</span>
                    <div>
                      <p className={styles.tierName}>{TIER_LABEL[t.nivel]}</p>
                      <p className={styles.tierSvcCount}>{t.servicos.length} serviço(s)</p>
                    </div>
                  </div>
                  <div className={styles.grid2}>
                    <div className={styles.field}>
                      <label className={styles.label}>Valor mínimo (R$)</label>
                      <input className={styles.input} type="number" value={t.valor_minimo}
                        onChange={e => updateTier(t.nivel, 'valor_minimo', Number(e.target.value))} />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Duração (min)</label>
                      <input className={styles.input} type="number" step="15" value={t.duracao_minutos}
                        onChange={e => updateTier(t.nivel, 'duracao_minutos', Number(e.target.value))} />
                    </div>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Serviços incluídos</label>
                    <div className={styles.tagsWrap}>
                      {t.servicos.map((s, i) => (
                        <span key={i} className={styles.tag2}>
                          {s}
                          <button onClick={() => removeSvc(t.nivel, i)} aria-label={`Remover ${s}`}>✕</button>
                        </span>
                      ))}
                    </div>
                    <div className={styles.addRow}>
                      <input className={styles.addInput} placeholder="Adicionar serviço..."
                        value={svcInputs[t.nivel] ?? ''}
                        onChange={e => setSvcInputs(prev => ({ ...prev, [t.nivel]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && addSvc(t.nivel)} />
                      <button className={styles.addBtn} onClick={() => addSvc(t.nivel)}>+ Adicionar</button>
                    </div>
                  </div>
                  <button className={styles.saveBtn} disabled={saving} onClick={() => salvarTier(t)}>
                    ✓ Salvar {TIER_LABEL[t.nivel]}
                  </button>
                </div>
              ))}
            </>
          )}

          {/* HORÁRIOS — todos os perfis, loja vê só a própria */}
          {painel === 'horarios' && (
            <>
              <h2 className={styles.panelTitle}>Horários de atendimento</h2>
              <p className={styles.panelSub}>Configure os dias e horários de funcionamento.</p>
              <div className={styles.card}>
                {isAdmin && (
                  <div className={styles.field}>
                    <label className={styles.label}>Loja</label>
                    <select className={styles.input} value={lojaHorario} onChange={e => setLojaHorario(e.target.value)}>
                      {lojas.filter(l => l.tipo === 'vic').map(l => (
                        <option key={l.id} value={l.id}>{l.nome}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className={styles.label} style={{ marginBottom: 8 }}>Dias de atendimento</div>
                <div className={styles.diasGrid}>
                  {DIAS.map(d => {
                    const h = getHorarioLoja(d)
                    return (
                      <button
                        key={d}
                        className={`${styles.diaBtn} ${h?.ativo ? styles.diaBtnOn : ''}`}
                        onClick={() => salvarHorario(d, 'ativo', !(h?.ativo ?? false))}
                      >
                        {DIAS_LABEL[d]}
                      </button>
                    )
                  })}
                </div>
                <div className={styles.grid2}>
                  <div className={styles.field}>
                    <label className={styles.label}>Abertura</label>
                    <input type="time" className={styles.input}
                      value={getHorarioLoja('seg')?.hora_inicio ?? '09:00'}
                      onChange={e => DIAS.forEach(d => salvarHorario(d, 'hora_inicio', e.target.value))} />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Encerramento</label>
                    <input type="time" className={styles.input}
                      value={getHorarioLoja('seg')?.hora_fim ?? '22:00'}
                      onChange={e => DIAS.forEach(d => salvarHorario(d, 'hora_fim', e.target.value))} />
                  </div>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Intervalo entre atendimentos</label>
                  <select className={styles.input}
                    value={getHorarioLoja('seg')?.intervalo_min ?? 30}
                    onChange={e => DIAS.forEach(d => salvarHorario(d, 'intervalo_min', Number(e.target.value)))}>
                    <option value={30}>30 minutos</option>
                    <option value={60}>60 minutos</option>
                    <option value={90}>90 minutos</option>
                  </select>
                </div>
                <button className={styles.saveBtn} disabled={saving} onClick={() => showToast('Horários salvos!')}>
                  ✓ Salvar horários
                </button>
              </div>
            </>
          )}

          {/* LOJAS */}
          {painel === 'lojas' && (
            <>
              <h2 className={styles.panelTitle}>{isAdmin ? 'Lojas' : 'Minha loja'}</h2>
              <p className={styles.panelSub}>Configure o WhatsApp{isAdmin ? ' e ative lojas no VIC' : ' da sua loja'}.</p>
              <div className={styles.card}>
                {lojas.map((l, i) => (
                  <div key={l.id} className={`${styles.lojaRow} ${i === lojas.length - 1 ? styles.lojaRowLast : ''}`}>
                    <div className={styles.lojaInfo}>
                      <p className={styles.lojaNome}>{l.nome}</p>
                      <p className={styles.lojaAddr}>{l.endereco}</p>
                    </div>
                    {isAdmin && (
                      <span className={`${styles.tipoPill} ${l.tipo === 'vic' ? styles.tipoVic : styles.tipoAtacado}`}>
                        {l.tipo === 'vic' ? 'VIC' : 'Atacado'}
                      </span>
                    )}
                    {l.tipo === 'vic' && (
                      <>
                        <input
                          className={styles.wppInput}
                          placeholder="WhatsApp da loja"
                          value={l.whatsapp}
                          onChange={e => setLojas(prev => prev.map(x => x.id === l.id ? { ...x, whatsapp: e.target.value } : x))}
                          onBlur={() => salvarLoja(l)}
                        />
                        {isAdmin && (
                          <div
                            className={`${styles.toggle} ${l.ativa ? styles.toggleOn : ''}`}
                            onClick={() => {
                              const nova = { ...l, ativa: !l.ativa }
                              setLojas(prev => prev.map(x => x.id === l.id ? nova : x))
                              salvarLoja(nova)
                            }}
                          >
                            <div className={styles.toggleKnob} />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* PERFIS — só admin */}
          {painel === 'perfis' && isAdmin && (
            <>
              <h2 className={styles.panelTitle}>Perfis de acesso</h2>
              <p className={styles.panelSub}>Defina o nível de acesso de cada usuário no sistema VIC.</p>
              <div className={styles.grid3} style={{ marginBottom: '1rem' }}>
                <InfoCard title="Admin"    desc="Dashboard, todas as lojas e configurações completas" />
                <InfoCard title="Loja"     desc="Agenda e configurações da própria loja" />
                <InfoCard title="Comercial" desc="Emite vouchers para clientes" />
              </div>
              <div className={styles.card}>
                {usuarios.map(u => (
                  <div key={u.id} className={styles.perfilRow}>
                    <div className={styles.perfilAvatar}>
                      {u.nome.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>
                    <div className={styles.perfilInfo}>
                      <p className={styles.perfilNome}>{u.nome}</p>
                      <p className={styles.perfilEmail}>{u.email}</p>
                      {u.loja_nome && <p className={styles.perfilLoja}>{u.loja_nome}</p>}
                    </div>
                    <select className={styles.perfilSelect} value={u.perfil}
                      onChange={e => salvarPerfil(u.id, e.target.value)}>
                      {PERFIS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* SISTEMA — só admin */}
          {painel === 'sistema' && isAdmin && (
            <>
              <h2 className={styles.panelTitle}>Voucher & sistema</h2>
              <p className={styles.panelSub}>Configure as regras globais de validade e reagendamento.</p>
              <div className={styles.card}>
                <div className={styles.grid2}>
                  <div className={styles.field}>
                    <label className={styles.label}>Validade padrão (dias)</label>
                    <input type="number" className={styles.input} min={7} max={90}
                      value={sistema.validade_dias}
                      onChange={e => setSistema(s => ({ ...s, validade_dias: Number(e.target.value) }))} />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Aviso de expiração (dias antes)</label>
                    <input type="number" className={styles.input} min={1} max={15}
                      value={sistema.aviso_expiracao_dias}
                      onChange={e => setSistema(s => ({ ...s, aviso_expiracao_dias: Number(e.target.value) }))} />
                  </div>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Reagendamentos permitidos por voucher</label>
                  <select className={styles.input}
                    value={sistema.reagendamentos_max}
                    onChange={e => setSistema(s => ({ ...s, reagendamentos_max: Number(e.target.value) }))}>
                    <option value={0}>Sem limite</option>
                    <option value={1}>1 vez</option>
                    <option value={2}>2 vezes</option>
                    <option value={3}>3 vezes</option>
                  </select>
                </div>
                <button className={styles.saveBtn} disabled={saving} onClick={salvarSistema}>
                  ✓ Salvar configurações
                </button>
              </div>
            </>
          )}

        </div>
      </div>

      {/* TOAST */}
      {toast && (
        <div className={styles.toast}>
          <span>✓</span> {toast}
        </div>
      )}

    </div>
  )
}

function InfoCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className={styles.infoCard}>
      <p className={styles.infoTitle}>{title}</p>
      <p className={styles.infoDesc}>{desc}</p>
    </div>
  )
}
