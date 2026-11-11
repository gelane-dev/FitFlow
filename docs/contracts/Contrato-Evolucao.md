---
tags: [fitflow, contrato]
atualizado: 2026-11-07
---

# Contrato — Seção Evolução (EV-01 a EV-04)

Decisões em [[Decisions#ADR-032 Gráficos de linha com react-native-svg]]. Mudou algo aqui? Registre a alteração neste contrato antes de implementar.

## Regras gerais

- Só dados reais de `historicos_execucao` e `avaliacoes_fisicas`. Nada fictício, interpolado ou preenchido com zero.
- Sem tabela nova. O aluno só enxerga os próprios dados: o `aluno_id` vem do token (`verificar_aluno`), nunca do cliente.
- Mudanças de API são **aditivas**: chamadas sem `periodo` respondem como hoje, com os campos novos a mais.
- Circunferências não existem no modelo e ficam fora do escopo. Não crie colunas para elas.

## API

### `GET /evolucao/exercicios/{exercicio_id}` e `GET /alunos/{aluno_id}/evolucao/exercicios/{exercicio_id}`

Novo parâmetro opcional `periodo`: `7d | 30d | 3m | 6m | 1a`. Valor inválido → **422**.

| `periodo` | Dias, contando hoje |
|---|---|
| `7d` | 7 |
| `30d` | 30 |
| `3m` | 90 |
| `6m` | 180 |
| `1a` | 365 |
| ausente | todo o histórico |

Janela: `data_execucao.date() >= hoje - (dias - 1)`, com `hoje` no fuso `APP_TIMEZONE` (`core/tempo.py`).

Resposta (campos novos marcados):

```jsonc
{
  "exercicio_id": 1,
  "nome": "Supino",
  "periodo": "30d",            // NOVO: eco do parâmetro; null se ausente
  "pontos": [                  // apenas dias dentro do período, em ordem crescente
    {
      "data": "2026-11-01",
      "carga_maxima": 40.0,
      "volume": 960.0,         // soma de series × repetições × carga do dia
      "registros": 3,
      "repeticoes_maximas": 12, // NOVO: maior repeticoes_realizadas do dia
      "series": 3               // NOVO: soma de series_realizadas do dia
    }
  ],
  "comparacao": {              // NOVO: sempre sobre TODO o histórico, ignora `periodo`
    "atual": { /* PontoEvolucao do dia mais recente */ },
    "anterior": { /* PontoEvolucao do dia anterior com registro */ } // ou null se só há um dia
  }
}
```

- Exercício com histórico, mas sem registros no período: **200** com `pontos: []` e `comparacao` preenchida.
- Sem nenhum registro do exercício: **404** `Sem registros para este exercício` (inalterado).
- Professor: **404** `Aluno não encontrado` (inalterado).

`GET /evolucao/exercicios` e as rotas de avaliação **não mudam**. A evolução física usa `GET /avaliacoes`.

### Banco

Índice composto `ix_historicos_execucao_aluno_data` em `historicos_execucao (aluno_id, data_execucao)`, com migração Alembic escrita à mão. Migração só adiciona: nada é removido.

## Frontend

### Tela `(aluno)/(abas)/aluno/evolucao/index.tsx`

Mantém `testID="tela-evolucao"`, a aba e a URL. Ordem da tela:

1. Cabeçalho `Evolução`.
2. Resumo com indicadores de progresso (só dados reais; bloco sem dado não aparece ou mostra "—").
3. Evolução dos treinos: seletor de exercício, período, métrica (Carga, Repetições, Volume), gráfico de linha, comparação e histórico de desempenho do exercício.
4. Evolução física: seletor de indicador, gráfico de linha, comparação com a avaliação anterior.
5. Histórico das avaliações físicas, com o detalhe de cada uma.

Cada seção tem carregamento (skeleton), erro com "Tentar novamente" e vazio próprios: falha em uma seção não derruba a outra.

#### Reorganização de UX (EV-05, 09/11/2026)

A ordem acima vira esta estrutura, sem mudar API, cálculos, URL, aba nem `testID="tela-evolucao"`:

1. Cabeçalho `Evolução` e um **resumo compacto** (uma faixa, até 3 indicadores com significado claro para o aluno, só dados reais, sem "registros" brutos).
2. **Alternador interno `Treinos | Corpo`** (estado local, sem rota nova). Padrão: `Treinos`. Cada lado tem os próprios estados de carregamento, erro e vazio.
3. **Treinos:** seletor de exercício → **um cartão** com valor atual e variação × anterior no cabeçalho, métrica (Carga, Repetições, Volume) dentro do cartão, gráfico e período em **uma linha só** com rótulos curtos (`7D 30D 3M 6M 1A Tudo`) que cabe em 320 px. Abaixo, dois indicadores lado a lado: "No período" e "Treino anterior" (valor e data). A variação do cabeçalho traz a legenda "vs. treino anterior" (no Corpo, "vs. avaliação anterior", com a avaliação anterior dentro do cartão). Alternar Treinos/Corpo preserva exercício, métrica, período, indicador e avaliação expandida. Histórico de desempenho com os **3 registros mais recentes** e o link "Ver todo o histórico do exercício" sempre visível.
4. **Corpo:** indicador (Peso, Gordura, Músculo, IMC) → um cartão com o mesmo padrão (valor atual, variação × anterior, gráfico). Histórico das avaliações como **lista compacta**: uma linha por avaliação (data, peso, IMC, gordura), selo "Mais recente" e medida ausente com "—" discreto. Tocar abre o detalhe com todas as medidas, altura e observação (expandir na própria linha ou folha inferior).
5. Nada de informação duplicada: a data e o valor atual aparecem uma vez por cartão.

### Indicadores físicos

| Chave | Rótulo | Unidade | Direção favorável |
|---|---|---|---|
| `peso` | Peso | kg | neutra |
| `percentual_gordura` | Gordura | % | queda |
| `massa_muscular` | Massa muscular | kg | alta |
| `imc` | IMC | sem unidade | neutra |

- Um indicador por gráfico: nunca duas unidades no mesmo eixo.
- `null` não vira ponto nem zero. A comparação usa as duas avaliações mais recentes **que têm aquele indicador**.
- `altura` e `observacao` aparecem no detalhe da avaliação.
- Não altere `setaVariacao` nem o comportamento da tela `aluno/avaliacoes`.

### Variação (`atual` × `anterior`)

- Diferença absoluta: `atual - anterior`.
- Percentual: `(atual - anterior) / anterior × 100`; `null` quando `anterior` é 0.
- Sem anterior: mostrar "Primeira avaliação" ou "Primeiro registro", sem número.
- Cor: direção favorável → `cores.sucesso`, desfavorável → `cores.perigo`, neutra → `cores.textoSecundario`. Sempre com sinal ou seta além da cor.

### Gráfico de linha

- Componente genérico e reutilizável, sem conhecer exercício ou avaliação: recebe pontos `{ data, valor }`, unidade e rótulo.
- Eixo Y derivado dos dados, sem começar forçosamente em zero, e com margem quando todos os valores são iguais.
- Um ponto só: mostra o ponto, sem linha. Lista vazia: estado vazio.
- Tocar em um ponto mostra valor e data; o padrão é o ponto mais recente. Alvo de toque ≥ 44 pt, mesmo com muitos pontos.
- Números com `tipografia.numero`. Acessibilidade: resumo textual do gráfico e rótulo em cada alvo de toque.

## Não alterar

`GraficoEvolucao`, telas do professor, `aluno/evolucao/[exercicioId].tsx` (só ganha a chamada igual à de hoje), textos e `testID`s usados em `e2e/tests/fluxos.spec.ts`.
