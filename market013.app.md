# ESCOPO DO PROJETO: MVP de Aplicativo de Preços de Supermercado com IA (Anti-Gasolina) + LGPD & Suporte

## 1. OBJETIVO DO PRODUTO
Desenvolver um MVP funcional de um aplicativo mobile/web onde os usuários podem comparar preços de supermercados em sua região, cadastrar preços de forma colaborativa (estilo Waze) e calcular a "Cesta Ótima" considerando a diferença de preço versus o custo de deslocamento (gasolina). O MVP agora inclui conformidade básica com LGPD/Termos de Uso e um canal direto de reporte de erros/suporte.

---

## 2. STACK TECNOLÓGICA SUGERIDA PARA MVP
- **Frontend web:** Next.js hospedado na Vercel, com acesso por navegador em computador/notebook.
- **Frontend mobile (fase posterior):** React Native/Expo consumindo a mesma API HTTP.
- **Backend / API:** Vercel Functions via Route Handlers do Next.js.
- **Banco de Dados:** PostgreSQL gerenciado pela integração Neon/Vercel, com PostGIS quando disponível no plano escolhido.
- **Arquivos:** armazenamento compatível com Vercel/Neon ou Blob Storage da Vercel, sujeito aos limites do plano gratuito.
- **Jobs:** Vercel Cron para tarefas leves; processamento pesado deve ser mantido fora do ciclo síncrono da Function.
- **Configuração:** variáveis de ambiente da Vercel; nenhum segredo deve ser versionado.
- **IA / Visão Computacional:** API do OpenAI (GPT-4o Vision) ou Google Gemini API para ler preços e produtos de fotos de etiquetas de gôndola e extração de dados de encartes em PDF. No navegador, a captura usa a webcam (`getUserMedia`) com fallback de upload de arquivo quando não há câmera.
- **Geolocalização:** Bibliotecas nativas de mapas e cálculo de distância (ex: Mapbox ou Haversine formula); no navegador, usa a Geolocation API do próprio browser, com fallback manual de endereço/CEP quando o usuário nega a permissão.
- **Responsividade Web:** Layout adaptativo (breakpoints mobile/tablet/desktop) para que as mesmas telas funcionem bem em telas grandes de notebook/desktop.

---

## 3. MÓDULOS E FUNCIONALIDADES DO MVP

### Módulo 1: O Motor de Entrada de Dados (Base + Colaborativo)
1. **Scraping / Ingestão de Encartes (Esqueleto Inicial):**
   - Script backend para receber PDFs/links de encartes semanais dos grandes mercados e processar via IA para popular a base inicial.
2. **Contribuição Colaborativa ("O Waze de Preços"):**
   - **Tela de Check-in/Scan:** O usuário tira foto da etiqueta na gôndola.
   - A IA extrai: `Nome do Produto`, `Marca`, `Peso/Volume`, `Preço` e `Supermercado`.
   - O usuário confirma os dados e o preço é salvo com geolocalização (lat/long), data e ID do usuário.
   - **No navegador (web):** usa a webcam do notebook via `getUserMedia` ou permite upload de uma foto (tirada pelo celular ou já salva localmente), já que nem todo desktop tem câmera acessível.
3. **Sistema de Gamificação / Desbloqueio:**
   - Validação de contribuições semanais para liberar o comparador avançado de rotas.

### Módulo 2: A Lista de Compras e Otimizador de Rota (O Coração do App)
1. **Montagem da Lista:**
   - O usuário busca livremente qualquer item de mercado e define quantidades.
2. **O Algoritmo de Decisão ("Cesta Ótima x Gasolina"):**
   - Cruza a lista com os preços locais num raio estipulado.
   - Calcula Mercado Único vs. Cesta Mista descontando o custo médio estimado de deslocamento (gasolina).
   - **No navegador:** mapa renderizado com uma lib compatível com web (ex: Mapbox GL JS), reaproveitando a mesma lógica de cálculo de distância do app nativo.

### Módulo 3: Conformidade Legal, Privacidade e LGPD (NOVO)
1. **Tela/Modal de Termos de Uso e Política de Privacidade no Primeiro Acesso:**
   - Termo simples exigindo aceite de que os preços colaborativos são informativos, isentando o app de divergências pontuais de gôndola.
   - Aviso de uso de dados de geolocalização estritamente para fins de cálculo de proximidade de mercados.
2. **Opção de Exclusão de Conta/Dados:**
   - Botão nas configurações para o usuário apagar seus dados e histórico da base, atendendo às diretrizes básicas de privacidade.

### Módulo 4: Canal de Feedback, Suporte e Relatório de Erros (NOVO)
1. **Botão "Reportar Erro" na Listagem e Preços:**
   - Se o usuário vir um preço incorreto ou a IA ler errado, ele clica em um botão rápido na tela do produto ("Preço errado?" ou "Produto incorreto?").
   - Abre um formulário ultrarrápido de 1 clique (ex: "Preço desatualizado", "Produto errado") que envia o ID do registro para uma tabela de moderação ou alerta direto no painel do desenvolvedor.
2. **Canal de Contato / Suporte Rápido:**
   - Um link direto nas configurações que redireciona para um canal de atendimento (ex: chat interno simples ou redirecionamento para WhatsApp de suporte) para reter o usuário insatisfeito antes que ele desinstale o app.

---

## 4. ESTRUTURA DE DADOS BÁSICA (Tabelas do Banco)
- **Users:** id, name, email, score_contribuicoes, accepted_terms_at, created_at
- **Products:** id, name, category, barcode (opcional)
- **Supermarkets:** id, name, address, latitude, longitude
- **Prices:** id, product_id, supermarket_id, price, source ('encarte' ou 'colaborativo'), user_id (nullable), created_at
- **Reports (NOVO):** id, price_id, user_id, reason, status ('pendente', 'resolvido'), created_at

## 5. Publicação nas Lojas (Google Play e App Store) e Deploy Web
Prepare o também na ultima fase o APP para lançamento na google play e appley store.
Além das lojas mobile, publicar a versão web (export estático do Expo for Web) em um hosting (ex: Vercel, Netlify ou Cloudflare Pages) com domínio próprio, permitindo acesso direto pelo navegador do computador/notebook.