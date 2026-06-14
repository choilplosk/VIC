import { neon } from '@neondatabase/serverless'

// DATABASE_URL pode não estar disponível em build time — falha apenas em runtime se ausente
export const sql = neon(process.env.DATABASE_URL ?? 'postgresql://build-placeholder')
