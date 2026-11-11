---
tags: [fitflow, contrato]
atualizado: 2026-11-09
---

# Contrato — Gestão da academia (admin, recepção, professor web)

Fonte da verdade para a expansão GA-01 a GA-12. Decisões em [[Decisions]] (ADR-033 a ADR-037). Precisa mudar algo daqui? Registre a alteração neste contrato antes de implementar.

## Regras gerais

- Evolução, não reescrita: nenhuma rota, campo, texto ou `testID` existente é removido. Mudanças de API existentes são **aditivas**, exceto o escopo do professor (seção Permissões), que é intencional.
- Migrações só **adicionam** (colunas novas com `server_default` ou nulas; tabelas novas). Nada é apagado. Toda a mudança de schema está numa única migração (GA-01) para evitar dois heads.
- Nenhum dado fictício. Datas que não existiam antes (`criado_em` de quem já está no banco) ficam **nulas** e aparecem como "sem data" nos gráficos.
- Dinheiro em `Numeric(10, 2)` no banco e `Decimal` no Pydantic, serializado como string (`"99.90"`); o frontend formata em `R$`.
- Datas de negócio (`date`) e horários (`datetime`) usam `agora()` e `hoje()` de `core/tempo.py` (fuso `APP_TIMEZONE`).
- Regra de negócio fica em `services/`, uma vez só. Routers só validam acesso, chamam o serviço e fazem `commit`.
- Toda operação que altera dados de gestão grava auditoria **na mesma transação** (`services/auditoria.py`).
- Nada é excluído fisicamente: aluno, professor e recepcionista são **desativados**; pagamento é **estornado**; matrícula é **cancelada**.

## Papéis e permissões (ADR-033)

`users.tipo`: `admin | professor | recepcao | aluno` (novo: `recepcao`). Ninguém altera o próprio `tipo`, `ativo` ou permissões; não existe rota que mude `tipo`.

| Recurso | admin | recepcao | professor | aluno |
|---|---|---|---|---|
| Dashboard admin, financeiro, auditoria, configurações, planos (escrita) | ✅ | ❌ | ❌ | ❌ |
| Professores e recepcionistas | ✅ | ❌ | ❌ | ❌ |
| `/gestao/alunos` (cadastrar, consultar, editar, aprovar) | ✅ | ✅ conforme permissão | ❌ | ❌ |
| Ativar/desativar aluno, trocar professor, restrição de acesso | ✅ | ❌ | ❌ | ❌ |
| Matrículas, pagamentos, controle de entrada | ✅ | ✅ conforme permissão | ❌ | ❌ |
| `GET /planos` (leitura) | ✅ | ✅ (só ativos) | ❌ | ❌ |
| Rotas de aluno do professor (`/alunos`, `/alunos/{id}/...`) | ✅ todos | ❌ | ✅ **só os vinculados** | ❌ |
| Fichas, treinos, itens (escrita) | ✅ qualquer ficha | ❌ | ✅ as próprias, só para aluno vinculado | ❌ |
| App do aluno | ❌ | ❌ | ❌ | ✅ |

**Escopo do professor (mudança intencional):** `GET /alunos` devolve só alunos com `professor_id` igual ao dele; `/alunos/{id}/...` de aluno não vinculado → **404 `Aluno não encontrado`** (não revela existência). Criar ficha ou avaliação para aluno não vinculado → 404 igual. Admin passa em todas essas rotas.

**Permissões da recepção** (`recepcionistas.permissoes`, lista de strings; admin sempre tem todas):

| Permissão | Padrão ao criar |
|---|---|
| `cadastrar_aluno` | ✅ |
| `editar_aluno` | ✅ |
| `aprovar_aluno` | ✅ |
| `matricular` | ✅ |
| `renovar_matricula` | ✅ |
| `alterar_plano` | ❌ |
| `cancelar_matricula` | ❌ |
| `registrar_pagamento` | ✅ |
| `estornar_pagamento` | ❌ |
| `registrar_acesso` | ✅ |
| `liberar_acesso_manual` | ❌ |

Sem a permissão → **403 `Permissão insuficiente`**. Lista de permissões inválida → 422.

### Dependências em `core/seguranca.py`

Mantém `verificar_aluno`, `verificar_professor`, `verificar_admin`, `verificar_aluno_ou_professor` com a mesma assinatura e retorno. Novas:

- `obter_usuario_atual(...) -> User`: token por header `Authorization: Bearer` **ou** cookie (abaixo). Usuário inexistente → 401 `Usuário não encontrado`; `ativo=False` → **401 `Conta desativada`**. Todos os `verificar_*` passam a usá-lo (desativar corta o acesso na próxima requisição).
- `exigir_papeis(*tipos)` → dependência que devolve o `User` ou 403 `Acesso não permitido para este perfil`.
- `exigir_permissao(nome)` → admin passa; recepção precisa da permissão; demais → 403 `Acesso não permitido para este perfil`.
- `verificar_professor_ou_admin` → devolve `("admin", User)` ou `("professor", Professor)`.
- `services/acesso_aluno.py: obter_aluno_acessivel(db, ator, aluno_id) -> Aluno` (404 se não existe ou professor não vinculado). Todas as rotas `/alunos/{aluno_id}/...` usam esta função.

## Autenticação web por cookie (ADR-034)

- `POST /login` continua devolvendo `{access_token, token_type}` **e** grava o cookie `fitflow_sessao` (`HttpOnly`, `Path=/`, `SameSite` de `COOKIE_SAMESITE` (padrão `lax`), `Secure` de `COOKIE_SECURE` (padrão `false`), `Max-Age` = expiração do JWT).
- Novo `POST /logout` → apaga o cookie, 200 `{"mensagem": "Sessão encerrada"}` (não exige token).
- Requisição autenticada **pelo cookie** (sem header `Authorization`) que não seja `GET`/`HEAD`/`OPTIONS` precisa do header `X-FitFlow-Client: web`; sem ele → **403 `Requisição sem cabeçalho de origem`** (proteção CSRF: o header força preflight de CORS).
- CORS: com cookie, `CORS_ORIGINS` precisa listar as origens (já é o caso fora do modo `*`); `allow_credentials=True` quando há origens explícitas; `X-FitFlow-Client` em `allow_headers`.
- Mobile não muda: SecureStore + Bearer.
- Web: não guarda token (`storage/secureStorage.ts` vira no-op na web), axios usa `withCredentials: true` e envia `X-FitFlow-Client: web`; a sessão é restaurada chamando `GET /perfil`; `sair()` chama `POST /logout`.
- Novas variáveis em `.env.exemplo`: `COOKIE_SECURE`, `COOKIE_SAMESITE`.

## Login e cadastro

- `POST /cadastro` (público) continua igual na entrada e na resposta, mas o aluno nasce com `status_cadastro="pendente"`.
- `POST /login`: senha errada → 401 (inalterado); conta desativada → **403 `Conta desativada`**; aluno `pendente` → **403 `Cadastro aguardando aprovação da recepção`**; aluno `recusado` → **403 `Cadastro não aprovado. Procure a recepção`**. Só depois disso emite token.
- Aluno cadastrado por admin ou recepção nasce `aprovado`.
- Aluno pode usar o app sem professor (`professor_id` nulo).
- `UsuarioResposta` (`GET /perfil`, `POST /cadastro`) ganha `ativo: bool` (aditivo).

## Banco (migração única GA-01)

### Alterações

| Tabela | Coluna | Tipo | Valor para quem já existe |
|---|---|---|---|
| `users` | `ativo` | bool, `server_default=true` | `true` |
| `users` | `criado_em` | datetime nulo | `NULL` |
| `alunos` | `status_cadastro` | str(20) `pendente\|aprovado\|recusado`, `server_default='aprovado'` | `aprovado` |
| `alunos` | `professor_id` | FK `professores.id` nula, índice | professor da **ficha ativa mais recente** do aluno; sem ficha → `NULL` |
| `alunos` | `professor_vinculado_em` | datetime nulo | `NULL` |
| `alunos` | `cpf` | str(14) nulo, único | `NULL` |
| `alunos` | `endereco` | str(255) nulo | `NULL` |
| `alunos` | `observacoes` | str(500) nulo | `NULL` |
| `alunos` | `restricao_acesso` | str(255) nulo (preenchido = bloqueia entrada) | `NULL` |
| `alunos` | `codigo_acesso` | str(32) único, gerado (`secrets.token_hex(8)`) | gerado na migração |
| `alunos` | `aprovado_em`, `aprovado_por_user_id` | datetime nulo, FK `users.id` nula | `NULL` |
| `fichas` | `objetivo` | str(300) nulo | `NULL` |
| `fichas` | `status` | str(20) `rascunho\|publicada`, `server_default='publicada'` | `publicada` |
| `fichas` | `atualizado_em` | datetime nulo | `data_criacao` |
| `treino` | `dia_semana` | passa a aceitar `NULL` (divisão A/B/C sem dia fixo) | inalterado |
| `itens_ficha` (tabela real do model `ItemFicha`) | `observacao` | str(300) nulo | `NULL` |
| `exercicios` | `instrucoes` | text nulo | `NULL` |
| `exercicios` | `criado_por_professor_id` | FK `professores.id` nula (nulo = biblioteca da academia) | `NULL` |
| `avaliacoes_fisicas` | `cintura`, `quadril`, `abdomen`, `peito`, `braco_direito`, `braco_esquerdo`, `coxa_direita`, `coxa_esquerda`, `panturrilha` | float nulo (cm) | `NULL` |

`criado_em` de `users` passa a ser preenchido em todo cadastro novo (público, admin, recepção, `criar_admin`, `criar_demo`).

### Tabelas novas

- **`recepcionistas`**: `id`, `user_id` FK único, `nome` str(150), `telefone` str(20), `permissoes` JSON (lista de strings).
- **`configuracao_academia`** (linha única, `id=1`, criada na migração): `nome` (padrão `FitFlow`), `endereco`, `telefone`, `email` (nulos), `horarios` JSON (lista `{dia: "segunda"..."domingo", abre: "06:00", fecha: "22:00", fechado: bool}`, padrão vazio), `tolerancia_dias_vencimento` int 0, `bloquear_pagamento_pendente` bool false, `dias_alerta_vencimento` int 7, `dias_reavaliacao` int 90, `dias_atualizar_treino` int 60, `atualizado_em`.
- **`planos`**: `id`, `nome` str(100), `descricao` str(500) nulo, `duracao_dias` int (> 0), `valor` Numeric(10,2) (≥ 0), `periodicidade` str(20) `mensal|trimestral|semestral|anual|avulso`, `renovacao_automatica` bool false, `condicoes` str(500) nulo, `ativo` bool true, `criado_em`.
- **`matriculas`**: `id`, `aluno_id` FK, `plano_id` FK, `data_inicio` date, `data_vencimento` date, `valor` Numeric(10,2), `status` str(20) `ativa|encerrada|substituida|cancelada`, `motivo_cancelamento` str(300) nulo, `cancelada_em` nulo, `criado_por_user_id` FK, `criado_em`, `matricula_anterior_id` FK nula (renovação/troca). Índice único parcial: uma `ativa` por aluno (mesma técnica de `f5a6b7c8d9e0`). Índice `(aluno_id, status)`.
- **`pagamentos`**: `id`, `aluno_id` FK, `matricula_id` FK nula, `descricao` str(150), `valor` Numeric(10,2), `vencimento` date, `status` str(20) `pendente|pago|estornado|cancelado`, `forma` str(20) nula `dinheiro|pix|cartao_credito|cartao_debito|transferencia|outro`, `valor_recebido` Numeric nulo, `pago_em` datetime nulo, `registrado_por_user_id` FK nula, `motivo_estorno` str(300) nulo, `estornado_em` nulo, `estornado_por_user_id` FK nula, `criado_em`. Índices `(aluno_id)`, `(status, vencimento)`.
- **`acessos`**: `id`, `aluno_id` FK, `data_hora` datetime, `resultado` str(20) `liberado|bloqueado`, `motivos` JSON (lista de códigos), `origem` str(20) `manual|qrcode|codigo_barras` (só `manual` é usado agora), `liberacao_manual` bool false, `registrado_por_user_id` FK. Índice `(aluno_id, data_hora)` e `(data_hora)`.
- **`auditoria`**: `id`, `user_id` FK nula, `data_hora`, `acao` str(60), `entidade` str(40), `entidade_id` int nulo, `descricao` str(300), `detalhes` JSON nulo. Índices `(data_hora)`, `(user_id)`, `(entidade, entidade_id)`.
- **`fichas_versoes`**: `id`, `ficha_id` FK, `numero` int (1, 2, 3… por ficha, único com `ficha_id`), `publicada_em`, `publicada_por_user_id` FK, `conteudo` JSON (cópia da ficha com treinos e itens ativos, no formato de `FichaCompletaResposta`).

## Regras de negócio (serviços)

### Matrícula (`services/matriculas.py`)

- Situação calculada, nunca gravada: `vigente` (status `ativa` e `data_vencimento >= hoje`), `vencida` (`ativa` e `data_vencimento < hoje`), `vencendo` (vigente e vence em até `dias_alerta_vencimento` dias), `sem_matricula` (nenhuma `ativa`).
- `data_vencimento = data_inicio + duracao_dias - 1`.
- **Matricular**: aluno aprovado, conta ativa, sem matrícula `ativa` (senão 409 `Aluno já possui matrícula ativa`), plano ativo (senão 422 `Plano inativo`). `data_inicio` padrão hoje, nunca mais de 30 dias no passado (422). Cria um `pagamento` `pendente` com o valor do plano, `vencimento = data_inicio`, `descricao = "Matrícula — <plano>"`.
- **Renovar** (`POST /matriculas/{id}/renovar`, `plano_id` opcional = mesmo plano): a atual (`ativa`) vira `encerrada`; a nova começa em `max(hoje, vencimento_anterior + 1)` e aponta `matricula_anterior_id`. Gera pagamento pendente.
- **Alterar plano**: a atual vira `substituida`, a nova começa hoje com o plano novo. Pagamentos pendentes da antiga viram `cancelado`; gera pendente novo.
- **Cancelar**: `cancelada` + motivo obrigatório; pendentes da matrícula viram `cancelado`.
- Tudo grava auditoria.

### Pagamento (`services/pagamentos.py`)

- **Registrar recebimento** de pendente: `forma` obrigatória, `valor_recebido` > 0 (padrão = `valor`), `pago_em` padrão agora → `pago`. Só pendente (409 `Pagamento não está pendente`).
- **Avulso**: cria já `pago` (aluno, descrição, valor, forma).
- **Estornar**: só `pago`, motivo obrigatório → `estornado`. Nunca apaga.
- `inadimplente` = aluno com pagamento `pendente` e `vencimento < hoje`.

### Entrada (`services/acessos.py`)

`avaliar_acesso(db, aluno) -> {autorizado: bool, motivos: [códigos]}` com códigos e mensagens:

| Código | Bloqueia quando | Mensagem |
|---|---|---|
| `conta_desativada` | `users.ativo=False` | Conta desativada |
| `cadastro_pendente` | `status_cadastro != aprovado` | Cadastro não aprovado |
| `restricao` | `restricao_acesso` preenchido | Restrição: <texto> |
| `sem_matricula` | nenhuma matrícula `ativa` | Sem matrícula ativa |
| `matricula_vencida` | vencida há mais que `tolerancia_dias_vencimento` dias | Matrícula vencida em dd/mm/aaaa |
| `pagamento_pendente` | `bloquear_pagamento_pendente` e há pendente vencido | Pagamento pendente |

`POST /acessos` sempre reavalia no servidor. Bloqueado + `forcar=true` + permissão `liberar_acesso_manual` → grava `liberado` com `liberacao_manual=true` e os motivos. Bloqueado sem forçar → grava `bloqueado` (a tentativa fica no histórico) e responde 200 com `resultado: "bloqueado"`. **Frequência = acessos `liberado`.**

### Fichas (`services/fichas.py`, estendido)

- `POST /ficha` aceita `status` (`rascunho|publicada`, padrão **`publicada`** para não quebrar o app atual) e `objetivo`.
- Aluno só vê fichas `publicada` (todas as rotas do aluno: `/ficha/aluno`, treino de hoje, execução). Rascunho é invisível ao aluno.
- `POST /ficha/{id}/publicar` → `status=publicada`, cria `fichas_versoes` com `numero = último + 1`. Publicar de novo uma ficha já publicada cria nova versão (é assim que "salvar alterações" vira histórico).
- `POST /ficha` com `status=publicada` também cria a versão 1.
- `GET /ficha/{id}/versoes` (lista `numero`, `publicada_em`, autor) e `GET /ficha/{id}/versoes/{numero}` (conteúdo).
- `POST /ficha/{id}/duplicar` `{aluno_id?, nome?}` → copia treinos e itens **ativos** como nova ficha `rascunho` do mesmo professor (admin: mantém o professor original). `aluno_id` precisa ser acessível.
- `POST /ficha/item/{id}/duplicar` → copia o item logo abaixo (ordem + 1, reordenando os seguintes).
- Toda escrita em ficha/treino/item atualiza `fichas.atualizado_em` e grava auditoria (`ficha.criar`, `ficha.editar`, `ficha.publicar`...). Admin pode editar qualquer ficha; a auditoria registra que foi o admin.

## API nova

Paginação padrão onde indicado: `?pagina=1&por_pagina=20` (máx. 100) → `{itens: [...], total, pagina, por_pagina}`.

### Gestão de alunos (admin + recepção)

| Método e rota | Permissão | Notas |
|---|---|---|
| `GET /gestao/alunos` | qualquer recepção | Paginado. Filtros: `busca` (nome, e-mail, telefone, CPF), `situacao` (`vigente\|vencendo\|vencida\|sem_matricula\|pendente\|desativado\|inadimplente`), `professor_id` (`0` = sem professor), `plano_id`. Item: `id, nome, email, telefone, foto, ativo, status_cadastro, professor {id,nome}\|null, plano_atual {id,nome}\|null, data_vencimento, situacao, inadimplente, criado_em` |
| `GET /gestao/alunos/{id}` | qualquer recepção | Tudo acima + `cpf, endereco, observacoes, data_nascimento, restricao_acesso, codigo_acesso, matricula_atual, aprovado_em` |
| `POST /gestao/alunos` | `cadastrar_aluno` | `email, senha, nome, telefone, data_nascimento, cpf?, endereco?, observacoes?`; admin pode mandar `professor_id`. Nasce aprovado. 400 `E-mail já cadastrado`, 400 `CPF já cadastrado` |
| `PUT /gestao/alunos/{id}` | `editar_aluno` | `nome, telefone, data_nascimento, cpf, endereco, observacoes` (e-mail não muda aqui) |
| `POST /gestao/alunos/{id}/aprovar` · `/recusar` | `aprovar_aluno` | Só de `pendente` (409 `Cadastro não está pendente`) |
| `GET /gestao/alunos/{id}/matriculas` · `/pagamentos` · `/acessos` | qualquer recepção | Histórico (acessos paginado) |
| `PUT /admin/alunos/{id}/status` `{ativo}` | admin | |
| `PUT /admin/alunos/{id}/professor` `{professor_id\|null}` | admin | Professor precisa estar ativo (422 `Professor inativo`); grava `professor_vinculado_em` |
| `PUT /admin/alunos/{id}/restricao` `{restricao_acesso\|null}` | admin | |

### Professores, recepção, planos (admin)

| Método e rota | Notas |
|---|---|
| `GET /admin/professores` | `id, nome, email, telefone, foto, ativo, criado_em, total_alunos, total_fichas, total_avaliacoes` |
| `POST /admin/professores` | inalterado (agora grava `criado_em` e auditoria) |
| `GET /admin/professores/{id}` | dados + `alunos` (resumo), `fichas` (id, nome, aluno, status, atualizado_em), `avaliacoes_recentes`, `atividade` (últimos 20 eventos de auditoria do usuário) |
| `PUT /admin/professores/{id}` | `nome, telefone, email` |
| `PUT /admin/professores/{id}/status` `{ativo}` | desativar **não** desvincula alunos; a tela oferece transferir |
| `POST /admin/professores/{id}/transferir-alunos` `{destino_professor_id\|null, aluno_ids?}` | sem `aluno_ids` = todos; destino ativo e diferente da origem |
| `GET/POST /admin/recepcionistas`, `GET/PUT /admin/recepcionistas/{id}`, `PUT .../status`, `PUT .../permissoes` `{permissoes: [...]}` | criar: `email, senha, nome, telefone, permissoes?` (padrão da tabela). Detalhe inclui `atividade` (auditoria do usuário, paginada em `/admin/auditoria?user_id=`) |
| `GET /planos` | admin: todos (filtro `ativo`); recepção: só ativos. Cada um com `total_alunos` (matrículas `ativa`) |
| `POST /admin/planos`, `PUT /admin/planos/{id}`, `PUT /admin/planos/{id}/status` | mudar valor não altera matrículas existentes |
| `GET /admin/planos/{id}/alunos` | alunos com matrícula `ativa` no plano |

### Matrículas, pagamentos, entradas (admin + recepção)

| Método e rota | Permissão |
|---|---|
| `GET /matriculas` (paginado; `aluno_id`, `status`, `situacao`, `plano_id`) | qualquer recepção |
| `POST /matriculas` `{aluno_id, plano_id, data_inicio?}` | `matricular` |
| `POST /matriculas/{id}/renovar` `{plano_id?}` | `renovar_matricula` |
| `POST /matriculas/{id}/alterar-plano` `{plano_id}` | `alterar_plano` |
| `POST /matriculas/{id}/cancelar` `{motivo}` | `cancelar_matricula` |
| `GET /pagamentos` (paginado; `status`, `aluno_id`, `inicio`, `fim`, `inadimplentes=true`) | qualquer recepção |
| `POST /pagamentos/{id}/registrar` `{forma, valor_recebido?, pago_em?}` | `registrar_pagamento` |
| `POST /pagamentos` `{aluno_id, descricao, valor, forma}` (avulso, já pago) | `registrar_pagamento` |
| `POST /pagamentos/{id}/estornar` `{motivo}` | `estornar_pagamento` |
| `GET /pagamentos/{id}/comprovante` | qualquer recepção → `{numero, aluno, descricao, valor, valor_recebido, forma, pago_em, registrado_por, academia {nome, endereco, telefone}}` (só `pago`/`estornado`) |
| `GET /acessos/verificar?aluno_id=` ou `?codigo=` | qualquer recepção → `{aluno {id,nome,foto,status_cadastro,ativo}, autorizado, motivos [{codigo, mensagem}], matricula {plano, data_vencimento, situacao}\|null, pendencias {quantidade, valor_total}, ultimas_entradas [5]}` |
| `POST /acessos` `{aluno_id \| codigo, origem="manual", forcar=false}` | `registrar_acesso` (+ `liberar_acesso_manual` se `forcar`) |
| `GET /acessos` (paginado; `data` padrão hoje, `aluno_id`, `resultado`) | qualquer recepção |

### Painéis

- `GET /admin/dashboard` → `totais {alunos, ativos, inativos, pendentes, vencidos, vencendo, inadimplentes, professores, recepcionistas}`, `alunos_recentes [5]`, `alunos_por_professor [{professor_id\|null, nome, total}]`, `alunos_por_plano [{plano_id, nome, total}]`, `matriculas {novas_mes, renovacoes_mes, cancelamentos_mes}`, `series {cadastros_por_mes [{mes:"2026-11", total}] (12 meses, + sem_data), frequencia_por_mes [{mes, entradas, alunos_distintos}], ativos_inativos {ativos, inativos}}`.
  - `ativos` = conta ativa, aprovado e matrícula vigente (inclui tolerância? **não**: só vigente); `inativos` = aprovados que não são ativos; `pendentes` = `status_cadastro=pendente`.
- `GET /recepcao/dashboard` (admin + recepção) → `ativos, entradas_hoje, matriculas_hoje, vencendo, vencidos, com_pendencia, cadastros_pendentes, ultimos_cadastros [5], atendimentos_recentes [10]` (auditoria de usuários `recepcao`/`admin` com ação de gestão).
- `GET /admin/financeiro?inicio=&fim=` (padrão: mês atual) → `recebido_periodo, pendente_total, vencido_total, inadimplentes (quantidade), recebido_por_mes [12], recebido_por_forma [{forma, total}]`.
- `GET /professor/dashboard` (professor) → `total_alunos, alunos_ativos, avaliacoes_pendentes` (vinculados sem avaliação ou com a última há mais de `dias_reavaliacao`), `fichas_ativas, fichas_rascunho, fichas_desatualizadas` (publicadas com `atualizado_em` há mais de `dias_atualizar_treino` ou `data_fim` vencida), `ultimos_alunos [5]` (por `professor_vinculado_em`), `proximas_avaliacoes [{aluno, ultima, proxima}]`.
- `GET /alunos/{aluno_id}/frequencia?meses=6` (professor vinculado ou admin; e `/gestao/alunos/{id}/frequencia` para recepção) → `{entradas_por_semana [...], total_periodo, ultima_entrada, sessoes_treino_periodo}`.

### Perfil da recepção

- `GET /perfil/recepcao` (recepção) → `{id, nome, telefone, permissoes: [...]}`; o app usa `permissoes` só para mostrar ou esconder ações (o backend continua decidindo).
- `PUT /perfil/recepcao` `{nome, telefone}` → mesma resposta (não altera permissões).

### Configuração e auditoria

- `GET /configuracao` (qualquer usuário autenticado) → dados públicos (nome, endereço, contato, horários).
- `GET /admin/configuracao` e `PUT /admin/configuracao` (todos os campos; validação: horários `HH:MM`, inteiros ≥ 0).
- `GET /admin/auditoria` (paginado; `user_id`, `acao`, `entidade`, `entidade_id`, `inicio`, `fim`) → itens com `usuario {id, nome, tipo}\|null`.
- Ações gravadas (mínimo): `aluno.cadastrar`, `aluno.editar`, `aluno.aprovar`, `aluno.recusar`, `aluno.ativar`, `aluno.desativar`, `aluno.trocar_professor`, `aluno.restricao`, `professor.criar`, `professor.editar`, `professor.ativar`, `professor.desativar`, `professor.transferir_alunos`, `recepcionista.criar`, `recepcionista.editar`, `recepcionista.ativar`, `recepcionista.desativar`, `recepcionista.permissoes`, `plano.criar`, `plano.editar`, `plano.ativar`, `plano.desativar`, `matricula.criar`, `matricula.renovar`, `matricula.alterar_plano`, `matricula.cancelar`, `pagamento.registrar`, `pagamento.avulso`, `pagamento.estornar`, `acesso.liberado_manual`, `configuracao.editar`, `ficha.criar`, `ficha.editar`, `ficha.publicar`, `ficha.duplicar`, `ficha.excluir`, `treino.*`, `item.*`. Entradas comuns (`acesso` liberado normal) **não** vão para a auditoria (já estão em `acessos`).

### Exercícios e avaliações (extensões)

- `ExercicioCriar/Atualizar/Resposta` ganham `instrucoes` (opcional) e `criado_por_professor_id` (só resposta). Professor edita/exclui exercício da biblioteca (`criado_por` nulo, como hoje) ou os próprios; de outro professor → 403 `Exercício de outro professor`. Admin edita todos. `GET /exercicios` ganha filtro `origem=biblioteca|meus`.
- `AvaliacaoCriar/Atualizar/Resposta` ganham as 9 circunferências opcionais (> 0, ≤ 300).
- `ItemFicha` (criar, editar, respostas) ganha `observacao` opcional.
- `TreinoCriar/Atualizar`: `dia_semana` opcional.

## Frontend

### Rotas (Expo Router, ADR-031 estendido)

| Grupo | Paths | Navegação |
|---|---|---|
| `(admin)` | `/admin` (painel), `/admin/alunos`, `/admin/alunos/[id]`, `/admin/professores`, `/admin/professores/[id]`, `/admin/recepcao`, `/admin/recepcao/[id]`, `/admin/planos`, `/admin/matriculas`, `/admin/financeiro`, `/admin/configuracoes`, `/admin/auditoria`, `/admin/perfil` | Abas: Painel, Alunos, Equipe, Financeiro, Mais |
| `(recepcao)` | `/recepcao` (painel), `/recepcao/entrada`, `/recepcao/alunos`, `/recepcao/alunos/novo`, `/recepcao/alunos/[id]`, `/recepcao/pagamentos`, `/recepcao/pagamentos/[id]/comprovante`, `/recepcao/perfil` | Abas: Painel, Entrada, Alunos, Pagamentos, Perfil |
| `(professor)` | atuais + `/fichas/montar` (nova) e `/fichas/[id]/montar` (edição web), `/fichas/[id]/versoes` | `/painel` vira o dashboard do professor (mantém o que já mostra hoje) |

- `rotaInicialDoPerfil`: `admin → /admin`, `recepcao → /recepcao`, professor e aluno inalterados. O admin deixa de entrar no grupo `(aluno)` (resolve TD-50); o `PainelAdmin` antigo é substituído pela área do admin (criar professor continua existindo lá).
- Tela de login: 403 com as mensagens de cadastro pendente/recusado/conta desativada aparece como mensagem de erro, não como "erro inesperado". Após `POST /cadastro`, o app mostra "Cadastro enviado. Aguarde a aprovação da recepção" e volta ao login (não tenta entrar).

### Fundação de interface (GA-03, congelada depois)

Em `components/ui/` (documentar em `docs/Design-System.md`), com os tokens atuais:

- `useLarguraTela()` → `{largura, ehLargo: largura >= 1024, ehMedio: largura >= 768}`.
- `LayoutAbas` / extensão de `BarraAbas`: em `ehLargo` (web e tablet) a navegação vira **sidebar** fixa à esquerda (logo, itens com ícone + rótulo, item ativo em amarelo, usuário e "Sair" no rodapé); abaixo disso, a barra inferior atual. As abas do professor e do aluno também ganham a sidebar no modo largo.
- `ConteudoLargo`: limita a largura do conteúdo (`maxWidth` 1200) e organiza colunas (`Grade` com 1/2/3/4 colunas conforme a largura).
- `TabelaDados<T>`: colunas declarativas; em `ehMedio` renderiza tabela com cabeçalho; em celular, cartões empilhados. Ordenação opcional, linha clicável, estado vazio/carregando/erro.
- `BarraFiltros` (busca com espera de 300 ms + chips), `Paginacao`, `Modal` (folha inferior no celular, diálogo centralizado no largo), `CampoSelecao` (lista em modal com busca), `CampoMoeda`, `CampoData`, `Indicador` (KPI: rótulo, valor em `tipografia.numero`, variação opcional), `SeloSituacao` (vigente/vencendo/vencida/pendente/desativado/liberado/bloqueado com cor **e** texto).
- `GraficoBarras` (react-native-svg, sem dependência nova; vertical e horizontal; rótulos e valores; acessível) ao lado do `GraficoLinha` existente (que vai para uso compartilhado).
- Confirmação de operações críticas: `mostrarAlerta` com botão destrutivo (padrão atual).

### Camada de dados (GA-04)

`types/gestao.types.ts`, `types/professorWeb.types.ts` e services: `gestaoAlunos.service.ts`, `equipe.service.ts` (professores + recepcionistas), `planos.service.ts`, `matriculas.service.ts`, `pagamentos.service.ts`, `acessos.service.ts`, `paineis.service.ts` (dashboards e financeiro), `configuracao.service.ts`, `auditoria.service.ts`; extensões em `ficha.service.ts`, `exercicio.service.ts`, `avaliacao.service.ts`. Funções puras de formatação em `utils/moeda.ts` e `utils/situacao.ts` (rótulo e cor de cada situação/motivo). Hooks ficam com cada tela.

## Fora do escopo agora

Gateway de pagamento, nota fiscal, leitor físico de QR/código de barras (só `origem` e `codigo_acesso` preparados), notificações push, multi-academia, criação de outros admins pela interface.

## Adendo da implementação (GA-02a e GA-02b, 09/11/2026)

- Rotas extras do professor: `GET /ficha/{id}/completa` (ficha com treinos e itens ativos, para o editor web), `GET /ficha?status=rascunho|publicada`. `POST /ficha/{id}/publicar` → `{numero, publicada_em, publicada_por {id, nome, tipo}}`; `POST /ficha/{id}/duplicar` → `FichaLista`; `POST /ficha/item/{id}/duplicar` → item.
- Frequência → `{entradas_por_semana [{semana_inicio (segunda-feira), total}], total_periodo, ultima_entrada, sessoes_treino_periodo}` (só sessões finalizadas).
- `/professor/dashboard`: `alunos_ativos` = conta ativa + aprovado + matrícula vigente; avaliações pendentes só de alunos ativos e aprovados.
- Duplicar ficha: `data_inicio` = hoje, `data_fim` nula. Admin edita fichas, mas não cria (`POST /ficha` segue só do professor).
- Gestão: `situacao` é exclusiva (`vigente` não inclui `vencendo`); `cadastros_por_mes` tem 12 meses + item final `{mes: "sem_data"}`; `forcar` sem permissão → 403 sem gravar; matricular aluno pendente ou desativado → 422; `comprovante.numero` = id com 6 dígitos.
- `horarios[].dia` usa os valores de `DiaSemana` (com acento: `terça`, `sábado`).

## Adendo do salvamento atômico da ficha (11/11/2026)

- **`PUT /ficha/{id}/completa`** (professor dono com aluno vinculado, ou admin): recebe o estado completo da ficha (`nome`, `objetivo`, vigência e `treinos` com `itens`) e aplica tudo numa única transação, devolvendo a ficha no formato de `GET /ficha/{id}/completa`. Ids existentes atualizam, itens e treinos sem `id` são criados e o que não vier é removido por exclusão lógica (item sem execução é apagado, como na rota de exclusão). Qualquer falha desfaz tudo, então o aluno nunca vê a ficha pela metade.
- Validações: exercício ativo (404 `Exercicio não encontrado`), ids pertencentes à ficha e ao treino informado (404 `Treino não encontrado` / `Item da ficha não encontrado`), ordens únicas (409, mesmas mensagens das rotas atuais), ids repetidos no corpo (422) e vigência (400). Mesmos 403 das demais rotas de escrita de ficha.
- Não altera `status` nem cria versão; `atualizado_em` é atualizado e a auditoria recebe **uma** entrada `ficha.editar` com o resumo (`treinos_criados`, `treinos_atualizados`, `treinos_removidos`, `itens_criados`, `itens_atualizados`, `itens_removidos`, `campos_alterados`). As rotas individuais de treino e item continuam iguais (o app mobile as usa).
- Frontend: `salvarFichaCompleta` em `ficha.service.ts`; o montador web salva com uma única chamada (ficha nova cria antes o rascunho vazio).

## Adendo da correção GA-05-fix (09/11/2026)

- **Escopo do professor em todos os recursos do aluno:** `GET /sessoes/{id}` → 404 `Sessão não encontrada` para aluno não vinculado. Fichas, treinos, itens, versões, duplicar/publicar e `PUT/DELETE /avaliacoes/{id}` exigem **ator = autor** e **aluno vinculado ao professor** (mesmos 403 e mensagens de antes). Sem professor vinculado só o admin gerencia as fichas do aluno.
- **ADR-038:** trocar o professor do aluno (`PUT /admin/alunos/{id}/professor`) ou `transferir-alunos` passa as fichas **ativas** do aluno para o novo professor; a auditoria guarda origem, destino e `fichas_transferidas`. Avaliações mantêm o autor.
- **Regra única de matrícula** em `services/matriculas.py` (`filtro_situacao_matricula`, `filtro_situacao`, `condicao_aluno_habilitado`, `condicao_aluno_ativo`, `vencida_alem_da_tolerancia`); routers, painel do professor e controle de entrada só a chamam.
- **Dashboard admin:** `totais.alunos` e a soma de `alunos_por_professor` agora contam **todos** os alunos (antes o segundo só contava contas ativas).
- **Validações:** CPF normalizado (só dígitos, 11) e com dígitos verificadores → 422 `CPF inválido`; `pago_em` futuro (folga de 5 min) → 422; `sub` inválido no token → 401 `Token inválido ou expirado`; `COOKIE_SAMESITE=none` sem `COOKIE_SECURE=true` impede a inicialização. Violação de unicidade em corrida (e-mail, CPF) → 400 `E-mail já cadastrado` / `CPF já cadastrado`. `FOR UPDATE` ao publicar versão, registrar/estornar pagamento e cancelar matrícula.
- `GET /acessos` e `GET /gestao/alunos/{id}/acessos` usam os mesmos motivos detalhados de `/acessos/verificar` ("Restrição: …", "Matrícula vencida em dd/mm/aaaa").
- Frontend: 401 `Conta desativada` leva ao login mostrando a mensagem; `dia_semana` nulo aparece como "Sem dia fixo".
- Avaliação física: só o professor vinculado cria e edita; o admin **lê** (`GET /alunos/{id}/avaliacoes`), mas `POST /alunos/{id}/avaliacoes` continua só do professor (403 `Acesso permitido apenas para professor`), porque a avaliação exige um professor como autor (ADR-038). Decidido na rodada de QA da expansão de gestão.
- `POST /matriculas/{id}/alterar-plano` com o mesmo plano da matrícula → **422 `Escolha um plano diferente do atual`**.
