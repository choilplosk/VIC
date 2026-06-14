'use client'
import { useState } from 'react'

export default function LoginVicPage() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  async function entrar() {
    if (!email || !senha) { setErro('Preencha email e senha.'); return }
    setLoading(true); setErro('')
    try {
      const res = await fetch('/api/vic/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      })
      const data = await res.json()
      if (res.ok && data.dest) {
        window.location.href = data.dest
      } else {
        setErro(data.error || 'Erro ao fazer login.')
        setLoading(false)
      }
    } catch {
      setErro('Erro de conexão.')
      setLoading(false)
    }
  }

  return (
    <div style={{ background:'#0e0e0e', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Inter,sans-serif' }}>
      <div style={{ width:'100%', maxWidth:360, padding:20 }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ fontSize:10, letterSpacing:'0.24em', textTransform:'uppercase', color:'rgba(255,255,255,0.5)', marginBottom:10 }}>o Boticário · Niterói</div>
          <div style={{ fontFamily:'Georgia,serif', fontSize:28, color:'#fff' }}>Studio<em style={{color:'#C9A96E'}}>Boti</em></div>
          <div style={{ width:32, height:1, background:'#C9A96E', margin:'12px auto 0' }}></div>
        </div>
        <div style={{ background:'#181818', border:'0.5px solid #2a2a2a', borderRadius:12, padding:'28px 24px' }}>
          <div style={{ marginBottom:16 }}>
            <label style={{ display:'block', fontSize:11, color:'#555', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              style={{ width:'100%', background:'#111', border:'0.5px solid #333', borderRadius:8, padding:'12px 14px', color:'#f5f0eb', fontSize:14, outline:'none', fontFamily:'Inter,sans-serif' }}
              onKeyDown={e => e.key === 'Enter' && entrar()}
            />
          </div>
          <div style={{ marginBottom:16 }}>
            <label style={{ display:'block', fontSize:11, color:'#555', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>Senha</label>
            <input
              type="password" value={senha} onChange={e => setSenha(e.target.value)}
              placeholder="••••••••"
              style={{ width:'100%', background:'#111', border:'0.5px solid #333', borderRadius:8, padding:'12px 14px', color:'#f5f0eb', fontSize:14, outline:'none', fontFamily:'Inter,sans-serif' }}
              onKeyDown={e => e.key === 'Enter' && entrar()}
            />
          </div>
          {erro && (
            <div style={{ background:'rgba(226,75,74,0.1)', border:'0.5px solid rgba(226,75,74,0.3)', borderRadius:8, padding:'10px 12px', fontSize:12, color:'#E24B4A', marginBottom:12 }}>
              {erro}
            </div>
          )}
          <button
            onClick={entrar} disabled={loading}
            style={{ width:'100%', background:'#3d8a65', border:'none', borderRadius:10, padding:14, fontFamily:'Georgia,serif', fontSize:15, color:'#fff', cursor:'pointer', opacity: loading ? 0.5 : 1 }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </div>
      </div>
    </div>
  )
}
