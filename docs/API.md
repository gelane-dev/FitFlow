---
tags: [fitflow, api]
atualizado: 2026-11-10
---

# API

Voltar: [[Home]] · Relacionados: [[Architecture]] · [[Database]]

Base local: `http://localhost:8000` · Swagger em `/docs`. Autenticação: header `Authorization: Bearer <token>` (JWT, expira em `JWT_EXPIRA_MINUTOS`, padrão 30; token expirado ou inválido → 401) **ou**, na web, o cookie `HttpOnly` `fitflow_sessao` gravado por `POST /login` (ADR-034). Requisição autenticada só pelo cookie que não seja `GET`/`HEAD`/`OPTIONS` precisa do header `X-FitFlow-Client: web`, senão 403 `Requisição sem cabeçalho de origem`. Conta desativada → 401 `Conta desativada` em qualquer rota autenticada.

Legenda **Perfil**: 🌐 público · 🔑 qualquer usuário logado · 👨‍🏫 professor · 🧑‍🎓 aluno · 🛡️ admin · 🧾 recepção (ver a seção de gestão). Onde a tabela diz "professor" para rotas de aluno, o **admin também passa** (vê todos) e o professor só alcança os alunos **vinculados** a ele (aluno não vinculado → 404 `Aluno não encontrado`, ADR-033).
Coluna **App**: ✅ já usado pelo frontend (`frontend/src/services`) · — não usado pelo app (rotas de administração, legado ou substituídas por `/sessoes`).

> **Conferência (10/11/2026):** as operações `@router.get/post/put/delete` de `backend/app/routers/*.py` (`grep -rhoE '^@router\.(get|post|put|delete)\("[^"]+"' backend/app/routers | sort -u`) são **117** (método + path distintos) e estão todas nas tabelas abaixo, com o mesmo método e path. Ao criar uma rota, rode o mesmo `grep` e confira esta página.

## Auth — `routers/auth.py`

| Método | Rota | Perfil | Descrição | App |
|---|---|---|---|---|
| POST | `/login` | 🌐 | `{email, senha}` → `{access_token, token_type}` **e** grava o cookie `fitflow_sessao` (`HttpOnly`, `SameSite`/`Secure` por `COOKIE_SAMESITE`/`COOKIE_SECURE`, `Max-Age` = validade do JWT). 401 `E-mail ou senha inválidos`; 403 `Conta desativada`; aluno `pendente` → 403 `Cadastro aguardando aprovação da recepção`; `recusado` → 403 `Cadastro não aprovado. Procure a recepção` | ✅ |
| POST | `/logout` | 🌐 (não exige token) | Apaga o cookie de sessão; 200 `{"mensagem": "Sessão encerrada"}`. A web chama ao sair | ✅ |
| POST | `/cadastro` | 🌐 | Cria usuário **aluno** + perfil `{email, senha, nome, telefone, data_nascimento}`; o aluno nasce `status_cadastro="pendente"` e só entra depois da aprovação da recepção; 400 e-mail duplicado | ✅ |

## Usuários / perfil — `routers/usuarios.py`

| Método | Rota | Perfil | Descrição | App |
|---|---|---|---|---|
| GET | `/alunos` | 👨‍🏫 🛡️ | Professor: só os alunos **vinculados** a ele (`alunos.professor_id`); admin: todos. Ordenado por nome | ✅ |
| GET | `/alunos/{aluno_id}` | 👨‍🏫 vinculado · 🛡️ | Dados do aluno `{id, nome, telefone, data_nascimento}`; 404 `Aluno não encontrado` (inclusive aluno de outro professor; ADR-033 substitui o acesso livre do ADR-022) | ✅ |
| GET | `/perfil` | 🔑 | `{id, email, tipo, foto, ativo}` do usuário logado (`tipo`: aluno/professor/recepcao/admin; `foto`: URL ou `null`) | ✅ |
| GET | `/perfil/professor` | 👨‍🏫 | Dados do professor | ✅ |
| GET | `/perfil/aluno` | 🧑‍🎓 | Dados do aluno | ✅ |
| PUT | `/perfil/professor` | 🔑 (checa tipo) | Atualiza nome/telefone | ✅ |
| PUT | `/perfil/aluno` | 🔑 (checa tipo) | Atualiza nome/telefone/nascimento | ✅ |
| GET | `/perfil/recepcao` | recepção | `{id, nome, telefone, permissoes: [...]}`; o app usa `permissoes` só para mostrar/esconder ações (o backend decide). Outros perfis: 403 `Acesso não permitido para este perfil` | ✅ |
| PUT | `/perfil/recepcao` | recepção | `{nome, telefone}` → mesma resposta; não altera permissões | ✅ |
| PUT | `/perfil/email` | 🔑 | Troca e-mail (400 se já existe) | ✅ |
| PUT | `/perfil/senha` | 🔑 | Troca senha (401 se senha atual errada) | ✅ |
| PUT | `/perfil/foto` | 🔑 | Upload jpg/png ≤ 5 MB (multipart `arquivo`) para o Cloudinary; apaga a foto anterior; resposta `{mensagem}` — a URL nova vem em `GET /perfil` | ✅ |
| GET | `/perfil/foto` | 🔑 | 307 para a URL do Cloudinary; foto local legada (caminho em disco) é servida como arquivo; 404 sem foto | — |
| DELETE | `/perfil/foto` | 🔑 | Remove a foto (Cloudinary ou disco) e zera `foto`/`foto_public_id`; 404 sem foto | ✅ |

## Admin — `routers/admin.py`

| Método | Rota | Perfil | Descrição | App |
|---|---|---|---|---|
| POST | `/admin/professores` | 🛡️ | Cria usuário professor + perfil (grava `criado_em` e auditoria `professor.criar`). Demais rotas de admin (professores, recepção, planos, painel, auditoria, configuração) estão na seção "Gestão da academia" | — |

## Exercícios — `routers/exercicios.py`

| Método | Rota | Perfil | Descrição | App |
|---|---|---|---|---|
| POST | `/exercicios` | 👨‍🏫 | Cria `{nome, descricao, grupo_muscular, instrucoes?}`; grava `criado_por_professor_id` | ✅ |
| GET | `/exercicios?pagina&limite&busca&grupo_muscular&origem` | 🔑 (qualquer perfil; sem token ou token inválido/expirado → 401) | Lista paginada de ativos `{itens, pagina, limite, total, total_paginas}`. `origem=biblioteca` (sem autor, da academia) ou `meus` (criados pelo professor logado; vazio para os demais perfis). Itens trazem `instrucoes` e `criado_por_professor_id` | ✅ |
| GET | `/exercicios/{id}` | 👨‍🏫 🛡️ | Detalhe | ✅ |
| PUT | `/exercicios/{id}` | 👨‍🏫 🛡️ | Atualiza dados. Professor edita os da biblioteca e os próprios; de outro professor → 403 `Exercício de outro professor`. Admin edita todos | ✅ |
| DELETE | `/exercicios/{id}` | 👨‍🏫 🛡️ | Exclusão lógica + apaga mídia no Cloudinary (mesma regra de autoria do PUT) | ✅ |
| PUT | `/exercicios/{id}/imagem` | 👨‍🏫 🛡️ | Upload jpg/png ≤ 5 MB (multipart `arquivo`) | ✅ |
| PUT | `/exercicios/{id}/video` | 👨‍🏫 🛡️ | Upload mp4/webm/mov ≤ 50 MB | ✅ |

## Fichas e itens — `routers/fichas.py`

> **Admin e escopo (ADR-037, ADR-038):** onde a tabela diz "👨‍🏫 dono", o admin também lê e edita qualquer ficha; o professor só as **próprias** e de aluno **vinculado** a ele (mesmos 403/404 de antes). O admin **não cria** ficha (`POST /ficha` é só do professor). Toda escrita atualiza `fichas.atualizado_em` e grava auditoria (`ficha.*`, `treino.*`, `item.*`). O aluno só vê fichas `publicada`.

| Método | Rota | Perfil | Descrição | App |
|---|---|---|---|---|
| POST | `/ficha` | 👨‍🏫 (aluno vinculado) | Cria ficha `{aluno_id, nome, data_inicio?, data_fim?, objetivo?, status?}` (`status` `rascunho\|publicada`, padrão `publicada`; publicada já cria a versão 1; `data_inicio` padrão = hoje em `APP_TIMEZONE`); `data_fim < data_inicio` → 400 `A data final deve ser posterior à data inicial`. Resposta traz `data_inicio`, `data_fim`, `vigente` | ✅ |
| GET | `/ficha?aluno_id&status` | 👨‍🏫 🛡️ | Fichas ativas do professor (admin: de todos; `status=rascunho\|publicada` filtra; com `aluno_nome`, `data_inicio`, `data_fim`, `vigente` e `total_treinos` = treinos ativos, por agregação SQL única); `aluno_id` filtra por aluno. Itens trazem também `status`, `objetivo` e `atualizado_em` | ✅ |
| GET | `/ficha/professor/{id}` | 👨‍🏫 dono | Resumo da ficha (mesma resposta de `GET /ficha`, com vigência e `total_treinos`; o `POST /ficha` devolve `total_treinos: 0`) | ✅ |
| PUT | `/ficha/{id}` | 👨‍🏫 dono | Atualiza `{nome, data_inicio?, data_fim?}`; datas omitidas não mudam (`data_fim: null` remove o limite); mesma validação 400 do POST. Resposta traz a vigência. **Ficha publicada**: a alteração vale na hora para o aluno (o montador do app envia PUT/DELETE/POST em sequência, sem transação; "Publicar" só registra uma versão) | ✅ |
| DELETE | `/ficha/{id}` | 👨‍🏫 dono | Exclusão lógica em cascata (treinos e itens) | ✅ |
| POST | `/ficha/itens` | 👨‍🏫 dono · 🛡️ | Adiciona exercício a um treino `{..., observacao?}`; 409 se exercício repetido ou ordem ocupada | ✅ |
| GET | `/ficha/itens/treino/{treino_id}` | 👨‍🏫 dono | Itens do treino com dados do exercício | ✅ |
| PUT | `/ficha/item/{id}` | 👨‍🏫 dono · 🛡️ | Atualiza séries/reps/carga/descanso/ordem/observação | ✅ |
| POST | `/ficha/item/{id}/duplicar` | 👨‍🏫 dono · 🛡️ | Copia o item logo abaixo (ordem + 1; os seguintes são reordenados) → `ItemTreinoDiaResposta` | ✅ |
| DELETE | `/ficha/item/{id}` | 👨‍🏫 dono | Apaga (ou desativa se houver histórico) | ✅ |
| GET | `/ficha/aluno` | 🧑‍🎓 | Fichas ativas e **publicadas** do aluno com `professor_nome` (string ou `null`), `data_inicio`, `data_fim`, `vigente`; vigentes primeiro, depois `data_criacao` desc; **200 + `[]` se nenhuma** | ✅ |
| GET | `/ficha/{id}/completa` | 👨‍🏫 dono · 🛡️ | Ficha completa (treinos e itens ativos, mesmo formato de `GET /ficha/{id}`) para o editor web do professor; 403 `Você não tem permissão para visualizar esta ficha` | ✅ |
| PUT | `/ficha/{id}/completa` | 👨‍🏫 dono · 🛡️ | Salva a ficha inteira numa **única transação** (TD-67). Corpo: `{nome, objetivo?, data_inicio?, data_fim?, treinos: [{id?, nome, dia_semana?, ordem, itens: [{id?, exercicio_id, series, repeticoes, carga, descanso, ordem, observacao?}]}]}`. Com `id` atualiza; sem `id` cria; o que não vier é removido (exclusão lógica; item sem execução é apagado, como em `DELETE /ficha/item/{id}`). Devolve o mesmo formato de `GET /ficha/{id}/completa`. Não muda `status` nem cria versão (publicar segue em `POST /ficha/{id}/publicar`). Grava uma única auditoria `ficha.editar` com o resumo. Qualquer erro desfaz tudo. Erros: 403 `Você não tem permissão para alterar esta ficha de treino`; 404 `Ficha não encontrada` / `Treino não encontrado` / `Item da ficha não encontrado` (id que não pertence à ficha ou ao treino informado) / `Exercicio não encontrado`; 400 `A data final deve ser posterior à data inicial`; 409 `Já existe um treino com esta ordem nesta ficha` / `Já existe um exercício com esta ordem neste treino`; 422 ids repetidos no corpo | ✅ |
| POST | `/ficha/{id}/publicar` | 👨‍🏫 dono · 🛡️ | `status=publicada` e nova versão numerada (`último + 1`, com cópia JSON da ficha) → `{numero, publicada_em, publicada_por{id,nome,tipo}}`. Publicar de novo cria outra versão ("salvar alterações" vira histórico) | ✅ |
| GET | `/ficha/{id}/versoes` | 👨‍🏫 dono · 🛡️ | Lista de versões `{numero, publicada_em, publicada_por}` | ✅ |
| GET | `/ficha/{id}/versoes/{numero}` | 👨‍🏫 dono · 🛡️ | Conteúdo da versão (formato de `FichaCompletaResposta`); 404 se não existe | ✅ |
| POST | `/ficha/{id}/duplicar` | 👨‍🏫 dono · 🛡️ | `{aluno_id?, nome?}` (corpo opcional) → copia treinos e itens **ativos** como nova ficha `rascunho` (`data_inicio` = hoje, `data_fim` nula) do mesmo professor (admin: mantém o professor original); `aluno_id` precisa ser acessível → `FichaLista` | ✅ |
| GET | `/ficha/{id}` | 🧑‍🎓 dono | Ficha completa com vigência e `professor_nome`: treinos ativos (cada um com `total_itens` = itens ativos) → itens ativos (cada item inclui `nome`, `descricao`, `grupo_muscular`, `imagem`, `video` do exercício e `observacao`). Rascunho é invisível ao aluno (404) | ✅ |

## Treinos — `routers/treino.py`

| Método | Rota | Perfil | Descrição | App |
|---|---|---|---|---|
| POST | `/treino` | 👨‍🏫 dono · 🛡️ | Cria treino `{ficha_id, nome, dia_semana?, ordem}` (`dia_semana` opcional: divisão A/B/C sem dia fixo); 409 ordem ocupada | ✅ |
| GET | `/treino/ficha/{ficha_id}` | 👨‍🏫 dono · 🛡️ | Treinos ativos ordenados, cada um com `total_itens` (itens ativos, agregação SQL única). `POST`/`PUT /treino` devolvem a mesma forma (`total_itens` 0 na criação) | ✅ |
| PUT | `/treino/{id}` | 👨‍🏫 dono · 🛡️ | Atualiza | ✅ |
| DELETE | `/treino/{id}` | 👨‍🏫 dono · 🛡️ | Exclusão lógica + itens | ✅ |
| PUT | `/treino/{treino_id}/itens/ordem` | 👨‍🏫 dono · 🛡️ | Reordenação atômica (ADR-028) `{itens: [{id, ordem ≥ 1}]}` (1+). 404 `Item da ficha não encontrado` (item de outro treino, inativo ou inexistente); 400 `Ordens duplicadas` (entre si, id repetido ou conflito com itens ativos não enviados); 403 se não é o dono. Transação única: com erro nada muda. Resposta `ItemTreinoDiaResposta[]` do treino ordenado | ✅ |
| GET | `/treino/hoje/{ficha_id}` | 🧑‍🎓 dono | Treinos do dia da semana atual com itens, ordenados por `ordem` (**200 + `[]` se nenhum**; ficha inexistente ou de outro aluno continua 404) | ✅ |

## Histórico — `routers/historico.py`

| Método | Rota | Perfil | Descrição | App |
|---|---|---|---|---|
| POST | `/ficha/treino` | 🧑‍🎓 dono | (`data_execucao` com fuso é convertida para `APP_TIMEZONE` e gravada sem fuso) Registra execução de um item `{item_ficha_id, data_execucao, series_realizadas, repeticoes_realizadas, carga_utilizada, observacao, sessao_id?}`; com `sessao_id`: 404 se a sessão não é do aluno ou o item não é do treino dela, 409 se finalizada | — |
| GET | `/ficha/progresso` | 🧑‍🎓 | Histórico do aluno, mais recente primeiro (**200 + `[]` se vazio**). Cada item: `{id, item_ficha_id, sessao_id, exercicio_id, exercicio_nome, data_execucao, series_realizadas, repeticoes_realizadas, carga_utilizada, observacao}` | — |
| GET | `/alunos/{aluno_id}/historico` | 👨‍🏫 vinculado · 🛡️ | Histórico do aluno (`HistoricoResposta[]`, desc); 404 `Aluno não encontrado` | — |

## Sessões de treino — `routers/sessoes.py`

`SessaoResumo = {id, treino_id, treino_nome, ficha_id, iniciada_em, finalizada_em, esforco, comentario, total_execucoes}` · `SessaoResposta = SessaoResumo + execucoes: HistoricoResposta[]`. Convenção do app: cada série concluída vira um registro com `series_realizadas = 1`.

| Método | Rota | Perfil | Descrição | App |
|---|---|---|---|---|
| POST | `/sessoes` | 🧑‍🎓 dono da ficha | `{treino_id}` → `SessaoResposta`. Se já houver sessão **não finalizada** do aluno para o treino, devolve ela (200); garantido pelo índice único parcial `uq_sessoes_treino_aberta` (ADR-029): numa corrida, o segundo pedido recebe a sessão já criada. 404 `Treino não encontrado` (treino/ficha inativos ou de outro aluno) | ✅ |
| POST | `/sessoes/{id}/execucoes` | 🧑‍🎓 dono | `{execucoes: [{item_ficha_id, series_realizadas ≥1, repeticoes_realizadas ≥0, carga_utilizada ≥0, observacao?}]}` (1..50), transação única → `HistoricoResposta[]` criados. 404 `Sessão não encontrada` / `Item da ficha não encontrado` (item de outro treino ou inativo); 409 `Sessão já finalizada` | ✅ |
| POST | `/sessoes/{id}/finalizar` | 🧑‍🎓 dono | `{esforco?: 1..10, comentario?: ≤500}` (corpo opcional) → `SessaoResposta`; 409 `Sessão já finalizada` | ✅ |
| GET | `/sessoes?limite=&deslocamento=` | 🧑‍🎓 | Sessões do próprio aluno, `iniciada_em` desc → `SessaoResumo[]` (cada item traz `total_execucoes`, `total_series`, `volume_total`, `duracao_segundos`; ver abaixo). Paginação **opcional**: `limite` (1..200; ausente = sem limite) e `deslocamento` (≥0, padrão 0); fora da faixa → 422. O histórico do app pagina de 20 em 20 | ✅ |
| GET | `/sessoes/{id}` | 🧑‍🎓 dono **ou** 👨‍🏫 (só o professor **vinculado** ao aluno) | `SessaoResposta`. Aluno que não é dono, ou professor não vinculado → 404 `Sessão não encontrada` | ✅ |
| GET | `/alunos/{aluno_id}/sessoes?limite=&deslocamento=` | 👨‍🏫 vinculado · 🛡️ | `SessaoResumo[]` desc, mesmos campos de resumo e mesma paginação opcional de `/sessoes`; 404 `Aluno não encontrado` | ✅ |

> **Resumo de sessão (`SessaoResumo`, também em `SessaoResposta`)** — campos aditivos: `total_series` (int, soma de `series_realizadas`), `volume_total` (float, soma de séries × repetições × carga, a mesma conta do app) e `duracao_segundos` (int ou `null` se a sessão não foi finalizada). Nas listagens vêm de uma única agregação SQL (sem N+1); sessão sem execuções devolve `0`/`0.0`.

## Evolução — `routers/evolucao.py`

`EvolucaoExercicioResumo = {exercicio_id, nome, grupo_muscular, total_registros, ultima_carga, carga_maxima, ultima_data}` · `EvolucaoExercicio = {exercicio_id, nome, periodo, pontos: [PontoEvolucao], comparacao: {atual, anterior}}` · `PontoEvolucao = {data, carga_maxima, volume, registros, repeticoes_maximas, series}` (pontos por dia, ordem crescente; `volume` = Σ séries × repetições × carga do dia; `repeticoes_maximas` = maior `repeticoes_realizadas` do dia; `series` = Σ `series_realizadas` do dia).

> **Parâmetro `periodo`** (opcional, nas duas rotas de detalhe): `7d | 30d | 3m | 6m | 1a` (7, 30, 90, 180 e 365 dias contando hoje; janela `data >= hoje - (dias - 1)`, com `hoje` em `APP_TIMEZONE`). Valor inválido → 422. Sem `periodo`, `pontos` traz todo o histórico e `periodo` é `null`. `periodo` na resposta ecoa o parâmetro. `comparacao` usa **todo** o histórico, ignorando o período: `atual` = dia mais recente, `anterior` = dia anterior com registro (`null` se só há um dia). Período sem registros → 200 com `pontos: []` e `comparacao` preenchida.

| Método | Rota | Perfil | Descrição | App |
|---|---|---|---|---|
| GET | `/evolucao/exercicios` | 🧑‍🎓 | Um item por exercício com registros do aluno (mais recente primeiro); `[]` se nenhum | ✅ |
| GET | `/evolucao/exercicios/{exercicio_id}` | 🧑‍🎓 | Série por dia, com `?periodo=` opcional; 422 se inválido; 404 `Sem registros para este exercício` | ✅ |
| GET | `/alunos/{aluno_id}/evolucao/exercicios` | 👨‍🏫 vinculado · 🛡️ | Mesmo que o do aluno, para o aluno informado; 404 `Aluno não encontrado` | ✅ |
| GET | `/alunos/{aluno_id}/evolucao/exercicios/{exercicio_id}` | 👨‍🏫 vinculado · 🛡️ | Idem (inclui `?periodo=`); 404 `Aluno não encontrado` / `Sem registros para este exercício` | ✅ |

## Avaliação física — `routers/avaliacoes.py`

`AvaliacaoCriar = {data_avaliacao (com fuso é convertida para `APP_TIMEZONE`), peso > 0, altura 0.5..2.5 (m), percentual_gordura? 0..100, massa_muscular? > 0, observacao? ≤ 500, cintura?, quadril?, abdomen?, peito?, braco_direito?, braco_esquerdo?, coxa_direita?, coxa_esquerda?, panturrilha? (cada circunferência > 0 e ≤ 300 cm)}` (fora da faixa → **422**). `AvaliacaoResposta = AvaliacaoCriar + {id, aluno_id, professor_id, imc}` com `imc = peso / altura²` arredondado a 2 casas.

| Método | Rota | Perfil | Descrição | App |
|---|---|---|---|---|
| POST | `/alunos/{aluno_id}/avaliacoes` | 👨‍🏫 (professor vinculado) | Cria e grava `professor_id` (id do perfil); 404 `Aluno não encontrado`. **O admin não cria avaliações** (403 `Acesso permitido apenas para professor`): a avaliação exige um professor como autor (ADR-038) | ✅ |
| GET | `/alunos/{aluno_id}/avaliacoes` | 👨‍🏫 (professor vinculado) e 🛡️ (o admin **lê**) | `data_avaliacao` desc | ✅ |
| GET | `/avaliacoes` | 🧑‍🎓 | Avaliações do próprio aluno, desc | ✅ |
| PUT | `/avaliacoes/{id}` | 👨‍🏫 autor | Substitui todos os campos; 404 `Avaliação não encontrada`; 403 `Você não tem permissão para alterar esta avaliação` (também para avaliações legadas sem `professor_id`) | ✅ |
| DELETE | `/avaliacoes/{id}` | 👨‍🏫 autor | Exclusão **física**; `{mensagem}`; 403 `Você não tem permissão para excluir esta avaliação` | ✅ |

## Mudanças de contrato na Fase 0

| Situação | Antes | Depois |
|---|---|---|
| Token válido de usuário apagado | 500 | 401 `Usuário não encontrado` |
| Usuário `professor`/`aluno` sem linha de perfil, em rota protegida por perfil | 200 (com ids errados) · 404 em `/perfil/professor` e `/perfil/aluno` | 403 com a mensagem do perfil errado |
| `GET /treino/hoje/{ficha_id}` | 500 sempre | funciona |
| Posse de ficha/histórico | comparava `users.id` | compara `professores.id` / `alunos.id` (ver [[Database]]) |

## Mudanças de contrato na Fase 1/2

| Situação | Antes | Depois |
|---|---|---|
| `GET /perfil` e `POST /cadastro` | `{id, email}` | `{id, email, tipo, foto}` (aditivo) |
| `GET /exercicios` | público | exige token de qualquer perfil (sem token ou inválido → 401) |
| `PUT /perfil/foto` | salva em `uploads/perfis` | envia ao Cloudinary; `users.foto` passa a ser URL |
| `GET /perfil/foto` | sempre arquivo | 307 para a URL; arquivo só para foto local legada |
| "Treino de hoje" e `data_criacao` da ficha | hora do servidor | hora de `APP_TIMEZONE` |

## Mudanças de contrato nas Fases 3 a 5

Fonte: [[Contrato-Fases-3-5]]. Todas aditivas, exceto as listas vazias.

| Situação | Antes | Depois |
|---|---|---|
| `GET /ficha/aluno`, `GET /ficha/progresso` sem dados | 404 | 200 + `[]` (ADR-014) |
| `GET /treino/hoje/{ficha_id}` sem treino hoje | 404 `Você não tem treinos salvos` | 200 + `[]` |
| Respostas de ficha | sem vigência | `data_inicio`, `data_fim`, `vigente` (ADR-020) |
| `PUT /ficha/{id}` | resposta sem vigência, só renomeava | aceita datas |
| `GET /ficha/{id}` → `treinos[].itens[]` | só campos do item | + `nome`, `descricao`, `grupo_muscular`, `imagem`, `video` |
| `HistoricoResposta` | sem sessão/exercício | + `sessao_id`, `exercicio_id`, `exercicio_nome` |
| Sessões, evolução, avaliações, visão do professor | — | rotas novas (ADR-021, ADR-022) |

## Mudanças de contrato na gestão da academia

Fonte: [[Contrato-Gestao]]. Aditivas, exceto o escopo do professor (intencional, ADR-033).

| Situação | Antes | Depois |
|---|---|---|
| `GET /alunos`, `GET /alunos/{id}`, `/alunos/{id}/...` (histórico, sessões, evolução, avaliações, frequência) | qualquer professor via todos os alunos (ADR-022) | professor só alcança alunos vinculados (404 caso contrário); admin alcança todos |
| `POST /cadastro` | aluno entra direto | aluno nasce `pendente`; login só após aprovação (403 com mensagem) |
| `POST /login` | só `access_token` | também grava o cookie `fitflow_sessao`; novos 403 (`Conta desativada`, cadastro pendente/recusado) |
| Conta desativada | — | 401 `Conta desativada` na próxima requisição autenticada |
| `UsuarioResposta` (`GET /perfil`, `POST /cadastro`) | `{id, email, tipo, foto}` | + `ativo` |
| `users.tipo` | `aluno\|professor\|admin` | + `recepcao` |
| Ficha | sempre visível ao aluno | `status` `rascunho\|publicada` (padrão `publicada`), `objetivo`, `atualizado_em`; aluno só vê publicadas; versões numeradas |
| `treino.dia_semana`, item `observacao`, exercício `instrucoes`/`criado_por_professor_id`, avaliação (9 circunferências) | — | campos opcionais |
| Ficha, treino, item, exercício | só professor | admin também lê e edita (não cria ficha) |

## Variáveis de ambiente que afetam a API

| Variável | Padrão | Efeito |
|---|---|---|
| `JWT_EXPIRA_MINUTOS` | `30` | validade do token |
| `CORS_ORIGINS` | vazio | vazio ou `*` → todas as origens, sem credenciais; lista separada por vírgula → só essas origens, com credenciais (necessário para o cookie de sessão da web); `X-FitFlow-Client` está em `allow_headers` |
| `COOKIE_SECURE` | `false` | `Secure` do cookie `fitflow_sessao` (use `true` em HTTPS) |
| `COOKIE_SAMESITE` | `lax` | `lax`, `strict` ou `none`; `none` sem `COOKIE_SECURE=true` impede a inicialização |
| `APP_TIMEZONE` | `America/Sao_Paulo` | fuso de `/treino/hoje/{ficha_id}` e das datas geradas pelo servidor |

Admin inicial: `python -m app.scripts.criar_admin --email X [--senha Y]` (dentro de `backend/`).

## Gestão da academia — `routers/gestao_alunos.py`, `equipe.py`, `planos.py`, `matriculas.py`, `pagamentos.py`, `acessos.py`, `paineis.py`, `auditoria.py`, `configuracao.py`

Fonte da verdade: [[Contrato-Gestao]]. Perfis: 🛡️ admin · 🧾 recepção (`users.tipo="recepcao"`) · 🧾\* recepção com a permissão indicada (admin sempre passa) · 🧾 sem token → 401; professor/aluno → 403 `Acesso não permitido para este perfil`; recepção sem a permissão → 403 `Permissão insuficiente`.

**Convenções desta seção**
- Paginação: `?pagina=1&por_pagina=20` (`por_pagina` 1–100, senão 422) → `{itens, total, pagina, por_pagina}`.
- Dinheiro (`Decimal`) sai como string com 2 casas (`"99.90"`, `"0.00"`). Datas de negócio (`date`) em `AAAA-MM-DD`; `datetime` com offset de `APP_TIMEZONE`.
- Situação do aluno/matrícula é **calculada** (nunca gravada): `vigente`, `vencendo` (vence em até `dias_alerta_vencimento` dias), `vencida`, `sem_matricula`. O campo `situacao` e o filtro `situacao` usam o mesmo valor (exclusivos: `vigente` não inclui `vencendo`). `inadimplente` = pagamento `pendente` com vencimento anterior a hoje.
- Toda escrita grava auditoria na mesma transação. Entradas `liberado` normais não vão para a auditoria (ficam em `acessos`).
- Todas as rotas de escrita respondem `200` com o recurso atualizado.

### Gestão de alunos (admin + recepção)

| Método | Rota | Perfil | Descrição |
|---|---|---|---|
| GET | `/gestao/alunos` | 🛡️ 🧾 | Paginado. Filtros: `busca` (nome, e-mail, telefone, CPF), `situacao` (`vigente\|vencendo\|vencida\|sem_matricula\|pendente\|desativado\|inadimplente`, outro valor → 422), `professor_id` (`0` = sem professor), `plano_id` (matrícula ativa). Item: `id, nome, email, telefone, foto, ativo, status_cadastro, professor{id,nome}\|null, plano_atual{id,nome}\|null, data_vencimento, situacao, inadimplente, criado_em` |
| GET | `/gestao/alunos/{id}` | 🛡️ 🧾 | Item + `cpf, endereco, observacoes, data_nascimento, restricao_acesso, codigo_acesso, matricula_atual{id,plano,data_inicio,data_vencimento,valor,situacao}\|null, aprovado_em`. 404 `Aluno não encontrado` |
| POST | `/gestao/alunos` | 🧾\* `cadastrar_aluno` | `email, senha(≥6), nome, telefone, data_nascimento, cpf?, endereco?, observacoes?, professor_id?` (só admin; recepção → 403 `Permissão insuficiente`). Nasce `aprovado`. 400 `E-mail já cadastrado` / `CPF já cadastrado`; 404 `Professor não encontrado`; 422 `Professor inativo` |
| PUT | `/gestao/alunos/{id}` | 🧾\* `editar_aluno` | `nome, telefone, data_nascimento, cpf, endereco, observacoes`. 400 `CPF já cadastrado` (CPF: só dígitos, 11, com dígitos verificadores; aceita máscara e grava normalizado; inválido → 422 `CPF inválido`) |
| POST | `/gestao/alunos/{id}/aprovar` · `/recusar` | 🧾\* `aprovar_aluno` | Só de `pendente`; senão 409 `Cadastro não está pendente` |
| GET | `/gestao/alunos/{id}/matriculas` · `/pagamentos` | 🛡️ 🧾 | Histórico (lista simples, mais recentes primeiro) |
| GET | `/gestao/alunos/{id}/acessos` | 🛡️ 🧾 | Paginado |
| PUT | `/admin/alunos/{id}/status` | 🛡️ | `{ativo}` — desativar corta o acesso na próxima requisição |
| PUT | `/admin/alunos/{id}/professor` | 🛡️ | `{professor_id\|null}`; 404 `Professor não encontrado`; 422 `Professor inativo`; grava `professor_vinculado_em`. As fichas **ativas** do aluno passam para o novo professor (ADR-038; auditoria `aluno.trocar_professor` com `professor_anterior_id`, `professor_id`, `fichas_transferidas`). Sem professor (`null`): as fichas ficam como estão e só o admin as gerencia |
| PUT | `/admin/alunos/{id}/restricao` | 🛡️ | `{restricao_acesso\|null}` (preenchida = bloqueia a entrada) |

### Professores, recepcionistas, planos (admin)

| Método | Rota | Perfil | Descrição |
|---|---|---|---|
| GET | `/admin/professores` | 🛡️ | Lista (sem paginação; filtro `ativo`): `id, nome, email, telefone, foto, ativo, criado_em, total_alunos, total_fichas (ativas), total_avaliacoes` |
| POST | `/admin/professores` | 🛡️ | Inalterado na entrada/resposta; agora grava `criado_em` e auditoria `professor.criar` |
| GET | `/admin/professores/{id}` | 🛡️ | Item + `alunos`, `fichas{id,nome,aluno,status,atualizado_em}`, `avaliacoes_recentes` (10), `atividade` (20 últimos eventos de auditoria do usuário) |
| PUT | `/admin/professores/{id}` | 🛡️ | `nome, telefone, email`; 400 `E-mail já cadastrado` |
| PUT | `/admin/professores/{id}/status` | 🛡️ | `{ativo}`; não desvincula alunos |
| POST | `/admin/professores/{id}/transferir-alunos` | 🛡️ | `{destino_professor_id\|null, aluno_ids?}` → `{transferidos}`; as fichas ativas dos alunos acompanham o destino (ADR-038; auditoria com `origem_professor_id`, `destino_professor_id`, `aluno_ids`, `fichas_transferidas`). 422 `Destino deve ser diferente da origem` / `Professor inativo` / `Aluno não pertence ao professor de origem` |
| GET · POST | `/admin/recepcionistas` | 🛡️ | POST: `email, senha(≥6), nome, telefone, permissoes?` (padrão do contrato; permissão inválida → 422). Item: `id, user_id (id da conta, para filtrar /admin/auditoria), nome, email, telefone, ativo, permissoes, criado_em` |
| GET · PUT | `/admin/recepcionistas/{id}` | 🛡️ | GET inclui `atividade`; PUT `nome, telefone, email` |
| PUT | `/admin/recepcionistas/{id}/status` · `/permissoes` | 🛡️ | `{ativo}` · `{permissoes:[...]}` (vale na próxima requisição) |
| GET | `/planos` | 🛡️ 🧾 | Admin: todos (filtro `ativo`); recepção: só ativos. Cada plano com `total_alunos` (matrículas ativas) |
| POST · PUT | `/admin/planos` · `/admin/planos/{id}` | 🛡️ | `nome, descricao?, duracao_dias(>0), valor(≥0, 2 casas), periodicidade(mensal\|trimestral\|semestral\|anual\|avulso), renovacao_automatica, condicoes?`. Mudar valor não altera matrículas existentes |
| PUT | `/admin/planos/{id}/status` | 🛡️ | `{ativo}` |
| GET | `/admin/planos/{id}/alunos` | 🛡️ | Alunos com matrícula ativa: `id, nome, email, telefone, data_inicio, data_vencimento, situacao` |

### Matrículas, pagamentos, entradas (admin + recepção)

| Método | Rota | Perfil | Descrição |
|---|---|---|---|
| GET | `/matriculas` | 🛡️ 🧾 | Paginado; filtros `aluno_id`, `status` (`ativa\|encerrada\|substituida\|cancelada`), `situacao` (`vigente\|vencendo\|vencida`, sobre as ativas), `plano_id`. Item: `id, aluno, plano, data_inicio, data_vencimento, valor, status, situacao (só ativa), motivo_cancelamento, cancelada_em, matricula_anterior_id, criado_em` |
| POST | `/matriculas` | 🧾\* `matricular` | `{aluno_id, plano_id, data_inicio?}`. `data_vencimento = data_inicio + duracao_dias − 1`; gera pagamento `pendente` (`Matrícula — <plano>`, vencimento = início). 404 aluno/plano; 409 `Aluno já possui matrícula ativa`; 422 `Plano inativo` / `Cadastro do aluno não aprovado` / `Conta do aluno desativada` / `Data de início não pode ser anterior a 30 dias` |
| POST | `/matriculas/{id}/renovar` | 🧾\* `renovar_matricula` | `{plano_id?}` (corpo opcional). Atual → `encerrada`; nova começa em `max(hoje, vencimento+1)`; gera pendente. 409 `Matrícula não está ativa`; 404 `Matrícula não encontrada` |
| POST | `/matriculas/{id}/alterar-plano` | 🧾\* `alterar_plano` | `{plano_id}`; o mesmo plano da matrícula → **422** `Escolha um plano diferente do atual`. Atual → `substituida`, pendentes dela → `cancelado`; nova começa hoje e gera pendente |
| POST | `/matriculas/{id}/cancelar` | 🧾\* `cancelar_matricula` | `{motivo}` obrigatório (422 se vazio). Pendentes da matrícula → `cancelado` |
| GET | `/pagamentos` | 🛡️ 🧾 | Paginado; filtros `status`, `aluno_id`, `inicio`/`fim` (sobre o **vencimento**), `inadimplentes=true`. Item traz `vencido` (pendente com vencimento passado) |
| POST | `/pagamentos/{id}/registrar` | 🧾\* `registrar_pagamento` | `{forma, valor_recebido?(>0, padrão = valor), pago_em?}`. 409 `Pagamento não está pendente` |
| POST | `/pagamentos` | 🧾\* `registrar_pagamento` | Avulso, já `pago`: `{aluno_id, descricao, valor(>0), forma}` |
| POST | `/pagamentos/{id}/estornar` | 🧾\* `estornar_pagamento` | `{motivo}`; só `pago` (409 `Pagamento não está pago`); nunca apaga |
| GET | `/pagamentos/{id}/comprovante` | 🛡️ 🧾 | `numero` (id com 6 dígitos), `status`, `aluno`, `descricao`, `valor`, `valor_recebido`, `forma`, `pago_em`, `registrado_por`, `academia{nome,endereco,telefone}`. Só `pago`/`estornado` (409 `Pagamento sem comprovante`) |
| GET | `/acessos/verificar?aluno_id=` ou `?codigo=` | 🛡️ 🧾 | `{aluno, autorizado, motivos[{codigo,mensagem}], matricula{plano,data_vencimento,situacao}\|null, pendencias{quantidade,valor_total}, ultimas_entradas (5 liberadas)}`. Sem parâmetros → 422 `Informe aluno_id ou codigo`; 404 `Aluno não encontrado` |
| POST | `/acessos` | 🧾\* `registrar_acesso` (+ `liberar_acesso_manual` se `forcar`) | `{aluno_id\|codigo, origem="manual\|qrcode\|codigo_barras", forcar=false}`. Sempre reavalia no servidor. Bloqueado sem forçar → grava `bloqueado` e responde **200** com `resultado:"bloqueado"`. `forcar` sem a permissão → 403 `Permissão insuficiente` (nada é gravado); forçar um aluno bloqueado → `liberado` com `liberacao_manual=true` + auditoria `acesso.liberado_manual` |
| GET | `/acessos` | 🛡️ 🧾 | Paginado; `data` (padrão hoje), `aluno_id`, `resultado` |

Motivos de bloqueio: `conta_desativada`, `cadastro_pendente` (qualquer status ≠ aprovado), `restricao`, `sem_matricula`, `matricula_vencida` (atraso > `tolerancia_dias_vencimento`), `pagamento_pendente` (só com `bloquear_pagamento_pendente` e pendente vencido). Acumulam-se.

### Painéis, configuração e auditoria

| Método | Rota | Perfil | Descrição |
|---|---|---|---|
| GET | `/admin/dashboard` | 🛡️ | `totais{alunos, ativos, inativos, pendentes, vencidos, vencendo, inadimplentes, professores, recepcionistas}`, `alunos_recentes`(5), `alunos_por_professor` (todos os alunos, como `totais.alunos`), `alunos_por_plano`, `matriculas{novas_mes, renovacoes_mes, cancelamentos_mes}`, `series{cadastros_por_mes, frequencia_por_mes, ativos_inativos}`. `ativos` = conta ativa + aprovado + matrícula vigente (sem tolerância); `inativos` = aprovados que não são ativos; `professores`/`recepcionistas` contam só contas ativas. `cadastros_por_mes` = 12 meses `{mes:"AAAA-MM", total}` **mais** um item final `{mes:"sem_data", total}` (usuários com `criado_em` nulo). `renovacoes_mes` = criadas no mês cuja anterior ficou `encerrada` (troca de plano não conta como nova nem renovação) |
| GET | `/recepcao/dashboard` | 🛡️ 🧾 | `ativos, entradas_hoje, matriculas_hoje, vencendo, vencidos, com_pendencia (qualquer pagamento pendente), cadastros_pendentes, ultimos_cadastros(5), atendimentos_recentes(10, auditoria de recepção/admin com ações aluno.*, matricula.*, pagamento.*, acesso.*)` |
| GET | `/admin/financeiro?inicio=&fim=` | 🛡️ | Padrão: mês atual (fim inclusivo; início > fim → 422). `recebido_periodo` (soma de `valor_recebido` dos `pago` com `pago_em` no período), `pendente_total`, `vencido_total`, `inadimplentes` (alunos), `recebido_por_mes` (12), `recebido_por_forma` |
| GET | `/configuracao` | 🔑 | Dados públicos da academia |
| GET · PUT | `/admin/configuracao` | 🛡️ | Todos os campos; grava `configuracao.editar` |
| GET | `/admin/auditoria` | 🛡️ | Paginado, mais recentes primeiro; filtros `user_id`, `acao`, `entidade`, `entidade_id`, `inicio`, `fim` (dias inclusivos). Item: `id, data_hora, acao, entidade, entidade_id, descricao, detalhes, usuario{id,nome,tipo}\|null` (admin aparece pelo e-mail) |

### Painel e frequência do professor — `routers/professor_web.py`

| Método | Rota | Perfil | Descrição |
|---|---|---|---|
| GET | `/professor/dashboard` | 👨‍🏫 | `total_alunos`, `alunos_ativos` (conta ativa + aprovado + matrícula vigente), `avaliacoes_pendentes` (vinculados sem avaliação ou com a última há mais de `dias_reavaliacao`), `fichas_ativas`, `fichas_rascunho`, `fichas_desatualizadas` (publicadas com `atualizado_em` há mais de `dias_atualizar_treino` ou `data_fim` vencida), `ultimos_alunos`(5, por `professor_vinculado_em`), `proximas_avaliacoes[{aluno, ultima, proxima}]` |
| GET | `/alunos/{aluno_id}/frequencia?meses=6` | 👨‍🏫 vinculado · 🛡️ | `meses` 1–24 (senão 422). `{entradas_por_semana[{semana_inicio (segunda-feira), total}], total_periodo, ultima_entrada, sessoes_treino_periodo}` (entradas `liberado`; só sessões finalizadas). 404 `Aluno não encontrado` |
| GET | `/gestao/alunos/{aluno_id}/frequencia?meses=6` | 🛡️ 🧾 | Mesma resposta, para a recepção e o admin |

## Convenções e inconsistências conhecidas

- Erros: `{"detail": "<mensagem em português>"}`. 401 token inválido/expirado, usuário removido ou conta desativada; 403 perfil errado, sem permissão (`Permissão insuficiente`) ou não é dono; 404 inexistente/inativo; 409 conflito de ordem/duplicado.
- Listas vazias retornam `200 + []` (ADR-014; antes das Fases 3-5 algumas retornavam 404). Ficha inexistente ou de outro aluno continua 404.
- Campos numéricos fora da faixa (avaliação, série, esforço) → 422 (validação do Pydantic).
- Nomes de rota misturam singular (`/ficha`, `/treino`) e plural (`/exercicios`, `/alunos`).

## Formato de datas e horas (FX-C, adendo ao ADR-016)

Todo campo `datetime` de resposta (`data_criacao`, `data_execucao`, `data_avaliacao`, `iniciada_em`, `finalizada_em`, `ultima_data`) é serializado em ISO 8601 **com o offset de `APP_TIMEZONE`**, por exemplo `2026-10-31T10:00:00-03:00`. Antes saía sem offset (`2026-10-31T10:00:00`). É o mesmo instante; só o formato mudou. Campos `date` (`2026-10-31`) não mudam. Nas entradas, datas com ou sem fuso continuam aceitas (com fuso são convertidas para `APP_TIMEZONE`).
