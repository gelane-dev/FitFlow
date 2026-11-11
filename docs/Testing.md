---
tags: [fitflow, testes]
atualizado: 2026-11-10
---

# Testes

Voltar: [[Home]] · Relacionados: [[Decisions#ADR-004 Testes de backend com SQLite em memória]]

## Estratégia

| Nível | Ferramenta | Onde | Situação (10/11/2026) |
|---|---|---|---|
| Unidade/integração backend (SQLite) | pytest + `TestClient` + SQLite em memória (`StaticPool`, `PRAGMA foreign_keys=ON`) | `backend/tests/` | ✅ 539 passam + 1 skipped (eram 192 em 31/10 e 177 em 30/10) |
| Backend em PostgreSQL real | pytest com `TEST_POSTGRES_URL` (postgres:16; nome do banco com "test" — `banco_seguro.py`) | `backend/tests/` | ✅ suíte completa mais `test_migracoes` (upgrade → downgrade base → upgrade + `alembic check`); o skip de SQLite deixa de existir (última contagem registrada em Postgres: 178 em 30/10, antes da gestão) |
| Banco novo só com Alembic | `alembic upgrade head` + `alembic check` + `\dt` | manual (QA) | ✅ 16 migrações, 11 tabelas, índice parcial `uq_sessoes_treino_aberta` (30/10; a cadeia agora tem 18 migrações e 20 tabelas, validada pelo `test_migracoes` em Postgres) |
| Fluxo completo via API | pytest (`test_fluxo_completo.py`, `test_fluxo_fases_3_5.py`) + smoke HTTP manual (uvicorn + Postgres) | `backend/tests/` | ✅ |
| Frontend unidade/hooks/services | jest-expo + Testing Library (`npm test`) | `frontend/src/**/__tests__/` | ✅ 68 suítes, 890 testes (eram 37 / 352 em 31/10 e 17 / 136 em 30/10) |
| Lint frontend | ESLint via `expo lint` (`npm run lint`) | `frontend/` | ✅ 0 erros, 31 avisos conhecidos (TD-38) |
| Typecheck frontend | `tsc --noEmit` (`npm run typecheck`) | `frontend/` | ✅ sem erros |
| Build web | `expo export --platform web` | `frontend/` | ✅ 30 rotas estáticas |
| E2E no navegador | Playwright (Chromium) sobre API real em SQLite temporário + build web | `e2e/` | ✅ 14 cenários (E2E-01 a E2E-14; eram 10 em 31/10 e 9 em 30/10) |
| Instalação limpa do frontend | `npm ci` | `frontend/` | ✅ após o reteste (QA-02 corrigido) |

Princípios:
- Banco limpo por teste (`create_all`/`drop_all`), `get_db` sobrescrito, Cloudinary substituído por stub (sem rede).
- **Ids divergentes**: a fixture `ids_divergentes` cria usuários extras para que `users.id ≠ professores.id/alunos.id` — impede a volta do bug TD-26.
- Todo endpoint novo ou corrigido ganha teste. Resultados só são registrados aqui depois de executados.

## Como rodar

```bash
cd backend
pip install -r requirements.txt -r requirements-dev.txt
pytest -q

cd ../frontend
npm install
npm run typecheck
npm run lint
npm test

cd ../e2e
npm install
npx playwright install chromium   # só na primeira vez
npm test
```

Contagens esperadas hoje: `pytest -q` → 539 passed + 1 skipped (sem `TEST_POSTGRES_URL`); `npm test` → 68 suítes, 890 testes; `npm run lint` → 0 erros, 31 avisos; `npm test` em `e2e/` → 14 cenários.

### QA e E2E

Roteiro de QA antes de considerar uma tarefa concluída (cada passo registra o comando e a saída real):

1. `cd backend && pytest -q` (SQLite) e, quando houver mudança de model ou migração, o mesmo com `TEST_POSTGRES_URL` (abaixo), incluindo `alembic check`.
2. `cd frontend && npm run typecheck && npm run lint && npm test`.
3. `cd e2e && npm test` (14 cenários sobre o build web; leva alguns minutos). O `globalSetup` cria banco SQLite temporário, sobe a API com `CORS_ORIGINS` igual à origem do app web (o cookie `fitflow_sessao` exige origem explícita), cria admin, professor, uma recepcionista com `liberar_acesso_manual` e o plano mensal, gera o build web, serve tudo em portas livres e o teardown encerra só os processos que criou. Pré-requisitos: `npm install` em `frontend/`, venv do backend em `backend/venv` e `npx playwright install chromium` (uma vez). Relatório HTML em `%TEMP%/fitflow-e2e-resultados/relatorio-html`. Variáveis opcionais (`E2E_SAIDA`, `E2E_API_PORT`, `E2E_WEB_PORT`, `E2E_WEB_DIR`) em `e2e/README.md`.
4. Para a gestão: dados de demonstração com `python -m app.scripts.criar_demo` (idempotente; senha `Demo@1234`; percorre os 7 dias da semana) e `python -m app.scripts.criar_admin --email ...`.

PostgreSQL (banco descartável; o nome precisa conter `test`):

```bash
docker run -d --name fitflow-qa-pg -e POSTGRES_PASSWORD=qa -e POSTGRES_DB=fitflow_test -p 15432:5432 postgres:16
cd backend
TEST_POSTGRES_URL=postgresql://postgres:qa@localhost:15432/fitflow_test venv/Scripts/python -m pytest -q
docker rm -f fitflow-qa-pg
```

## Arquivos de teste

### Backend (`backend/tests/`)


| Arquivo | Cobre |
|---|---|
| `conftest.py` | engine SQLite, FK ligada, fixtures de admin/professor/aluno com token, `ids_divergentes`, stub do Cloudinary |
| `test_auth.py` | cadastro, login, e-mail duplicado, senha errada, `/perfil` com/sem token, 403 por perfil, usuário removido → 401, perfil sem linha → 403, admin cria professor |
| `test_exercicios.py` | CRUD, paginação/busca, exclusão lógica, upload com stub |
| `test_fichas.py` | ficha → treino → item, conflitos 409, 403 de professor não dono, exclusões lógicas, histórico e progresso |
| `test_ids_perfil.py` | posse por id de perfil com ids divergentes; ordem e filtros de `GET /ficha/{id}` e `/treino/hoje` |
| `test_config.py` | `SQL_ECHO` padrão false, `RuntimeError` sem `DATABASE_URL`/`SECRET_KEY` (subprocesso), alembic sem `SECRET_KEY` |
| `test_fase2_backend.py` | `/perfil` e `/cadastro` com `tipo`/`foto`, `JWT_EXPIRA_MINUTOS`, token expirado/inválido → 401, `GET /exercicios` sem token, CORS, `criar_admin` (função, `main`, aviso de `--senha`), foto de perfil (Cloudinary, legada local, falha ao apagar), fuso `APP_TIMEZONE` em `treino/hoje` e `data_criacao` |
| `test_migracoes.py` | cadeia com uma única head; com `TEST_POSTGRES_URL`: upgrade head → downgrade base → upgrade head + `alembic check`. Em SQLite o teste de Postgres fica *skipped* (`ALTER ADD CONSTRAINT`) |
| `test_avaliacoes.py` | avaliação física: criar/listar/editar/excluir, autoria do professor, IMC, validações, visão do aluno |
| `test_sessoes.py` | sessões de treino: abrir (idempotente), execuções em lote, finalizar (esforço/comentário), 404/409, posse |
| `test_evolucao.py` | evolução de carga por exercício (aluno e professor), 404 sem registros |
| `test_vigencia.py` | `data_inicio`/`data_fim`/`vigente` da ficha, validação 400, ordenação das fichas do aluno |
| `test_visao_professor.py` | professor consulta aluno, histórico e sessões do aluno |
| `test_correcoes_revisao.py` | regressões dos achados das revisões de código |
| `test_banco_seguro.py` + `banco_seguro.py` | trava que impede a suíte de rodar em banco cujo nome não contém `test` |
| `test_fluxo_fases_3_5.py` | fluxo ponta a ponta das fases 3–5 (sessão, evolução, avaliação) |
| `test_fluxo_completo.py` | admin → professor → aluno → exercício/ficha/treino/item → aluno lê, registra e consulta progresso → exclusão do treino; sanidade da FK |
| `test_gestao_base.py` | autenticação por cookie (CSRF com `X-FitFlow-Client`, `POST /logout`), contas desativadas (401), cadastro pendente/aprovado/recusado, permissões, escopo do professor, configuração e auditoria |
| `test_gestao_permissoes.py` | `exigir_papeis` e `exigir_permissao` por rota: admin passa sempre, recepção só com a permissão, professor/aluno → 403 |
| `test_gestao_alunos.py` | `/gestao/alunos` (cadastro, edição, aprovação, listagem filtrada e paginada) e `/admin/alunos/{id}/...` (status, professor, restrição) |
| `test_gestao_equipe.py` | professores, recepcionistas, planos (admin) e auditoria: listagem com totais, detalhe, status, permissões, transferência de alunos |
| `test_gestao_matriculas.py` | matrículas: matricular, renovar, alterar plano, cancelar, listagem e pagamentos gerados |
| `test_gestao_pagamentos.py` | registrar, avulso, estorno, inadimplência, comprovante, validações |
| `test_gestao_acessos.py` | controle de entrada: `avaliar_acesso` (todos os motivos), verificar, registrar, forçar liberação, listagem |
| `test_gestao_paineis.py` | dashboards do admin e da recepção e financeiro, com números conferidos contra dados criados no teste |
| `test_perfil_recepcao.py` | `GET`/`PUT /perfil/recepcao` |
| `test_professor_web.py` | rascunho/publicação/versões e duplicação de fichas, admin em fichas, treino sem dia, observação do item, exercícios, circunferências, dashboard e frequência |
| `test_correcoes_ga05.py` | correções dos achados da revisão de código da gestão (escopo do professor, ADR-038, CPF, concorrência) |
| `test_migracao_gestao.py` | migração `b7c8d9e0f1a2` aplicada sobre o schema anterior em SQLite |
| `gestao_fabrica.py` | funções auxiliares de criação de dados (não é um arquivo de teste) |

### Frontend (jest — `frontend/src/**/__tests__/`)

| Arquivo | Cobre |
|---|---|
| `hooks/__tests__/useCronometro.test.ts`, `useSessaoExecucao.test.ts` | cronômetro de descanso; hook da sessão de execução |
| `services/__tests__/api.test.ts`, `services.test.ts` | interceptor 401/sessão expirada; chamadas HTTP dos services |
| `utils/__tests__/` `alerta`, `avaliacaoForm`, `avaliacoes`, `busca`, `cronometro`, `datas`, `erroApi`, `evolucao`, `lembretes`, `ordem`, `params`, `sessao`, `vigencia` (`.test.ts`) | lógica pura de utilidades (13 arquivos) |

Os testes também cobrem, além dos listados: contextos (`AuthContext`, cookie na web), `storage/secureStorage`, hooks da gestão (`useAdmin*`, `useGestao*`, `useRecepcao*`, `useProfessor*`, `useMontadorFicha`), componentes de `components/ui` (inclusive `TabelaDados`, `Modal`, `Paginacao`, `GraficoBarras`/`GraficoLinha`), `components/gestao`, `components/professor` e utils novos (`moeda`, `situacao`, `rotas`, `paginacao`, `montadorFicha`, `horarios`, `painelAdmin`...).

Total atual: 68 suítes, 890 testes (`npm test`; `npm run test:ci` em CI).

### E2E (Playwright — `e2e/`)

| Arquivo | Cobre |
|---|---|
| `tests/fluxos.spec.ts` | E2E-01 a E2E-14: cadastro pendente → aprovação pela recepção → login, professor cria exercícios+ficha+treino+itens, aluno executa treino e vê histórico, avaliação física, guarda de rota, sessão por cookie/cookie inválido, perfil, novo exercício na lista sem recarregar, reordenação de itens, evolução, entrada liberada/bloqueada/liberação manual na recepção, montador de fichas (rascunho invisível, publicar visível), painel do admin (GA-10) |
| `global-setup.ts` + `scripts/preparar.js`, `scripts/criar_schema.py` | banco SQLite temporário, API, admin/professor, build web e servidor estático; teardown apaga tudo |

## Estado atual — gestão da academia (10/11/2026)

Contagens registradas ao fechar a expansão de gestão (GA-01 a GA-11): backend **539 testes + 1 skipped** em 31 arquivos; frontend **899 testes em 68 suítes**; E2E **14 cenários**; lint **0 erros e 31 avisos** (TD-38); typecheck sem erros. A suíte em PostgreSQL e o `alembic check` continuam exigindo `TEST_POSTGRES_URL`. O CI do GitHub ainda não foi executado (TD-42) e o E2E segue fora do CI (ADR-027).

O histórico das rodadas anteriores, com os comandos e as saídas de cada QA, segue abaixo.

## Resultados

### Entrega final — 30/10/2026

Veredito do QA: **APROVADO** após o reteste abaixo (a 1ª rodada foi REPROVADA apenas por QA-02 (`npm ci` do frontend falha; Q1–Q3 e Q5–Q8 passaram, e Q4 passou exceto o `npm ci`). QA-03 e QA-04 eram observações não bloqueantes). Tudo foi executado do zero nesta rodada; nenhum código de implementação foi alterado.

| Critério | Resultado | Evidência |
|---|---|---|
| Q1 Backend em SQLite | ✅ | `cd backend && venv/Scripts/python -m pytest -q` → `177 passed, 1 skipped, 1 warning in 184.59s (0:03:04)` (warning: `StarletteDeprecationWarning` do `httpx`) |
| Q2 Backend em PostgreSQL 16 | ✅ | container `postgres:16` na porta 15432, `POSTGRES_DB=fitflow_test`; `TEST_POSTGRES_URL=postgresql://postgres:qa@localhost:15432/fitflow_test pytest -q` → `178 passed, 1 warning in 208.39s (0:03:28)`, 0 skipped. `test_migracoes.py -v`: `test_upgrade_downgrade_upgrade_e_check_em_postgres PASSED`, `test_cadeia_de_migracoes_tem_uma_unica_head PASSED`. O Docker Desktop estava parado e foi iniciado de `%LOCALAPPDATA%\Programs\DockerDesktop` (não existe em `C:\Program Files`) |
| Q3 Banco novo só com Alembic | ✅ | banco vazio `fitflow_novo` no mesmo container; `alembic upgrade head`: 16 migrações (`-> 2b58ed61c57b` … `e4f5a6b7c8d9 -> f5a6b7c8d9e0`) sem erro; `alembic check` → `No new upgrade operations detected.`; `\dt`: alembic_version, alunos, avaliacoes_fisicas, exercicios, fichas, historicos_execucao, itens_ficha, professores, **sessoes_treino**, treino, users (11); `pg_indexes`: `CREATE UNIQUE INDEX uq_sessoes_treino_aberta ON public.sessoes_treino USING btree (aluno_id, treino_id) WHERE (finalizada_em IS NULL)` |
| Q4a `npm ci` (1ª rodada) | ❌ (corrigido, ver reteste) | `EUSAGE`: `Invalid: lock file's eslint-config-expo@58.0.4 does not satisfy eslint-config-expo@57.0.2` (QA-02). Os passos seguintes rodaram sobre o `node_modules` já instalado |
| Q4b `npm test` (jest) | ✅ | `Test Suites: 17 passed, 17 total`; `Tests: 136 passed, 136 total`; 3.678 s |
| Q4c `npm run lint` | ✅ | `✖ 30 problems (0 errors, 30 warnings)` (avisos conhecidos, TD-38), exit 0 |
| Q4d `npm run typecheck` | ✅ | `tsc --noEmit` sem erros |
| Q4e `expo export --platform web` | ✅ | saída em `%TEMP%\fitflow-export-qa` (fora do repositório), 1078 módulos, 30 rotas estáticas: `/`, `/fichas`, `/perfil`, `/cadastro`, `/_sitemap`, `/exercicios`, `/+not-found`, `/aluno`, `/alunos`, `/alunos/[id]`, `/fichas/nova`, `/fichas/[id]`, `/fichas/[id]/editar`, `/fichas/[id]/treinos/novo`, `/fichas/[id]/treinos/editar`, `/fichas/[id]/treinos/[treinoId]`, `/exercicios/novo`, `/exercicios/[id]`, `/exercicios/[id]/editar`, `/aluno/lembretes`, `/aluno/avaliacoes`, `/aluno/fichas/[id]`, `/aluno/evolucao`, `/aluno/evolucao/[exercicioId]`, `/aluno/historico`, `/aluno/historico/[sessaoId]`, `/aluno/treino/[treinoId]`, `/alunos/[id]/avaliacoes/nova`, `/alunos/[id]/avaliacoes/[avaliacaoId]`, `/alunos/[id]/evolucao/[exercicioId]`. Pasta apagada (confirmado) |
| Q5 E2E Playwright | ✅ | `cd e2e && npm test` → `9 passed (1.1m)` (E2E-01 2.1s, 02 4.2s, 03 1.9s, 04 1.9s, 05 1.6s, 06 1.3s, 07 1.9s, 08 1.7s, 09 1.7s). Nenhum processo encerrado à força; o teardown do Playwright encerrou API e servidor |
| Q6 Smoke manual da API (uvicorn + Postgres do Q3) | ✅ | `criar_admin` → `Admin criado`; admin cria professor 200; aluno `POST /cadastro` 200 (`tipo:"aluno"`); professor cria exercício, ficha, treino (dia de hoje, sexta) e item 200; aluno `GET /treino/hoje/{ficha}` 200, `POST /sessoes` 200 (repetido devolve a mesma sessão), `POST /sessoes/1/execucoes` 200, `POST /sessoes/1/finalizar` 200 (repetido → 409 `Sessão já finalizada`); professor `GET /alunos/1/evolucao/exercicios` 200 (`ultima_carga 42.5`), `POST /alunos/1/avaliacoes` 200, `GET /alunos/1/sessoes` 200; aluno `GET /avaliacoes` 200 com a avaliação; professor em `GET /avaliacoes` → 403. 20/20 chamadas com o status esperado; `alunos.id=1` ≠ `users.id=3`. Uvicorn encerrado pelo PID próprio (porta 18000 sem LISTEN) |
| Q7 Higiene do git | ✅ | `git status --short` (208 entradas): nenhum `.db`, `node_modules`, `venv`, `__pycache__`, relatório do Playwright ou temporário. `git status --ignored` mostra como ignorados `backend/venv/`, `backend/**/__pycache__/`, `backend/.pytest_cache/`, `frontend/node_modules/`, `frontend/.expo/`, `e2e/node_modules/`; `git check-ignore` confirma também `.env`, `uploads/`, `test-results/`, `playwright-report/`, `dist/`. QA-03 (`*.db` fora do `.gitignore`) corrigido, ver reteste |
| Q8 `docs/Testing.md` | ✅ | esta seção, tabela de estratégia e tabelas de arquivos (backend, jest, e2e) |
| Limpeza | ✅ | `docker rm -f fitflow-qa-pg`; `docker ps -a --filter name=fitflow-qa-pg -q` vazio. Docker Desktop foi deixado aberto. `%TEMP%\fitflow-e2e-resultados` (relatório do Playwright, fora do repositório, por design do `e2e/README.md`) permanece |
| App em dispositivo / Expo Go | ❌ não executado | sem dispositivo/emulador |

#### Reteste QA-02 / QA-03 — 30/10/2026

| Critério | Resultado | Evidência |
|---|---|---|
| Q4a `cd frontend && npm ci` | ✅ | exit 0 (só avisos de `npm audit` e `install-scripts` do `unrs-resolver`); `eslint-config-expo` realinhado em 57.0.2 |
| Q4b `npm test` | ✅ | `Test Suites: 17 passed, 17 total`; `Tests: 136 passed, 136 total`; 5.461 s |
| Q4c `npm run lint` | ✅ | `✖ 30 problems (0 errors, 30 warnings)`, exit 0 |
| Q4d `npm run typecheck` | ✅ | `tsc --noEmit`, exit 0 |
| Q4e `expo export --platform web --output-dir %TEMP%itflow-export-qa2` | ✅ | exit 0; `Web Bundled 2128ms` (1062 módulos); `Static routes (30)`; 30 arquivos `.html`; pasta apagada (confirmado) |
| QA-03 `.gitignore` e `git status --short` | ✅ | `git check-ignore -v`: `.gitignore:10:*.db`, `:11:*.sqlite`, `:12:*.sqlite3`; `git status --short` não lista nenhum `.db`/`.sqlite`/`.sqlite3` |

QA-02 e QA-03: **corrigidos e revalidados**. Veredito final: **APROVADO**. Resta só QA-04 (informativa) e o app em dispositivo, não executado.

Bugs e observações (nenhum bloqueia backend, app web nem E2E):

- **QA-02 (frontend, `npm ci` falha — corrigido)** — `frontend/package.json` declara `"eslint-config-expo": "~57.0.2"` (linha 43), mas `frontend/package-lock.json` resolve `node_modules/eslint-config-expo` em `58.0.4` e o pacote raiz do lock declara `^58.0.4`. Repro: `cd frontend && npm ci` → `npm error code EUSAGE ... Invalid: lock file's eslint-config-expo@58.0.4 does not satisfy eslint-config-expo@57.0.2`. Impacto: instalação limpa quebra e o CI (`.github/workflows/ci.yml:76`, `run: npm ci`) falha. Correção sugerida: alinhar `package.json` e o lockfile. Aviso extra: `ERESOLVE overriding peer dependency` (`test-renderer` → `react-reconciler@0.34` pede `react ^19.3`, instalado 19.2.3).
- **QA-03 (higiene, baixa — corrigido)** — `.gitignore` não cobre `*.db`/`*.sqlite`; um banco SQLite local acidental apareceria no `git status`. Hoje não existe nenhum.
- **QA-04 (E2E, informativa)** — o schema do E2E em SQLite cai no fallback `create_all` porque `alembic upgrade head` falha em SQLite (`NotImplementedError: No support for ALTER of constraints in SQLite dialect`); o caminho Alembic está coberto no Postgres (Q2/Q3).

### Fase 0 — 30/10/2026

| Critério | Resultado | Evidência |
|---|---|---|
| Suíte backend | ✅ | `46 passed, 1 warning in 49.50s` (aviso: `StarletteDeprecationWarning` sobre `httpx` no `TestClient`) — conferido pelo QA |
| Import do app e alias `app.routers.main:app` | ✅ | QA |
| Smoke do servidor (uvicorn + SQLite) | ✅ | `/docs` 200; `/openapi.json` com 39 operações |
| Fluxo completo e FK ativa | ✅ | `test_fluxo_completo.py` |
| Typecheck frontend | ✅ | `tsc --noEmit` exit 0 (QA) |
| Rota duplicada removida | ✅ | grep: nenhuma referência ao arquivo removido; `/exercicios/[id]` → `[id]/index.tsx`. `expo export` não executado |
| Lint | ⚠️ não executado | — |
| PostgreSQL real / `alembic upgrade head` | ❌ não executado | sem Postgres no ambiente; `alembic heads` OK (`7a0d6ebef000`) |
| App no dispositivo | ❌ não executado | precisa de Expo Go/emulador e API rodando |

Revisões: revisão de código **APROVADA** em duas rodadas (achados da 1ª corrigidos na 2ª). QA **APROVADO**.

### Fases 1 e 2 — 30/10/2026

Veredito do QA: **APROVADO** após reteste (1ª rodada REPROVADA pelo bug QA-01 — migração inicial vazia; corrigido pelo ADR-019 e revalidado abaixo).

| Critério | Resultado | Evidência |
|---|---|---|
| QA1 Suíte backend (1ª rodada) | ✅ | `cd backend && venv/Scripts/python -m pytest -q` → `73 passed, 1 warning in 56.99s` (mesmo `StarletteDeprecationWarning` da Fase 0) |
| QA2a `alembic upgrade head` em banco vazio (postgres:16) — 1ª rodada | ❌ falhou (corrigido, ver reteste) | `Running upgrade  -> 2b58ed61c57b` ok, depois `psycopg2.errors.UndefinedTable: relation "users" does not exist [SQL: ALTER TABLE users ADD COLUMN foto VARCHAR(255)]` na `922c5e7b10be`. A migração inicial `2b58ed61c57b` tem `upgrade()` com só `pass` — nenhuma migração cria as tabelas-base. Após a falha o banco ficou sem tabelas |
| QA2b downgrade -1 / upgrade head (complemento) | ✅ | Schema criado por `Base.metadata.create_all` + `alembic stamp head`; `downgrade -1` (`b1c2d3e4f5a6 -> 7a0d6ebef000`) removeu `users.foto_public_id`; `upgrade head` recriou. Prova só a migração `b1c2d3e4f5a6` (reversível), não a cadeia |
| QA2c Tabelas e `users.foto_public_id` | ✅ | `\dt`: alembic_version, alunos, avaliacoes_fisicas, exercicios, fichas, historicos_execucao, itens_ficha, professores, treino, users. Coluna `foto_public_id` `varchar(255)` nullable |
| QA2d `alembic check` | ⚠️ limitado | `No new upgrade operations detected.` — mas rodado sobre schema vindo de `create_all`, então não detecta divergência real entre models e a cadeia de migrações (que nem aplica do zero) |
| QA2e Container removido | ✅ | `docker rm -f fitflow-qa-pg`; `docker ps -a --filter name=fitflow-qa-pg` vazio |
| QA3 Fumaça HTTP (uvicorn + Postgres) | ✅ | `POST /cadastro` → 200 `tipo:"aluno"`, `foto:null`; `GET /perfil` idem; `GET /exercicios` sem token → 401; token forjado com `exp` no passado → 401 `Token inválido ou expirado`; `python -m app.scripts.criar_admin --email ... --senha ...` → `Admin criado` (exit 0; repetir → `E-mail já cadastrado`, exit 1); login do admin 200 e `/perfil` `tipo:"admin"`; `POST /admin/professores` 200; login do professor 200 e `/perfil` `tipo:"professor"`; aluno em `/admin/professores` → 403. Servidor encerrado (porta fechada) |
| QA4a Typecheck frontend | ✅ | `npm run typecheck` → `tsc --noEmit`, exit 0 |
| QA4b `expo export --platform web` | ✅ | Bundle web de 957 módulos, 15 rotas estáticas: `/`, `/fichas`, `/perfil`, `/cadastro`, `/_sitemap`, `/exercicios`, `/+not-found`, `/aluno`, `/fichas/nova`, `/fichas/[id]`, `/exercicios/novo`, `/exercicios/[id]`, `/exercicios/[id]/editar`, `/fichas/[id]/treinos/novo`, `/fichas/[id]/treinos/[treinoId]`. Pasta temporária apagada |
| QA5 Sessão restaurada ao abrir | ✅ (estático) | `frontend/src/contexts/AuthContext.tsx:39-66` (`restaurarSessao` no `useEffect`: lê token, chama `buscarUsuario`); spinner enquanto carrega `app/_layout.tsx:11-25`; falha de rede/5xx mantém o token e mostra "TENTAR NOVAMENTE" `AuthContext.tsx:52-58`, `_layout.tsx:27-51` |
| QA5 Guarda por perfil | ✅ (estático) | `app/_layout.tsx:53-81`: `Stack.Protected` — visitante: `index`/`cadastro`; professor: `exercicios*`/`fichas*`; aluno/admin: `aluno/index`; `perfil` para os dois |
| QA5 401 leva ao login | ✅ (estático) | `services/api.ts:32-54` apaga o token e chama `aoSessaoExpirada`; `AuthContext.tsx:69-73` registra callback que faz `setUsuario(null)`, o que reativa a guarda de visitante |
| QA5 401 de "senha atual incorreta" não desloga | ✅ (estático) | `services/api.ts:38-42` exclui `PUT /perfil/senha` com `detail === 'Senha atual incorreta'` (exatamente o `detail` de `backend/app/routers/usuarios.py:235`); `/login` também excluído |
| QA6 App em dispositivo | ❌ não executado | sem dispositivo/emulador; QA5 é só leitura de código |
| Lint | ⚠️ não executado | `expo lint` não foi pedido nesta rodada |

#### Reteste QA-01 (ADR-019) — 30/10/2026

| Critério | Resultado | Evidência |
|---|---|---|
| QA2 refeito: `alembic upgrade head` em banco vazio (postgres:16, porta 15432, sem `create_all`) | ✅ | Cadeia completa `-> 2b58ed61c57b` … `7a0d6ebef000 -> b1c2d3e4f5a6`, 11 migrações, sem erro. 10 tabelas: alembic_version, alunos, avaliacoes_fisicas, exercicios, fichas, historicos_execucao, itens_ficha, professores, treino, users |
| `alembic downgrade base` | ✅ | 11 downgrades sem erro (inclui `e4444f75bdc7` corrigida); só sobrou `alembic_version` |
| `alembic upgrade head` (2ª vez) | ✅ | mesmas 11 migrações aplicadas sem erro |
| `alembic check` | ✅ | `No new upgrade operations detected.` — agora sobre schema criado só pelo Alembic, logo sem divergência entre models e migrações |
| `users.foto_public_id` | ✅ | `varchar(255)` nullable; `users` = id, email, senha, tipo, foto, foto_public_id |
| QA3 refeito contra o banco criado pelo Alembic | ✅ | mesmo roteiro da 1ª rodada, mesmos resultados: cadastro aluno (`tipo:"aluno"`, `foto:null`), `/exercicios` sem token 401, token expirado 401, `criar_admin` + login admin, admin cria professor, `/perfil` do professor `tipo:"professor"`, aluno em `/admin/professores` 403. Servidor encerrado |
| `pytest -q` | ✅ | `73 passed, 1 skipped, 1 warning in 61.03s` (skip: `tests/test_migracoes.py:11`, só SQLite) |
| Container | ✅ | `fitflow-qa-pg` removido (`docker ps -a --filter name=fitflow-qa-pg` vazio) |

Bug QA-01: **corrigido e revalidado**.

Desvios de ambiente: Docker Desktop estava em `%LOCALAPPDATA%\Programs\DockerDesktop` (não em `C:\Program Files`) e foi iniciado de lá. A porta 55432 está em faixa reservada pelo Windows (`bind: ... acesso proibidas pelas permissões de acesso`), então o container usou a porta **15432**.

**Bug QA-01 (bloqueante, T-TEC-02):** `alembic upgrade head` não funciona em banco vazio. Repro: `docker run -d --name fitflow-qa-pg -e POSTGRES_PASSWORD=qa -e POSTGRES_DB=fitflow_qa -p 15432:5432 postgres:16`; `cd backend; DATABASE_URL=postgresql://postgres:qa@localhost:15432/fitflow_qa SECRET_KEY=x alembic upgrade head` → `UndefinedTable: relation "users" does not exist`. Causa: `alembic/versions/2b58ed61c57b_create_initial_tables.py` é vazia (`pass`). Pré-existente às Fases 1 e 2, mas impede subir um ambiente novo só com as migrações. Correção sugerida: preencher a migração inicial com as tabelas-base ou documentar `create_all` + `stamp` no README/Decisions.

## Redesenho UI — 31/10/2026

QA visual e funcional do redesenho (Design-System.md). Screenshots guardados fora do repositório. Emulador Android `FitFlow_Pixel`, Expo Go SDK 57, API local no banco `academia`.

**Veredito: APROVADO com ressalvas** (0 bloqueantes, 5 importantes, 17 de polimento).

| Verificação | Resultado | Evidência |
|---|---|---|
| `cd frontend && npm test` | ✅ | `Test Suites: 25 passed, 25 total`, `Tests: 231 passed, 231 total` |
| `cd frontend && npm run typecheck` | ✅ | `tsc --noEmit` sem saída |
| `cd frontend && npm run lint` | ✅ | `29 problems (0 errors, 29 warnings)` |
| `cd backend && venv/Scripts/python -m pytest -q` | ✅ | `182 passed, 1 skipped, 1 warning in 278.20s` |
| `cd e2e && npm test` | ✅ | `10 passed (1.4m)` |
| Fluxo professor no emulador (login, abas, aluno, avaliação, ficha → treino → itens → reordenar → editar → remover, exercício, perfil) | ✅ | screenshots `A*` e `B*` |
| Fluxo aluno no emulador (início, treinos, execução com descanso, continuar treino, resumo, histórico, evolução, avaliações, lembretes) | ✅ | screenshots `C*` |

Problemas importantes: I-01 o zero do Orbitron parece ícone "proibido" (estatísticas e timer), I-02 duração do resumo ("1 min") difere do histórico ("3 min") após retomar a sessão, I-03 capitalização "Exercício(S)/Min" e unidade "kg" perdida na Evolução, I-04 hero continua "Começar treino" depois do treino de hoje concluído, I-05 erros de seção sem "Tentar novamente".

Limitações: o botão "Tools" do Expo Go cobre a ação do cabeçalho no canto superior direito (só em desenvolvimento). Uma queda de rede do emulador causou erros de carregamento transitórios; a API respondia 200. Os dados de QA (ficha, exercício, avaliação e sessão) ficaram no banco `academia`.

## Redesenho UI rodada 2 — 31/10/2026

QA visual e funcional da segunda rodada, no emulador Android `FitFlow_Pixel` (Expo Go SDK 57, API local no banco `academia`). Screenshots guardados fora do repositório; os itens I-01..I-05 e P-01..P-17 estão resumidos abaixo.

**Veredito: REPROVADO (condicional).** 0 bloqueantes, 4 importantes, 12 de polimento. O I-02 do primeiro QA continua aberto: o Resumo do treino mostra "3h02" contra "2 min" no Histórico, porque `minutosDesde` (`frontend/src/utils/sessao.ts`) lê a data naive do servidor no fuso do aparelho (emulador em UTC, servidor em BRT).

| Verificação | Resultado | Evidência |
|---|---|---|
| `cd frontend && npm test` | ✅ | `Test Suites: 35 passed, 35 total`, `Tests: 337 passed, 337 total` |
| `cd frontend && npm run typecheck` | ✅ | `tsc --noEmit` sem saída |
| `cd frontend && npm run lint` | ✅ | `29 problems (0 errors, 29 warnings)` |
| `cd backend && venv/Scripts/python -m pytest -q` | ✅ | `188 passed, 1 skipped, 1 warning in 222.62s (0:03:42)` |
| `cd e2e && npm test` | ✅ | `10 passed (1.7m)` |
| Itens do 1º QA (23) | 17 corrigidos, 2 parciais (P-12 data de nascimento do perfil do aluno; P-17 bolinha de ordem), 1 não corrigido (I-02), 3 sem verificação ou sem ação (I-05, P-02, P-03) | relatório |
| Modal de alerta escuro, prévia do treino, "Sair do treino?" (inclusive voltar do Android), hero "Treino de hoje concluído ✓", datas com máscara, chips Seg..Dom, "Treino de Segunda", contagens, véu na status bar | ✅ | screenshots `A*`, `B*`, `C*` |
| Rotas nativas `/aluno/treino/[id]` (execução) e `/aluno/treino/[id]/previa` | ✅ | linha do treino abre a prévia (C05); "Começar treino" abre a execução (C06) |
| Rolagem infinita do histórico | não executado | o demo tem 14 sessões e a página é de 20; só jest cobre |
| Erro de seção com "Tentar novamente" no detalhe do aluno | não executado | falha parcial de rede não reproduzida; só jest cobre |

Problemas importantes: P-A duração do Resumo errada; P-B o seletor de exercício mostra "Nenhum exercício encontrado." quando a requisição falha; P-C placeholders 4/12/40/60 parecem valores padrão e "Salvar" reclama; P-D treino em andamento que não é o de hoje não mostra "Continuar treino".

Limitações: a engrenagem do Expo Go cobre o ícone de editar do cabeçalho (só em desenvolvimento). A rede do emulador oscilou (ícone 5G, toast "Cannot connect to Expo CLI…") e causou erros transitórios, com a API respondendo 200 por `curl`. Os dados de QA (ficha, exercício, avaliação e sessão) ficaram no banco `academia`.

## Números finais do redesenho — 31/10/2026

Estado depois da FX-C (última onda). Jest e coleta do pytest foram executados nesta rodada; os demais números vêm do QA 2 e dos relatórios de fechamento.

| Camada | 30/10 (Fases 0 a 5) | Revisão UI | QA 1 | QA 2 | **Final (31/10)** |
|---|---|---|---|---|---|
| pytest (SQLite) | 177 (+1 skip) | 182 (+1) | 182 (+1) | 188 (+1) | **192 (+1 skip)**; `pytest --collect-only`: 193 coletados |
| jest | 136 (17 suítes) | 231 (25) | 231 (25) | 337 (35) | **352 (37 suítes)**; `npx jest --ci`: `Tests: 352 passed`, `Test Suites: 37 passed` |
| E2E Playwright | 9 | — | 10 | 10 | **10** (E2E-10: navegação por abas, painel e sair com confirmação) |
| typecheck | sem erros | sem erros | sem erros | sem erros | sem erros |
| lint | 0 erros, 30 avisos | 29 | 29 | 29 | **0 erros, 29 avisos** (TD-38) |
| QA visual no emulador | — | — | APROVADO com ressalvas | REPROVADO condicional | FX-C corrigiu P-A a P-D; **sem 3ª rodada completa** |

Testes novos do redesenho:
- backend: `test_contagens.py` (conta queries), `test_fuso_serializacao.py` (offset `-03:00`), `test_criar_demo.py`, resumo da sessão e `professor_nome` em `test_sessoes.py`/`test_fichas.py`, paginação de `/sessoes`;
- jest: `theme/tema`, `components/ui/{componentes,fundacao}`, `components/aluno/{aluno,fundacaoAluno}`, `components/professor`, `ModalSeletorExercicio`, hooks (`useAlunoDetalhe`, `useErrosAposTentativa`, `useHistoricoSessoes`, `usePuxarParaAtualizar`) e utils (`diasSemana`, `gruposMusculares`, `historicoAluno`, `numeros`, `painelAluno`, `pluralizacao`, `rotas`, `saudacao`, `validacaoFormularios`);
- E2E: o alerta novo (`dialogo-alerta`) é aceito por um laço em segundo plano; E2E-10 novo.

Não executado: rolagem infinita do histórico e erro de seção no emulador (só jest); CI no GitHub; dispositivo físico; pytest e E2E completos após a FX-C nesta rodada. Atenção: os testes de `components/ui/` ficam em `frontend/src/components/ui/__tests__/`, pasta que o `.gitignore` ignora (TD-58).
