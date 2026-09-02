# Status do Projeto — market013.app

Checklist de acompanhamento, baseado no [PLANO_DESENVOLVIMENTO_TESTES.md](PLANO_DESENVOLVIMENTO_TESTES.md). Marcado como feito apenas o que já existe fisicamente no workspace; o restante segue na ordem recomendada de execução.

## Concluído

- [x] Documento de escopo do produto ([market013.app.md](market013.app.md))
- [x] Plano de desenvolvimento e testes ([PLANO_DESENVOLVIMENTO_TESTES.md](PLANO_DESENVOLVIMENTO_TESTES.md))
- [x] Estrutura de pastas do monorepo criada:
  - [x] `apps/web/` (Next.js — web + Vercel Functions)
  - [x] `backend/functions/`
  - [x] `backend/ingestion/`
  - [x] `docs/`
  - [x] `tests/unit/`, `tests/integration/`, `tests/e2e/`
- [x] Arquitetura Vercel definida para ambiente gratuito, sem deploy externo
  - [x] Next.js em `apps/web` para frontend web e Vercel Functions
  - [x] `vercel.json` com comandos de instalação/build
  - [x] Integração por `DATABASE_URL` com PostgreSQL Neon/Vercel
  - [x] Endpoint local `GET /api/health`
  - [x] Configuração Vercel específica em `apps/web/vercel.json` para projetos com Root Directory `apps/web`
  - [x] TypeScript validado com `npm run typecheck`
  - [x] Build de produção local validado com `npm run build:web`
  - [x] Suíte Vitest executada com sucesso

## Fora do escopo neste momento

- Nenhum deploy na Vercel foi executado nesta etapa.
- A CLI da Vercel no WSL ainda está deslogada; é necessário executar `vercel login` nessa distribuição antes de criar o projeto remoto.
- O plano gratuito da Vercel/Neon possui limites de execução, banco, armazenamento e tráfego que deverão ser revisados antes de produção.
- O PostgreSQL local via Docker continua disponível para desenvolvimento e testes sem serviços externos.

## Pendente (em ordem de execução)

### Fase 0 — Fundação
- [x] Criar o scaffold Next.js em `apps/web`
- [x] Configurar `DATABASE_URL` e `.env.example`
- [x] Criar migrations em `backend/database/migrations/` e seed local
- [ ] Criar o banco Neon/Vercel e configurar `DATABASE_URL` no painel da Vercel
- [ ] Aplicar migrations/seed no banco remoto quando o deploy for autorizado
- [ ] Configurar ambiente de testes: Jest/Vitest, React Native Testing Library, Detox/Maestro, Playwright, Supertest
- [ ] Rodar smoke test do servidor local `npm run dev` e `GET /api/health`
- [ ] Criar camadas de abstração `ai-provider` e `maps-provider` (com mocks para testes)

### Módulo 2 — Otimizador (algoritmo primeiro)
- [ ] Suíte de testes unitários da "Cesta Ótima x Gasolina" (mercado único, cesta mista, custo anula economia, raio sem mercado, dados incompletos)
- [ ] Implementação do algoritmo de decisão
- [ ] Teste de cálculo de distância (Haversine/Mapbox) isolado

### Módulo 3 — LGPD/Termos
- [ ] Tela/modal de Termos de Uso no primeiro acesso + teste de bloqueio sem aceite
- [ ] Fluxo de exclusão de conta/dados + teste de cascata/anonimização
- [ ] Consentimento de geolocalização antes da coleta

### Módulo 1 — Entrada de dados
- [ ] Parser de encartes (PDF) com IA + testes de contrato do schema
- [ ] Tela de check-in/scan (câmera nativa + fallback de upload no navegador)
- [ ] Gravação de preço colaborativo com geolocalização, data e user_id
- [ ] Regra de gamificação (validação semanal para liberar comparador)
- [ ] Testes de integração M1+M2 (dados reais alimentando o otimizador)

### Módulo 4 — Suporte/Reporte de erros
- [ ] Botão "Preço errado?" gravando em `Reports`
- [ ] Teste de idempotência e feedback de UI
- [ ] Link de contato/suporte (WhatsApp ou chat) + teste de redirecionamento (deep link mobile / nova aba web)

### Módulo 5 — Acesso via navegador (Web)
- [ ] Responsividade (breakpoints mobile/tablet/desktop)
- [ ] Fallback de câmera (`getUserMedia` + upload de arquivo)
- [ ] Geolocalização via Geolocation API do navegador + fallback manual de endereço/CEP
- [ ] Testes cross-browser (Chrome, Firefox, Safari/WebKit)
- [ ] Persistência de sessão entre reloads de página

### Fechamento
- [ ] Pipeline de CI rodando unit + integration a cada PR
- [ ] Empacotamento e publicação nas lojas (Google Play e App Store)
- [ ] Reexecutar o deploy da versão web na Vercel após corrigir o comando de build
