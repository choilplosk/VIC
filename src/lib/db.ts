import { neon, NeonQueryFunction } from '@neondatabase/serverless'

// Inicialização lazy — o cliente só é criado quando uma query é executada
// Isso evita erros em build time quando DATABASE_URL não está disponível
let _sql: NeonQueryFunction<false, false> | null = null

function getClient(): NeonQueryFunction<false, false> {
  if (!_sql) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL não definida nas variáveis de ambiente')
    _sql = neon(url)
  }
  return _sql
}

// sql é uma função tagged template que inicializa o cliente lazily
export const sql: NeonQueryFunction<false, false> = ((...args: Parameters<NeonQueryFunction<false, false>>) => {
  return getClient()(...args)
}) as NeonQueryFunction<false, false>
