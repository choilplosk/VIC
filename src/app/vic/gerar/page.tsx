import { sql } from '@/lib/db'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import GeradorClient from './GeradorClient'

export default async function GeradorPage() {
  // Valida acesso via cookie do portal
  const cookieStore = await cookies()
  const email = cookieStore.get('user_email')?.value

  if (!email) redirect('/login')

  // Busca usuário VIC
  const [usuario] = await sql`
    SELECT id, nome, perfil FROM usuarios_vic
    WHERE email = ${email} AND ativo = TRUE
    LIMIT 1
  `

  if (!usuario) redirect('/login')
  if (usuario.perfil === 'atendente') redirect('/vic/agenda')

  // Busca configurações de tier
  const tiers = await sql`
    SELECT nivel, valor_minimo, duracao_minutos, servicos
    FROM configuracoes_tier
    WHERE ativo = TRUE
    ORDER BY
      CASE nivel
        WHEN 'bronze'   THEN 1
        WHEN 'prata'    THEN 2
        WHEN 'ouro'     THEN 3
        WHEN 'diamante' THEN 4
      END
  `

  // Busca vouchers recentes do usuário (ou todos se coordenadora)
  const vouchers = usuario.perfil === 'coordenadora'
    ? await sql`
        SELECT v.*, u.nome AS comercial_nome
        FROM vouchers v
        LEFT JOIN usuarios_vic u ON v.comercial_id = u.id
        ORDER BY v.criado_em DESC LIMIT 30
      `
    : await sql`
        SELECT v.*, u.nome AS comercial_nome
        FROM vouchers v
        LEFT JOIN usuarios_vic u ON v.comercial_id = u.id
        WHERE v.comercial_id = ${usuario.id}
        ORDER BY v.criado_em DESC LIMIT 30
      `

  return (
    <GeradorClient
      usuario={{ id: String(usuario.id), nome: String(usuario.nome), perfil: String(usuario.perfil) }}
      tiers={tiers.map(t => ({
        nivel:           String(t.nivel),
        valor_minimo:    Number(t.valor_minimo),
        duracao_minutos: Number(t.duracao_minutos),
        servicos:        t.servicos as string[],
      }))}
      vouchersIniciais={vouchers.map(v => ({
        id:             String(v.id),
        cliente_nome:   String(v.cliente_nome),
        empresa_nome:   v.empresa_nome ? String(v.empresa_nome) : null,
        nivel:          String(v.nivel),
        status:         String(v.status),
        expira_em:      String(v.expira_em),
        criado_em:      String(v.criado_em),
        comercial_nome: v.comercial_nome ? String(v.comercial_nome) : null,
      }))}
    />
  )
}
