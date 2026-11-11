---
tags: [fitflow, backlog]
atualizado: 2026-11-10
---

# Backlog de ideias

Voltar: [[Home]] · [[Roadmap]] · Dívida: [[Technical-Debt]]

Ideias ainda **sem planejamento** (sem critérios nem prioridade). Ao serem priorizadas, entram no [[Roadmap]].

## Deixado de fora de propósito nas Fases 3 a 5

| Ideia | Por que ficou fora | Como está hoje |
|---|---|---|
| **Ciclos/mesociclos de periodização** (entidade própria, fases de carga, deload) | ADR-020: vigência por `data_inicio`/`data_fim` resolve o caso real (troca de ficha a cada X semanas) com 2 colunas | Ficha com vigência; o professor cria a próxima ficha |
| **Push notifications** (servidor, tokens de dispositivo, lembretes enviados pelo professor) | ADR-024: exige infraestrutura nova (servidor de push, FCM/APNs) | Lembrete diário **local**, configurado pelo aluno |
| **Refresh token** | ADR-015: o 401 já leva ao login; expiração é configurável por `JWT_EXPIRA_MINUTOS` | Token único (padrão 30 min) |
| **Biblioteca de gráficos** (svg/skia) | ADR-023: uma série de carga/volume não justifica dependência nativa | `GraficoEvolucao` com `View`s |
| **E2E no CI** | ADR-027: pesado (build web + Chromium) | Roda manualmente: `cd e2e && npm test` |
| ~~Professor restrito aos próprios alunos~~ | Implementado na gestão da academia (ADR-033, ADR-038) | Professor vê só os alunos vinculados; admin vê todos |
| **Testes em dispositivo físico / Maestro** | Não havia aparelho no ambiente de desenvolvimento (ADR-026) | Playwright sobre o build web |
| ~~Painel admin no app~~ | Implementado na gestão da academia (ADR-033 a ADR-038) | Área `/admin` completa (alunos, equipe, planos, matrículas, financeiro, auditoria, configurações) |
| **Aviso de fim do descanso em segundo plano** | Escopo do ADR-024 (só lembrete diário) | Vibração com o app aberto |
| **Esconder sessões vazias no histórico** | A-06 da revisão, sem perda de dados | Sessões sem registro aparecem |

## Gestão da academia: fora do escopo atual

Gateway de pagamento e cobrança automática, nota fiscal, leitor físico de QR code/código de barras (só `origem` e `alunos.codigo_acesso` estão preparados), notificações push e e-mail, várias academias (multi-tenant), criação de outros admins pela interface, exportação de relatórios (CSV/PDF), refresh token.

## Produto
- Modelos de ficha reutilizáveis como entidade própria (hoje o professor duplica uma ficha existente: `POST /ficha/{id}/duplicar`).
- Biblioteca de exercícios com categorias fixas de grupo muscular (hoje é texto livre) e equipamento.
- Supersérie / bi-set (agrupar itens).
- Progressão automática de carga sugerida a partir do histórico.
- Chat ou comentários do professor no treino.
- Metas do aluno (peso, carga em um exercício) com acompanhamento.
- Exportar evolução/avaliação física em PDF.
- Várias academias (multi-tenant) — impacta `GET /alunos` (TD-12).
- Modo offline para execução do treino com sincronização posterior.
- Fotos de progresso nas avaliações físicas.

## Técnico
- Paginação em `/alunos`, `/ficha`, `/ficha/progresso`, `/sessoes`.
- Rate limit no `/login`.
- Logs estruturados e tratamento global de exceções.
- Unificar verificação "professor é dono da ficha" (TD-18) — exige alinhar mensagens.
- Constraints únicas parciais no Postgres para ordem e exercício por treino (TD-23).
- Agregação da evolução em SQL (`GROUP BY`) se o histórico crescer (hoje em Python, aceitável).
- Lock (`with_for_update`) entre execuções e finalizar (TD-45).
- ~~Mover o token da web para cookie `HttpOnly` (TD-40)~~: feito no ADR-034.
