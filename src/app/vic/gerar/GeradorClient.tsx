'use client'

import { useState } from 'react'
import styles from './gerar.module.css'

interface Usuario { id: string; nome: string; perfil: string }

interface Tier {
  nivel: string
  valor_minimo: number
  duracao_minutos: number
  servicos: string[]
}

interface VoucherHistorico {
  id: string
  cliente_nome: string
  empresa_nome: string | null
  nivel: string
  status: string
  expira_em: string
  criado_em: string
  comercial_nome: string | null
}

interface Props {
  usuario: Usuario
  tiers: Tier[]
  vouchersIniciais: VoucherHistorico[]
}

const TIER_LABEL: Record<string, string> = {
  bronze: 'Bronze', prata: 'Prata', ouro: 'Ouro', diamante: 'Diamante'
}

const TIER_COLOR: Record<string, string> = {
  bronze: '#CD7F32', prata: '#9a9a9a', ouro: '#C9A96E', diamante: '#4a90c4'
}

const STATUS_LABEL: Record<string, string> = {
  pendente: 'Aguardando', agendado: 'Agendado',
  utilizado: 'Utilizado', expirado: 'Expirado', cancelado: 'Cancelado'
}

const STATUS_CLASS: Record<string, string> = {
  pendente: 'statusPendente', agendado: 'statusAgendado',
  utilizado: 'statusUtilizado', expirado: 'statusExpirado', cancelado: 'statusExpirado'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function GeradorClient({ usuario, tiers, vouchersIniciais }: Props) {
  const [aba, setAba]             = useState<'novo'|'historico'>('novo')
  const [nome, setNome]           = useState('')
  const [wpp, setWpp]             = useState('')
  const [empresa, setEmpresa]     = useState('')
  const [valor, setValor]         = useState('')
  const [produtos, setProdutos]   = useState<string[]>([])
  const [prodInput, setProdInput] = useState('')
  const [tier, setTier]           = useState('')
  const [loading, setLoading]     = useState(false)
  const [linkGerado, setLinkGerado] = useState('')
  const [copiado, setCopiado]     = useState(false)
  const [vouchers, setVouchers]   = useState(vouchersIniciais)

  const iniciais = usuario.nome.split(' ').map(n => n[0]).slice(0, 2).join('')
  const tierSel  = tiers.find(t => t.nivel === tier)
  const valido   = nome && tier && valor

  function addProduto() {
    if (!prodInput.trim()) return
    setProdutos(p => [...p, prodInput.trim()])
    setProdInput('')
  }

  function removeProduto(i: number) {
    setProdutos(p => p.filter((_, idx) => idx !== i))
  }

  function limpar() {
    setNome(''); setWpp(''); setEmpresa(''); setValor('')
    setProdutos([]); setProdInput(''); setTier(''); setLinkGerado('')
  }

  async function gerar() {
    if (!valido) return
    setLoading(true)
    try {
      const res = await fetch('/api/vic/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_nome: nome,
          cliente_wpp:  wpp.replace(/\D/g, ''),
          empresa_nome: empresa || null,
          produtos,
          valor_compra: parseFloat(valor),
          nivel:        tier,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setLinkGerado(data.url)
        // Adiciona ao histórico local
        setVouchers(v => [{
          id: data.voucher.id,
          cliente_nome: nome,
          empresa_nome: empresa || null,
          nivel: tier,
          status: 'pendente',
          expira_em: data.voucher.expira_em,
          criado_em: data.voucher.criado_em,
          comercial_nome: usuario.nome,
        }, ...v])
      }
    } finally {
      setLoading(false)
    }
  }

  async function copiar() {
    await navigator.clipboard.writeText(linkGerado)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  function enviarWpp() {
    const num = wpp.replace(/\D/g, '')
    const msg = encodeURIComponent(
      `Olá, ${nome}! 🌿 Sua experiência exclusiva no Studio Boti está pronta.\n` +
      `Acesse seu voucher e agende seu atendimento: ${linkGerado}`
    )
    const url = num ? `https://wa.me/55${num}?text=${msg}` : `https://wa.me/?text=${msg}`
    window.open(url, '_blank')
  }

  return (
    <div className={styles.root}>

      {/* TOPBAR */}
      <div className={styles.topbar}>
        <div className={styles.topbarLeft}>
          <span className={styles.brand}>VIC <em>·</em> Studio boti</span>
          <span className={styles.tag}>Comercial</span>
        </div>
        <div className={styles.topbarUser}>
          <div className={styles.avatar}>{iniciais}</div>
          {usuario.nome.split(' ')[0]}
        </div>
      </div>

      <div className={styles.body}>

        {/* ABAS */}
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${aba === 'novo' ? styles.tabActive : ''}`} onClick={() => setAba('novo')}>
            Novo voucher
          </button>
          <button className={`${styles.tab} ${aba === 'historico' ? styles.tabActive : ''}`} onClick={() => setAba('historico')}>
            Histórico ({vouchers.length})
          </button>
        </div>

        {/* ABA NOVO */}
        {aba === 'novo' && !linkGerado && (
          <>
            <h1 className={styles.pageTitle}>Gerar voucher VIC</h1>
            <p className={styles.pageSub}>Preencha os dados da cliente e da venda para gerar o link exclusivo.</p>

            {/* DADOS DA CLIENTE */}
            <div className={styles.card}>
              <div className={styles.cardTitle}>
                <span>👤</span> Dados da cliente
              </div>
              <div className={styles.grid2}>
                <div className={styles.field}>
                  <label className={styles.label}>Nome completo</label>
                  <input className={styles.input} placeholder="Ex: Maria Clara" value={nome} onChange={e => setNome(e.target.value)} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>WhatsApp</label>
                  <input className={styles.input} type="tel" placeholder="(21) 9 0000-0000" value={wpp} onChange={e => setWpp(e.target.value)} />
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Empresa de origem</label>
                <input className={styles.input} placeholder="Ex: Prefeitura de Niterói" value={empresa} onChange={e => setEmpresa(e.target.value)} />
              </div>
            </div>

            {/* DADOS DA VENDA */}
            <div className={styles.card}>
              <div className={styles.cardTitle}>
                <span>🛍</span> Dados da venda
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Valor total da compra (R$)</label>
                <input className={styles.input} type="number" placeholder="Ex: 150.00" value={valor} onChange={e => setValor(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Produtos comprados</label>
                <div className={styles.produtosWrap}>
                  {produtos.map((p, i) => (
                    <span key={i} className={styles.prodTag}>
                      {p}
                      <button onClick={() => removeProduto(i)} aria-label={`Remover ${p}`}>✕</button>
                    </span>
                  ))}
                </div>
                <div className={styles.addRow}>
                  <input
                    className={styles.addInput}
                    placeholder="Digite o produto e pressione +"
                    value={prodInput}
                    onChange={e => setProdInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addProduto()}
                  />
                  <button className={styles.addBtn} onClick={addProduto}>+ Adicionar</button>
                </div>
              </div>
            </div>

            {/* NÍVEL */}
            <div className={styles.card}>
              <div className={styles.cardTitle}>
                <span>💎</span> Nível do voucher
              </div>
              <p className={styles.label} style={{ marginBottom: 8 }}>Selecione conforme o valor da compra</p>
              <div className={styles.tierGrid}>
                {tiers.map(t => (
                  <div
                    key={t.nivel}
                    className={`${styles.tierBtn} ${tier === t.nivel ? styles.tierSel : ''}`}
                    style={tier === t.nivel ? { borderColor: TIER_COLOR[t.nivel] } : {}}
                    onClick={() => setTier(t.nivel)}
                  >
                    <div className={styles.tierIcon} style={{ color: TIER_COLOR[t.nivel] }}>◆</div>
                    <div className={styles.tierName}>{TIER_LABEL[t.nivel]}</div>
                    <div className={styles.tierMin}>a partir de R$ {t.valor_minimo.toLocaleString('pt-BR')}</div>
                    <div className={styles.tierSvc}>{t.servicos.join(', ')}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* PREVIEW */}
            {valido && (
              <div className={styles.preview}>
                <p className={styles.previewLabel}>Prévia do voucher</p>
                <PreviewRow label="Cliente"        value={nome} />
                <PreviewRow label="Empresa"        value={empresa || '—'} />
                <PreviewRow label="Valor da compra" value={valor ? `R$ ${parseFloat(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'} />
                <PreviewRow label="Nível"           value={tierSel ? `${TIER_LABEL[tier]} · ${tierSel.servicos[0]}` : '—'} />
                <PreviewRow label="Validade"        value="30 dias a partir de hoje" />
              </div>
            )}

            <div className={styles.actions}>
              <button className={styles.btnPrimary} disabled={!valido || loading} onClick={gerar}>
                ✦ {loading ? 'Gerando...' : 'Gerar voucher'}
              </button>
              <button className={styles.btnSecondary} onClick={limpar}>↺ Limpar</button>
            </div>
          </>
        )}

        {/* MODAL DE SUCESSO */}
        {aba === 'novo' && linkGerado && (
          <div className={styles.successWrap}>
            <div className={styles.successBanner}>
              <span className={styles.successIcon}>✓</span>
              <div>
                <p className={styles.successTitle}>Voucher gerado com sucesso!</p>
                <p className={styles.successSub}>O link exclusivo está pronto para ser enviado.</p>
              </div>
            </div>
            <p className={styles.label}>Link do voucher</p>
            <div className={styles.linkBox}>
              <span className={styles.linkText}>{linkGerado}</span>
              <button className={styles.copyBtn} onClick={copiar}>
                {copiado ? '✓ Copiado' : '⎘ Copiar'}
              </button>
            </div>
            <div className={styles.actions} style={{ marginTop: '1rem' }}>
              <button className={styles.btnWpp} onClick={enviarWpp}>
                💬 Enviar no WhatsApp
              </button>
              <button className={styles.btnSecondary} onClick={limpar}>
                + Novo voucher
              </button>
            </div>
          </div>
        )}

        {/* ABA HISTÓRICO */}
        {aba === 'historico' && (
          <>
            <h1 className={styles.pageTitle}>Vouchers emitidos</h1>
            <p className={styles.pageSub}>Acompanhe os vouchers gerados pela sua equipe.</p>
            {vouchers.length === 0 ? (
              <p className={styles.empty}>Nenhum voucher emitido ainda.</p>
            ) : (
              vouchers.map(v => (
                <div key={v.id} className={styles.histItem}>
                  <div className={styles.histAvatar}>
                    {v.cliente_nome.split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </div>
                  <div className={styles.histInfo}>
                    <p className={styles.histNome}>{v.cliente_nome}</p>
                    <p className={styles.histMeta}>
                      {v.empresa_nome ?? 'Sem empresa'} · {TIER_LABEL[v.nivel]} · {formatDate(v.criado_em)}
                    </p>
                  </div>
                  <span className={`${styles.statusBadge} ${styles[STATUS_CLASS[v.status]]}`}>
                    {STATUS_LABEL[v.status]}
                  </span>
                </div>
              ))
            )}
          </>
        )}

      </div>
    </div>
  )
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.previewRow}>
      <span className={styles.previewKey}>{label}</span>
      <span className={styles.previewVal}>{value}</span>
    </div>
  )
}
