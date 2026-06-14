import { sql } from '@/lib/db'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function VicPage() {
  const cookieStore = await cookies()
  const email = cookieStore.get('user_email')?.value
  if (!email) redirect('/login')

  const rows = await sql`
    SELECT id, email, perfil::text AS perfil, ativo 
    FROM usuarios_vic
    WHERE email = ${email} AND ativo = TRUE
    LIMIT 1
  `

  console.log('[VIC page] email:', email, 'rows:', JSON.stringify(rows))

  const usuario = rows[0]
  if (!usuario) redirect('/login')

  const perfil = String(usuario.perfil)
  console.log('[VIC page] perfil lido:', perfil)

  if (perfil === 'coordenadora') redirect('/vic/dashboard')
  if (perfil === 'comercial') redirect('/vic/gerar')
  redirect('/vic/agenda')
}
