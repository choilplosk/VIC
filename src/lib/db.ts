import { neon, NeonQueryFunction } from '@neondatabase/serverless'

let _sql: NeonQueryFunction<false, false> | null = null

export function getSql(): NeonQueryFunction<false, false> {
  if (!_sql) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL não definida nas variáveis de ambiente')
    _sql = neon(url)
  }
  return _sql
}

// Proxy que inicializa lazily — mantém compatibilidade com o código existente
export const sql = new Proxy({} as NeonQueryFunction<false, false>, {
  get(_target, prop) {
    return getSql()[prop as keyof NeonQueryFunction<false, false>]
  },
  apply(_target, _thisArg, args) {
    return (getSql() as unknown as (...args: unknown[]) => unknown)(...args)
  }
}) as unknown as NeonQueryFunction<false, false>
