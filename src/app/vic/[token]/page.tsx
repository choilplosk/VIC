import { notFound } from 'next/navigation'
import { sql } from '@/lib/db'
import VoucherClient from './VoucherClient'

interface Props {
  params: Promise<{ token: string }>
}

export default async function VoucherPage({ params }: Props) {
  const { token } = await params

  // Busca voucher e configuração do tier
  const [voucher] = await sql`
    SELECT
      v.id, v.token, v.cliente_nome, v.nivel,
      v.status, v.expira_em, v.criado_em,
      ct.servicos, ct.duracao_minutos
    FROM vouchers v
    JOIN configuracoes_tier ct ON ct.nivel = v.nivel
    WHERE v.token = ${token}
    LIMIT 1
  `

  if (!voucher) notFound()

  // Marca como expirado se necessário
  if (new Date(voucher.expira_em) < new Date() && voucher.status === 'pendente') {
    await sql`
      UPDATE vouchers SET status = 'expirado', atualizado_em = NOW()
      WHERE token = ${token}
    `
    voucher.status = 'expirado'
  }

  // Busca lojas VIC ativas
  const lojas = await sql`
    SELECT id, nome, bairro, endereco, whatsapp
    FROM lojas
    WHERE ativa = TRUE AND tipo = 'vic'
    ORDER BY bairro, nome
  `

  return (
    <VoucherClient
      voucher={{
        id:              String(voucher.id),
        token:           String(voucher.token),
        cliente_nome:    String(voucher.cliente_nome),
        nivel:           voucher.nivel as string,
        status:          voucher.status as string,
        expira_em:       String(voucher.expira_em),
        servicos:        voucher.servicos as string[],
        duracao_minutos: Number(voucher.duracao_minutos),
      }}
      lojas={lojas.map(l => ({
        id:       String(l.id),
        nome:     String(l.nome),
        bairro:   String(l.bairro),
        endereco: String(l.endereco),
        whatsapp: l.whatsapp ? String(l.whatsapp) : null,
      }))}
    />
  )
}
