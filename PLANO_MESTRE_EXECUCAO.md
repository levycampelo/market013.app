# Plano Mestre de Execucao — market013.app

## Objetivo principal

Transformar o market013.app em um produto funcional de ponta a ponta: uma pessoa consegue entrar no sistema, aceitar os termos, localizar mercados, montar uma lista, comparar precos reais, receber uma recomendacao de cesta considerando deslocamento, contribuir com novos precos e reportar erros.

A prioridade e entregar um **MVP utilizavel e confiavel**, primeiro na web e depois nas lojas mobile. IA, gamificacao avancada e automacoes de encartes entram somente depois que o fluxo principal funcionar com dados controlados.

## Resultado esperado do MVP

O MVP estara pronto para uma primeira turma de usuarios quando for possivel:

1. Acessar a aplicacao pela web em computador e celular.
2. Criar uma conta ou usar uma sessao identificada.
3. Aceitar Termos de Uso e Politica de Privacidade antes de continuar.
4. Informar a localizacao por permissao do navegador ou por endereco/CEP.
5. Pesquisar produtos e montar uma lista com quantidades.
6. Comparar mercado unico e cesta mista dentro de um raio definido.
7. Considerar uma estimativa configuravel de custo de deslocamento.
8. Ver a recomendacao e a economia estimada com transparencia sobre os dados usados.
9. Cadastrar ou corrigir um preco por formulario e, em seguida, por foto.
10. Reportar um preco incorreto e acessar o canal de suporte.
11. Excluir a conta e os dados conforme a politica definida.
12. Operar com dados reais, monitoramento basico, backups e caminho de retorno em caso de falha.

## Principios de execucao

- **Dados antes de IA:** o comparador precisa funcionar com seed e cadastro manual antes de depender de visao computacional.
- **Algoritmo antes de mapa:** a recomendacao deve ser testada matematicamente antes da interface cartografica.
- **Web antes de mobile:** a web e o caminho mais curto para validar o produto e o comportamento dos usuarios.
- **Privacidade desde o primeiro acesso:** consentimento, minimizacao de dados e exclusao nao sao tarefas de acabamento.
- **Toda funcionalidade tem criterio de aceite:** nao marcar uma etapa como pronta apenas porque a tela existe.
- **Producao controlada:** inicialmente, contribuicoes podem entrar como pendentes para moderacao.

## Estado atual consolidado

### Ja existe no workspace

- Monorepo iniciado com `apps/web`, `backend/database` e `tests/unit`.
- Aplicacao Next.js na web.
- Endpoint `GET /api/health`.
- Endpoint inicial de produtos.
- Migrations e seed do banco no repositorio.
- Configuracao para deploy da web na Vercel.
- TypeScript, build web e suite Vitest registrados como validados no status.
- Deploy inicial da pagina principal na Vercel.

### Precisa ser confirmado antes de ser considerado concluido

- Smoke test local real com `npm run dev` e `GET /api/health`.
- Aplicacao das migrations e do seed no ambiente remoto.
- Conexao da aplicacao em producao com o banco correto.
- PostGIS, caso seja mantido como dependencia.
- Estado real das APIs em producao, pois o status possui informacoes contraditorias.
- Existencia das pastas e ferramentas de integracao/E2E mencionadas no plano anterior.

### Decisao bloqueante de infraestrutura

Escolher e registrar uma unica fonte oficial para o banco de producao:

- **Opcao A:** PostgreSQL Neon integrado a Vercel, conforme os documentos do projeto.
- **Opcao B:** Supabase self-hosted via Docker na VM registrada na infraestrutura.

A implementacao nao deve manter caminhos paralelos. A escolha precisa definir URL, migrations, autenticacao, storage, backups, observabilidade e procedimento de restauracao. Ate essa decisao, tarefas de banco remoto ficam com status **bloqueado**.

# Fases de execucao

## Fase 0 — Decisao e fundacao tecnica

**Objetivo:** deixar o projeto executavel localmente e eliminar ambiguidades de infraestrutura.

### Entregas

- Escolher a infraestrutura oficial de producao e documentar a decisao.
- Confirmar comandos de desenvolvimento, typecheck, build e testes.
- Configurar `.env.example` sem segredos e validar variaveis obrigatorias no startup.
- Executar migrations e seed em banco local.
- Criar dados minimos: 2 ou 3 supermercados, 10 a 20 produtos e precos variados.
- Padronizar respostas e erros das Route Handlers.
- Definir autenticacao minima e identificacao do usuario.
- Criar ambientes separados para local, preview e producao.
- Configurar logs basicos e uma verificacao de saude do banco.

### Criterios de aceite

- Uma pessoa nova consegue instalar dependencias e subir a aplicacao seguindo o README.
- `typecheck`, build e testes passam.
- `GET /api/health` retorna sucesso quando aplicacao e banco estao disponiveis e falha de forma diagnosticavel quando o banco nao esta.
- O seed permite testar o comparador sem servicos externos.
- Nenhum segredo esta versionado.

## Fase 1 — Modelo de dados, catalogo e API basica

**Objetivo:** criar uma base confiavel para produtos, mercados e precos.

### Entregas

- Consolidar tabelas de usuarios, produtos, supermercados, precos e reports.
- Adicionar constraints e indices para preco valido, produto/mercado existentes e consultas por data.
- Definir status de preco: pendente, aprovado, rejeitado ou expirado, conforme necessidade.
- Definir politica para precos antigos e ultima atualizacao visivel.
- Implementar APIs para buscar produtos, mercados proximos e precos.
- Implementar cadastro manual de preco com validacao de valores, origem e data.
- Impedir duplicacoes obvias e registrar autoria da contribuicao.
- Preparar camada de servico para que a regra de negocio nao fique presa a pagina ou Route Handler.

### Criterios de aceite

- A busca retorna produtos por nome, marca e categoria, tolerando acentuacao.
- A listagem mostra origem, data e confiabilidade/status do preco.
- Precos invalidos, produtos inexistentes e mercados inexistentes sao rejeitados.
- APIs possuem testes de contrato e integracao usando o banco de teste.

## Fase 2 — Algoritmo da Cesta Otima

**Objetivo:** validar o diferencial do produto antes de investir em mapas ou automacoes.

### Entregas

- Implementar distancia por Haversine ou provedor de mapas atras de uma interface.
- Definir parametros: raio, consumo medio, preco do combustivel, distancia de ida e volta e custo por parada.
- Calcular pelo menos:
  - mercado unico mais barato;
  - cesta mista entre mercados;
  - economia bruta;
  - custo estimado de deslocamento;
  - economia liquida;
  - itens sem preco.
- Definir regras para empate, dados incompletos, preco expirado e ausencia de mercados.
- Exibir a memoria de calculo para que a recomendacao seja auditavel.

### Criterios de aceite

- Testes unitarios cobrem mercado unico, cesta mista vantajosa, deslocamento que elimina a economia, raio sem mercado, empate e produto sem preco.
- Coordenadas conhecidas produzem distancia dentro de uma tolerancia definida.
- A recomendacao nunca apresenta economia liquida negativa como vantagem.
- O resultado informa claramente quando foi calculado com dados incompletos.

## Fase 3 — Primeiro fluxo utilizavel na web

**Objetivo:** entregar uma experiencia completa com dados manuais e seed.

### Entregas

- Tela de entrada/onboarding.
- Aceite de Termos de Uso e Politica de Privacidade.
- Busca de produtos e montagem da lista com quantidades.
- Escolha de localizacao por navegador ou endereco/CEP manual.
- Tela de resultados com comparacao de mercado unico e cesta mista.
- Detalhes da recomendacao: mercados, itens, precos, distancia, custo e economia liquida.
- Estados de carregamento, vazio, erro e dados desatualizados.
- Responsividade para celular, tablet e desktop.

### Criterios de aceite

- O fluxo completo funciona em uma sessao limpa sem intervencao manual de desenvolvedor.
- Recusar geolocalizacao nao impede o uso: o fallback manual funciona.
- O usuario consegue entender por que uma opcao foi recomendada.
- O layout nao perde informacoes nem controles nos breakpoints suportados.

## Fase 4 — Contribuicao colaborativa e moderacao

**Objetivo:** permitir que a base cresca com contribuicoes reais sem contaminar imediatamente os resultados.

### Entregas

- Formulario de contribuicao manual com confirmacao dos dados.
- Fluxo de foto por upload no navegador.
- Captura por webcam com `getUserMedia` quando disponivel.
- Fallback claro para upload quando a camera for negada ou indisponivel.
- Persistencia de produto, mercado, preco, usuario, data e localizacao somente com consentimento.
- Fila de moderacao para contribuicoes novas.
- Regras de validacao e aprovacao/rejeicao.
- Gamificacao simples apenas depois que contribuicao e moderacao estiverem estaveis.

### Integracao de IA

- Criar `ai-provider` como contrato substituivel.
- Usar mock deterministico nos testes e desenvolvimento.
- Validar a resposta da IA por schema antes de gravar qualquer dado.
- Exigir confirmacao do usuario antes da persistencia.
- Tratar foto ilegivel, campos vazios, preco invalido, timeout, limite e indisponibilidade do provedor.
- Registrar custo, latencia e falhas sem armazenar imagens alem do necessario.

### Criterios de aceite

- Uma contribuicao manual aparece como pendente e nao altera o comparador antes da aprovacao.
- Uma imagem ilegivel nao gera preco inventado.
- A API de IA pode ser substituida por mock sem alterar o restante do fluxo.
- Pelo menos um fluxo de contribuicao esta coberto por teste de integracao.

## Fase 5 — LGPD, seguranca e confiabilidade operacional

**Objetivo:** tornar o MVP apto para usuarios reais com tratamento responsavel de dados.

### Entregas

- Termos de Uso e Politica de Privacidade revisados para o funcionamento real do produto.
- Registro de versao e data do aceite.
- Consentimentos separados para geolocalizacao, camera e uso de imagem, quando aplicavel.
- Minimizacao de dados coletados e politica de retencao.
- Fluxo autenticado de exclusao de conta e dados, com cascata ou anonimização documentada.
- Autorizacao para impedir que um usuario altere dados de outro.
- Validacao de payloads, rate limiting basico e protecao contra abuso de endpoints.
- Nao expor credenciais, dados pessoais desnecessarios ou detalhes internos nos erros.
- Backup, restauracao testada e procedimento para indisponibilidade do banco.

### Criterios de aceite

- Nao e possivel usar funcionalidades protegidas sem aceitar os termos aplicaveis.
- Geolocalizacao e camera somente sao acessadas depois da acao correspondente do usuario.
- A exclusao produz o resultado prometido na politica e pode ser verificada em teste.
- Falhas de permissao e autenticacao retornam respostas seguras e compreensiveis.

## Fase 6 — Reportes, suporte e qualidade dos dados

**Objetivo:** criar um ciclo de correcao que mantenha os resultados uteis.

### Entregas

- Botao de reporte associado ao `price_id`.
- Motivos curtos: preco desatualizado, produto incorreto, mercado incorreto e outro.
- Idempotencia para evitar reportes repetidos do mesmo usuario/preco/motivo.
- Tela ou consulta administrativa para tratar reports pendentes.
- Alteracao de status e registro de resolucao.
- Canal de suporte com link web e deep link mobile quando aplicavel.
- Mensagens de confirmacao e falha no fluxo de reporte.

### Criterios de aceite

- Um reporte grava usuario, preco, motivo, status e data.
- O mesmo reporte nao e duplicado silenciosamente.
- A equipe consegue localizar, resolver e auditar um reporte.
- O link web abre corretamente e nao depende de APIs nativas.

## Fase 7 — Testes, CI e preparacao de beta

**Objetivo:** garantir que o produto continue funcionando a cada alteracao.

### Entregas

- Testes unitarios das regras de negocio.
- Testes de integracao das APIs com banco de teste.
- Testes de contrato das respostas da IA e dos provedores de mapa.
- E2E web com Playwright para onboarding, lista, comparador, contribuicao e reporte.
- Testes de responsividade e fallback de camera/geolocalizacao.
- Cross-browser no minimo em Chromium, Firefox e WebKit.
- CI em cada pull request: typecheck, lint, unit, integration e build.
- Teste de carga pequeno para busca e calculo do comparador.
- Ambiente de preview com dados de teste e sem chaves de producao.
- Grupo pequeno de usuarios para beta fechado e coleta de feedback.

### Criterios de aceite

- O pipeline bloqueia merge quando testes essenciais falham.
- Existe pelo menos um fluxo E2E completo na web.
- O beta consegue concluir a tarefa principal sem suporte do desenvolvedor.
- Bugs de dados, calculo e privacidade possuem prioridade maior que melhorias visuais.

## Fase 8 — Mobile e publicacao

**Objetivo:** levar um produto web validado para Android e iOS sem duplicar regras de negocio.

### Entregas

- Criar app Expo/React Native consumindo as mesmas APIs.
- Compartilhar tipos, validacoes e calculo da cesta quando a arquitetura permitir.
- Implementar camera, geolocalizacao, permissao, notificacoes de erro e deep links nativos.
- Testar Android e iOS em dispositivos reais.
- Preparar icone, splash, screenshots, nome, descricao e politica de privacidade.
- Configurar identificadores, assinatura, variaveis de ambiente e builds de release.
- Publicar primeiro em beta fechado na Google Play e TestFlight.
- Corrigir problemas do beta antes da publicacao ampla.
- Manter a web publicada em dominio proprio com monitoramento.

### Criterios de aceite

- Android e iOS concluem onboarding, lista, comparador, contribuicao e reporte.
- Permissoes sao explicadas e podem ser negadas sem quebrar o app.
- Builds de producao sao reproduziveis e nao contem segredos.
- As lojas aprovam os materiais e a politica de privacidade esta acessivel.

# Ordem pratica de trabalho

1. Resolver a decisao Neon/Vercel versus Supabase self-hosted.
2. Confirmar o que realmente sobe localmente e em producao.
3. Fechar banco, seed, APIs e autenticacao minima.
4. Implementar e testar o algoritmo da cesta.
5. Entregar o fluxo web completo com cadastro manual de precos.
6. Aplicar LGPD, seguranca e exclusao de dados.
7. Adicionar contribuicao por foto, IA com mock e moderacao.
8. Adicionar reportes, suporte e observabilidade.
9. Automatizar CI e E2E e executar beta web.
10. Criar o app mobile e publicar em beta nas lojas.

# Backlog de primeira entrega

A primeira entrega deve conter somente o necessario para provar valor:

- [ ] Infraestrutura oficial decidida e documentada.
- [ ] Banco local funcionando com migration e seed.
- [ ] API de produtos, mercados e precos.
- [ ] Autenticacao ou sessao identificada minima.
- [ ] Algoritmo da cesta implementado com testes.
- [ ] Tela web de lista e resultado.
- [ ] Localizacao por permissao e fallback manual.
- [ ] Aceite de termos.
- [ ] Cadastro manual de preco.
- [ ] Testes unitarios, integracao e um E2E web.
- [ ] Smoke test local e deploy de preview funcionando.

# Definicao geral de pronto

Uma fase somente pode ser marcada como concluida quando:

- a funcionalidade esta implementada no codigo;
- existe teste adequado ao risco;
- os estados de erro e ausencia de dados foram tratados;
- a documentacao ou configuracao necessaria esta atualizada;
- o fluxo foi validado localmente e, quando aplicavel, em preview;
- nao depende de uma acao manual nao documentada;
- metricas ou logs suficientes permitem diagnosticar falhas.

## Indicadores para acompanhar no beta

- Percentual de usuarios que concluem a montagem da lista.
- Tempo ate a primeira recomendacao.
- Percentual de buscas sem preco.
- Percentual de contribuicoes aprovadas.
- Quantidade de reports por mil precos.
- Diferenca entre economia estimada e economia observada quando houver feedback.
- Erros de API, latencia e indisponibilidade.
- Solicitações de exclusao e atendimentos de suporte.

O criterio de sucesso inicial nao e ter todos os modulos sofisticados. E um usuario conseguir tomar uma decisao de compra melhor, com dados suficientemente claros, em poucos passos e sem que a equipe precise corrigir o sistema manualmente a cada uso.
