'use client'

import { useState } from 'react'
import VicNav from '../VicNav'
import styles from './gerar.module.css'

interface Usuario { id: string; nome: string; perfil: string }

interface Tier {
  nivel: string
  valor_minimo: number
  duracao_minutos: number
  servicos: string[]
}

interface VoucherHistorico {
  id: string; cliente_nome: string; empresa_nome: string | null
  nivel: string; status: string; expira_em: string
  criado_em: string; comercial_nome: string | null
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
const STATUS_COLOR: Record<string, string> = {
  pendente: '#C9A96E', agendado: '#3d8a65',
  utilizado: '#4a90c4', expirado: '#bbb', cancelado: '#bbb'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function GeradorClient({ usuario, tiers, vouchersIniciais }: Props) {
  const [aba, setAba]           = useState<'novo' | 'historico'>('novo')
  const [nome, setNome]         = useState('')
  const [empresa, setEmpresa]   = useState('')
  const [nivel, setNivel]       = useState('')
  const [servico, setServico]   = useState('')
  const [valor, setValor]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [linkGerado, setLinkGerado] = useState('')
  const [copiado, setCopiado]   = useState(false)
  const [vouchers, setVouchers] = useState(vouchersIniciais)

  const tierSel = tiers.find(t => t.nivel === nivel)
  const valido  = nome.trim() && empresa.trim() && nivel && servico && valor

  function selecionarNivel(n: string) {
    setNivel(n)
    setServico('')
    const t = tiers.find(t => t.nivel === n)
    setValor(t ? String(t.valor_minimo) : '')
  }

  async function gerar() {
    if (!valido) return
    setLoading(true)
    try {
      const res = await fetch('/api/vic/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_nome:  nome.trim(),
          empresa_nome:  empresa.trim(),
          nivel,
          produtos:      [servico],
          valor_compra:  parseFloat(valor),
        }),
      })
      const data = await res.json()
      console.log('[VIC gerar] resposta:', JSON.stringify(data))
      const voucherToken = data.voucher?.token ?? data.token
      if (voucherToken) {
        const url = `${window.location.origin}/vic/${voucherToken}`
        setLinkGerado(url)
        setVouchers(prev => [{
          id:            String(data.voucher?.id ?? ''),
          cliente_nome:  nome.trim(),
          empresa_nome:  empresa.trim(),
          nivel,
          status:        'pendente',
          expira_em:     String(data.voucher?.expira_em ?? ''),
          criado_em:     new Date().toISOString(),
          comercial_nome: usuario.nome,
        }, ...prev])
        setNome(''); setEmpresa(''); setNivel(''); setServico(''); setValor('')
      }
    } finally {
      setLoading(false)
    }
  }

  function copiar() {
    navigator.clipboard.writeText(linkGerado)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  function abrirWpp() {
    const msg = encodeURIComponent(
      `Olá! 🌿 Você recebeu um voucher exclusivo do Studio Boti.\n\nAcesse e agende seu atendimento:\n${linkGerado}`
    )
    window.open(`https://wa.me/?text=${msg}`, '_blank')
  }

  return (
    <div className={styles.root}>
      <VicNav perfil={usuario.perfil} nome={usuario.nome} />

      <div className={styles.body}>
        <div className={styles.abas}>
          <button
            className={`${styles.aba} ${aba === 'novo' ? styles.abaOn : ''}`}
            onClick={() => setAba('novo')}
          >
            Novo voucher
          </button>
          <button
            className={`${styles.aba} ${aba === 'historico' ? styles.abaOn : ''}`}
            onClick={() => setAba('historico')}
          >
            Histórico ({vouchers.length})
          </button>
        </div>

        {aba === 'novo' && (
          <div className={styles.card}>

            <div className={styles.section}>
              <div className={styles.sectionLabel}>Cliente</div>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.label}>Nome completo</label>
                  <input
                    className={styles.input}
                    placeholder="Nome da cliente"
                    value={nome}
                    onChange={e => setNome(e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Empresa</label>
                  <input
                    className={styles.input}
                    placeholder="Empresa de origem"
                    value={empresa}
                    onChange={e => setEmpresa(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className={styles.section}>
              <div className={styles.sectionLabel}>Serviço</div>
              <div className={styles.tierGrid}>
                {tiers.map(t => (
                  <div
                    key={t.nivel}
                    className={`${styles.tierCard} ${nivel === t.nivel ? styles.tierSel : ''}`}
                    style={{ borderTopColor: TIER_COLOR[t.nivel] }}
                    onClick={() => selecionarNivel(t.nivel)}
                  >
                    <div className={styles.tierNome} style={{ color: TIER_COLOR[t.nivel] }}>
                      ◆ {TIER_LABEL[t.nivel]}
                    </div>
                    <div className={styles.tierSvcs}>
                      {t.servicos.slice(0, 3).map((s, i) => (
                        <span key={i} className={styles.tierSvcTag}>{s}</span>
                      ))}
                      {t.servicos.length > 3 && (
                        <span className={styles.tierSvcMore}>+{t.servicos.length - 3}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {tierSel && tierSel.servicos.length > 0 && (
                <div className={styles.svcSelectWrap}>
                  <label className={styles.label}>Serviço específico</label>
                  <select
                    className={styles.svcSelect}
                    value={servico}
                    onChange={e => setServico(e.target.value)}
                  >
                    <option value="">Selecione o serviço...</option>
                    {tierSel.servicos.map((s, i) => (
                      <option key={i} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              )}

              {nivel && (
                <div className={styles.valorWrap}>
                  <label className={styles.label}>Valor do voucher</label>
                  <div className={styles.valorRow}>
                    <span className={styles.valorPrefix}>R$</span>
                    <input
                      className={styles.valorInput}
                      type="number"
                      step="0.01"
                      min="0"
                      value={valor}
                      onChange={e => setValor(e.target.value)}
                    />
                  </div>
                  <p className={styles.valorNota}>Valor exibido ao cliente como benefício recebido</p>
                </div>
              )}
            </div>

            {linkGerado && (
              <div className={styles.linkBox}>
                <div className={styles.linkTitle}>✓ Voucher gerado!</div>
                <div className={styles.linkFieldRow}>
                  <input
                    className={styles.linkField}
                    readOnly
                    value={linkGerado}
                    onFocus={e => e.target.select()}
                    onClick={e => (e.target as HTMLInputElement).select()}
                  />
                  <button className={styles.btnCopiar} onClick={copiar}>
                    {copiado ? '✓ Copiado!' : 'Copiar'}
                  </button>
                </div>
                <button className={styles.btnWpp} style={{width:'100%',marginTop:8}} onClick={abrirWpp}>
                  Enviar pelo WhatsApp
                </button>
              </div>
            )}

            <button className={styles.btnGerar} disabled={!valido || loading} onClick={gerar}>
              {loading ? 'Gerando...' : 'Gerar link do voucher'}
            </button>
          </div>
        )}

        {aba === 'historico' && (
          <div className={styles.card}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Empresa</th>
                  <th>Nível</th>
                  <th>Comercial</th>
                  <th>Expira</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {vouchers.length === 0 && (
                  <tr><td colSpan={6} className={styles.vazio}>Nenhum voucher emitido ainda.</td></tr>
                )}
                {vouchers.map(v => (
                  <tr key={v.id}>
                    <td className={styles.tdNome}>{v.cliente_nome}</td>
                    <td className={styles.tdSub}>{v.empresa_nome ?? '—'}</td>
                    <td>
                      <span style={{ color: TIER_COLOR[v.nivel], fontWeight: 500, fontSize: 12 }}>
                        {TIER_LABEL[v.nivel] ?? v.nivel}
                      </span>
                    </td>
                    <td className={styles.tdSub}>{v.comercial_nome ?? '—'}</td>
                    <td className={styles.tdSub}>{v.expira_em ? formatDate(v.expira_em) : '—'}</td>
                    <td>
                      <span className={styles.status} style={{ color: STATUS_COLOR[v.status] ?? '#888' }}>
                        {STATUS_LABEL[v.status] ?? v.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
