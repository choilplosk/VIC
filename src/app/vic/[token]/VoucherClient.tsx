'use client'

import { useState, useEffect } from 'react'
import styles from './voucher.module.css'

interface Voucher {
  id: string
  token: string
  cliente_nome: string
  nivel: string
  status: string
  expira_em: string
  servicos: string[]
  duracao_minutos: number
}

interface Loja {
  id: string
  nome: string
  bairro: string
  endereco: string
  whatsapp: string | null
}

interface Slot {
  hora: string
  disponivel: boolean
}

interface Props {
  voucher: Voucher
  lojas: Loja[]
}

const TIER_LABEL: Record<string, string> = {
  bronze:   'Bronze',
  prata:    'Prata',
  ouro:     'Ouro',
  diamante: 'Diamante',
}

const TIER_COLOR: Record<string, string> = {
  bronze:   '#CD7F32',
  prata:    '#9a9a9a',
  ouro:     '#C9A96E',
  diamante: '#4a90c4',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric'
  })
}

function formatDateShort(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long'
  })
}

export default function VoucherClient({ voucher, lojas }: Props) {
  const [tela, setTela]       = useState<'voucher'|'servico'|'loja'|'horario'|'confirmar'|'sucesso'>('voucher')
  const [servico, setServico] = useState('')
  const [loja, setLoja]       = useState<Loja | null>(null)
  const [data, setData]       = useState('')
  const [hora, setHora]       = useState('')
  const [slots, setSlots]     = useState<Slot[]>([])
  const [phone, setPhone]     = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro]       = useState('')

  const expirado = voucher.status === 'expirado' || voucher.status === 'utilizado'

  // Busca slots ao escolher data e loja
  useEffect(() => {
    if (!loja || !data) return
    setHora('')
    setSlots([])
    fetch(`/api/vic/lojas/${loja.id}/slots?data=${data}`)
      .then(r => r.json())
      .then(d => setSlots(d.slots ?? []))
  }, [loja, data])

  async function confirmar() {
    if (!loja || !servico || !data || !hora || !phone) return
    setLoading(true)
    setErro('')
    try {
      const res = await fetch('/api/vic/agendamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voucher_token: voucher.token,
          loja_id:       loja.id,
          servico,
          data,
          hora,
          cliente_wpp:   phone.replace(/\D/g, ''),
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        setErro(d.error ?? 'Erro ao agendar. Tente novamente.')
        setLoading(false)
        return
      }
      setTela('sucesso')
    } catch {
      setErro('Erro de conexão. Tente novamente.')
    }
    setLoading(false)
  }

  function wppLink() {
    if (!loja?.whatsapp) return '#'
    const num = loja.whatsapp.replace(/\D/g, '')
    const msg = encodeURIComponent(
      `Olá! Sou ${voucher.cliente_nome} e acabo de agendar pelo VIC.\n` +
      `Serviço: ${servico}\nLoja: ${loja.nome}\n` +
      `Data: ${formatDateShort(data)} às ${hora}\nAguardo a confirmação! 😊`
    )
    return `https://wa.me/55${num}?text=${msg}`
  }

  // Tela de voucher expirado/utilizado
  if (expirado) {
    return (
      <div className={styles.root}>
        <div className={styles.hero}>
          <HeroContent />
        </div>
        <div className={styles.errorBox}>
          <span className={styles.errorIcon}>⏱</span>
          <h2>{voucher.status === 'utilizado' ? 'Voucher já utilizado' : 'Voucher expirado'}</h2>
          <p>{voucher.status === 'utilizado'
            ? 'Este voucher já foi utilizado para um agendamento.'
            : 'Este voucher expirou. Fale com o comercial para obter um novo.'
          }</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.root}>

      {/* TELA 1 — VOUCHER */}
      {tela === 'voucher' && (
        <>
          <div className={styles.hero}>
            <HeroContent />
          </div>

          <div className={styles.greeting}>
            <p className={styles.greetingLabel}>Seu voucher exclusivo</p>
            <h1 className={styles.clientName}>{voucher.cliente_nome}</h1>
            <p className={styles.clientTagline}>Uma experiência preparada especialmente para você</p>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <p className={styles.cardHeaderLabel}>Voucher VIP</p>
                <p className={styles.cardHeaderTitle}>Espaço da Beleza</p>
              </div>
              <span className={styles.vipBadge}>Exclusivo</span>
            </div>
            <div className={styles.cardBody}>
              <p className={styles.sectionLabel}>Nível do serviço</p>
              <div className={styles.tierBadge} style={{ borderColor: TIER_COLOR[voucher.nivel] + '55', color: TIER_COLOR[voucher.nivel] }}>
                <span className={styles.tierDot} style={{ background: TIER_COLOR[voucher.nivel] }}/>
                Nível {TIER_LABEL[voucher.nivel]}
              </div>
              <div className={styles.validity}>
                <span>⏱</span>
                Válido por 30 dias · Expira em {formatDate(voucher.expira_em)}
              </div>
            </div>
          </div>

          <div className={styles.steps}>
            <h3 className={styles.stepsTitle}>Como funciona</h3>
            <Step n="1" title="Escolha seu serviço"   desc="Selecione entre os serviços do seu nível" />
            <Step n="2" title="Escolha loja e horário" desc="Agende na unidade mais próxima" />
            <Step n="3" title="Aguarde a confirmação" desc="A loja confirma pelo seu WhatsApp" />
          </div>

          <div className={styles.btnWrap}>
            <button className={styles.btnPrimary} onClick={() => setTela('servico')}>
              Agendar minha experiência →
            </button>
          </div>
          <Footer />
        </>
      )}

      {/* TELA 2 — SERVIÇO */}
      {tela === 'servico' && (
        <>
          <BackBtn onClick={() => setTela('voucher')} />
          <h2 className={styles.screenTitle}>Escolha seu serviço</h2>
          <div className={styles.serviceGrid}>
            {voucher.servicos.map(s => (
              <div
                key={s}
                className={`${styles.serviceCard} ${servico === s ? styles.serviceCardSel : ''}`}
                onClick={() => setServico(s)}
              >
                <span className={styles.serviceIcon}>✦</span>
                <p className={styles.serviceName}>{s}</p>
                <p className={styles.serviceDur}>{voucher.duracao_minutos} min</p>
              </div>
            ))}
          </div>
          <div className={styles.btnWrap}>
            <button
              className={styles.btnPrimary}
              disabled={!servico}
              onClick={() => setTela('loja')}
            >
              Escolher loja →
            </button>
          </div>
        </>
      )}

      {/* TELA 3 — LOJA */}
      {tela === 'loja' && (
        <>
          <BackBtn onClick={() => setTela('servico')} />
          <h2 className={styles.screenTitle}>Escolha a loja</h2>
          <div className={styles.lojaList}>
            {lojas.map(l => (
              <div
                key={l.id}
                className={`${styles.lojaItem} ${loja?.id === l.id ? styles.lojaItemSel : ''}`}
                onClick={() => setLoja(l)}
              >
                <div>
                  <p className={styles.lojaNome}>{l.nome}</p>
                  <p className={styles.lojaAddr}>{l.endereco}</p>
                </div>
                <span>›</span>
              </div>
            ))}
          </div>
          <div className={styles.btnWrap}>
            <button
              className={styles.btnPrimary}
              disabled={!loja}
              onClick={() => setTela('horario')}
            >
              Ver horários →
            </button>
          </div>
        </>
      )}

      {/* TELA 4 — HORÁRIO */}
      {tela === 'horario' && (
        <>
          <BackBtn onClick={() => setTela('loja')} />
          <h2 className={styles.screenTitle}>Escolha o horário</h2>
          <div className={styles.dateWrap}>
            <p className={styles.sectionLabel}>Data</p>
            <input
              type="date"
              className={styles.dateInput}
              min={new Date().toISOString().split('T')[0]}
              value={data}
              onChange={e => { setData(e.target.value); setHora('') }}
            />
          </div>
          {data && slots.length > 0 && (
            <div className={styles.slotsWrap}>
              <p className={styles.sectionLabel} style={{ padding: '0 1.25rem 0.6rem' }}>Horário disponível</p>
              <div className={styles.slotsGrid}>
                {slots.map(s => (
                  <button
                    key={s.hora}
                    className={`${styles.slotBtn} ${!s.disponivel ? styles.slotBloqueado : ''} ${hora === s.hora ? styles.slotSel : ''}`}
                    disabled={!s.disponivel}
                    onClick={() => setHora(s.hora)}
                  >
                    {s.hora}
                  </button>
                ))}
              </div>
            </div>
          )}
          {data && slots.length === 0 && (
            <p className={styles.noSlots}>Nenhum horário disponível nesta data. Tente outro dia.</p>
          )}
          <div className={styles.btnWrap}>
            <button
              className={styles.btnPrimary}
              disabled={!hora}
              onClick={() => setTela('confirmar')}
            >
              Confirmar horário →
            </button>
          </div>
        </>
      )}

      {/* TELA 5 — CONFIRMAR */}
      {tela === 'confirmar' && (
        <>
          <BackBtn onClick={() => setTela('horario')} />
          <h2 className={styles.screenTitle}>Confirmar agendamento</h2>
          <div className={styles.summaryCard}>
            <SummaryRow label="Cliente"    value={voucher.cliente_nome} />
            <SummaryRow label="Serviço"    value={servico} />
            <SummaryRow label="Loja"       value={loja?.nome ?? ''} />
            <SummaryRow label="Data"       value={`${formatDateShort(data)} · ${hora}`} />
          </div>
          <div className={styles.phoneWrap}>
            <p className={styles.phoneLabel}>Seu WhatsApp para confirmação</p>
            <input
              type="tel"
              className={styles.phoneInput}
              placeholder="(21) 9 0000-0000"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
          </div>
          {erro && <p className={styles.erroMsg}>{erro}</p>}
          <div className={styles.btnWrap}>
            <button
              className={styles.btnPrimary}
              disabled={phone.replace(/\D/g,'').length < 10 || loading}
              onClick={confirmar}
            >
              {loading ? 'Agendando...' : 'Agendar →'}
            </button>
          </div>
        </>
      )}

      {/* TELA 6 — SUCESSO */}
      {tela === 'sucesso' && (
        <>
          <div className={styles.successBox}>
            <span className={styles.successIcon}>✓</span>
            <h2 className={styles.successTitle}>Agendado!</h2>
            <p className={styles.successSub}>
              Seu horário está reservado. A loja entrará em contato pelo WhatsApp para confirmar.
            </p>
            <div className={styles.summaryCard} style={{ background: '#111', margin: '0 0 1rem' }}>
              <SummaryRow label="Serviço" value={servico} />
              <SummaryRow label="Loja"    value={loja?.nome ?? ''} />
              <SummaryRow label="Horário" value={`${formatDateShort(data)} · ${hora}`} />
            </div>
            {loja?.whatsapp && (
              <a href={wppLink()} target="_blank" rel="noopener noreferrer" className={styles.wppBtn}>
                <span>💬</span> Falar com a loja no WhatsApp
              </a>
            )}
          </div>
          <Footer />
        </>
      )}

    </div>
  )
}

function HeroContent() {
  return (
    <div className={styles.heroContent}>
      <p className={styles.heroOboticario}>o Boticário · Niterói</p>
      <div className={styles.heroGoldLine} />
      <h1 className={styles.heroTitle}>
        Studio <em>boti</em>
      </h1>
      <p className={styles.heroSub}>Experiência exclusiva</p>
    </div>
  )
}

function Step({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <div className={styles.step}>
      <div className={styles.stepNum}>{n}</div>
      <div>
        <strong>{title}</strong>
        <p>{desc}</p>
      </div>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.summaryRow}>
      <span className={styles.sumLabel}>{label}</span>
      <span className={styles.sumVal}>{value}</span>
    </div>
  )
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button className={styles.backBtn} onClick={onClick}>
      ← Voltar
    </button>
  )
}

function Footer() {
  return (
    <div className={styles.footer}>
      <p>Studio Boti · O Boticário Niterói</p>
    </div>
  )
}
