# Setup Completo do Banco — Neon + Vercel

Este guia configura o PostgreSQL remoto dos ambientes Development e Preview da Vercel usando Neon. O projeto nao depende de banco ou servidor local.

## 1. Pré-requisitos

- Projeto criado no Neon ou pela integração da Vercel.
- Acesso ao projeto na Vercel.
- Acesso ao projeto Neon ou a integracao Neon/Vercel.
- Nenhuma credencial real versionada no Git.

## 2. Configurar a Vercel

No projeto Vercel, abra **Settings → Environment Variables** e configure nos ambientes `Development` e `Preview`:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require
AI_PROVIDER=mock
AI_API_KEY=
```

Use a URL pooled do Neon em `DATABASE_URL`. Nunca coloque uma senha real em `.env.example`, README, codigo ou commit.

## 3. Testar a conexao remota

Valide no painel do Neon ou usando um cliente administrativo remoto, sem salvar a credencial no repositorio:

```bash
set -a
echo "Confirme DATABASE_URL no ambiente Development da Vercel"
```

Teste o banco:

```bash
psql "$DATABASE_URL" \
  -c "select current_database(), current_user;"
```

A resposta deve indicar o banco e o usuário do Neon.

## 4. Verificar o PostGIS

O projeto usa PostGIS para armazenar a localização dos supermercados e fazer consultas geográficas.

```bash
psql "$DATABASE_URL" \
  -c "create extension if not exists postgis;"
```

Confirme a versão:

```bash
psql "$DATABASE_URL" \
  -c "select postgis_full_version();"
```

Se a extensão não estiver disponível no plano escolhido, será necessário usar Haversine diretamente no código da aplicação.

## 5. Aplicar a migration

Use a conexão não pooled para migrations, quando ela estiver disponível:

```bash
psql "${DATABASE_URL_UNPOOLED:-$DATABASE_URL}" \
  -v ON_ERROR_STOP=1 \
  -f backend/database/migrations/0001_initial.sql
```

A migration cria:

- `users`
- `products`
- `supermarkets`
- `prices`
- `reports`
- constraints de integridade
- relacionamentos entre as tabelas
- índices para produtos, mercados e preços
- índice geográfico do PostGIS

## 6. Aplicar o seed

```bash
psql "${DATABASE_URL_UNPOOLED:-$DATABASE_URL}" \
  -v ON_ERROR_STOP=1 \
  -f backend/database/seed.sql
```

O seed cria os dados iniciais para teste:

- 10 produtos;
- 3 supermercados;
- aproximadamente 30 preços.

## 7. Validar os dados

```bash
psql "$DATABASE_URL" \
  -c "select count(*) as products from products;"

psql "$DATABASE_URL" \
  -c "select count(*) as supermarkets from supermarkets;"

psql "$DATABASE_URL" \
  -c "select count(*) as prices from prices;"
```

Resultado esperado:

```text
products: 10
supermarkets: 3
prices: 30
```

Para visualizar alguns produtos:

```bash
psql "$DATABASE_URL" \
  -c "select name, brand, category from products order by name;"
```

## 8. Configurar a Vercel

No painel do projeto:

```text
Project → Settings → Environment Variables
```

Crie ou edite nos ambientes `Development` e `Preview`:

```text
DATABASE_URL
```

Use a URL pooled do Neon com `sslmode=require`.

Production sera configurado somente depois da aprovacao do beta.

Se a integração criar `POSTGRES_URL`, isso não substitui automaticamente `DATABASE_URL`. A aplicação atual procura `DATABASE_URL`.

## 9. Redeploy

Depois de alterar variáveis de ambiente, faça um novo deploy:

```bash
vercel
```

Para produção, somente depois de validar o Preview:

```bash
vercel --prod
```

Também é possível usar **Deployments → Redeploy** no painel da Vercel.

## 10. Testar a aplicação publicada

Health check:

```bash
curl https://SEU_PROJETO.vercel.app/api/health
```

Produtos:

```bash
curl https://SEU_PROJETO.vercel.app/api/products
```

A API de produtos deve retornar um objeto JSON com a propriedade `products`.

## 11. Diagnóstico de erro 503

Se `/api/products` retornar:

```json
{
  "error": "Banco de dados indisponível"
}
```

verifique:

1. `DATABASE_URL` foi criada no projeto correto da Vercel.
2. A variável está habilitada para o ambiente do deploy.
3. Foi feito redeploy depois de salvar a variável.
4. A URL contém `sslmode=require`.
5. A tabela `products` existe.
6. A migration foi aplicada.
7. O banco Neon está ativo.
8. O provedor não suspendeu o banco por inatividade.

Verifique as tabelas pelo terminal:

```bash
psql "$DATABASE_URL" -c "\\dt"
```

## 12. Segurança

Não versione:

```text
.env
DATABASE_URL
DATABASE_URL_UNPOOLED
PGPASSWORD
POSTGRES_PASSWORD
```

Se uma senha for exposta:

1. Rotacione a senha no Neon.
2. Atualize `DATABASE_URL` na Vercel.
3. Faça redeploy.
4. Remova a credencial do histórico público do Git quando necessário.

## Fluxo completo

```text
Criar banco Neon pela integracao da Vercel
  ↓
Configurar DATABASE_URL em Development e Preview
  ↓
Aplicar migration e seed no banco remoto
        ↓
Ativar/verificar PostGIS
        ↓
Aplicar migration
        ↓
Aplicar seed
        ↓
Validar tabelas e registros
        ↓
Configurar DATABASE_URL na Vercel
        ↓
Fazer deploy de Preview
        ↓
Testar /api/health e /api/products
        ↓
Liberar Production
```
