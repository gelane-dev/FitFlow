---
tags: [fitflow, contrato, api]
atualizado: 2026-10-30
---

# Contrato da API — Fases 3 a 5

Voltar: [[Home]] · [[API]] · [[Decisions]]

**Fonte única** para as equipes de backend e frontend que trabalham em paralelo. Os nomes de campos e paths abaixo **não podem ser alterados** sem registrar a mudança neste contrato. Datas: `date` = `"AAAA-MM-DD"`, `datetime` = ISO 8601 sem fuso (horário de `APP_TIMEZONE`).

Fases: **3** = professor (fichas com vigência, edição, alunos) · **4** = aluno (home, execução, sessões, cronômetro, feedback) · **5** = evolução, avaliação física, lembretes, testes/E2E/CI.

## Mudanças em endpoints existentes

| Endpoint | Mudança |
|---|---|
| `POST /ficha` | corpo aceita `data_inicio?: date` (padrão: hoje) e `data_fim?: date \| null`. `data_fim < data_inicio` → **400** `"A data final deve ser posterior à data inicial"` |
| `PUT /ficha/{id}` | corpo `{nome, data_inicio?, data_fim?}`; campos de data omitidos não mudam. Mesma validação |
| `GET /ficha` | query opcional `aluno_id`. Itens ganham `data_inicio`, `data_fim`, `vigente: bool` |
| `GET /ficha/professor/{id}` | mesma resposta de `GET /ficha` (com vigência) |
| `GET /ficha/aluno` | **200 + `[]`** quando não houver (antes 404). Itens ganham `data_inicio`, `data_fim`, `vigente`; ordenado com vigentes primeiro, depois `data_criacao` desc |
| `GET /ficha/{id}` (aluno) | ganha `data_inicio`, `data_fim`, `vigente`. **Adendo:** cada item de `treinos[].itens` ganha `nome`, `descricao`, `grupo_muscular`, `imagem`, `video` (mesmos campos de `ItemTreinoDiaResposta`) |
| `GET /treino/hoje/{ficha_id}` | **200 + `[]`** quando não houver treino hoje |
| `GET /ficha/progresso` | **200 + `[]`** quando vazio |
| `POST /ficha/treino` | aceita `sessao_id?: int` (compatibilidade) |
| `HistoricoResposta` | ganha `sessao_id: int \| null`, `exercicio_id: int`, `exercicio_nome: str` |

`vigente` = ficha ativa **e** `data_inicio <= hoje` **e** (`data_fim` nulo ou `>= hoje`). Fichas antigas (sem `data_inicio`) usam a data de `data_criacao`.

## Sessões de treino (aluno)

```
SessaoResumo  = {id, treino_id, treino_nome, ficha_id, iniciada_em: datetime, finalizada_em: datetime|null,
                 esforco: int|null, comentario: str|null, total_execucoes: int}
SessaoResposta = SessaoResumo + {execucoes: HistoricoResposta[]}
ExecucaoCriar = {item_ficha_id, series_realizadas, repeticoes_realizadas, carga_utilizada, observacao?: str|null}
```

| Método | Rota | Perfil | Regra |
|---|---|---|---|
| POST | `/sessoes` `{treino_id}` | aluno dono da ficha | treino e ficha ativos. Se já existir sessão **não finalizada** do aluno para esse treino, retorna ela (200). Resposta `SessaoResposta` |
| POST | `/sessoes/{id}/execucoes` `{execucoes: ExecucaoCriar[]}` (1..50) | aluno dono | transação única; cada item deve pertencer ao treino da sessão e estar ativo (404 `"Item da ficha não encontrado"`); sessão finalizada → **409** `"Sessão já finalizada"`. Resposta `HistoricoResposta[]` criados. `data_execucao` = agora |
| POST | `/sessoes/{id}/finalizar` `{esforco?: 1..10, comentario?: str}` | aluno dono | 409 se já finalizada. Resposta `SessaoResposta` |
| GET | `/sessoes` | aluno | as do próprio aluno, `iniciada_em` desc → `SessaoResumo[]` |
| GET | `/sessoes/{id}` | aluno dono **ou** qualquer professor (ADR-022) | `SessaoResposta` |

Convenção do app: cada série concluída gera um registro com `series_realizadas = 1`.

## Reordenação atômica de itens (adendo ADR-028)

| Método | Rota | Perfil | Regra |
|---|---|---|---|
| PUT | `/treino/{treino_id}/itens/ordem` `{itens: [{id: int, ordem: int}]}` | professor dono da ficha | todos os ids devem ser itens ativos do treino (404 `"Item da ficha não encontrado"`); ordens ≥ 1 e sem repetição entre si **e** em relação aos itens ativos não enviados (400 `"Ordens duplicadas"`); aplicação em transação única. Resposta: `ItemTreinoDiaResposta[]` do treino ordenado |

## Visão do professor sobre o aluno

Regra de acesso: **qualquer professor** acessa dados de qualquer aluno (uma academia; ver ADR-022).

| Método | Rota | Resposta |
|---|---|---|
| GET | `/alunos/{aluno_id}` | `AlunoResposta` (404 `"Aluno não encontrado"`) |
| GET | `/alunos/{aluno_id}/historico` | `HistoricoResposta[]` desc |
| GET | `/alunos/{aluno_id}/sessoes` | `SessaoResumo[]` desc |
| GET | `/alunos/{aluno_id}/evolucao/exercicios` | `EvolucaoExercicioResumo[]` |
| GET | `/alunos/{aluno_id}/evolucao/exercicios/{exercicio_id}` | `EvolucaoExercicio` |

## Evolução (aluno)

```
EvolucaoExercicioResumo = {exercicio_id, nome, grupo_muscular, total_registros, ultima_carga, carga_maxima, ultima_data: datetime}
EvolucaoExercicio = {exercicio_id, nome, pontos: [{data: date, carga_maxima: float, volume: float, registros: int}]}
```
`volume` = Σ(series × repetições × carga) do dia. Pontos em ordem crescente de data. Exercício sem registros do aluno → 404 `"Sem registros para este exercício"`.

| Método | Rota | Perfil |
|---|---|---|
| GET | `/evolucao/exercicios` | aluno |
| GET | `/evolucao/exercicios/{exercicio_id}` | aluno |

## Avaliação física

```
AvaliacaoCriar = {data_avaliacao: datetime, peso: float (>0, kg), altura: float (0.5..2.5, metros),
                  percentual_gordura?: float|null (0..100), massa_muscular?: float|null (>0), observacao?: str|null}
AvaliacaoResposta = AvaliacaoCriar + {id, aluno_id, professor_id: int|null, imc: float (2 casas)}
```

| Método | Rota | Perfil | Regra |
|---|---|---|---|
| POST | `/alunos/{aluno_id}/avaliacoes` | professor | grava `professor_id` |
| GET | `/alunos/{aluno_id}/avaliacoes` | professor | `data_avaliacao` desc |
| GET | `/avaliacoes` | aluno | as próprias, desc |
| PUT | `/avaliacoes/{id}` | professor autor | 403 `"Você não tem permissão para alterar esta avaliação"` |
| DELETE | `/avaliacoes/{id}` | professor autor | exclusão física; 403 idem com "excluir" |

## Banco (migrações novas, encadeadas após `b1c2d3e4f5a6`)

- `fichas.data_inicio` DATE nullable, `fichas.data_fim` DATE nullable.
- `sessoes_treino` (id, aluno_id FK alunos, treino_id FK treino, iniciada_em DATETIME NOT NULL, finalizada_em DATETIME NULL, esforco INT NULL, comentario VARCHAR(500) NULL).
- `historicos_execucao.sessao_id` FK `sessoes_treino` nullable.
- `avaliacoes_fisicas.professor_id` FK `professores` nullable; `percentual_gordura`, `massa_muscular`, `observacao` passam a nullable.

## Rotas do app (Expo Router)

Professor (`Stack.Protected guard={ehProfessor}`): `alunos`, `alunos/[id]/index`, `alunos/[id]/evolucao/[exercicioId]`, `alunos/[id]/avaliacoes/nova`, `alunos/[id]/avaliacoes/[avaliacaoId]`, além das existentes.
Aluno (`guard={ehAlunoOuAdmin}`): `aluno/index`, `aluno/fichas/[id]`, `aluno/treino/[treinoId]`, `aluno/historico/index`, `aluno/historico/[sessaoId]`, `aluno/evolucao/index`, `aluno/evolucao/[exercicioId]`, `aluno/avaliacoes`, `aluno/lembretes`.
