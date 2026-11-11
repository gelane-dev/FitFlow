---
tags: [fitflow, design]
atualizado: 2026-10-31
---

# Brief de UI/UX do FitFlow (Team Fitness) — decidido pelo arquiteto

Pedido do usuário: "a UI e a UX estão muito ruins. A única coisa que eu quero manter é a temática de cores, porque a academia é assim; pode fazer outras alterações. Quero uma barra de navegação na parte de baixo da tela para navegar pelo aplicativo. Quero algo bem com cara de aplicativo, tipo Strava, Nike Run ou algum aplicativo com aparência premium."

## Identidade (manter)
Preto + amarelo/dourado da academia (#FECF2B), com a fonte Orbitron e o logo em assets/images/branding.

## Tokens (src/theme/)
Cores:
- fundo #0A0A0B;
- superficie #141416;
- superficieElevada #1C1C1F;
- borda #26262A;
- bordaForte #34343A;
- primaria #FECF2B;
- primariaPressionada #E6B800;
- sobrePrimaria #0A0A0B (texto sobre amarelo);
- texto #FFFFFF;
- textoSecundario #A1A1AA;
- textoTerciario #8A8A93 (contraste ≥ 4,5:1 sobre fundo, superficie e superficieElevada; era #6B6B73, ~3,7:1);
- textoPlaceholder #5C5C65: dica de campo vazio (placeholder), propositalmente mais apagada que o texto digitado; os campos de item do treino vêm preenchidos com padrões (FX-C P-C);
- sucesso #3DDC84;
- perigo #FF5A5F;
- aviso #FFB020;
- gradienteDestaque ['#FECF2B', '#F5A623'].
Hoje há cores fixas espalhadas pelo código (#111111, #AAAAAA, #888, #1A1A1A...): todas passam a usar os tokens.

Tipografia:
- display: Orbitron. **Só para títulos de tela e a marca.** Todos os NÚMEROS (estatísticas, cronômetro, cargas, séries, gráficos) usam a fonte do sistema em peso 800 com `fontVariant: ['tabular-nums']`: token `tipografia.numero` (o zero do Orbitron parecia um ícone de "proibido"; QA I-01/P-17). Uso: `{ ...tipografia.numero, fontSize: 28 }`.
- O corpo do texto usa a fonte do sistema.
- Escala: 34 (título de tela) / 28 / 22 / 17 (corpo forte) / 15 (corpo) / 13 (legenda) / 11 (rótulo MAIÚSCULO com letterSpacing 1.2).

Espaçamento: grade de 4 pt (4, 8, 12, 16, 20, 24, 32, 40). Margem lateral das telas: 20.

Raios: 10 (chip), 14 (botão e input), 18 (card), 28 (hero).

Profundidade: cards com fundo superficie e borda de 1 px na cor borda, sem sombras pesadas. O hero usa o gradiente.

## Padrões (inspirados em Strava, Nike Run Club e Nike Training)
- **Barra de abas inferior** para cada perfil. Especificação:
  - fundo #0A0A0B (pode ser translúcido), com hairline no topo;
  - altura de 64 + safe area;
  - ícones Ionicons: contorno quando a aba está inativa, preenchidos quando ativa;
  - aba ativa: ícone e rótulo em amarelo, com um indicador (pílula ou ponto) acima ou abaixo;
  - aba inativa em textoTerciario;
  - haptics leve ao tocar.
  A barra fica escondida em telas de detalhe e de fluxo (formulários, execução do treino), que abrem por cima com botão de voltar.
- **Cabeçalho grande** no estilo Nike:
  - título enorme alinhado à esquerda;
  - acima dele, um rótulo pequeno (a saudação ou a data, por exemplo "SEXTA, 31 OUT");
  - avatar ou ação à direita.
- **Hero do treino de hoje**:
  - card grande com gradiente dourado e texto escuro;
  - nome do treino, número de exercícios e duração estimada;
  - CTA "Começar treino" (ou "Continuar" quando houver sessão aberta).
- **Blocos de estatística no estilo Strava**: número grande (`tipografia.numero`) com rótulo pequeno embaixo (treinos na semana, volume, sequência).
- **Listas** com linhas de 64 a 72 px de altura, ícone ou thumbnail à esquerda, título e subtítulo, chevron à direita e separadores finos.
- **Estado de carregamento** com skeleton, sem spinner solto no meio da tela. **Estado vazio** com ícone grande, frase curta e botão de ação. **Erro** com mensagem e "Tentar novamente".
- **Feedback ao tocar**: escala 0.97 e opacidade, mais haptics nas ações principais.
- **Formulários**:
  - rótulo acima do campo;
  - campo preenchido (superficieElevada) que ganha borda amarela no foco;
  - botão primário com 52 px de altura, largura total e preso ao rodapé quando fizer sentido;
  - teclado tratado.
- **Ações destrutivas** em vermelho, sempre com confirmação (mostrarAlerta).
- **Ritmo e respiro**: bastante espaço entre as seções, com títulos de seção em rótulo MAIÚSCULO pequeno.

## Navegação (rotas)
Use grupos do Expo Router. Os nomes entre parênteses NÃO mudam a URL: os paths atuais (/fichas, /alunos/..., /aluno/..., /perfil, /exercicios...) continuam iguais, porque o E2E e os router.push dependem deles.

Abas do **professor**:
1. Início — painel novo: saudação; estatísticas (alunos, fichas vigentes, exercícios); atalhos "Nova ficha" e "Novo exercício"; alunos recentes. Usa só endpoints que já existem.
2. Alunos — /alunos.
3. Fichas — /fichas.
4. Exercícios — /exercicios.
5. Perfil — /perfil.

Abas do **aluno** (e do admin, que hoje vê a área do aluno):
1. Início — /aluno: hero do treino de hoje, semana em pontos (dias treinados) e estatísticas.
2. Treinos — fichas e treinos.
3. Histórico — /aluno/historico.
4. Evolução — /aluno/evolucao.
5. Perfil — /perfil, com entradas para Avaliações e Lembretes.

O login e o cadastro também devem ganhar visual premium: fundo de academia escurecido, logo, campos e botões novos.

## Dependências aprovadas (ADR-031)
Todas são oficiais do Expo e existem no Expo Go do SDK 57. Instale com `npx expo install`:
- @expo/vector-icons (ícones; hoje só existe como dependência transitiva);
- expo-linear-gradient (hero e botões em destaque);
- expo-haptics (feedback tátil).
Nada além dessas: sem UI kits nem bibliotecas de navegação extras. As abas vêm do Tabs do expo-router.

## Regras
Mantenha o padrão tela → hook → service. A lógica dos hooks e services não muda: é redesenho visual e de navegação. Use mostrarAlerta e useRecarregarNoFoco. Todo texto em português. Preserve os testIDs e os textos que o E2E (e2e/tests/fluxos.spec.ts) usa; se precisar mudar algum, atualize o E2E na mesma tarefa.

---

# API dos componentes (implementada na onda UI-1)

Tudo vive em `frontend/src` e é importado de `@/components/ui` (barrel) ou do arquivo do componente. Tokens: `import { cores, espacamento, raios, tipografia, fonteDisplay, margemTela } from '@/theme'`. **Nunca escreva hexadecimal em tela ou componente**: use `cores.*`.

## Estrutura de rotas (`src/app`)

```
_layout.tsx                      # fontes, AuthProvider, Stack.Protected por perfil
(publico)/   _layout, index (login /), cadastro (/cadastro)
(professor)/ _layout (Stack, âncora (abas))
  (abas)/    _layout (Tabs + BarraAbas), painel (/painel), alunos/index (/alunos),
             fichas (/fichas), exercicios (/exercicios), perfil (/perfil)
  alunos/[id]/..., exercicios/novo|[id]/..., fichas/nova|[id]/...   # detalhes e fluxos, sem barra
(aluno)/     _layout (Stack, âncora (abas))
  (abas)/    _layout (Tabs + BarraAbas), aluno/index (/aluno), aluno/treinos (/aluno/treinos),
             aluno/historico/index, aluno/evolucao/index, perfil (/perfil)
  aluno/fichas/[id], aluno/treino/[treinoId], aluno/historico/[sessaoId],
  aluno/evolucao/[exercicioId], aluno/avaliacoes, aluno/lembretes # detalhes e fluxos, sem barra
```

Como criar telas:
- **Tela de aba** (arquivo dentro de `(abas)`): `<Tela abas aoAtualizar={...}>` + `<CabecalhoGrande .../>`. A barra de abas já cobre a safe area de baixo (`abas`).
- **Tela de detalhe/fluxo** (fora de `(abas)`): `<Tela>` (sem `abas`) + `<CabecalhoDetalhe titulo="..."/>`. Formulários: `<Tela teclado rodape={<Botao>...</Botao>}>`.
- Para abrir uma aba a partir de outra tela, use `router.navigate('/fichas')`; para detalhe, `router.push(...)`.
- `Perfil` é uma aba nos dois grupos: cada `(abas)/perfil.tsx` renderiza `components/PerfilConteudo`.

## Componentes

| Componente | Props principais | Observações |
|---|---|---|
| `Tela` | `children`, `rolavel` (true), `aoAtualizar?`, `atualizando?`, `abas?`, `teclado?`, `rodape?`, `semMargem?`, `style?` | SafeArea + fundo `fundo` + margem lateral 20. `aoAtualizar` liga o puxar-para-atualizar. `teclado` usa `KeyboardAwareScrollView`. `rodape` fica preso embaixo com hairline. Tem um **véu** (`VeuStatusBar`, faixa `fundo` sobre a safe area superior) para o conteúdo rolado não passar sob o relógio. |
| `TelaLista` / `TelaSecoes` | `dados`+`renderItem`+`chave` / `secoes`+`renderSecao`+`renderItem`+`chave`; `cabecalho?`, `vazio?`, `rodape?`, `aoAtualizar?`, `atualizando?`, `aoChegarAoFim?`, `abas?`, `espacoInferior?` | Mesma casca de `Tela` (safe area, margem 20, véu, puxar-para-atualizar) sobre `FlatList`/`SectionList` (virtualizadas). Use para listas que crescem sem limite (histórico, evolução) e nas listas do professor; `espacoInferior` reserva espaço para o `BotaoFlutuante` (`ESPACO_BOTAO_FLUTUANTE`). É o único componente de lista de tela. `cabecalho` rola junto; `vazio` aparece no lugar dos itens (esqueleto, erro ou estado vazio). |
| `DialogoAlerta` | `visivel`, `titulo`, `mensagem?`, `botoes?`, `aoEscolher` | Modal escuro do design system (centrado, `superficieElevada`). Botões: `default` (amarelo), `destructive` (vermelho, variante `perigo`) e `cancel` (secundário). Não use direto: `mostrarAlerta` o abre pelo `ProvedorAlerta` (ADR-030, adendo). testIDs: `dialogo-alerta`, `alerta-titulo`, `alerta-mensagem`, `alerta-botao-<estilo>-<índice>`. |
| `CabecalhoGrande` | `rotulo?`, `titulo`, `direita?` | Estilo Nike: rótulo pequeno (ex.: `rotuloData()`), título 34 Orbitron, avatar/ação à direita. |
| `CabecalhoDetalhe` | `titulo?`, `direita?`, `aoVoltar?` | Botão circular de voltar (`testID="botao-voltar"`, `accessibilityLabel="Voltar"`), título centralizado, ação à direita. Padrão: `router.back()`; sem histórico (URL aberta direto), `router.replace` para a aba inicial do perfil logado (`/painel` professor, `/aluno` aluno/admin; `rotaInicialDoPerfil`). Reserva 16 pt de respiro abaixo de si, então o primeiro cartão não cola no cabeçalho. |
| `Cartao` | `children`, `onPress?`, `elevado?`, `semPadding?`, `style?` | Fundo `superficie`, borda 1 px, raio 18. Com `onPress` vira pressionável. |
| `HeroGradiente` | `children`, `style?` | Card com gradiente dourado, raio 28, padding 24. Texto dentro: `cores.sobrePrimaria`. |
| `Botao` | `children` (rótulo), `onPress`, `variante` (`primario`\|`secundario`\|`fantasma`\|`perigo`), `tamanho` (`grande` 52 \|`medio` 44\|`pequeno` 36), `carregando?`, `disabled?`, `icone?` (nome Ionicons), `larguraTotal` (true), `haptico` (true), `testID?` | `carregando` troca o rótulo por spinner e desabilita. |
| `CampoTexto` | `rotulo?`, `erro?`, `icone?` + todas as props de `TextInput` | Fundo `superficieElevada`, borda amarela no foco, vermelha com `erro`. `secureTextEntry` ganha o olho de mostrar senha. `multiline` cresce. |
| `Chip` | `rotulo`, `selecionado?`, `onPress?`, `icone?`, `igual?` (`igual` divide a linha em partes iguais: os 7 dias numa linha só) | Filtros e seleção (dia da semana, grupo). Altura visual 34, área de toque 44 (`hitSlop` vertical). |
| `Selo` | `rotulo`, `tom` (`primario`\|`sucesso`\|`perigo`\|`aviso`\|`neutro`) | Etiqueta de status em maiúsculas. |
| `BlocoEstatistica` | `valor`, `rotulo`, `unidade?`, `destaque?` | Número (`tipografia.numero`) de 28 + rótulo; a unidade ("kg", "dia(s)") acompanha o número. Use `flex: 1` em linha (já vem). |
| `LinhaLista` | `titulo`, `subtitulo?`, `icone?`, `thumbUri?`, `direita?`, `onPress?`, `semChevron?`, `separador` (true), `testID?` | Linha de 68 px; chevron aparece quando há `onPress`. |
| `TituloSecao` | `titulo`, `acao?: { rotulo, onPress }` | Rótulo MAIÚSCULO pequeno com espaço acima (32). |
| `Skeleton` / `SkeletonLista` | `largura?`, `altura?`, `raio?` / `linhas?` | Use no lugar de spinner solto. |
| `EstadoVazio` | `icone?`, `titulo`, `descricao?`, `acaoRotulo?`, `aoAcionar?` | Ícone grande, frase curta e botão opcional. |
| `EstadoErro` | `mensagem?`, `aoTentarNovamente?`, `rede?` | Erro da tela inteira, centralizado: ícone de **alerta** (`alert-circle-outline`) e botão "Tentar novamente" centralizado. `rede` troca o ícone pela nuvem sem conexão (use só em erro de rede). `testID="estado-erro"`. |
| `EstadoErroSecao` | `mensagem`, `aoTentarNovamente?`, `rede?`, `testID?` | Variante **compacta** para o erro de uma seção (a tela continua útil): cartão com ícone, mensagem e botão pequeno "Tentar novamente". Substitui a linha vermelha solta (QA I-05). `testID` padrão `estado-erro-secao`. Importe de `@/components/ui/EstadoErroSecao`. |
| `Avatar` | `uri?`, `nome?`, `tamanho` (44) | Sem foto: iniciais em Orbitron. |
| `Pressionavel` | `onPress`, `escala` (0.97), `haptico` (`'leve'`\|`'media'`\|`'sucesso'`\|`false`), `style`, `disabled` | Base de todo toque: escala + opacidade ao pressionar. |
| `BarraAbas` | `{...propsDoTabBar} abas: Record<nomeDaRota, { rotulo, icone, iconeAtivo }>` | Use em `<Tabs tabBar={(p) => <BarraAbas {...p} abas={ABAS}/>}>`. `testID` de cada aba: `aba-<Rótulo>`; a barra: `barra-abas`. |
| `tocarHaptico(intensidade)` | `'leve'`\|`'media'`\|`'sucesso'` | Seguro na web (no-op). |

Utilitários de texto: `pluralizar(n, 'dia')` ("1 dia"/"2 dias", com espaço que não quebra), `plural(n, 'dia')` (só a palavra), `comUnidade(valor, 'kg')` (unidade presa ao número), `descreverTreino(n, min)` ("3 exercícios · ~16 min") e `inicialMaiuscula` em `@/utils/pluralizacao`; nunca use `textTransform: 'capitalize'` em linhas de metadados. `saudacao(hora)`, `rotuloData(data)` (`"SEXTA, 31 OUT"`) e `primeiroNome(nome)` em `@/utils/saudacao`.

`Button` (`components/button.tsx`) e `Input` (`components/input.tsx`) continuam existindo só para as telas ainda não migradas; novo código usa `Botao` e `CampoTexto`.

## Componentes da Evolução (`components/evolucao`, ADR-032)

Genéricos: não conhecem exercício nem avaliação. Gráfico de linha com `react-native-svg`; a matemática (escala, eixo Y, coordenadas) fica em `utils/graficoLinha.ts`. O `GraficoEvolucao` de barras segue nas telas do professor.

| Componente | Props principais | Observações |
|---|---|---|
| `GraficoLinha` | `pontos: {data, valor}[]`, `rotulo`, `unidade?`, `mensagemVazio?`, `embutido?`, `testID?` | Eixo Y derivado dos dados (sem zero forçado; margem se os valores são iguais). Um ponto: só o ponto, sem linha. Vazio: cartão com `mensagemVazio`. Tocar num ponto mostra valor e data (padrão: o mais recente). `embutido` (dentro de um `CartaoEvolucao`): sem moldura própria e sem repetir o valor mais recente, que já está no cabeçalho do cartão; a leitura só aparece ao tocar em outro ponto. Alvo de toque de 44 pt por ponto; com muitos pontos a área rola na horizontal. Acessibilidade: resumo textual (`<testID>-resumo`) e rótulo em cada alvo. testIDs: `<testID>`, `-valor`, `-data`, `-ponto-<i>`, `-vazio`, `-area`. |
| `SeletorPeriodo` | `valor: PeriodoEvolucao \| null`, `onChange` | `Chip`s `igual` numa linha só (`7D 30D 3M 6M 1A Tudo`; `Tudo` = `null`), cabem em 320 px sem quebrar nem rolar. testIDs `periodo-7d`… `periodo-1a`, `periodo-tudo`. |
| `SeletorExercicio` | `exercicios`, `selecionadoId`, `onSelecionar` | Campo (`seletor-exercicio`) que abre folha modal com busca (`seletor-exercicio-modal`, `-busca`, `-opcao-<id>`, `-fechar`). Para listas longas. |
| `ComparacaoValores` | `rotulo?`, `atual`, `anterior \| null`, `unidade?`, `direcao` (`alta`\|`queda`\|`neutra`), `semAnterior`, `testID?` | Cabeçalho do cartão: valor atual e data uma vez só (`-atual`, `-data`) e variação × anterior com diferença absoluta e percentual (`-variacao`). O valor anterior fica em `IndicadoresLado`. Cor por direção favorável (`sucesso`/`perigo`/`textoSecundario`), sempre com sinal e seta. Sem anterior mostra `semAnterior` (`-sem-anterior`), sem número. |
| `CartaoEvolucao` | `cabecalho?`, `children` | Um cartão (`Cartao`) com o cabeçalho (`ComparacaoValores` ou esqueleto) e, abaixo, controles e gráfico. Mesmo padrão nos lados Treinos e Corpo. |
| `IndicadoresLado` / `indicadorAnterior` | `itens: {rotulo, valor, cor?, detalhe?, accessibilityLabel?, testID?}[]` | Indicadores curtos lado a lado (quebram linha em tela estreita). Em Treinos: "No período" (`progresso-periodo`) e "Último × anterior" (`comparacao-treino-anterior`); no Corpo, só o segundo (`comparacao-fisica-anterior`). |
| `HistoricoDesempenho` | `pontos`, `exercicioId`, `aoVerDetalhe` | Os 3 registros mais recentes do período (`historico-desempenho`) e o link `link-detalhe-exercicio`, sempre visível (sozinho quando o período está vazio). |
| `ListaAvaliacoes` | `avaliacoes` | Lista compacta: uma linha por avaliação (data, peso, IMC, gordura; selo "Mais recente"; medida ausente com "—" discreto). Tocar expande o detalhe (todas as medidas, altura, observação), uma por vez. testIDs `avaliacao-<id>`, `-linha`, `-detalhe`. |
| `SecaoTreinos` / `SecaoCorpo` / `ResumoEvolucao` | dados e estados dos hooks | `SecaoTreinos`: seletor de exercício + cartão (métrica, período, gráfico) + indicadores + histórico. `SecaoCorpo`: indicador + cartão + lista das avaliações. Cada lado tem esqueleto, erro (`EstadoErroSecao`: `erro-treinos`, `erro-desempenho`, `erro-fisica`) e vazio próprios. `ResumoEvolucao`: faixa compacta de até 3 indicadores (exercícios, cargas em alta "X de N", peso atual). testIDs `secao-treinos`, `secao-fisica`, `secao-avaliacoes`, `resumo-evolucao`. |

A aba (`aluno/evolucao/index.tsx`) tem um alternador interno `Treinos | Corpo` (`Segmentado`, testIDs `segmento-treinos` e `segmento-corpo`, estado local, padrão Treinos).

O seletor de métrica reaproveita `components/aluno/Segmentado` (testIDs `segmento-carga_maxima`, `segmento-repeticoes_maximas`, `segmento-volume`, `segmento-peso`, `segmento-percentual_gordura`, `segmento-massa_muscular`, `segmento-imc`).

## Fundação de interface da gestão (GA-03, `components/ui`)

Contrato em [[Contrato-Gestao]] (seção Frontend). Tudo usa os tokens de `src/theme` (novo: `cores.primariaSuave`, amarelo translúcido do item ativo) e Ionicons. Exportado por `components/ui/index.ts`.

| Componente | Props principais | Observações |
|---|---|---|
| `useLarguraTela()` | — → `{largura, ehMedio (>=768), ehLargo (>=1024)}` | Reage a rotação/redimensionamento. Pura em `utils/larguraTela.ts` (`classificarLargura`, `colunasPorLargura`). |
| `BarraAbas` (estendida) | `abas` (igual a antes) | `ehLargo`: **sidebar** de 248 px à esquerda (logo, itens ícone + rótulo, ativo em amarelo com marcador, e-mail do usuário e "Sair" com confirmação; testIDs `barra-lateral`, `aba-<rótulo>`, `botao-sair-barra`). Abaixo disso, a barra inferior de sempre (`barra-abas`). O layout das abas precisa de `screenOptions={{ ...useOpcoesBarraAbas() }}` (posiciona a barra à esquerda no largo). Usada por aluno, professor, admin e recepção. |
| `ConteudoLargo` | `larguraMaxima?` (1200), `style?` | Limita e centraliza o conteúdo. |
| `Grade` | `colunas?`, `espaco?` (16), `children` | 1/2/3/4 colunas conforme a largura do próprio container (<480, <720, <960, acima). Cada filho vira uma célula. |
| `TabelaDados<T>` | `colunas: ColunaTabela<T>[]`, `dados`, `chaveItem`, `aoPressionar?`, `carregando?`, `erro?`, `aoTentarNovamente?`, `vazio?: {titulo, descricao?, icone?}`, `ordenacaoInicial?`, `rotulo?`, `testID?` | `ColunaTabela`: `{chave, titulo, render(item), peso?, alinhamento?, ordenavel?, valorOrdenacao?, principal?, ocultarNoCartao?}`. `>=768`: tabela com cabeçalho (ordenável: seta no cabeçalho, `tabela-ordenar-<chave>`); celular: cartões (coluna `principal` = título). testIDs `<testID>-linha-<chave>` / `-cartao-<chave>`. |
| `BarraFiltros` | `aoBuscar(texto)`, `buscaInicial?`, `placeholder?`, `chips?: {valor, rotulo}[]`, `chipAtivo?`, `aoMudarChip(valor\|null)` | Busca com espera de 300 ms (`ESPERA_BUSCA_MS`); não dispara na montagem. Chips de escolha única (tocar no ativo desmarca). testIDs `filtro-busca`, `filtro-limpar`, `filtro-chip-<valor>`. |
| `Paginacao` | `total`, `tamanhoPagina`, `pagina` (1-based), `aoMudarPagina`, `carregando?` | "21–40 de 135", "Página 2 de 7", Anterior/Próxima (`paginacao-anterior`, `paginacao-proxima`). Some com `total = 0`. Cálculo em `utils/paginacao.ts`. |
| `Modal` | `visivel`, `titulo`, `aoFechar`, `rodape?`, `children` | Folha inferior no celular, diálogo centralizado (560 px) a partir de 768. Fundo/botão/voltar fecham (`modal-fundo`, `modal-fechar`). |
| `CampoSelecao<V>` | `opcoes: {valor, rotulo, descricao?}[]`, `valor \| null`, `aoMudar`, `rotulo?`, `placeholder?`, `erro?`, `buscavel?`, `limpavel?` | Lista em `Modal`; busca automática com mais de 7 opções. testIDs `selecao-opcao-<valor>`, `selecao-busca`. |
| `CampoMoeda` | `value` (mascarado), `onChangeValor(texto, decimal\|null)` + props de `CampoTexto` | Máscara de centavos ("1.234,56", prefixo R$). `decimal` = "1234.56" (formato da API). Helpers em `utils/campoMoeda.ts` (`decimalParaCampo` para editar). |
| `CampoData` | `value` (DD/MM/AAAA), `onChangeData(texto, iso\|null)` + props de `CampoTexto` | Máscara de data; `iso` só quando a data é válida. |
| `Indicador` | `rotulo`, `valor` (já formatado), `variacao?: {texto, tendencia: alta\|queda\|estavel, favoravel?}`, `icone?`, `carregando?`, `aoPressionar?` | KPI com `tipografia.numero`; variação com seta + texto (cor só reforça). |
| `SeloSituacao` | `situacao?` (vigente, vencendo, vencida, pendente, desativado, liberado, bloqueado ou texto livre), `info?: InfoSituacao` (de `utils/situacao`: `situacaoAluno(c)`, `statusPagamento(c)`, `statusMatricula(c)`, `resultadoAcesso(c)`...; tem prioridade sobre `situacao`), `rotulo?`, `testID?` | Único selo de situação das áreas de gestão (o antigo `SeloGestao` foi removido, na revisão final da expansão). Cor **e** ícone **e** texto, texto mínimo 12. Desconhecida: neutra, mostra o texto recebido. |
| `Etiqueta` | `rotulo`, `icone?`, `destaque?` (amarela) — rótulo somente leitura com o visual do `Chip` | Use dentro de cartões clicáveis: `Chip` é um botão e a web não aceita botão dentro de botão. |
| `GraficoBarras` | `dados: {rotulo, valor}[]`, `rotulo`, `orientacao?` (`vertical`\|`horizontal`), `formatarValor?`, `altura?`, `mensagemVazio?`, `testID?` | `react-native-svg`, escala "bonita" a partir de zero (`utils/graficoBarras.ts`), valores nas barras, `accessibilityLabel` com o resumo. Negativos viram barra vazia. |
| `GraficoLinha` | (igual ao de `components/evolucao`) | Reexportado em `components/ui`; os imports antigos continuam valendo. |
| `TelaEmConstrucao` | `titulo`, `rotulo?`, `icone?`, `comSair?` | Placeholder das abas de admin/recepção ("Em construção"); as abas de perfil trazem "Sair" (`botao-sair`) para o usuário não ficar preso no celular. |

Sessão web (ADR-034): `storage/secureStorage.ts` não guarda token na web; `services/api.ts` usa `withCredentials` e `X-FitFlow-Client: web`; a sessão volta por `GET /perfil`; `sair()` chama `POST /logout`. O mobile segue com SecureStore + Bearer.

## Componentes de gestão (GA-07, `components/gestao`)

Compartilhados entre a recepção e o admin. Importe de `@/components/gestao` (barrel). **Regras:** são visuais e não chamam a API; recebem dados e callbacks. As ações dependem de `permissoes: readonly PermissaoRecepcao[]`: a recepção passa as de `GET /perfil/recepcao` (hook `useRecepcaoPermissoes().permissoes`) e o **admin passa `PERMISSOES_RECEPCAO` (todas)**. Esconder a ação é conforto; o backend continua decidindo (403 mostra a mensagem do servidor). Cores só por `cores.*` e `utils/situacao.ts`.

| Componente | Props principais | Observações |
|---|---|---|
| `CabecalhoAluno` | `aluno` (`nome, foto, email?, telefone?, ativo, status_cadastro, situacao, inadimplente?, plano_atual?`), `acoes?: ReactNode`, `tamanhoFoto?` | Foto, nome, contato, selo da situação (`situacaoPrincipalAluno`: desativado > pendente/recusado > matrícula) e selo de inadimplente. Aceita `GestaoAlunoItem`/`GestaoAlunoDetalhe`. testID `cabecalho-aluno`. |
| `FormularioAluno` | `modo` (`criar`\|`editar`), `valoresIniciais?` (campos da API; `data_nascimento` ISO), `aoCriar?(GestaoAlunoCriar)`, `aoAtualizar?(GestaoAlunoAtualizar)`, `enviando?`, `erroGeral?`, `rotuloEnviar?` | Valida por campo ao tentar enviar (`validarFormularioAluno` em `utils/gestaoRecepcao`): nome, e-mail e senha (≥ 6, só ao criar), telefone, nascimento (DD/MM/AAAA, não futuro), CPF (vazio ou 11 dígitos, máscara). Devolve o payload com a data em ISO. No `editar` o e-mail é só leitura. testIDs `aluno-nome`, `-email`, `-telefone`, `-nascimento`, `-cpf`, `-senha`, `-endereco`, `-observacoes`, `aluno-salvar`. |
| `CartaoMatricula` | `matricula: MatriculaResposta\|null`, `permissoes`, `podeMatricular?`, `aoMatricular?`, `aoRenovar?`, `aoAlterarPlano?`, `aoCancelar?` | Cada botão exige a permissão (`matricular`, `renovar_matricula`, `alterar_plano`, `cancelar_matricula`) **e** o callback. testIDs `matricula-nova`, `-renovar`, `-alterar`, `-cancelar`. |
| `ListaMatriculas` | `matriculas`, `carregando?`, `erro?`, `aoTentarNovamente?` | Histórico com selo de status; esqueleto/erro/vazio próprios. |
| `ListaPagamentos` | `pagamentos`, `permissoes`, `carregando?`, `erro?`, `aoTentarNovamente?`, `aoRegistrar?`, `aoEstornar?`, `aoVerComprovante?` | Receber (pendente + `registrar_pagamento`), Estornar (pago + `estornar_pagamento`), Comprovante (pago/estornado). testIDs `pagamento-<id>-receber`/`-estornar`/`-comprovante`. |
| `ListaAlunosGestao` | `alunos`, `carregando?`, `erro?`, `aoTentarNovamente?`, `aoAbrir(aluno)`, `colunaContato` (`professor` admin \| `telefone` recepção), `renderAcoes?(aluno)` (cria a coluna "Ações"; devolver `null` deixa a célula vazia), `chips`, `chipAtivo`, `aoMudarChip`, `aoBuscar`, `filtrosExtras?` (entre a busca e a tabela), `vazio {titulo, descricao}`, `total`, `tamanhoPagina`, `pagina`, `aoMudarPagina` | Busca + chips + `TabelaDados` + `Paginacao` com colunas Aluno, contato, Plano, Vencimento e Situação (selo + inadimplente). Admin passa `colunaContato="professor"` e `filtrosExtras` (professor/plano); recepção passa `renderAcoes` conforme `pode('aprovar_aluno')`. testIDs `tabela-alunos`, `filtro-chip-<valor>`. |
| `ListaPagamentosGestao` | `pagamentos`, `carregando?`, `erro?`, `aoTentarNovamente?`, `renderAluno(p)`, `colunaDescricao?`, `tituloStatus?` (padrão `Status`), `mostrarMotivoEstorno?`, `renderAcoes(p)`, `alinhamentoAcoes?`, `vazio`, `total`, `tamanhoPagina`, `pagina`, `aoMudarPagina` | Tabela paginada de pagamentos (Valor, Vencimento, Forma, selo de status). Admin: `LinkAluno`, `colunaDescricao`, `tituloStatus="Situação"`, `mostrarMotivoEstorno` e botão Estornar; recepção: nome + descrição e Receber/Comprovante se `registrar_pagamento`. testID `tabela-pagamentos`. |
| `AcoesAlunoGestao` | `aluno {id, status_cadastro}`, `podeEditar`, `podeAprovar`, `aoEditar`, `aoAprovar`, `aoRecusar`, `processando` (id em andamento), `children?` | Botões do cabeçalho do detalhe: Editar, Aprovar/Recusar (só com cadastro pendente) e ações extras do papel (admin: Ativar/Desativar). testIDs `aluno-editar`, `aluno-aprovar`, `aluno-recusar`. |
| `DialogosAlunoGestao` | `aluno`, `matriculaAtual`, `planos {dados, carregando, erro}`, `modoMatricula`/`aoFecharMatricula`/`aoConfirmarMatricula`, `dialogoPagamento`/`aoFecharPagamento`/`aoConfirmarPagamento`, `editando`/`aoFecharEdicao`, `formulario {aoAtualizar, enviando, erroGeral, rotuloEnviar?}` | Diálogos de matrícula e pagamento e modal "Editar aluno". O estado de abertura fica na tela; os diálogos fecham sozinhos quando a confirmação não devolve erro. |
| `DialogoMatricula` | `visivel`, `modo` (`nova`\|`renovar`\|`alterar`\|`cancelar`), `aluno {id, nome}`, `matricula?`, `planos`, `carregandoPlanos?`, `erroPlanos?`, `aoFechar`, `aoConfirmar(resultado): Promise<string\|null>` | `resultado` = `{modo, dados}` pronto para o service (`useGestaoAcoesFinanceiras().executarMatricula(resultado, matriculaId)`). `aoConfirmar` devolve `null` (fecha) ou a mensagem de erro (fica aberto). Cancelar exige motivo e confirmação (`mostrarAlerta`). testIDs `dialogo-matricula`, `matricula-plano`, `-inicio`, `-motivo`, `-confirmar`, `-erro`. |
| `DialogoPagamento` | `visivel`, `modo` (`registrar`\|`avulso`\|`estornar`), `pagamento?`, `aluno?` (avulso), `aoFechar`, `aoConfirmar(resultado): Promise<string\|null>` | Valida forma e valor (> 0) antes de confirmar; estorno exige motivo + confirmação. `executarPagamento(resultado, pagamentoId)` no mesmo hook. testIDs `dialogo-pagamento`, `pagamento-forma`, `-valor`, `-descricao`, `-motivo`, `-confirmar`, `-erro`. |
| `PainelEntrada` | `verificacao: AcessoVerificacao\|null`, `carregando?`, `erro?`, `aoTentarNovamente?`, `permissoes`, `registro?`, `registrando?`, `erroRegistro?`, `aoRegistrar(forcar)`, `aoProximo?` | Resultado grande LIBERADO/BLOQUEADO (cor + ícone + texto), foto, plano, vencimento, pendências, motivos e últimas entradas. "Registrar" exige `registrar_acesso`; "Liberar mesmo assim" exige `liberar_acesso_manual` e confirmação. testIDs `entrada-liberado`, `entrada-bloqueado`, `entrada-registrar`, `entrada-liberar-mesmo-assim`, `entrada-registro`, `entrada-proximo`, `entrada-motivos`. |
| `HistoricoEntradas` | `acessos`, `carregando?`, `erro?`, `aoTentarNovamente?`, `mostrarAluno?`, `mostrarData?`, `textoVazio?` | Hora, resultado, motivos e marca "Liberação manual". |

Hooks (um só par genérico, na revisão final da expansão): `useGestaoConsulta(buscar|null, mensagemPadrao, deps)` (carregamento/erro com **descarte de resposta antiga**; `useAdminRecurso` é só um atalho com `chave` em texto) e `useGestaoAcao()` (`{processando, executar(operacao, padraoErro) → {ok, valor}|{ok:false, erro}}`; `useAdminAcao` é o mesmo hook; use o `erro` do resultado, nunca o estado do hook, para mostrar a falha na hora), `useGestaoCriarAluno()` (cadastro de aluno, admin e recepção), `useAdminProfessoresAtivos()`, `useGestaoPlanos`, `useGestaoAprovacao(aoConcluir)` (aprovar/recusar com confirmação), `useGestaoAcoesFinanceiras(aoConcluir)` (executa o que os diálogos devolvem), `useRecepcaoPermissoes` (contexto de `GET /perfil/recepcao`, montado em `(recepcao)/_layout.tsx`) e, só da recepção, `useRecepcaoPainel|Entrada|Alunos|AlunoDetalhe|Pagamentos|Comprovante`.

## testIDs e textos que o E2E usa
`aba-Início|Alunos|Fichas|Exercícios|Treinos|Histórico|Evolução|Perfil`, `barra-abas`, `botao-voltar`, `botao-sair`, `botao-comecar-treino` (hero do Início; abre a prévia), `botao-iniciar-treino` (prévia → execução), `botao-treinar-de-novo`, `dialogo-alerta` (os alertas agora são o modal do app, não `window.alert`), e os textos de login/cadastro (`ENTRAR`, `CADASTRAR`, `Cadastre-se`, placeholders). Mantenha-os ao redesenhar.

## Professor web (GA-08, `components/professor`)

Visão do professor para a web e o celular. Tudo usa tokens e `components/ui`; as regras de negócio estão em `utils/montadorFicha.ts` (puras) e nos hooks `useMontadorFicha`, `useProfessorBiblioteca`, `useProfessorVersoes`, `useProfessorFrequencia`, `useProfessorDashboard`, `useProfessorFichaAcoes`, `useProfessorId` (id do professor guardado **por usuário logado**, sem vazar entre contas) e `useAvisoSaidaSemSalvar`.

| Componente | Uso | Observações |
|---|---|---|
| `TelaMontador` | `/fichas/montar` (nova, aceita `?alunoId=`) e `/fichas/[id]/montar` (edição) | Estado local + **salvar explícito**: nada vai à API até "Salvar rascunho"/"Publicar". Largo (≥1024): editor à esquerda e biblioteca em painel à direita; celular: biblioteca em `Modal`. Aviso ao sair com alterações (`useAvisoSaidaSemSalvar`: `beforeRemove` + `beforeunload` na web). Publicar pede confirmação e mostra a versão criada. |
| `DadosFichaMontador` | aluno (só vinculados; fixo depois de criada), nome, objetivo, vigência | `CamposVigencia` ganhou `emColunas` (início e fim lado a lado). |
| `EditorDivisao` | divisão A/B/C: nome, dia ou "Sem dia fixo" (`dia_semana` nulo), mover/duplicar/remover divisão, lista de itens | Chips de dia com `papel="radio"`. |
| `LinhaItemMontador` | séries, reps, carga sugerida, descanso, observação + subir/descer/duplicar/remover | Botões de 44 pt (`BotaoIcone`) com `accessibilityLabel` ("Subir Supino reto"); o arrastar não foi implementado (opcional). testIDs `item-<i>-series|repeticoes|carga|descanso|observacao|subir|descer|duplicar|remover`. |
| `BibliotecaMontador` | busca (300 ms), origem (biblioteca/meus), grupo muscular, "Adicionar" | Servidor filtra nome e origem; o grupo é filtrado no cliente sobre o carregado. |
| `DialogoDuplicarFicha` | duplicar ficha para o mesmo ou outro aluno vinculado | A cópia nasce como rascunho. |
| `VisualizacaoVersao` | `/fichas/[id]/versoes`: conteúdo somente leitura de uma versão | |
| `SecaoFrequenciaProfessor` / `SecaoMedidasProfessor` | detalhe do aluno: frequência (`GraficoBarras`) e uma circunferência por `GraficoLinha` | |

Sincronização do montador (`calcularPlano`): ficha (POST/PUT) → remoções (`DELETE /treino`, `DELETE /ficha/item`) → por divisão `POST/PUT /treino` → itens novos `POST /ficha/itens`, editados `PUT /ficha/item/{id}` e só-reordenados `PUT /treino/{id}/itens/ordem`; ordem = posição + 1. Se falhar no meio, os ids já criados ficam no estado e a digitação é preservada.


## Nota sobre salvar ficha publicada
O montador aplica o diff em sequência (PUT/DELETE/POST), sem endpoint transacional. Em ficha **publicada** a edição vale na hora (o aluno vê as alterações assim que cada chamada termina) e "Publicar" só registra uma versão no histórico. O aviso após "Salvar alterações" diz isso. Dívida: um `PUT /ficha/{id}/completa` transacional eliminaria a janela de ficha pela metade (ver Technical-Debt.md, TD-67).
