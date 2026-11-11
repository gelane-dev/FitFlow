---
tags: [fitflow, decisoes, adr]
atualizado: 2026-10-30
---

# Decisões arquiteturais (ADR)

Voltar: [[Home]] · Relacionados: [[Architecture]] · [[Technical-Debt]]

Formato: contexto → decisão → consequências. Status: **Aceita**, **Proposta** (aguarda o usuário), **Substituída**.

---

## ADR-001 Monorepo com `backend/` e `frontend/`
**Status:** Aceita · 30/10/2026
**Contexto:** backend ficava na raiz e o app em `app-academia-mobile/`.
**Decisão:** pastas `backend/` (FastAPI + Alembic) e `frontend/` (Expo). Comandos de backend rodam dentro de `backend/`.
**Consequências:** `.env`, `venv/` e `uploads/` locais precisam ficar em `backend/`.

## ADR-002 Manter a stack atual
**Status:** Aceita
**Decisão:** FastAPI + SQLAlchemy síncrono + PostgreSQL + Alembic; Expo Router + axios. Sem troca para ORM async, Redux/Zustand, UI kits ou React Query nesta etapa.
**Consequências:** qualquer nova tecnologia exige um ADR.

## ADR-003 Manter arquitetura em camadas simples
**Status:** Aceita
**Contexto:** ~2 mil linhas de backend, regras simples. Clean Architecture completa (repositórios, casos de uso) seria complexidade sem retorno agora.
**Decisão:** router → (core/services) → models. Extrair para `services/<dominio>.py` só regras que se repetem ou que crescerem (periodização, avaliação física).
**Consequências:** routers ainda fazem consultas diretas; aceitável enquanto forem finos.

## ADR-004 Testes de backend com SQLite em memória
**Status:** Aceita
**Contexto:** não havia Postgres na máquina de desenvolvimento; os models usam só tipos portáveis.
**Decisão:** pytest + `TestClient` + SQLite (`StaticPool`) com override de `get_db`; Cloudinary substituído por stub.
**Consequências:** diferenças de dialeto (ex.: `ilike`, enums, constraints) não são cobertas. A suíte também roda contra PostgreSQL real com `TEST_POSTGRES_URL` (T-TEC-02, job `backend-postgres` do CI).
**Dependências adicionadas:** `pytest`, `httpx` (exigido pelo `TestClient`) em `requirements-dev.txt`.

## ADR-005 Dependências de runtime declaradas
**Status:** Aceita
**Decisão:** incluir em `requirements.txt` os pacotes que o código já importava/precisava e não estavam declarados: `cloudinary`, `uvicorn`, `alembic`, `psycopg2-binary`, `email-validator`, `python-multipart`, `pwdlib[bcrypt]`.
**Justificativa:** sem eles a instalação limpa não sobe a API. Não são dependências novas de funcionalidade.

## ADR-006 Contratos da API preservados na Fase 0
**Status:** Aceita
**Decisão:** paths, status, campos e mensagens `detail` não mudam na refatoração. Única mudança: usuário inexistente com token válido passa de 500 para 401.

## ADR-007 Exclusão lógica como padrão
**Status:** Aceita (já praticada no código)
**Decisão:** `ativo=False` para exercício, ficha, treino e item com histórico; leituras sempre filtram ativos.

## ADR-008 Vault do Obsidian em `docs/`
**Status:** Aceita
**Contexto:** o repositório não tinha vault configurado. Usar a raiz como vault indexaria `node_modules` e código.
**Decisão:** vault em `docs/`; `.obsidian/workspace*.json` ignorado no git.

## ADR-009 Fluxo de trabalho: implementação, revisão de código e QA
**Status:** Aceita
**Decisão:** cada tarefa é planejada, implementada com testes, passa por revisão de código (que não altera o código) e por QA (execução dos testes e validação dos fluxos) antes de ser considerada concluída. Se a revisão ou o QA reprovar, a tarefa volta para a implementação.

## ADR-010 Correção do bug de IDs sem migração de dados
**Status:** Aceita pelo usuário · 30/10/2026
**Contexto:** `verificar_professor`/`verificar_aluno` retornavam `User`, e os routers usavam `user.id` como id de perfil (FKs para `professores.id`/`alunos.id`). Só funcionava quando os ids coincidiam.
**Decisão:** as dependências passam a retornar `Professor`/`Aluno`. Usuário com tipo certo sem linha de perfil → 403. Dados existentes **não** são migrados automaticamente; SQL de diagnóstico em [[Database#⚠️ Diagnóstico de dados — bug de IDs (corrigido na Fase 0)]].
**Consequências:** testes rodam com ids divergentes e `PRAGMA foreign_keys=ON`.

## ADR-011 Remover rota duplicada de detalhe de exercício
**Status:** Aceita pelo usuário · 30/10/2026
**Decisão:** apagar `frontend/src/app/exercicios/[id].tsx` (versão do commit inicial); manter `exercicios/[id]/index.tsx`.

---

## ADR-012 Foto de perfil no Cloudinary
**Status:** Aceita (decisão do arquiteto, autorizada pelo usuário) · 30/10/2026 — substitui ADR-P01
**Contexto:** foto em disco local com caminho relativo some em deploy com disco efêmero e é inconsistente com os exercícios.
**Decisão:** `PUT /perfil/foto` envia ao Cloudinary e grava `users.foto` (URL) + `users.foto_public_id` (migração aditiva, nullable). `GET /perfil` passa a expor `foto`. `GET /perfil/foto` redireciona (307) para a URL; fotos antigas locais continuam sendo servidas do disco (compatibilidade).
**Consequências:** nenhuma tela usava a foto, então nada quebra no app.

## ADR-013 `GET /exercicios` exige login
**Status:** Aceita · substitui ADR-P02
**Decisão:** qualquer usuário autenticado (aluno, professor, admin) lista exercícios; sem token → 401. `GET /exercicios/{id}` continua só para professor (o aluno recebe os dados do exercício dentro dos itens do treino).
**Motivo:** não expor a biblioteca publicamente; o app já envia o token em todas as chamadas.

## ADR-014 Listas vazias retornam `[]`
**Status:** Aceita · substitui ADR-P03 · **aplicada nas Fases 3-4** (T-S8-01; ver [[Contrato-Fases-3-5]])
**Decisão:** `/ficha/aluno`, `/ficha/progresso` e `/treino/hoje/{ficha_id}` retornam 200 + `[]`.

## ADR-015 Sessão no app
**Status:** Aceita
**Decisão:** `GET /perfil` passa a retornar `tipo` e `foto` (mudança aditiva). O `AuthContext` restaura a sessão ao abrir o app (token no SecureStore → `GET /perfil`), guarda o usuário e a navegação é separada por perfil. Um interceptor de resposta trata 401 apagando o token e voltando ao login. Sem refresh token por ora: expiração configurável por `JWT_EXPIRA_MINUTOS` (padrão 30).

## ADR-016 Fuso horário da aplicação
**Status:** Aceita
**Decisão:** `APP_TIMEZONE` (padrão `America/Sao_Paulo`) via `zoneinfo` para "treino de hoje" e datas geradas pelo servidor. Dependência `tzdata` adicionada porque o Windows não traz a base de fusos para o `zoneinfo`.

**Adendo (31/10/2026, FX-C): datetimes da API saem com offset.** Os valores continuam gravados naive em `APP_TIMEZONE`, mas toda resposta serializa `datetime` em ISO 8601 **com o offset de `APP_TIMEZONE`** (ex.: `2026-10-31T10:00:00-03:00`), pelo tipo `DataHoraLocal` (`core/tempo.py`) usado nos schemas de resposta. É o mesmo instante, agora sem ambiguidade: antes o JS lia a string naive no fuso do aparelho e a duração do Resumo do treino errava em 3 h num aparelho em UTC (QA P-A, I-02). Entrada continua aceitando datas com ou sem fuso. Datas puras (`date`) não mudam. No app, `lerInstante` (`utils/datas.ts`) interpreta o offset (e assume `-03:00` se faltar) e as telas continuam exibindo o horário do texto recebido, que é o de Brasília.

## ADR-017 CORS configurável e admin inicial por comando
**Status:** Aceita
**Decisão:** `CORS_ORIGINS` (lista separada por vírgula; padrão `*` sem credenciais, para não quebrar o Expo em dev). Admin inicial criado com `python -m app.scripts.criar_admin`.

## ADR-018 Fases 1 e 2
**Status:** Aceita
**Decisão:** Fase 1 = fechar a Semana 1 (banco): validação das migrações num PostgreSQL vazio, migração da foto, fuso. Fase 2 = fechar a Semana 2 (autenticação, perfis e permissões) de ponta a ponta: contrato de perfil, expiração, CORS, permissão de exercícios, admin inicial, e no app sessão persistente, navegação por perfil, 401 e tela de perfil.
**Execução:** backend e frontend implementados em paralelo, depois revisão de código e QA (ADR-009).

## ADR-019 Preencher a migração inicial vazia
**Status:** Aceita · 30/10/2026
**Contexto:** o QA descobriu que `2b58ed61c57b_create_initial_tables` tinha só `pass`. As tabelas-base foram criadas fora do Alembic, e `alembic upgrade head` falhava num banco vazio.
**Decisão:** preencher essa revisão com o schema-base como era naquele ponto, sem mudar o id. É uma exceção consciente à regra "não editar migrações aplicadas": bancos existentes já têm a revisão e não a reexecutam, então ninguém é afetado, e bancos novos passam a ser criados só com `alembic upgrade head`.

## ADR-020 Periodização por vigência da ficha
**Status:** Aceita · 30/10/2026
**Decisão:** `fichas.data_inicio`/`data_fim` (opcionais) e o campo calculado `vigente`. Não criei "ciclos/mesociclos" como entidade separada.
**Motivo:** resolve o caso real (o aluno troca de ficha a cada X semanas) com 2 colunas, sem complexidade. Ciclos ficam no [[Backlog]].

## ADR-021 Sessão de treino
**Status:** Aceita
**Decisão:** nova tabela `sessoes_treino` agrupa as execuções de um treino (início, fim, esforço percebido 1–10, comentário). `historicos_execucao.sessao_id` é opcional, para manter o `POST /ficha/treino` antigo. Cada série concluída no app vira um registro (`series_realizadas = 1`) e é gravada na hora. Assim nada se perde se o app fechar no meio do treino.
**Consequências:** feedback (S4-02) e registro em lote (S4-03) ficam no mesmo recurso (`/sessoes/{id}/execucoes` aceita uma lista).

## ADR-022 Professores acessam todos os alunos
**Status:** Substituída pelo escopo do professor (ADR-033/ADR-038): hoje o professor só acessa alunos vinculados
**Decisão:** qualquer professor vê histórico, evolução e avaliações de qualquer aluno, e cria avaliações para eles. Editar/excluir avaliação: só o autor.
**Motivo:** coerente com `GET /alunos`, que já lista todos (uma academia). Para várias academias, rever (TD-12).

## ADR-023 Gráficos sem biblioteca
**Status:** Aceita
**Decisão:** gráfico de barras simples com `View`s (componente `GraficoEvolucao`), sem instalar lib de gráficos.
**Motivo:** para uma série de carga/volume não precisa de dependência nativa nova (svg/skia).

## ADR-024 Lembretes com notificações locais
**Status:** Aceita
**Decisão:** `expo-notifications` (dependência nova, instalada com `npx expo install`) só para lembrete diário **local**, configurado pelo aluno. Sem push nem servidor.
**Motivo:** cumpre "notificações" da Semana 10 sem infraestrutura nova.
**Adendo (Expo Go Android):** no Expo Go para Android (SDK 53+) o `expo-notifications` não está completo e o import estático lançava `Cannot find native module 'ExpoTopicSubscriptionModule'` na carga de `lembretes.ts` (importado pelo `AuthContext`), derrubando o app inteiro. Agora o módulo é carregado sob demanda (`require` em função, com `try/catch` e cache) e `lembretesSuportados()` é uma função: falsa na web, no Expo Go para Android (`Constants.executionEnvironment === StoreClient` e `Platform.OS === 'android'`, via `expo-constants`, já instalado) ou se o `require` falhar. Sem suporte, as funções viram no-op seguro (`cancelarLembretes` nunca lança) e `/aluno/lembretes` mostra aviso. Lembretes funcionam no development build.

## ADR-025 Testes de frontend com jest-expo
**Status:** Aceita
**Decisão:** `jest-expo` + `@testing-library/react-native` (devDependencies) para lógica pura (`src/utils`), services e hooks principais.
**Motivo:** é o padrão oficial do Expo e não exige dispositivo.
**Dependências:** devDependencies `jest`, `jest-expo` e `@types/jest` (runner e preset oficiais do Expo SDK 57), `@testing-library/react-native` (`renderHook` para os hooks), `eslint` e `eslint-config-expo` (lint padrão do Expo, usado por `npm run lint`).

## ADR-026 E2E no navegador com Playwright sobre o build web
**Status:** Aceita
**Decisão:** os fluxos de professor e aluno são testados de ponta a ponta com Playwright, contra `expo export --platform web` servido localmente e a API em SQLite. `secureStorage` ganha fallback para `localStorage` na web, porque o SecureStore não existe lá.
**Motivo:** não há dispositivo ou emulador no ambiente, e o Maestro exige um. O build web executa o mesmo código das telas.
**Risco registrado (revisão final, D-05):** na web o token fica em `localStorage`, exposto a XSS. Hoje a web só serve ao E2E; não publicar a web sem rever (TD-40). Sem teste unitário do ramo web de `secureStorage.ts`.

## ADR-027 CI no GitHub Actions
**Status:** Aceita
**Decisão:** workflow com backend (pytest em SQLite + pytest de migrações num serviço Postgres) e frontend (typecheck + jest). O E2E fica fora do CI por ora, por ser pesado.

## ADR-028 Reordenação de itens atômica no backend
**Status:** Aceita · 30/10/2026
**Contexto:** a revisão apontou que trocar a ordem com 3 `PUT` seguidos deixa o treino inconsistente se um deles falhar.
**Decisão:** novo `PUT /treino/{treino_id}/itens/ordem`, que aplica todas as ordens em uma transação. O app passa a usá-lo.

## ADR-029 Idempotência de sessão garantida pelo banco
**Status:** Aceita
**Decisão:** índice único parcial `(aluno_id, treino_id) WHERE finalizada_em IS NULL`. Se dois toques simultâneos criarem duas sessões, o segundo recebe a sessão já existente.

## ADR-030 Alertas multiplataforma e recarga no foco
**Status:** Aceita · 30/10/2026
**Contexto:** o E2E mostrou que `Alert.alert` não faz nada no react-native-web. Na web, o usuário não recebia confirmação, e as navegações disparadas pelo botão do alerta não aconteciam. As listas também não recarregavam ao voltar para a tela.
**Decisão:** `src/utils/alerta.ts` com `mostrarAlerta(titulo, mensagem, botoes?)`. No nativo, delega para `Alert.alert`. Na web, usa `window.alert`/`window.confirm` e executa o `onPress` do botão escolhido. Todas as telas usam essa função. As listas passam a recarregar com `useFocusEffect`.

**Adendo (31/10/2026, rodada de correções FX-A): alerta com tema próprio.** O diálogo nativo branco destoava do tema escuro (QA P-01). `mostrarAlerta` mantém a assinatura, mas agora abre o modal `DialogoAlerta` (`components/ui`) por meio do `ProvedorAlerta` (`contexts/AlertaContext.tsx`), montado no `_layout` raiz; funciona igual no nativo e na web (substitui também `window.alert`/`window.confirm`). `utils/alerta.ts` guarda o exibidor registrado (`registrarExibidorAlerta`); **sem o provider montado** (testes, falha de boot) cai no comportamento anterior (`Alert.alert` no nativo, `window.alert/confirm` na web). Alertas simultâneos entram numa fila. Botões: `default`, `destructive` e `cancel`; o Voltar do Android só dispensa se houver `cancel`. Nenhuma dependência nova. O E2E passou a aceitar o modal (`dialogo-alerta`) por um laço em segundo plano em vez de `page.on('dialog')`.

## ADR-031 Redesenho de UI/UX: design system, abas e três dependências do Expo
**Status:** Aceita · 31/10/2026
**Contexto:** a UI era uma sequência de telas com botões "‹ Voltar" e listas de atalhos, sem navegação persistente e com cores fixas espalhadas pelo código. O pedido do usuário foi um app "com cara de app" (referências: Strava, Nike Run Club), mantendo só a identidade preto + amarelo da academia.
**Decisão:**
1. **Design system** em `src/theme` (cores, tipografia, espaçamento, raios) e `src/components/ui` (componentes em português), documentado em `docs/Design-System.md`. Nenhuma tela usa hexadecimal solto.
2. **Dependências** (todas oficiais do Expo, presentes no Expo Go do SDK 57, instaladas com `npx expo install`): `@expo/vector-icons` (ícones Ionicons; já era dependência transitiva), `expo-linear-gradient` (hero e gradiente de destaque) e `expo-haptics` (feedback tátil). Não entram UI kits nem bibliotecas de navegação: as abas usam o `Tabs` do expo-router com uma `tabBar` própria (`BarraAbas`).
3. **Rotas em grupos** do Expo Router (os nomes entre parênteses não aparecem na URL, então **nenhum path muda**): `(publico)` (login e cadastro), `(professor)` e `(aluno)`. Cada perfil tem um `Stack` cuja âncora é o grupo `(abas)` (Tabs + `BarraAbas`); telas de detalhe e de fluxo ficam no Stack, por cima das abas e sem barra. `Stack.Protected` por perfil continua no layout raiz (o admin vê a área do aluno).
4. **Destino após o login**: a guarda de rotas escolhe o primeiro grupo liberado. Professor cai em `/painel` (novo painel de início); aluno e admin caem em `/aluno`.
5. **Início do professor em `/painel`**: `/` é o login e `/professor` não existia; `/painel` é um path novo, curto e sem conflito.
6. **Aba Treinos do aluno em `/aluno/treinos`** (path novo), reaproveitando `useMinhasFichas` e `useMinhasFichaCompleta`.
7. **Perfil compartilhado**: o conteúdo mora em `components/PerfilConteudo.tsx` e cada área de abas tem o seu `perfil.tsx` (que só renderiza o componente), para a barra aparecer nas duas áreas. Ver "Rota /perfil" abaixo.
**Rota /perfil:** o mesmo path existe em `(professor)/(abas)/perfil.tsx` e `(aluno)/(abas)/perfil.tsx`. Funciona porque o `Stack.Protected` deixa só um grupo ativo por perfil (verificado no E2E-07 e E2E-10).
**Web:** o react-native-screens não esconde abas inativas; `CenaAba` (via `screenLayout`) aplica `display: none` nelas.
**Consequências:** o E2E passa a navegar pelas abas (`testID` `aba-<Rótulo>`, `botao-voltar`, `botao-sair`); as telas antigas continuam funcionando enquanto são migradas para os componentes de `ui` (`Button` e `Input` viraram wrappers de `Botao` e do campo com tokens).

## ADR-032 Gráficos de linha com react-native-svg
**Status:** aceita (07/11/2026). Complementa o ADR-023 e abre exceção à lista de dependências do ADR-031.
**Contexto:** a seção Evolução precisa de gráficos de linha por exercício e por indicador físico. O ADR-023 dispensou bibliotecas porque barras com `View` bastavam para uma série simples.
**Decisão:** adicionar `react-native-svg` na versão do Expo SDK 57 (15.15.4), instalada com `npx expo install`, e desenhar a linha em um componente próprio. Nenhuma biblioteca de gráficos é adicionada. O `GraficoEvolucao` de barras continua nas telas do professor e no detalhe do exercício.
**Motivo:** é módulo oficial do SDK, já existe no Expo Go e funciona na web. Simular linhas com `View` giradas é frágil e pior de manter.
**Consequências:** o app ganha uma dependência nativa. Contrato em `docs/contracts/Contrato-Evolucao.md`.

## ADR-033 Papéis com permissões da recepção (RBAC)
**Status:** aceita (09/11/2026).
**Contexto:** a academia passa a ter admin, recepção, professor e aluno. A recepção precisa de permissões ajustáveis pelo admin.
**Decisão:** papel fixo em `users.tipo` (novo valor `recepcao`) e, só para a recepção, uma lista de permissões em `recepcionistas.permissoes`. Dependências `exigir_papeis` e `exigir_permissao` no backend; o professor passa a ver só alunos vinculados (`alunos.professor_id`). Nenhuma rota muda `tipo`.
**Motivo:** cobre o pedido sem tabelas genéricas de papel/permissão, que o sistema não precisa.
**Consequências:** mudança intencional de escopo no `GET /alunos` do professor; a migração vincula cada aluno ao professor da ficha ativa mais recente. Contrato em `docs/contracts/Contrato-Gestao.md`.

## ADR-034 Sessão web em cookie HttpOnly
**Status:** aceita (09/11/2026). Substitui o ADR-026 na web e resolve o TD-40.
**Decisão:** o login grava o JWT em cookie `HttpOnly` (`SameSite` e `Secure` configuráveis); a web não guarda token e envia `X-FitFlow-Client: web` em escritas (proteção CSRF). O mobile continua com SecureStore e Bearer.
**Motivo:** admin e recepção vão usar a web de verdade; token em `localStorage` fica exposto a XSS.

## ADR-035 Matrícula, pagamento e entrada
**Status:** aceita (09/11/2026).
**Decisão:** matrícula com status gravado (`ativa`, `encerrada`, `substituida`, `cancelada`) e situação calculada pela data (vigente, vencendo, vencida). Pagamentos só manuais, nunca apagados (estorno). Entrada avaliada no servidor e gravada em `acessos`, com `origem` e `alunos.codigo_acesso` preparados para leitor futuro. Frequência = entradas liberadas.
**Motivo:** vencimento calculado não depende de tarefa agendada; histórico financeiro auditável.

## ADR-036 Auditoria na mesma transação
**Status:** aceita (09/11/2026).
**Decisão:** tabela `auditoria` gravada por `services/auditoria.py` antes do `commit` de cada operação de gestão, com usuário, ação, entidade e detalhes.

## ADR-037 Ficha com rascunho e versões
**Status:** aceita (09/11/2026).
**Decisão:** `fichas.status` (`rascunho`/`publicada`, padrão `publicada` para manter o app atual) e `fichas_versoes` com cópia JSON a cada publicação. O aluno só vê fichas publicadas. Interface web do professor sobre o mesmo Expo Router, com sidebar em telas largas (sem nova tecnologia).

## ADR-038 Fichas acompanham o aluno na troca de professor
**Status:** aceita (09/11/2026). Complementa o ADR-033 (achado da revisão de back-end da expansão).
**Decisão:** o professor só gerencia fichas e avaliações de aluno **vinculado a ele**. Quando o admin troca o professor do aluno (`PUT /admin/alunos/{id}/professor` ou `transferir-alunos`), as fichas ativas do aluno passam para o novo professor (`fichas.professor_id`); avaliações mantêm o autor, e só o professor vinculado edita (o admin lê, não edita avaliações). Aluno sem professor: só o admin gerencia as fichas dele.
**Motivo:** o novo responsável precisa continuar o treino; o antigo perde o acesso junto com o vínculo. Autoria fica nas versões e na auditoria.

## Propostas aguardando decisão

Nenhuma no momento (ADR-P01→012, P02→013, P03→014).
