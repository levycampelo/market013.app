# market013.app

MVP web para comparar precos de supermercados e calcular a cesta mais economica considerando deslocamento.

## Stack

- Next.js + React para a aplicacao web
- Vercel para hospedagem e Vercel Functions
- PostgreSQL com PostGIS para dados de produtos, mercados e precos
- Neon integrado a Vercel como banco gerenciado opcional
- Vitest para testes locais

## Desenvolvimento na Vercel

O ambiente oficial de desenvolvimento e o projeto Vercel com banco Neon. O repositorio nao depende de Docker ou de banco local.

1. Conecte o repositorio a um projeto Vercel.
2. Configure `DATABASE_URL` no ambiente `Development`.
3. Aplique a migration e o seed no banco Neon.
4. Crie um deploy de preview para validar a aplicacao.

Rotas iniciais:

- `/` - tela inicial
- `/lista` - lista de compras
- `/contribuir` - contribuicao colaborativa
- `/api/health` - health check
- `/api/products` - produtos do PostgreSQL

## Banco de desenvolvimento

O PostgreSQL do ambiente Development/Preview e fornecido pelo Neon integrado a Vercel. O schema e o seed ficam em `backend/database/` e devem ser aplicados no banco remoto de desenvolvimento.

```bash
npm run typecheck
npm run test
npm run build:web
```

## Vercel

O projeto usa `apps/web` como Root Directory. A configuracao esta em `apps/web/vercel.json`.

1. Crie um projeto Vercel conectado a este repositorio.
2. Adicione um PostgreSQL pela integracao Neon/Vercel.
3. Configure `DATABASE_URL` nos ambientes Development e Preview.
4. Aplique `backend/database/migrations/0001_initial.sql` e `backend/database/seed.sql` no banco de desenvolvimento.
5. Execute um deploy de preview e teste `/`, `/api/health` e `/api/products`.

Nunca versione `.env`, credenciais, `node_modules/`, `.next/` ou arquivos de build.

## Estado atual

O projeto ainda esta em desenvolvimento. A validacao oficial deve ocorrer nos deploys Development/Preview da Vercel; Production sera configurado somente depois do beta.

## Licenca

Este projeto esta licenciado sob a [Licenca MIT](LICENSE).
