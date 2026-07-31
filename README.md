# Finance

App de controle financeiro pessoal — despesas, receitas e cartões por mês, com suporte a gastos variáveis rastreados.

## Rodar local

```bash
pnpm install
pnpm dev
```

O `pnpm dev` sobe a API (http://localhost:8080) e o frontend (http://localhost:5173) juntos. Abra http://localhost:5173.

## Configuração do banco

Crie um `.env.local` na raiz com a string de conexão do Postgres (ex.: Supabase):

```
DATABASE_URL=postgresql://usuario:senha@host:5432/postgres
```

Aplicar o schema no banco:

```bash
pnpm --filter @workspace/db run push
```

Os dados de seed são inseridos automaticamente na primeira chamada a `GET /api/finance/data`.

## Comandos

| Comando                | O que faz                                   |
| ---------------------- | ------------------------------------------- |
| `pnpm dev`             | Sobe API + frontend juntos                  |
| `pnpm run typecheck`   | Typecheck de todos os pacotes               |
| `pnpm run build`       | Build de produção                           |

## Estrutura

- `artifacts/finance/` — Frontend React + Vite + Tailwind v4
- `artifacts/api-server/` — API Express (CRUD financeiro)
- `lib/db/` — Schema drizzle e conexão com o Postgres

## Stack

- pnpm workspaces, TypeScript
- React 19 + Vite + Tailwind CSS v4 + shadcn/ui + Recharts
- Express + drizzle-orm + Postgres (Supabase)
