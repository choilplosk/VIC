import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getUsuarioVIC } from '@/lib/auth'
import { gerarToken, calcularExpiracao, montarUrlVoucher } from '@/lib/utils'

// GET /api/vic/vouchers
// Lista vouchers do comercial logado (ou todos, se coordenadora)
export async function GET(req: NextRequest) {
  const usuario = await getUsuarioVIC(req)
  if (!usuario) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const pagina = parseInt(searchParams.get('pagina') ?? '1')
  const limite = parseInt(searchParams.get('limite') ?? '20')
  const offset = (pagina - 1) * limite

  // Coordenadora vê todos; comercial vê apenas os seus
  const rows = usuario.perfil === 'coordenadora'
    ? await sql`
        SELECT v.*, u.nome AS comercial_nome
        FROM vouchers v
        LEFT JOIN usuarios_vic u ON v.comercial_id = u.id
        ORDER BY v.criado_em DESC
        LIMIT ${limite} OFFSET ${offset}
      `
    : await sql`
        SELECT v.*, u.nome AS comercial_nome
        FROM vouchers v
        LEFT JOIN usuarios_vic u ON v.comercial_id = u.id
        WHERE v.comercial_id = ${usuario.id}
        ORDER BY v.criado_em DESC
        LIMIT ${limite} OFFSET ${offset}
      `

  return NextResponse.json({ vouchers: rows, pagina, limite })
}

// POST /api/vic/vouchers
// Cria um novo voucher e retorna o link exclusivo
export async function POST(req: NextRequest) {
  const usuario = await getUsuarioVIC(req)
  if (!usuario) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }


  const body = await req.json()
  const { cliente_nome, cliente_wpp, empresa_nome, produtos, valor_compra, nivel } = body

  // Validação básica
  if (!cliente_nome || !nivel) {
    return NextResponse.json(
      { error: 'cliente_nome e nivel são obrigatórios' },
      { status: 400 }
    )
  }

  // Busca configuração do tier para calcular expiração
  const [config] = await sql`
    SELECT validade_dias FROM configuracoes_sistema WHERE id = 1
  `
  const validade = config?.validade_dias ?? 30

  const token   = gerarToken()
  const expira  = calcularExpiracao(validade)

  const [voucher] = await sql`
    INSERT INTO vouchers (
      token, cliente_nome, cliente_wpp, empresa_nome,
      produtos, valor_compra, nivel, comercial_id, expira_em
    ) VALUES (
      ${token}, ${cliente_nome}, ${cliente_wpp}, ${empresa_nome ?? null},
      ${produtos ?? []}, ${valor_compra ?? null}, ${nivel}, ${usuario.id}, ${expira}
    )
    RETURNING *
  `

  return NextResponse.json({
    voucher,
    url: montarUrlVoucher(token)
  }, { status: 201 })
}
