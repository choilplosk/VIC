export default function LoginVicPage() {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>VIC · Studio Boti — Login</title>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Inter:wght@300;400;500&display=swap" rel="stylesheet" />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: #0e0e0e; font-family: 'Inter', sans-serif; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
          .wrap { width: 100%; max-width: 360px; padding: 20px; }
          .hero { text-align: center; margin-bottom: 32px; }
          .brand { font-size: 10px; letter-spacing: 0.24em; text-transform: uppercase; color: rgba(255,255,255,0.5); margin-bottom: 10px; }
          .title { font-family: 'Playfair Display', serif; font-size: 28px; color: #fff; }
          .title em { color: #C9A96E; font-style: italic; }
          .gold-line { width: 32px; height: 1px; background: #C9A96E; margin: 12px auto 0; }
          .card { background: #181818; border: 0.5px solid #2a2a2a; border-radius: 12px; padding: 28px 24px; }
          .field { margin-bottom: 16px; }
          label { display: block; font-size: 11px; color: #555; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 6px; }
          input { width: 100%; background: #111; border: 0.5px solid #333; border-radius: 8px; padding: 12px 14px; color: #f5f0eb; font-size: 14px; font-family: 'Inter', sans-serif; outline: none; }
          input:focus { border-color: rgba(61,138,101,0.6); }
          input::placeholder { color: #383838; }
          .btn { width: 100%; background: #3d8a65; border: none; border-radius: 10px; padding: 14px; font-family: 'Playfair Display', serif; font-size: 15px; color: #fff; cursor: pointer; margin-top: 8px; }
          .btn:hover { opacity: 0.88; }
          .btn:disabled { opacity: 0.4; cursor: not-allowed; }
          .erro { background: rgba(226,75,74,0.1); border: 0.5px solid rgba(226,75,74,0.3); border-radius: 8px; padding: 10px 12px; font-size: 12px; color: #E24B4A; margin-top: 12px; display: none; }
        `}</style>
      </head>
      <body>
        <div className="wrap">
          <div className="hero">
            <div className="brand">o Boticário · Niterói</div>
            <div className="title">Studio<em>Boti</em></div>
            <div className="gold-line"></div>
          </div>
          <div className="card">
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" placeholder="seu@email.com" autoComplete="email" />
            </div>
            <div className="field">
              <label htmlFor="senha">Senha</label>
              <input id="senha" type="password" placeholder="••••••••" autoComplete="current-password" />
            </div>
            <button className="btn" id="btn" onClick={() => {}}>Entrar</button>
            <div className="erro" id="erro"></div>
          </div>
        </div>
        <script dangerouslySetInnerHTML={{ __html: `
          document.getElementById('btn').onclick = async function() {
            var btn = document.getElementById('btn');
            var erro = document.getElementById('erro');
            var email = document.getElementById('email').value.trim();
            var senha = document.getElementById('senha').value;
            if (!email || !senha) { erro.style.display='block'; erro.textContent='Preencha email e senha.'; return; }
            btn.disabled = true;
            btn.textContent = 'Entrando...';
            try {
              var res = await fetch('/api/vic/login', {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({email, senha})
              });
              var data = await res.json();
              if (res.ok && data.dest) {
                window.location.href = data.dest;
              } else {
                erro.style.display = 'block';
                erro.textContent = data.error || 'Erro ao fazer login.';
                btn.disabled = false;
                btn.textContent = 'Entrar';
              }
            } catch(e) {
              erro.style.display = 'block';
              erro.textContent = 'Erro de conexão.';
              btn.disabled = false;
              btn.textContent = 'Entrar';
            }
          };
          document.getElementById('senha').addEventListener('keydown', function(e) {
            if (e.key === 'Enter') document.getElementById('btn').click();
          });
        `}} />
      </body>
    </html>
  )
}
