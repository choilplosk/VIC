import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

// GET /api/vic/vouchers/[token]
// Rota PÚBLICA — o cliente acessa sem autenticação via link do voucher
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

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

  if (!voucher) {
    return NextResponse.json({ error: 'Voucher não encontrado' }, { status: 404 })
  }

  if (new Date(voucher.expira_em) < new Date()) {
    await sql`
      UPDATE vouchers SET status = 'expirado'
      WHERE token = ${token} AND status = 'pendente'
    `
    return NextResponse.json({ error: 'Voucher expirado' }, { status: 410 })
  }

  if (voucher.status === 'utilizado') {
    return NextResponse.json({ error: 'Voucher já utilizado' }, { status: 409 })
  }

  return NextResponse.json({ voucher })
}
