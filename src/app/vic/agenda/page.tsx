import { sql } from '@/lib/db'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import AgendaClient from './AgendaClient'

export default async function AgendaPage() {
  const cookieStore = await cookies()
  const email = cookieStore.get('user_email')?.value
  if (!email) redirect('/login')

  const [usuario] = await sql`
    SELECT u.id, u.nome, u.perfil, u.loja_id,
           l.nome AS loja_nome, l.bairro AS loja_bairro, l.whatsapp AS loja_wpp
    FROM usuarios_vic u
    LEFT JOIN lojas l ON l.id = u.loja_id
    WHERE u.email = ${email} AND u.ativo = TRUE
    LIMIT 1
  `

  if (!usuario) redirect('/login')
  if (usuario.perfil === 'comercial') redirect('/vic/gerar')

  const isAdmin = usuario.perfil === 'coordenadora'

  const todasLojas = await sql`
    SELECT id, nome, bairro FROM lojas
    WHERE tipo = 'vic' AND ativa = TRUE
    ORDER BY bairro, nome
  `

  const lojaId = isAdmin
    ? String(todasLojas[0]?.id ?? '')
    : String(usuario.loja_id ?? '')

  const hoje = new Date().toISOString().split('T')[0]

  const agendamentos = await sql`
    SELECT * FROM v_agendamentos_completo
    WHERE loja_id = ${lojaId} AND data = ${hoje}
    ORDER BY hora ASC
  `

  const bloqueios = await sql`
    SELECT hora::TEXT AS hora FROM bloqueios_agenda
    WHERE loja_id = ${lojaId} AND data = ${hoje}
  `

  const [stats] = await sql`
    SELECT
      COUNT(*)                                           AS total,
      COUNT(*) FILTER (WHERE status = 'confirmado')     AS confirmados,
      COUNT(*) FILTER (WHERE status = 'concluido')      AS concluidos,
      COUNT(*) FILTER (WHERE status = 'nao_compareceu') AS faltas
    FROM agendamentos
    WHERE loja_id = ${lojaId} AND data = ${hoje}
  `

  return (
    <AgendaClient
      usuario={{
        id:          String(usuario.id),
        nome:        String(usuario.nome),
        perfil:      String(usuario.perfil),
        loja_id:     lojaId,
        loja_nome:   usuario.loja_nome ? String(usuario.loja_nome) : '',
        loja_bairro: usuario.loja_bairro ? String(usuario.loja_bairro) : '',
        loja_wpp:    usuario.loja_wpp ? String(usuario.loja_wpp) : null,
      }}
      todasLojas={todasLojas.map(l => ({
        id: String(l.id), nome: String(l.nome), bairro: String(l.bairro)
      }))}
      agendamentosIniciais={agendamentos.map(a => ({
        agendamento_id:     String(a.agendamento_id),
        data:               String(a.data),
        hora:               String(a.hora).slice(0, 5),
        servico:            String(a.servico),
        agendamento_status: String(a.agendamento_status),
        cliente_nome:       String(a.cliente_nome),
        cliente_wpp:        String(a.cliente_wpp),
        nivel:              String(a.nivel),
        produtos:           a.produtos as string[],
        empresa_nome:       a.empresa_nome ? String(a.empresa_nome) : null,
        loja_nome:          String(a.loja_nome),
        loja_wpp:           a.loja_wpp ? String(a.loja_wpp) : null,
        comercial_nome:     a.comercial_nome ? String(a.comercial_nome) : null,
      }))}
      bloqueiosIniciais={bloqueios.map(b => String(b.hora ?? '').slice(0, 5))}
      statsIniciais={{
        total:       Number(stats?.total ?? 0),
        confirmados: Number(stats?.confirmados ?? 0),
        concluidos:  Number(stats?.concluidos ?? 0),
        faltas:      Number(stats?.faltas ?? 0),
      }}
      dataInicial={hoje}
    />
  )
}
