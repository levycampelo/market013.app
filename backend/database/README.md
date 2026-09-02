# Banco PostgreSQL local e Vercel

O schema usa PostgreSQL 16 com PostGIS. Em desenvolvimento local, o banco roda via Docker. Em Vercel, use um PostgreSQL da integracao Neon/Vercel configurando `DATABASE_URL`.

```bash
docker compose -f docker-compose.local.yml up -d
```

Conexao local: `postgresql://market013:market013_dev_only@localhost:5432/market013`.

Para aplicar o schema e o seed em um banco existente:

```bash
psql "$DATABASE_URL" -f backend/database/migrations/0001_initial.sql
psql "$DATABASE_URL" -f backend/database/seed.sql
```

O schema e o seed sao carregados na primeira inicializacao do volume local. Nenhum banco externo e criado automaticamente por este repositorio.
