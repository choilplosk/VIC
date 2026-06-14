import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getUsuarioVIC } from '@/lib/auth'
import { gerarToken, calcularExpiracao, montarUrlVoucher } from '@/lib/utils'

export async function GET(req: NextRequest) {
  const usuario = await getUsuarioVIC(req)
  if (!usuario) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const pagina = parseInt(searchParams.get('pagina') ?? '1')
  const limite = parseInt(searchParams.get('limite') ?? '20')
  const offset = (pagina - 1) * limite

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

export async function POST(req: NextRequest) {
  const usuario = await getUsuarioVIC(req)
  if (!usuario) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { cliente_nome, empresa_nome, produtos, valor_compra, nivel } = body

  if (!cliente_nome || !nivel) {
    return NextResponse.json(
      { error: 'cliente_nome e nivel são obrigatórios' },
      { status: 400 }
    )
  }

  try {
    const [config] = await sql`
      SELECT validade_dias FROM configuracoes_sistema WHERE id = 1
    `
    const validade = Number(config?.validade_dias ?? 30)
    const token  = gerarToken()
    const expira = calcularExpiracao(validade)

    const produtosArr = Array.isArray(produtos) ? produtos as string[] : []

    const [voucher] = await sql`
      INSERT INTO vouchers (
        token, cliente_nome, cliente_wpp, empresa_nome,
        produtos, valor_compra, nivel, comercial_id, expira_em
      ) VALUES (
        ${token},
        ${String(cliente_nome)},
        ${''},
        ${empresa_nome ? String(empresa_nome) : null},
        ${produtosArr},
        ${valor_compra ? Number(valor_compra) : null},
        ${String(nivel)}::tier_nivel,
        ${usuario.id}::uuid,
        ${expira}
      )
      RETURNING id, token, cliente_nome, empresa_nome, nivel::text, status::text, expira_em, criado_em
    `

    return NextResponse.json({ token, voucher, url: montarUrlVoucher(token) }, { status: 201 })
  } catch (err) {
    console.error('[VIC vouchers POST]', err)
    return NextResponse.json({ error: 'Erro ao criar voucher', detail: String(err) }, { status: 500 })
  }
}
