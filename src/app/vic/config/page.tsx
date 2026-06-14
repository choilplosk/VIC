import { sql } from '@/lib/db'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import ConfigClient from './ConfigClient'

export default async function ConfigPage() {
  const cookieStore = await cookies()
  const email = cookieStore.get('user_email')?.value
  if (!email) redirect('/login')

  const [usuario] = await sql`
    SELECT u.id, u.nome, u.perfil, u.loja_id
    FROM usuarios_vic u
    WHERE u.email = ${email} AND u.ativo = TRUE LIMIT 1
  `

  if (!usuario) redirect('/login')
  // Apenas admin, coordenadora e loja acessam config
  if (!['admin','coordenadora','loja','atendente'].includes(String(usuario.perfil))) redirect('/vic/agenda')

  const perfil = String(usuario.perfil)
  const lojaId = usuario.loja_id ? String(usuario.loja_id) : null

  const tiers = await sql`
    SELECT nivel, valor_minimo, duracao_minutos, servicos, ativo
    FROM configuracoes_tier
    ORDER BY CASE nivel
      WHEN 'bronze' THEN 1 WHEN 'prata' THEN 2
      WHEN 'ouro'   THEN 3 WHEN 'diamante' THEN 4
    END
  `

  const [sistema] = await sql`
    SELECT validade_dias, aviso_expiracao_dias, reagendamentos_max
    FROM configuracoes_sistema WHERE id = 1
  `

  // Admin/coordenadora vê todas as lojas; loja vê só a própria
  const lojas = perfil === 'admin' || perfil === 'coordenadora'
    ? await sql`SELECT id, nome, bairro, endereco, tipo, whatsapp, ativa FROM lojas ORDER BY tipo, bairro, nome`
    : await sql`SELECT id, nome, bairro, endereco, tipo, whatsapp, ativa FROM lojas WHERE id = ${lojaId}`

  const usuarios = await sql`
    SELECT u.id, u.nome, u.email, u.perfil, u.ativo, l.nome AS loja_nome
    FROM usuarios_vic u
    LEFT JOIN lojas l ON l.id = u.loja_id
    ORDER BY u.nome
  `

  // Horários: admin/coordenadora vê todos; loja vê só o próprio
  const horarios = perfil === 'admin' || perfil === 'coordenadora'
    ? await sql`SELECT loja_id, dia, hora_inicio, hora_fim, intervalo_min, ativo FROM horarios_loja ORDER BY loja_id, dia`
    : await sql`SELECT loja_id, dia, hora_inicio, hora_fim, intervalo_min, ativo FROM horarios_loja WHERE loja_id = ${lojaId} ORDER BY dia`

  return (
    <ConfigClient
      usuario={{ id: String(usuario.id), nome: String(usuario.nome), perfil, loja_id: lojaId }}
      tiersIniciais={tiers.map(t => ({
        nivel:           String(t.nivel),
        valor_minimo:    Number(t.valor_minimo),
        duracao_minutos: Number(t.duracao_minutos),
        servicos:        t.servicos as string[],
        ativo:           Boolean(t.ativo),
      }))}
      sistemaInicial={{
        validade_dias:        Number(sistema?.validade_dias ?? 30),
        aviso_expiracao_dias: Number(sistema?.aviso_expiracao_dias ?? 5),
        reagendamentos_max:   Number(sistema?.reagendamentos_max ?? 1),
      }}
      lojasIniciais={lojas.map(l => ({
        id:       String(l.id),
        nome:     String(l.nome),
        bairro:   String(l.bairro),
        endereco: String(l.endereco),
        tipo:     String(l.tipo),
        whatsapp: l.whatsapp ? String(l.whatsapp) : '',
        ativa:    Boolean(l.ativa),
      }))}
      usuariosIniciais={usuarios.map(u => ({
        id:        String(u.id),
        nome:      String(u.nome),
        email:     String(u.email),
        perfil:    String(u.perfil),
        ativo:     Boolean(u.ativo),
        loja_nome: u.loja_nome ? String(u.loja_nome) : null,
      }))}
      horariosIniciais={horarios.map(h => ({
        loja_id:        String(h.loja_id),
        dia:            String(h.dia),
        hora_inicio:    String(h.hora_inicio).slice(0, 5),
        hora_fim:       String(h.hora_fim).slice(0, 5),
        intervalo_min:  Number(h.intervalo_min),
        ativo:          Boolean(h.ativo),
      }))}
    />
  )
}
