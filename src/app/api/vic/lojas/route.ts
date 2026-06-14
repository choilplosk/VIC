export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

// GET /api/vic/lojas
// Rota PÚBLICA — retorna lojas VIC ativas (para o cliente escolher no voucher)
// Query param: ?tipo=vic|atacado (padrão: vic)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tipo = searchParams.get('tipo') ?? 'vic'

  const lojas = await sql`
    SELECT id, nome, bairro, endereco, whatsapp, tipo
    FROM lojas
    WHERE ativa = TRUE
      AND tipo = ${tipo}
    ORDER BY bairro, nome
  `

  return NextResponse.json({ lojas })
}
