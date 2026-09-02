# market013.app

MVP web para comparar precos de supermercados e calcular a cesta mais economica considerando deslocamento.

## Stack

- Next.js + React para a aplicacao web
- Vercel para hospedagem e Vercel Functions
- PostgreSQL com PostGIS para dados de produtos, mercados e precos
- Neon integrado a Vercel como banco gerenciado opcional
- Vitest para testes locais

## Desenvolvimento local

Requisitos: Node.js 20+ e Docker.

```bash
npm install
docker compose -f docker-compose.local.yml up -d
npm run web
```

Abra `http://localhost:3000`.

Rotas iniciais:

- `/` - tela inicial
- `/lista` - lista de compras
- `/contribuir` - contribuicao colaborativa
- `/api/health` - health check
- `/api/products` - produtos do PostgreSQL

## Banco local

O PostgreSQL com PostGIS roda em Docker. O schema e o seed ficam em `backend/database/` e sao aplicados na primeira inicializacao do volume.

```bash
npm run typecheck
npm run test
npm run build:web
```

## Vercel

O projeto usa `apps/web` como Root Directory. A configuracao esta em `apps/web/vercel.json`.

1. Crie um projeto Vercel conectado a este repositorio.
2. Adicione um PostgreSQL pela integracao Neon/Vercel.
3. Configure `DATABASE_URL` nos ambientes Development, Preview e Production.
4. Aplique `backend/database/migrations/0001_initial.sql` e `backend/database/seed.sql` no banco.
5. Execute um deploy de preview e teste `/`, `/api/health` e `/api/products`.

Nunca versione `.env`, credenciais, `node_modules/`, `.next/` ou arquivos de build.

## Estado atual

O projeto ainda esta em desenvolvimento. Nenhum deploy e necessario para executar localmente, e recursos externos devem ser configurados somente nos ambientes da Vercel.
