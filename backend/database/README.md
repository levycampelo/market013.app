# Banco PostgreSQL — Vercel e Neon

O schema usa PostgreSQL com PostGIS. O ambiente oficial de desenvolvimento e preview e o banco Neon integrado a Vercel, configurado pela variavel `DATABASE_URL`.

Para aplicar o schema e o seed no banco de desenvolvimento:

```bash
psql "$DATABASE_URL" -f backend/database/migrations/0001_initial.sql
psql "$DATABASE_URL" -f backend/database/migrations/0002_price_status.sql
psql "$DATABASE_URL" -f backend/database/migrations/0003_user_tracking.sql
psql "$DATABASE_URL" -f backend/database/migrations/0004_admin_audit_logs.sql
psql "$DATABASE_URL" -f backend/database/seed.sql
```

O schema e o seed devem ser aplicados manualmente no banco Neon do projeto Vercel antes do primeiro deploy de preview.
