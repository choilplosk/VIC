import { sql } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/vic/cron/expirar
// Rodar via Vercel Cron diariamente às 3h
// vercel.json: { "crons": [{ "path": "/api/vic/cron/expirar", "schedule": "0 3 * * *" }] }
export async function GET() {
  const [result] = await sql`SELECT expirar_vouchers_vencidos() AS total`
  return NextResponse.json({ expirados: result.total, executado_em: new Date().toISOString() })
}
