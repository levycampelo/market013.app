# Plano de Desenvolvimento e Testes — market013.app (MVP)

O workspace contém o documento de escopo ([market013.app.md](market013.app.md)) como base deste plano. Ele cobre desde a estruturação inicial do projeto até a estratégia de testes por módulo, priorizando o caminho mais curto para começar a testar.

## 1. Análise rápida do escopo

| Módulo | Complexidade | Dependência externa | Risco |
|---|---|---|---|
| M1 – Ingestão de dados (scraping + colaborativo) | Alta | IA (GPT-4o Vision/Gemini) | Alto (qualidade da extração de imagem) |
| M2 – Lista de compras + otimizador de rota | Alta | Geolocalização/Maps | Médio-Alto (algoritmo de custo-benefício) |
| M3 – LGPD/Termos | Baixa | Nenhuma | Baixo, mas bloqueante legal |
| M4 – Reporte de erros/Suporte | Baixa-Média | WhatsApp/Chat | Baixo |
| Publicação nas lojas | Média | Apple/Google | Médio (prazos de revisão) |

Recomendação: **M3 e a base de dados devem vir primeiro** (são pré-requisitos legais e estruturais), seguidos por M1 (sem dados não há o que testar em M2), depois M2, M4 e por fim empacotamento para as lojas.

## 2. Estrutura de projeto sugerida

```
market013.app/
├── apps/
│   ├── web/                 # Next.js — frontend web + Vercel Functions
│   └── app/                 # Expo mobile (fase posterior)
├── backend/
│   ├── functions/           # regras de domínio reutilizáveis pelas Vercel Functions
│   └── ingestion/           # scripts de scraping/parsing de encartes
├── database/                # migrations e seed do PostgreSQL/PostGIS
│   ├── migrations/
│   └── seed.sql
├── vercel.json              # configuração de build e região da Vercel
├── docs/
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/                 # inclui testes de browser (Playwright) além de mobile (Detox/Maestro)
```

## 3. Fase 0 — Fundação (pré-requisito para qualquer teste)

1. Inicializar o app Next.js e suas Vercel Functions dentro de `apps/web`.
2. Criar as tabelas descritas na seção 4 do escopo no PostgreSQL da integração Neon/Vercel.
3. Configurar ambiente de testes:
   - **Unitário/Integração backend:** Jest ou Vitest.
   - **Componentes RN:** Jest + React Native Testing Library.
   - **E2E mobile:** Detox ou Maestro.
   - **E2E web:** Playwright (Chrome, Firefox, WebKit) rodando contra `npx expo start --web`.
  - **API/contrato:** testes HTTP contra as Vercel Functions/Route Handlers.
4. Popular banco com dados seed mínimos (2-3 supermercados, 10-20 produtos, preços de teste) para permitir testes desde o início sem depender da IA real.
5. Rodar `npx expo start --web` como smoke test de plataforma antes de iniciar as demais suítes, garantindo que o build web sobe sem erros.

## 4. Plano de testes por módulo

### Módulo 1 — Entrada de dados
- **Ingestão de encartes (IA):**
  - Testes unitários do parser de PDF (mockando resposta da IA) para validar mapeamento produto→preço→supermercado.
  - Teste de contrato: schema da resposta da IA (nome, marca, peso, preço) — validar com dados malformados/incompletos.
- **Contribuição colaborativa (scan de gôndola):**
  - Mock da API de visão computacional para testes determinísticos (não bater na API real em CI).
  - Testar fluxo: foto → extração → tela de confirmação → gravação com lat/long, data, user_id.
  - Casos de borda: foto ilegível, IA retorna campos vazios, usuário sem geolocalização habilitada.
- **Gamificação:**
  - Teste da regra de "validação semanal" que libera o comparador de rotas (contagem de contribuições, reset semanal).

### Módulo 2 — Lista de compras e otimizador
- **Busca de itens:** teste de busca (correspondência parcial, acentuação, categorias).
- **Algoritmo "Cesta Ótima x Gasolina":** este é o núcleo do MVP e deve ter suíte de testes unitários dedicada, com casos:
  - Mercado único mais barato mesmo sem cruzar bairros.
  - Cesta mista compensando o deslocamento.
  - Cesta mista onde o custo de gasolina anula a economia (deve recomendar mercado único).
  - Raio de busca sem nenhum mercado (fallback).
  - Preços empatados / dados incompletos (produto sem preço em um dos mercados do raio).
- Testar cálculo de distância (Haversine ou Mapbox) isoladamente com coordenadas conhecidas.

### Módulo 3 — LGPD / Termos
- Teste de bloqueio: usuário não pode prosseguir sem aceitar termos (`accepted_terms_at` nulo).
- Teste do fluxo de exclusão de conta: confirmar exclusão em cascata (Prices com user_id, histórico) ou anonimização, conforme decisão de produto.
- Validar que geolocalização só é coletada após consentimento explícito.

### Módulo 4 — Suporte/Reporte de erros
- Teste do botão "Preço errado?": grava registro em `Reports` com `price_id`, `user_id`, `reason`, `status='pendente'`.
- Teste de idempotência (usuário reportando o mesmo preço duas vezes) e de UI (feedback de 1 clique).
- Teste do redirecionamento para canal de suporte (deep link/WhatsApp) — testar geração correta da URL. No navegador, validar que o link abre em nova aba (`target="_blank"`) em vez de deep link nativo.

### Módulo 5 — Acesso via navegador (Web)
- **Responsividade:** testar breakpoints mobile/tablet/desktop nas telas principais (lista, otimizador, scan, configurações).
- **Câmera/scan:** testar fallback de upload de arquivo quando `getUserMedia` não está disponível ou é negado pelo usuário.
- **Geolocalização:** testar aceite/recusa da permissão do navegador e fallback manual de endereço/CEP.
- **Compatibilidade cross-browser:** rodar a suíte E2E em Chrome, Firefox e Safari/WebKit.
- **Persistência de sessão:** login/autenticação mantido corretamente entre reloads de página no navegador.

## 5. Testes de integração/E2E (fluxos completos)
1. Onboarding → aceite de termos → cadastro/login.
2. Scan de gôndola → confirmação → preço salvo → aparece na busca.
3. Montagem de lista → cálculo de cesta ótima → exibição de economia estimada.
4. Reporte de erro em um preço → status "pendente" no painel.
5. Exclusão de conta → dados removidos/anonimizados.

## 6. Estratégia de mocks para IA e mapas
Como a IA (GPT-4o Vision/Gemini) e serviços de mapas têm custo e latência, recomenda-se:
- Criar uma camada de abstração (`ai-provider` e `maps-provider`) para poder injetar mocks nos testes.
- Testes de CI usam mocks; um conjunto pequeno de testes manuais/contract tests roda contra a URL de preview da Vercel periodicamente (não a cada commit).

## 7. Definition of Done para "iniciar os testes"
- [ ] Schema do banco criado e migrado.
- [ ] Seed de dados de teste disponível.
- [ ] Camadas de IA/Maps abstraídas com mocks.
- [ ] Suíte unitária do algoritmo de cesta ótima com os casos de borda listados acima.
- [ ] Ao menos 1 fluxo E2E automatizado (onboarding + scan + lista) rodando em mobile (Detox/Maestro) e em web (Playwright).
- [ ] Build web (`npx expo start --web` / `npx expo export --platform web`) rodando sem erros.
- [ ] Pipeline de CI configurado rodando unit + integration a cada PR.

## 8. Ordem de execução recomendada
1. Fase 0 (scaffolding + schema + seeds) + smoke test do build web (`expo start --web`).
2. Testes unitários do algoritmo de cesta ótima (M2) — é o diferencial do produto, vale validar a lógica antes de qualquer UI.
3. Testes de M3 (LGPD) — simples e bloqueante legal.
4. Testes de M1 com mocks de IA, incluindo o fallback de upload de foto no navegador.
5. Integração M1+M2 (dados reais alimentando o otimizador), validada em mobile e web.
6. M4 (suporte/reporte).
7. M5 (web): responsividade e compatibilidade cross-browser (Chrome/Firefox/Safari).
8. Testes de build/empacotamento para Google Play/App Store (checklist de assets, permissões de localização/câmera, política de privacidade nas lojas) e deploy da versão web (Vercel/Netlify/Cloudflare Pages).
