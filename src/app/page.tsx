import { cookies } from 'next/headers'
import { sql } from '@/lib/db'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function Home({ searchParams }: { searchParams: Promise<{ sso?: string }> }) {
  const cookieStore = await cookies()
  const params = await searchParams
  const ssoToken = params.sso

  // SSO do Agregador
  if (ssoToken) {
    let ssoEmail: string | null = null
    let ssoPerfil: string | null = null

    try {
      const res = await fetch('https://www.boticarioniteroi.com.br/api/sso/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: ssoToken }),
        cache: 'no-store',
      })
      const data = await res.json()
      if (data.valid && data.email) {
        const perfilMap: Record<string, string> = {
          admin:   'coordenadora',
          gerente: 'coordenadora',
          loja:    'atendente',
        }
        ssoEmail = data.email
        ssoPerfil = perfilMap[data.perfil] || 'atendente'
      }
    } catch (e) {
      console.error('SSO error:', e)
    }

    if (ssoEmail && ssoPerfil) {
      const store = await cookies()
      store.set('user_email', ssoEmail, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 8,
        path: '/',
      })
      const perfilRoutes: Record<string, string> = {
        coordenadora: '/vic/dashboard',
        atendente:    '/vic/agenda',
        comercial:    '/vic/gerar',
      }
      redirect(perfilRoutes[ssoPerfil] || '/vic/agenda')
    }
  }

  // Login normal por cookie
  const email = cookieStore.get('user_email')?.value
  if (email) {
    const [usuario] = await sql`
      SELECT perfil FROM usuarios_vic
      WHERE email = ${email} AND ativo = TRUE LIMIT 1
    `
    if (usuario) {
      if (String(usuario.perfil) === 'coordenadora') redirect('/vic/dashboard')
      if (String(usuario.perfil) === 'atendente')    redirect('/vic/agenda')
      if (String(usuario.perfil) === 'comercial')    redirect('/vic/gerar')
    }
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: '#111111',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Inter, sans-serif',
      padding: '2rem',
      textAlign: 'center',
    }}>
      <div style={{
        background: '#3d8a65',
        borderRadius: '50%',
        width: 80, height: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '1.5rem',
        fontSize: '2rem',
      }}>
        🌿
      </div>

      <h1 style={{
        fontFamily: 'Playfair Display, serif',
        fontSize: '2.2rem',
        color: '#fff',
        fontWeight: 400,
        marginBottom: '0.4rem',
        lineHeight: 1.1,
      }}>
        Studio <em style={{ fontStyle: 'italic', color: '#C9A96E' }}>boti</em>
      </h1>

      <p style={{
        fontSize: '0.65rem',
        letterSpacing: '0.25em',
        textTransform: 'uppercase',
        color: '#5a5a5a',
        marginBottom: '2rem',
      }}>
        VIC · Vendas In Company · O Boticário Niterói
      </p>

      <div style={{ width: 32, height: 1, background: '#C9A96E', marginBottom: '2rem' }} />

      <p style={{
        fontSize: '0.85rem',
        color: '#5a5a5a',
        maxWidth: 320,
        lineHeight: 1.6,
        marginBottom: '2rem',
      }}>
        Acesse o sistema pelo portal O Boticário Niterói ou utilize o link do seu voucher exclusivo.
      </p>

      <a href="https://boticarioniteroi.com.br" style={{
        display: 'inline-block',
        background: '#8DB8A0',
        color: '#111111',
        borderRadius: 8,
        padding: '12px 28px',
        fontSize: '0.82rem',
        fontWeight: 500,
        textDecoration: 'none',
        letterSpacing: '0.04em',
      }}>
        Acessar o portal →
      </a>

      <p style={{
        fontSize: '0.6rem',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: '#2a2a2a',
        marginTop: '3rem',
      }}>
        Studio Boti · O Boticário Niterói
      </p>
    </main>
  )
}
