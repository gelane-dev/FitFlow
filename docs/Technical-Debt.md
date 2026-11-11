---
tags: [fitflow, divida-tecnica]
atualizado: 2026-11-10
---

# Dívida técnica

Voltar: [[Home]] · Relacionados: [[Architecture]] · [[Decisions]] · [[Roadmap]]

Levantamento da auditoria de 30/10/2026, atualizado após as Fases 0 a 5, as revisões de código e a gestão da academia. **Severidade**: 🔴 bug/segurança · 🟠 manutenção/risco · 🟡 melhoria.
**Status**: ✅ resolvido · 📋 tarefa planejada · 💤 aceito por ora (aberto).

## Resumo do que ainda está aberto

TD-12, TD-17, TD-18, TD-21, TD-22, TD-23, TD-24, TD-27, TD-28, TD-29, TD-35, TD-36 (antigos), TD-37 a TD-56 e TD-58 a TD-64 (redesenho de 31/10). Os mais relevantes: **TD-37** (regra de lint desligada), **TD-39** (alembic no SQLite), **TD-41/42** (CI nunca executado no GitHub) e **TD-55** (app nunca testado em dispositivo).

## Backend

| # | Problema | Onde | Sev. | Status |
|---|---|---|---|---|
| TD-01 | `requirements.txt` incompleto | `backend/requirements.txt` | 🔴 | ✅ F0-01 |
| TD-02 | `GET /treino/hoje/{id}` chamava `.order_by` no resultado → 500 sempre | `routers/treino.py` | 🔴 | ✅ F0-05 |
| TD-03 | Token de usuário removido causava `AttributeError` (500) | `core/seguranca.py` | 🔴 | ✅ F0-04 |
| TD-04 | `verificar_professor/aluno/admin` duplicados | `core/seguranca.py` | 🟠 | ✅ F0-04 |
| TD-05 | Montagem de `ItemTreinoDiaResposta` copiada 3× | `fichas.py`, `treino.py` | 🟠 | ✅ F0-06 (`services/respostas.py`) |
| TD-06 | `GET /ficha/{id}` atribuía listas filtradas às relationships ORM | `routers/fichas.py` | 🔴 | ✅ F0-06 |
| TD-07 | Entrypoint `FastAPI` dentro de `routers/main.py` | `routers/main.py` | 🟡 | ✅ F0-02 (alias mantido) |
| TD-08 | `load_dotenv`/`os.getenv` espalhados; env ausente gerava erros obscuros | `database.py`, `seguranca.py`, `config.py` | 🟠 | ✅ F0-03 |
| TD-09 | `echo=True` fixo | `database.py` | 🟡 | ✅ F0-03 (`SQL_ECHO`) |
| TD-10 | Nenhum teste automatizado | — | 🔴 | ✅ F0-07 (192 pytest hoje) |
| TD-11 | `GET /exercicios` sem autenticação | `routers/exercicios.py` | 🟠 | ✅ ADR-013 |
| TD-12 | `GET /alunos` e a visão do professor listam **todos** os alunos | `routers/usuarios.py` | 🟡 | 💤 aceito: uma academia só (ADR-022); rever se virar multi-tenant |
| TD-13 | CORS `*` com `allow_credentials=True` | `main.py` | 🟠 | ✅ T-TEC-03 (`CORS_ORIGINS`) |
| TD-14 | Foto de perfil em disco local | `routers/usuarios.py` | 🟠 | ✅ ADR-012 (fotos locais antigas continuam servidas do disco) |
| TD-15 | JWT de 30 min sem refresh; app não trata 401 | `seguranca.py`, `api.ts` | 🟠 | ✅ 401 tratado e expiração configurável · 💤 refresh token no [[Backlog]] |
| TD-16 | `datetime.now()` sem timezone | `fichas.py`, `treino.py` | 🟡 | ✅ T-TEC-04 (`core/tempo.py`) |
| TD-17 | Upload lê arquivo inteiro na memória (vídeo até 50 MB) | `exercicios.py` | 🟡 | 💤 |
| TD-18 | Regra "professor é dono da ficha" repetida em ~10 endpoints com mensagens diferentes | `fichas.py`, `treino.py` | 🟡 | 💤 unificar quando mexer nesses endpoints (mensagens são contrato) |
| TD-19 | Admin só criado direto no banco | — | 🟡 | ✅ `python -m app.scripts.criar_admin` |
| TD-26 | **`verificar_professor/aluno` retornavam `User`; `users.id` gravado como id de perfil** | `seguranca.py`, `fichas.py`, `treino.py`, `historico.py` | 🔴 | ✅ F0-11 (código) · ⚠️ dados antigos: rodar o diagnóstico em [[Database]] |
| TD-27 | `GET /ficha/{id}` inclui itens de exercício inativo; `/treino/hoje` e `/ficha/itens/treino` excluem | `fichas.py` | 🟡 | 💤 contrato antigo mantido |
| TD-28 | N+1 em `GET /ficha/{id}` (uma consulta por treino) | `fichas.py` | 🟡 | 💤 ver TD-43 |
| TD-29 | Ramo 404 inalcançável e consulta duplicada em `GET /perfil/professor` e `/perfil/aluno` | `usuarios.py` | 🟡 | 💤 |
| TD-43 | N+1 residual por item/exercício: `GET /ficha/{id}`, `GET /ficha/itens/treino/{id}`, `treinos_dia`. O `join(Exercicio)` só filtra; falta `joinedload(ItemFicha.exercicio)` | `fichas.py:~190-204,395-402`, `treino.py:190-192` | 🟡 | 💤 (revisão backend, rodada 2) |
| TD-44 | `PUT /treino/{id}/itens/ordem` devolve itens de exercício inativo; `GET /ficha/itens/treino/{id}` e `/treino/hoje` os filtram | `treino.py:267-270` | 🟡 | 💤 |
| TD-45 | Corrida entre `POST /sessoes/{id}/execucoes` e `finalizar`: `exigir_sessao_aberta` sem lock (`with_for_update()` resolveria) | `services/sessoes.py` | 🟡 | 💤 impacto baixo |
| TD-46 | Teste de concorrência faz monkeypatch por **posição** da chamada (`n == 3` de `db.scalar`); quebra se uma consulta for adicionada antes | `tests/test_correcoes_revisao.py:227-237` | 🟡 | 💤 trocar por evento `before_commit` |
| TD-47 | `GET /perfil` com mensagem `Usuario` sem acento e 404 vs 401 em e-mail/senha (B-4 da Fase 1–2) | `usuarios.py` | 🟡 | 💤 (mensagens são contrato) |

## API

| # | Problema | Sev. | Status |
|---|---|---|---|
| TD-20 | Lista vazia retornava 404 | 🟡 | ✅ ADR-014 (`[]` em `/ficha/aluno`, `/ficha/progresso`, `/treino/hoje`) |
| TD-21 | Mistura singular/plural nas rotas | 🟡 | 💤 não renomear (quebra o app) |

## Banco

| # | Problema | Sev. | Status |
|---|---|---|---|
| TD-22 | `itens_ficha.ficha_id` redundante com `treino.ficha_id` | 🟡 | 💤 documentado; manter consistente no código |
| TD-23 | Unicidade de ordem/exercício só no código (condição de corrida); só a sessão aberta ganhou índice único (ADR-029) | 🟡 | 💤 |
| TD-24 | Migrações antigas adicionam colunas NOT NULL sem default (`222f16e3ce67`, `7bb72965c3b5`, `e4444f75bdc7`, `81d766226503`): falham em banco com dados | 🟡 | 💤 não editar migrações aplicadas; usar `server_default` daqui em diante |
| TD-25 | `avaliacoes_fisicas.observacao` NOT NULL | 🟡 | ✅ migração `e4f5a6b7c8d9` |
| TD-39 | **`alembic upgrade head` não roda em SQLite**: `e4444f75bdc7` usa `ALTER ADD CONSTRAINT` (e `7a0d6ebef000` usa `alter_column`). O teste de migrações é pulado sem `TEST_POSTGRES_URL`, e o E2E (`e2e/scripts/criar_schema.py`) tenta o alembic e cai em `Base.metadata.create_all` | 🟡 | 💤 corrigir exigiria editar migração aplicada (batch mode) |

## Frontend

| # | Problema | Sev. | Status |
|---|---|---|---|
| TD-30 | Rota duplicada `exercicios/[id].tsx` | 🟠 | ✅ F0-12 |
| TD-31 | `sair()` não apagava o token | 🔴 | ✅ F0-08 |
| TD-32 | Sessão não restaurada ao abrir; sem guarda de rotas | 🟠 | ✅ F2-06 |
| TD-33 | Após login todos iam para `/exercicios` | 🟠 | ✅ F2-06 |
| TD-34 | Sem script de typecheck e sem testes | 🟠 | ✅ `typecheck` (F0-08) + jest (352 testes hoje) + E2E |
| TD-35 | Telas grandes (300+ linhas) com estilos inline: `aluno/treino/[treinoId].tsx` (399), `alunos/[id]/index.tsx` (364), `perfil.tsx` (358), `aluno/index.tsx` (297) | 🟡 | 💤 extrair ao mexer |
| TD-36 | `as any` em `pathname` de rotas tipadas | 🟡 | 💤 |
| TD-37 | **Regra `react-hooks/set-state-in-effect` desligada** em `frontend/eslint.config.js:16`. Ligada, acusa 24 ocorrências do padrão `useEffect(() => { carregar() }, [carregar])`, que é o padrão do projeto. É a única regra desligada; o motivo estava só no comentário do arquivo | `eslint.config.js`, hooks de dados | 🟠 | 📋 B-05: migrar o data fetching e religar a regra (mudaria comportamento; exige ADR) |
| TD-38 | **29 avisos de lint** (0 erros; eram 30 em 30/10): quase todos `import/no-named-as-default-member` (`axios.isAxiosError`, `axios.create`; corrigir com `import axios, { isAxiosError } from 'axios'`) e 1× `@typescript-eslint/no-redeclare` em `contexts/AuthContext.tsx:23`. Também: comentário de `hooks/useAlertaErro.ts:4` ainda diz "Exibe um Alert" | `src/services/*`, `utils/erroApi.ts`, `AuthContext.tsx` | 🟡 | 📋 B-06 |
| TD-40 | **Token JWT em `localStorage` na web** (ADR-026): exposto a XSS. Hoje a web só serve ao E2E, mas o `app.json` tem `web.output: "static"`. Falta teste unitário do ramo web de `secureStorage.ts` e um `typeof localStorage` defensivo (o módulo é carregado em Node durante o `expo export`) | `storage/secureStorage.ts` | 🟠 | ✅ resolvido na gestão da academia (ADR-034): a web usa cookie `HttpOnly` e não guarda token |
| TD-48 | Qualquer professor vê o formulário de editar/excluir qualquer avaliação, mas só o autor consegue (403 no envio) | `app/alunos/[id]/avaliacoes/[avaliacaoId].tsx` | 🟡 | 💤 esconder Salvar/Excluir comparando `professor_id` |
| TD-49 | Tipos e utilitários duplicados: `atualizarFicha` tipado como `FichaLista` (resposta real é `FichaResposta`); `ItemFicha` × `ItemFichaAluno`; `lerNumero` em `utils/sessao.ts` e `utils/vigencia.ts` com semânticas diferentes; só `formatarData` foi para `utils/datas.ts` (`formatarDataCurta`, `formatarHora`, `hojeIso` continuam em `evolucao.ts`/`avaliacaoForm.ts`) | `services/ficha.service.ts`, `types/*`, `utils/*` | 🟡 | 💤 |
| TD-50 | Admin entra no bloco `ehAlunoOuAdmin` e pode abrir por deep link `aluno/historico`, `aluno/treino/…` (todas as chamadas dão 403). Só `aluno/index` tem `PainelAdmin` | `app/_layout.tsx:82-92` | 🟡 | ✅ resolvido: o admin tem grupo `(admin)` próprio (rota inicial `/admin`) |
| TD-51 | Execução do treino: (a) após falha ambígua em uma série, tocar em **outra** série antes de repetir faz `return true` sem enviar a segunda (S-R2-1); (b) sair da tela sem registrar nada deixa sessões vazias no histórico (A-06); (c) `finalizar` sem trava `useRef` (A-07); (d) `carregando` pisca "descanso" por um frame e o foco duplica a carga inicial (A-09); (e) vibração do cronômetro atrasada em segundo plano (A-08) | `hooks/useSessaoExecucao.ts`, `useCronometro.ts`, `useTreinoDoDia.ts`, `aluno/index.tsx` | 🟡 | 💤 sem perda nem duplicação de dados |
| TD-52 | Lembretes: se `scheduleNotificationAsync`/`salvarLembrete` falhar após o cancelamento, a tela segue mostrando o lembrete anterior como ativo; parâmetro `_anterior` de `ativarLembrete` sem uso | `utils/lembretes.ts:83-100`, `hooks/useLembrete.ts` | 🟡 | 💤 |
| TD-53 | Só as telas do aluno usam `EstadoTela`/`CabecalhoTela` (em `components/aluno/`); as do professor repetem `ActivityIndicator` + erro | `app/fichas/[id]/editar.tsx`, `treinos/editar.tsx`, `alunos/[id]/*`, `perfil.tsx` | 🟡 | 💤 mover os componentes para `components/` |
| TD-54 | `buscarTreinos`/`buscarItensTreino` convertem **qualquer** 404 em `[]` (ficha excluída aparece como "sem treinos"); `fichas/[id]/editar.tsx` reescreve os campos se `ficha` recarregar com o usuário digitando | `services/treino.service.ts`, `ficha.service.ts`, `fichas/[id]/editar.tsx` | 🟡 | 💤 |
| TD-56 | `jest`, `jest-expo` e `@types/jest` estão em `dependencies` de `frontend/package.json`; o ADR-025 fala em devDependencies | `frontend/package.json` | 🟡 | 💤 mover para `devDependencies` (não afeta o runtime do app) |

## Infraestrutura e processo

| # | Problema | Onde | Sev. | Status |
|---|---|---|---|---|
| TD-41 | CI com `push:` e `pull_request:` sem filtro: roda duas vezes por PR. No job Postgres, `pytest -q` já executa `test_migracoes.py` e o passo seguinte o repete (manter só se o `-rs` for intencional) | `.github/workflows/ci.yml:4-5,59-61` | 🟡 | 📋 B-04 |
| TD-42 | **O CI nunca rodou no GitHub** e o **E2E está fora do CI** (ADR-027) por ser pesado | `.github/`, `e2e/` | 🟠 | 📋 B-04 |
| TD-55 | **App nunca testado em dispositivo físico** (emulador Android `FitFlow_Pixel` + Expo Go foi usado nos 2 QAs do redesenho em 31/10). Cobertura: typecheck, jest, build web, E2E em navegador e emulador. Lembretes, vibração, câmera/galeria e `expo-video` só funcionam no aparelho | — | 🟠 | 📋 B-03 (usuário) |
| TD-57 | **Lembretes indisponíveis no Expo Go para Android** (`expo-notifications` incompleto no SDK 53+); import agora é preguiçoso e a tela avisa (ADR-024, adendo). Validar lembretes só em development build | `utils/lembretes.ts` | 🟡 | 📋 B-03 (usuário) |

## Redesenho de UI/UX: pendências abertas (31/10/2026)

Origem: a segunda rodada de QA visual do redesenho (QA 2) e o estado depois da FX-C. A FX-C tratou P-A a P-D e parte do polimento; **nenhuma nova rodada completa de QA visual foi feita depois dela** (só 14 screenshots da FX-C), então o que segue não foi verificado no emulador.

| # | Problema | Onde | Sev. | Status |
|---|---|---|---|---|
| TD-58 | **`src/components/ui/` está no `frontend/.gitignore` (linha 60, herdado do template do Expo): os 26 arquivos do design system não aparecem no `git status` e ficariam fora do commit.** O app não compila a partir do repositório sem eles | `frontend/.gitignore:60` | 🔴 | ✅ resolvido: a regra não existe mais no `frontend/.gitignore` e os arquivos de `components/ui/` estão versionados |
| TD-59 | Rolagem infinita do histórico verificada **só por jest**: o demo tem 14 sessões e a página é de 20 (`TAMANHO_PAGINA_HISTORICO`). Para ver no emulador, criar > 20 sessões ou reduzir a página | `hooks/useHistoricoSessoes.ts` | 🟡 | 💤 |
| TD-60 | Erro de seção com "Tentar novamente" (`EstadoErroSecao`, detalhe do aluno) só por jest; falha parcial de rede não foi provocada no emulador | `alunos/[id]/index.tsx` | 🟡 | 💤 |
| TD-61 | Polimentos do QA 2 sem confirmação após a FX-C: P-E (rede cai depois de gravar o item: recarregar a lista ao falhar), P-F (ordem do Tab nos campos do item), P-G ("Nova senha" vazia sem validação), P-I ("Continuar treinando" quebra em 2 linhas no modal), P-J (cartão dentro de cartão e "DIAS TREINADOS" em 2 linhas na evolução do professor), P-K ("Dom" sozinho na 2ª linha dos chips), P-L (altura "1.7 m" × "1.68 m"), P-M (bolinha de ordem do item em Orbitron), P-O (botão "+ Adicionar exercício" visível com o formulário aberto), P-P (título do exercício truncado) | telas do professor, `ui/` | 🟡 | 💤 |
| TD-62 | Itens do QA 1 sem verificação ou sem ação: P-02 (login "preso" no 1º acesso, não reproduzido), P-04 (dado demo com "peito" minúsculo nos cartões) | — | 🟡 | 💤 |
| TD-63 | O botão flutuante "Tools" do Expo Go cobre a ação do cabeçalho (avatar, editar) no canto superior direito: só em desenvolvimento, não é defeito do app; a rede do emulador oscila e gera erros transitórios | ambiente | 🟡 | 💤 |
| TD-64 | Dados de QA no banco `academia` (ficha "QA Ficha Rodada2 editada", exercícios, avaliações e sessões criadas nos QAs); `criar_demo` não os remove | banco local | 🟡 | 💤 |
| TD-65 | `/aluno/avaliacoes` corta valores em 320 px (`BlocoEstatistica` com `numberOfLines={1}` e três blocos por linha; `adjustsFontSizeToFit` não age na web); o histórico da aba Evolução já foi corrigido (QA-EV04-02) | `app/(aluno)/aluno/avaliacoes`, `components/ui/BlocoEstatistica` | 🟡 | 💤 |
| TD-66 | `CardExercicio` põe um `Chip` (papel `button`) dentro do cartão clicável: na web gera o aviso "<button> cannot contain a nested <button>" em `/exercicios` do professor (preexistente, achado no QA da EV-05) | 🟢 | ✅ GA-10-fix (`CardExercicio` usa `Etiqueta`; `Pressionavel`/`Cartao` ganharam `contemControles` para linhas e cartões clicáveis com botões dentro; teste em `components/ui/__tests__/gestao.test.tsx`) |
| TD-67 | Salvar alterações de ficha no montador enviava PUT/DELETE/POST em sequência: durante a gravação o aluno podia ver a ficha pela metade | `useMontadorFicha.ts` | 🟡 | ✅ `PUT /ficha/{id}/completa` transacional (tudo ou nada); o montador salva com uma única chamada |
| TD-68 | Telas de alunos (lista e detalhe) e de pagamentos de admin e recepção eram paralelas (colunas, chips, selos, ações repetidas), e os hooks `useProfessor*` repetiam à mão o padrão de carga | `(admin)`/`(recepcao)`, `hooks/useProfessor*` | 🟡 | ✅ `ListaAlunosGestao`, `ListaPagamentosGestao`, `AcoesAlunoGestao` e `DialogosAlunoGestao` em `components/gestao` (ações por papel via props); `useProfessorDashboard/Frequencia/Versoes/Biblioteca` usam `useGestaoConsulta`, com o mesmo retorno às telas |
| TD-69 | `PUT /ficha/{id}/completa`: dois salvamentos simultâneos da mesma ficha seguem a regra "último ganha" (sem checagem de `atualizado_em`), e o schema não limita séries, repetições, carga e descanso a faixas razoáveis (as rotas antigas também não). Sugestão: aceitar `atualizado_em` e responder 409 quando diferir; `Field(ge=..., le=...)` nos itens | `routers/fichas.py`, `schemas/ficha.py` | 🟡 | 💤 |

## Resolvidos nas revisões das Fases 1 a 5 (histórico)

| Achado | Onde | Resolução |
|---|---|---|
| QA-01: migração inicial vazia, `upgrade head` falhava em banco vazio | `2b58ed61c57b` | ✅ ADR-019 |
| B-1/B-2/B-3/F-1…F-4 (Fases 1–2): apagar foto antiga fora da transação, senha em argv, `content_type` da foto, 401 da senha, token apagado em erro de rede | `usuarios.py`, `criar_admin.py`, `api.ts`, `AuthContext.tsx`, `perfil.tsx` | ✅ rodada 2 da revisão |
| Backend 1: `GET /sessoes/{id}` restringia ao professor dono (ADR-022 manda liberar) | `routers/sessoes.py` | ✅ |
| Backend 2: N+1 em `/sessoes`, `/ficha/progresso`, `/alunos/{id}/historico`, `/ficha`, `/ficha/aluno` | services/routers | ✅ `joinedload`/`selectinload` + testes que contam queries |
| Backend 3: criação concorrente de sessão aberta | `services/sessoes.py` | ✅ ADR-029 |
| Backend 5/6: fuso na evolução e em `data_avaliacao` | `core/tempo.py`, schemas | ✅ `para_naive_local` |
| Frontend P-01: reordenação com 3 `PUT` sem rollback | `useItemEdicao.ts` | ✅ ADR-028 |
| Frontend A-01…A-04: reconciliação de série, lembretes na web, canal Android, notificações órfãs | `useSessaoExecucao.ts`, `utils/lembretes.ts` | ✅ rodada 2 |
| Frontend C-01/C-05/C-06/C-07: `utils/datas`, `utils/params`, ESLint e jest sem ADR, token na web | `utils/`, `package.json` | ✅ parcial (ver TD-49), ADR-025/026 |
| Final B-01: hooks duplicados `useRecargaNoFoco` × `useRecarregarNoFoco` | `hooks/` | ✅ `useRecargaNoFoco.ts` removido; 8 telas usam `useRecarregarNoFoco` |
| Final D-02: `TEST_POSTGRES_URL` apontando para o banco de desenvolvimento apagaria dados | `tests/conftest.py` | ✅ `tests/banco_seguro.py` recusa nomes sem `test` (`test_banco_seguro.py`) |
