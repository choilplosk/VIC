# VIC — Vendas In Company
## Guia de integração · O Boticário Niterói

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js (App Router) |
| Backend | Next.js API Routes |
| Banco | Neon (PostgreSQL) |
| Hosting | Vercel |
| Auth | SSO via token do portal |

---

## Instalação

### 1. Dependências
```bash
npm install @neondatabase/serverless
```

### 2. Variáveis de ambiente
Adicione no painel da Vercel (e no `.env.local` local):

```env
DATABASE_URL=postgresql://...       # string de conexão do Neon
NEXT_PUBLIC_URL=https://boticarioniteroi.com.br
```

### 3. Banco de dados
Execute o arquivo `vic_schema.sql` no SQL Editor do Neon.
O script cria todas as tabelas, views, funções e dados iniciais.

### 4. Copiar arquivos para o repositório
Copie a pasta `vic/` para a raiz do repositório do portal:
```
/
├── app/
│   └── api/
│       └── vic/          ← copiar aqui
├── lib/
│   └── vic/              ← copiar db.ts, auth.ts, utils.ts aqui
└── types/
    └── vic/              ← copiar index.ts aqui
```

---

## Rotas de API

### Públicas (sem autenticação)
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/vic/vouchers/[token]` | Dados do voucher pelo token |
| GET | `/api/vic/lojas` | Lista lojas VIC ativas |
| GET | `/api/vic/lojas/[id]/slots?data=` | Horários disponíveis |
| POST | `/api/vic/agendamentos` | Cliente cria agendamento |

### Autenticadas (SSO do portal)
| Método | Rota | Perfil mínimo | Descrição |
|---|---|---|---|
| GET | `/api/vic/vouchers` | comercial | Lista vouchers |
| POST | `/api/vic/vouchers` | comercial | Gera voucher |
| GET | `/api/vic/agendamentos` | atendente | Agenda da loja |
| PATCH | `/api/vic/agendamentos/[id]` | atendente | Atualiza status |
| POST | `/api/vic/horarios/bloqueios` | atendente | Bloqueia horário |
| DELETE | `/api/vic/horarios/bloqueios` | atendente | Desbloqueia |
| GET | `/api/vic/dashboard` | coordenadora | Métricas gerais |
| GET | `/api/vic/config` | atendente | Configurações |
| PATCH | `/api/vic/config` | coordenadora | Salva configurações |

---

## Autenticação

O portal já valida o token SSO e injeta o header `x-user-email`
em todas as requisições autenticadas. O VIC lê esse header e
busca o perfil do usuário na tabela `usuarios_vic`.

**Para cadastrar um usuário no VIC:**
```sql
INSERT INTO usuarios_vic (email, nome, perfil, loja_id)
VALUES ('email@boticarioniteroi.com.br', 'Nome', 'atendente', 'uuid-da-loja');
```

---

## Cron Job — expirar vouchers

Configure um Vercel Cron para rodar diariamente:

```json
// vercel.json
{
  "crons": [{
    "path": "/api/vic/cron/expirar",
    "schedule": "0 3 * * *"
  }]
}
```

Crie o arquivo `/api/vic/cron/expirar/route.ts`:
```typescript
import { sql } from '@/lib/vic/db'
import { NextResponse } from 'next/server'

export async function GET() {
  const [{ expirar_vouchers_vencidos: total }] = await sql`
    SELECT expirar_vouchers_vencidos()
  `
  return NextResponse.json({ expirados: total })
}
```

---

## Perfis de acesso

| Perfil | O que pode fazer |
|---|---|
| `comercial` | Gerar vouchers, ver histórico próprio |
| `atendente` | Ver agenda da sua loja, confirmar/cancelar agendamentos, bloquear horários |
| `coordenadora` | Tudo — todas as lojas, dashboard, configurações |

---

## Fluxo completo

```
Comercial gera voucher
  → banco: INSERT vouchers (status: pendente)
  → retorna URL: boticarioniteroi.com.br/vic/{token}

Cliente abre o link
  → GET /api/vic/vouchers/{token}   (valida e retorna dados)
  → GET /api/vic/lojas              (lista lojas)
  → GET /api/vic/lojas/{id}/slots   (horários disponíveis)
  → POST /api/vic/agendamentos      (cria agendamento)
  → banco: INSERT agendamentos + UPDATE vouchers (status: agendado)

Loja recebe notificação
  → atendente vê na agenda (GET /api/vic/agendamentos)
  → clica para confirmar (PATCH /api/vic/agendamentos/{id})
  → envia confirmação pelo WhatsApp da loja para a cliente
```
