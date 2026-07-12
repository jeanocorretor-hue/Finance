# Axis Finance

App de controle financeiro pessoal — despesas, receitas e cartões por mês, com suporte a gastos variáveis rastreados.

## Run & Operate

- `pnpm --filter @workspace/axis-finance run dev` — rodar o app (porta configurada pelo workflow)
- `pnpm run typecheck` — typecheck completo de todos os pacotes

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite + Tailwind CSS v4 + shadcn/ui
- Estado: React Context (in-memory, sem backend)
- Gráficos: Recharts

## Where things live

- `artifacts/axis-finance/src/lib/finance-store.tsx` — Context provider e toda a lógica de estado
- `artifacts/axis-finance/src/lib/finance-logic.ts` — Cálculos de views mensais e tendências
- `artifacts/axis-finance/src/lib/finance-data.ts` — Dados de seed (Julho 2026)
- `artifacts/axis-finance/src/lib/finance-types.ts` — Tipos TypeScript
- `artifacts/axis-finance/src/components/finance/` — Todos os componentes do dashboard
- `artifacts/axis-finance/src/index.css` — Tema dark (oklch) com Tailwind v4

## Architecture decisions

- App puramente frontend (sem backend/banco de dados) — estado em memória via React Context
- Portado de Next.js para React+Vite (removidos diretivas 'use client', imports do Next.js)
- Tema dark-first usando oklch diretamente nas variáveis CSS (Tailwind v4 inline theme)
- Dados persistem apenas na sessão do navegador (refresh reseta para o seed)

## User preferences

_Preencher conforme o usuário indicar preferências._
