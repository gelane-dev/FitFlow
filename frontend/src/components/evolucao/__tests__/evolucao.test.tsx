import { fireEvent, render, screen } from '@testing-library/react-native';
import { ReactElement, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ComparacaoValores } from '@/components/evolucao/ComparacaoValores';
import { ListaAvaliacoes } from '@/components/evolucao/ListaAvaliacoes';
import { ResumoEvolucao } from '@/components/evolucao/ResumoEvolucao';
import { GraficoLinha } from '@/components/evolucao/GraficoLinha';
import { SeletorExercicio } from '@/components/evolucao/SeletorExercicio';
import { SeletorPeriodo } from '@/components/evolucao/SeletorPeriodo';
import EvolucaoAluno from '@/app/(aluno)/(abas)/aluno/evolucao/index';
import { useDesempenhoExercicio } from '@/hooks/useDesempenhoExercicio';
import { useEvolucaoLista } from '@/hooks/useEvolucaoLista';
import { useMinhasAvaliacoes } from '@/hooks/useMinhasAvaliacoes';
import { AvaliacaoResposta } from '@/types/avaliacao.types';
import { EvolucaoExercicio, EvolucaoExercicioResumo, PontoEvolucao } from '@/types/evolucao.types';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), navigate: jest.fn(), back: jest.fn() },
  useFocusEffect: jest.fn(),
}));
jest.mock('@/hooks/useEvolucaoLista');
jest.mock('@/hooks/useMinhasAvaliacoes');
jest.mock('@/hooks/useDesempenhoExercicio');

const METRICAS = {
  frame: { x: 0, y: 0, width: 360, height: 800 },
  insets: { top: 24, left: 0, right: 0, bottom: 16 },
};

async function renderizar(elemento: ReactElement) {
  return render(<SafeAreaProvider initialMetrics={METRICAS}>{elemento}</SafeAreaProvider>);
}

type NoJson = { type: string; props: Record<string, unknown>; children?: (NoJson | string)[] | null };

function nos(raiz: NoJson | NoJson[] | null): NoJson[] {
  const lista = Array.isArray(raiz) ? raiz : raiz ? [raiz] : [];

  return lista.flatMap((no) => [
    no,
    ...nos((no.children ?? []).filter((c): c is NoJson => typeof c !== 'string')),
  ]);
}

const resumo = (id: number, nome: string): EvolucaoExercicioResumo => ({
  exercicio_id: id,
  nome,
  grupo_muscular: 'Peito',
  total_registros: 4,
  ultima_carga: 50,
  carga_maxima: 50,
  ultima_data: '2026-11-01',
});

const ponto = (data: string, carga: number): PontoEvolucao => ({
  data,
  carga_maxima: carga,
  volume: carga * 30,
  registros: 3,
  repeticoes_maximas: 10,
  series: 3,
});

const avaliacao = (id: number, data: string, extra: Partial<AvaliacaoResposta> = {}): AvaliacaoResposta => ({
  id,
  aluno_id: 1,
  professor_id: 2,
  data_avaliacao: data,
  peso: 70,
  altura: 1.75,
  imc: 22.86,
  percentual_gordura: null,
  massa_muscular: null,
  observacao: null,
  ...extra,
});

describe('GraficoLinha', () => {
  it('lista vazia mostra o estado vazio', async () => {
    await renderizar(<GraficoLinha pontos={[]} rotulo="Carga" unidade="kg" testID="g" />);

    expect(screen.getByTestId('g-vazio')).toBeTruthy();
    expect(screen.getByText('Sem registros para exibir.')).toBeTruthy();
  });

  it('um ponto só: mostra o valor e o alvo de toque, sem quebrar', async () => {
    await renderizar(<GraficoLinha pontos={[{ data: '2026-11-01', valor: 40 }]} rotulo="Carga" unidade="kg" testID="g" />);

    expect(screen.getByTestId('g-valor')).toHaveTextContent(/^40.kg$/);
    expect(screen.getAllByTestId(/^g-ponto-/)).toHaveLength(1);
  });

  it('o ponto mais recente vem selecionado e tocar troca valor e data', async () => {
    await renderizar(
      <GraficoLinha
        pontos={[
          { data: '2026-10-01', valor: 40 },
          { data: '2026-10-08', valor: 45.5 },
        ]}
        rotulo="Carga"
        unidade="kg"
        testID="g"
      />
    );

    expect(screen.getByTestId('g-valor')).toHaveTextContent(/^45,5.kg$/);
    expect(screen.getByTestId('g-data')).toHaveTextContent('08/10/2026');

    await fireEvent.press(screen.getByTestId('g-ponto-0'));

    expect(screen.getByTestId('g-valor')).toHaveTextContent(/^40.kg$/);
    expect(screen.getByTestId('g-data')).toHaveTextContent('01/10/2026');
  });

  it('cada alvo tem rótulo de acessibilidade e há um resumo textual', async () => {
    await renderizar(
      <GraficoLinha
        pontos={[
          { data: '2026-10-01', valor: 40 },
          { data: '2026-10-08', valor: 45 },
        ]}
        rotulo="Carga"
        unidade="kg"
        testID="g"
      />
    );

    expect(screen.getByTestId('g-ponto-1').props.accessibilityLabel).toMatch(/45.*kg em 08\/10\/2026/);
    expect(screen.getByTestId('g-resumo').props.accessibilityLabel).toMatch(/2 registros.*Mínimo 40.*máximo 45/);
  });
});

describe('GraficoLinha: acessibilidade na web e rolagem até o ponto mais recente', () => {
  const muitos = Array.from({ length: 30 }, (_, i) => ({
    data: `2026-10-${String(i + 1).padStart(2, '0')}`,
    valor: 40 + i,
  }));

  it('importantForAccessibility fica no View que envolve o Svg, não no Svg', async () => {
    await renderizar(<GraficoLinha pontos={muitos} rotulo="Carga" testID="g" />);

    const todos = nos(screen.toJSON() as NoJson | NoJson[] | null);
    const svg = todos.find((n) => /svg/i.test(n.type) && !/(circle|line|polyline|path)/i.test(n.type));
    const pai = todos.find((n) => (n.children ?? []).includes(svg as NoJson));

    expect(svg).toBeDefined();
    expect(svg?.props.importantForAccessibility).toBeUndefined();
    expect(pai?.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('rola até o fim quando o conteúdo é medido, mas não depois que o usuário rolou', async () => {
    const spy = jest.spyOn(ScrollView.prototype, 'scrollTo').mockImplementation(() => {});

    await renderizar(<GraficoLinha pontos={muitos} rotulo="Carga" testID="g" />);
    const area = screen.getByTestId('g-area');

    spy.mockClear();
    await fireEvent(area, 'contentSizeChange', 1200, 200);
    expect(spy).toHaveBeenCalledTimes(1);

    await fireEvent(area, 'scrollBeginDrag');
    spy.mockClear();
    await fireEvent(area, 'contentSizeChange', 1300, 200);
    expect(spy).not.toHaveBeenCalled();

    spy.mockRestore();
  });

  it('série nova volta a acompanhar o ponto mais recente', async () => {
    const spy = jest.spyOn(ScrollView.prototype, 'scrollTo').mockImplementation(() => {});
    const { rerender } = await renderizar(<GraficoLinha pontos={muitos} rotulo="Carga" testID="g" />);

    await fireEvent(screen.getByTestId('g-area'), 'scrollBeginDrag');
    spy.mockClear();
    await rerender(
      <SafeAreaProvider initialMetrics={METRICAS}>
        <GraficoLinha pontos={muitos.slice(0, 20)} rotulo="Carga" testID="g" />
      </SafeAreaProvider>
    );

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('ResumoEvolucao', () => {
  it('mostra até três indicadores com significado claro, sem "registros" brutos', async () => {
    await renderizar(
      <ResumoEvolucao
        exercicios={[resumo(1, 'Supino reto'), { ...resumo(2, 'Agachamento'), ultima_carga: 40 }]}
        avaliacoes={[avaliacao(1, '2026-10-01', { peso: 70.5 })]}
      />
    );

    expect(screen.getByLabelText('2 exercícios acompanhados')).toBeTruthy();
    expect(screen.getByLabelText('1 de 2 exercícios com a carga em alta')).toBeTruthy();
    expect(screen.getByLabelText('Peso atual: 70,5 kg')).toBeTruthy();
    expect(screen.queryByText(/registros/i)).toBeNull();
  });

  it('quebra linha em vez de truncar em telas estreitas', async () => {
    await renderizar(<ResumoEvolucao exercicios={[resumo(1, 'Supino reto')]} avaliacoes={[]} />);

    let no = screen.getByLabelText('1 exercício acompanhado').parent;

    while (no && StyleSheet.flatten(no.props.style)?.flexWrap !== 'wrap') {
      no = no.parent;
    }

    expect(no).not.toBeNull();
  });

  it('sem dado algum a faixa não aparece', async () => {
    await renderizar(<ResumoEvolucao exercicios={[]} avaliacoes={[]} />);
    expect(screen.queryByTestId('resumo-evolucao')).toBeNull();
  });

  it('duas avaliações na mesma data: peso atual é o de maior id, em qualquer ordem (QA-EV04-01)', async () => {
    const a3 = avaliacao(3, '2026-10-31', { peso: 70.5 });
    const a4 = avaliacao(4, '2026-10-31', { peso: 71 });

    await renderizar(<ResumoEvolucao exercicios={[]} avaliacoes={[a4, a3]} />);
    expect(screen.getByLabelText('Peso atual: 71 kg')).toBeTruthy();
  });

  it('mesma data, ordem crescente de chegada: mesmo resultado', async () => {
    const a3 = avaliacao(3, '2026-10-31', { peso: 70.5 });
    const a4 = avaliacao(4, '2026-10-31', { peso: 71 });

    await renderizar(<ResumoEvolucao exercicios={[]} avaliacoes={[a3, a4]} />);
    expect(screen.getByLabelText('Peso atual: 71 kg')).toBeTruthy();
  });
});

describe('ComparacaoValores', () => {
  it('mostra diferença absoluta e percentual com sinal e seta', async () => {
    await renderizar(
      <ComparacaoValores
        atual={{ valor: 45, data: '2026-11-01' }}
        anterior={{ valor: 40, data: '2026-10-25' }}
        unidade="kg"
        direcao="alta"
        semAnterior="Primeiro registro"
      />
    );

    expect(screen.getByTestId('comparacao-variacao')).toHaveTextContent('+5 kg (+12,5%)');
    expect(screen.getByText('↑')).toBeTruthy();
    // o valor atual e a data aparecem uma vez; o anterior fica nos indicadores ao lado
    expect(screen.getByTestId('comparacao-atual')).toHaveTextContent(/^45.kg$/);
    expect(screen.getAllByText('01/11/2026')).toHaveLength(1);
    expect(screen.queryByTestId('comparacao-anterior')).toBeNull();
  });

  it('sem anterior mostra o texto e nenhum número de variação', async () => {
    await renderizar(
      <ComparacaoValores
        atual={{ valor: 72, data: '2026-11-01' }}
        anterior={null}
        unidade="kg"
        direcao="neutra"
        semAnterior="Primeira avaliação"
      />
    );

    expect(screen.getByTestId('comparacao-sem-anterior')).toHaveTextContent('Primeira avaliação');
    expect(screen.queryByTestId('comparacao-variacao')).toBeNull();
  });

  it('anterior 0: só a diferença absoluta, sem percentual', async () => {
    await renderizar(
      <ComparacaoValores
        atual={{ valor: 5, data: '2026-11-01' }}
        anterior={{ valor: 0, data: '2026-10-25' }}
        unidade="kg"
        direcao="alta"
        semAnterior="Primeiro registro"
      />
    );

    expect(screen.getByTestId('comparacao-variacao')).toHaveTextContent(/^\+5 kg$/);
  });
});

describe('SeletorPeriodo e SeletorExercicio', () => {
  it('trocar o período devolve o valor escolhido (Tudo = null)', async () => {
    const onChange = jest.fn();

    await renderizar(<SeletorPeriodo valor="30d" onChange={onChange} />);
    await fireEvent.press(screen.getByTestId('periodo-3m'));
    await fireEvent.press(screen.getByTestId('periodo-tudo'));

    expect(onChange).toHaveBeenNthCalledWith(1, '3m');
    expect(onChange).toHaveBeenNthCalledWith(2, null);
  });

  it('os seis períodos cabem numa linha só, com rótulos curtos e largura igual', async () => {
    await renderizar(<SeletorPeriodo valor={null} onChange={jest.fn()} />);

    expect(nos(screen.toJSON() as NoJson | NoJson[] | null).some((n) => /ScrollView/.test(n.type))).toBe(false);
    const linha = StyleSheet.flatten(screen.getByLabelText('Período').props.style);

    expect(linha.flexDirection).toBe('row');
    expect(linha.flexWrap).toBeUndefined();
    for (const [id, rotulo] of [['7d', '7D'], ['30d', '30D'], ['3m', '3M'], ['6m', '6M'], ['1a', '1A'], ['tudo', 'Tudo']]) {
      expect(screen.getByTestId(`periodo-${id}`)).toHaveTextContent(rotulo);
      expect(StyleSheet.flatten(screen.getByTestId(`periodo-${id}`).props.style).flex).toBe(1);
    }
    expect(screen.getByTestId('periodo-tudo').props.accessibilityState.selected).toBe(true);
  });

  it('o seletor de exercício abre a lista, filtra pela busca e seleciona', async () => {
    const onSelecionar = jest.fn();
    const lista = [resumo(1, 'Supino reto'), resumo(2, 'Agachamento')];

    await renderizar(<SeletorExercicio exercicios={lista} selecionadoId={1} onSelecionar={onSelecionar} />);
    await fireEvent.press(screen.getByTestId('seletor-exercicio'));

    expect(screen.getByTestId('seletor-exercicio-opcao-2')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('seletor-exercicio-busca'), 'agach');
    expect(screen.queryByTestId('seletor-exercicio-opcao-1')).toBeNull();

    await fireEvent.press(screen.getByTestId('seletor-exercicio-opcao-2'));
    expect(onSelecionar).toHaveBeenCalledWith(lista[1]);
  });
});

describe('Aba Evolução (seções independentes)', () => {
  const lista = useEvolucaoLista as jest.Mock;
  const avaliacoes = useMinhasAvaliacoes as jest.Mock;
  const desempenho = useDesempenhoExercicio as jest.Mock;
  const recarregar = jest.fn();

  const estadoLista = (extra = {}) => ({
    exercicios: [resumo(1, 'Supino reto')],
    carregando: false,
    erro: null,
    recarregar,
    ...extra,
  });
  const estadoAvaliacoes = (extra = {}) => ({
    avaliacoes: [
      avaliacao(1, '2026-10-01', { peso: 72, percentual_gordura: 20, observacao: 'Boa evolução' }),
      avaliacao(2, '2026-10-15', { peso: 70, percentual_gordura: 18 }),
    ],
    carregando: false,
    erro: null,
    recarregar,
    ...extra,
  });
  const evolucao: EvolucaoExercicio = {
    exercicio_id: 1,
    nome: 'Supino reto',
    periodo: null,
    pontos: [ponto('2026-10-25', 40), ponto('2026-11-01', 45)],
    comparacao: { atual: ponto('2026-11-01', 45), anterior: ponto('2026-10-25', 40) },
  };
  const estadoDesempenho = (extra = {}) => ({
    evolucao,
    carregando: false,
    erro: null,
    recarregar,
    ...extra,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    lista.mockReturnValue(estadoLista());
    avaliacoes.mockReturnValue(estadoAvaliacoes());
    desempenho.mockReturnValue(estadoDesempenho());
  });

  const irParaCorpo = async () => fireEvent.press(screen.getByTestId('segmento-corpo'));

  it('abre no lado Treinos: resumo, alternador, cartão único e histórico; o Corpo fica fora', async () => {
    await renderizar(<EvolucaoAluno />);

    expect(screen.getByTestId('tela-evolucao')).toBeTruthy();
    expect(screen.getByText('Evolução')).toBeTruthy();
    expect(screen.getByTestId('resumo-evolucao')).toBeTruthy();
    expect(screen.getByTestId('segmento-treinos').props.accessibilityState.selected).toBe(true);
    expect(screen.getByTestId('segmento-corpo').props.accessibilityState.selected).toBe(false);
    expect(screen.getByTestId('secao-treinos')).toBeTruthy();
    expect(screen.getByTestId('grafico-treino')).toBeTruthy();
    expect(screen.getByTestId('comparacao-treino-atual')).toHaveTextContent(/^45.kg$/);
    expect(screen.getByTestId('comparacao-treino-variacao')).toHaveTextContent('+5 kg (+12,5%)');
    expect(screen.getByTestId('comparacao-treino-anterior')).toHaveTextContent(/40.kg/);
    expect(screen.getByTestId('progresso-periodo')).toHaveTextContent(/\+5 kg \(\+12,5%\)/);
    expect(screen.getByTestId('historico-desempenho')).toBeTruthy();
    expect(screen.queryByTestId('secao-fisica')).toBeNull();
    expect(screen.queryByTestId('grafico-fisico')).toBeNull();
  });

  it('o valor atual e a data aparecem uma vez no cartão (sem duplicar no gráfico)', async () => {
    await renderizar(<EvolucaoAluno />);

    // gráfico embutido: o ponto mais recente já está no cabeçalho do cartão
    expect(screen.queryByTestId('grafico-treino-valor')).toBeNull();
    expect(screen.getByText('Toque em um ponto para ver o valor e a data')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('grafico-treino-ponto-0'));
    expect(screen.getByTestId('grafico-treino-valor')).toHaveTextContent(/^40.kg$/);
    expect(screen.getByTestId('grafico-treino-data')).toHaveTextContent('25/10/2026');
  });

  it('métrica e período ficam dentro do cartão, os períodos numa linha só', async () => {
    await renderizar(<EvolucaoAluno />);

    expect(screen.getByTestId('segmento-carga_maxima')).toBeTruthy();
    expect(screen.getByTestId('segmento-repeticoes_maximas')).toBeTruthy();
    expect(screen.getByTestId('segmento-volume')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByLabelText('Período').props.style).flexWrap).toBeUndefined();
  });

  it('o hook de desempenho recebe o primeiro exercício e muda com o período', async () => {
    await renderizar(<EvolucaoAluno />);
    expect(desempenho).toHaveBeenLastCalledWith(1, null);

    await fireEvent.press(screen.getByTestId('periodo-30d'));
    expect(desempenho).toHaveBeenLastCalledWith(1, '30d');
  });

  it('o histórico mostra só os 3 registros mais recentes e o link do histórico completo', async () => {
    const { router } = jest.requireMock('expo-router');
    const pontos = ['2026-10-01', '2026-10-08', '2026-10-15', '2026-10-22', '2026-11-01'].map((d, i) => ponto(d, 30 + i));

    desempenho.mockReturnValue(estadoDesempenho({ evolucao: { ...evolucao, pontos } }));
    await renderizar(<EvolucaoAluno />);

    const linhas = screen.getAllByTestId(/^historico-ponto-/);

    expect(linhas.map((l) => l.props.testID)).toEqual([
      'historico-ponto-2026-11-01',
      'historico-ponto-2026-10-22',
      'historico-ponto-2026-10-15',
    ]);

    await fireEvent.press(screen.getByTestId('link-detalhe-exercicio'));
    expect(router.push).toHaveBeenCalledWith('/aluno/evolucao/1');
  });

  it('período sem registros ainda oferece o histórico completo do exercício', async () => {
    const { router } = jest.requireMock('expo-router');

    desempenho.mockReturnValue(estadoDesempenho({ evolucao: { ...evolucao, pontos: [], comparacao: null } }));
    await renderizar(<EvolucaoAluno />);

    expect(screen.getByTestId('desempenho-vazio')).toBeTruthy();
    expect(screen.queryByTestId('historico-desempenho')).toBeNull();

    await fireEvent.press(screen.getByTestId('link-detalhe-exercicio'));
    expect(router.push).toHaveBeenCalledWith('/aluno/evolucao/1');
  });

  it('carregando o desempenho: os filtros ficam no cartão e o gráfico mostra o esqueleto', async () => {
    desempenho.mockReturnValue(estadoDesempenho({ evolucao: null, carregando: true }));

    await renderizar(<EvolucaoAluno />);

    expect(screen.getByTestId('desempenho-carregando')).toBeTruthy();
    expect(screen.getByTestId('periodo-30d')).toBeTruthy();
    expect(screen.queryByTestId('grafico-treino')).toBeNull();
  });

  it('carregando as listas: cada lado mostra o próprio esqueleto', async () => {
    lista.mockReturnValue(estadoLista({ exercicios: [], carregando: true }));
    avaliacoes.mockReturnValue(estadoAvaliacoes({ avaliacoes: [], carregando: true }));
    desempenho.mockReturnValue(estadoDesempenho({ evolucao: null, carregando: true }));

    await renderizar(<EvolucaoAluno />);

    expect(screen.getByTestId('secao-treinos')).toBeTruthy();
    expect(screen.getAllByLabelText('Carregando').length).toBeGreaterThan(0);
    expect(screen.queryByTestId('grafico-treino')).toBeNull();
    expect(screen.queryByTestId('resumo-evolucao')).toBeNull();

    await irParaCorpo();
    expect(screen.getByTestId('secao-fisica')).toBeTruthy();
    expect(screen.getAllByLabelText('Carregando').length).toBeGreaterThan(0);
    expect(screen.queryByTestId('grafico-fisico')).toBeNull();
  });

  it('erro nos treinos não derruba o Corpo, e "Tentar novamente" recarrega', async () => {
    lista.mockReturnValue(estadoLista({ exercicios: [], erro: 'Falha nos treinos.' }));

    await renderizar(<EvolucaoAluno />);

    expect(screen.getByTestId('erro-treinos')).toBeTruthy();
    expect(screen.getByText('Falha nos treinos.')).toBeTruthy();

    await fireEvent.press(screen.getAllByText('Tentar novamente')[0]);
    expect(recarregar).toHaveBeenCalled();

    await irParaCorpo();
    expect(screen.getByTestId('grafico-fisico')).toBeTruthy();
    expect(screen.queryByTestId('erro-fisica')).toBeNull();
  });

  it('erro nas avaliações não derruba os Treinos', async () => {
    avaliacoes.mockReturnValue(estadoAvaliacoes({ avaliacoes: [], erro: 'Falha nas avaliações.' }));

    await renderizar(<EvolucaoAluno />);
    expect(screen.getByTestId('grafico-treino')).toBeTruthy();
    expect(screen.queryByTestId('erro-treinos')).toBeNull();

    await irParaCorpo();
    expect(screen.getByTestId('erro-fisica')).toBeTruthy();
    expect(screen.getByText('Falha nas avaliações.')).toBeTruthy();
    expect(screen.queryByTestId('secao-avaliacoes')).toBeNull();
  });

  it('erro só no desempenho do exercício mantém seletor e filtros', async () => {
    desempenho.mockReturnValue(estadoDesempenho({ evolucao: null, erro: 'Falha no exercício.' }));

    await renderizar(<EvolucaoAluno />);

    expect(screen.getByTestId('erro-desempenho')).toBeTruthy();
    expect(screen.getByTestId('seletor-exercicio')).toBeTruthy();
    expect(screen.getByTestId('periodo-7d')).toBeTruthy();
  });

  it('sem exercícios e sem avaliações: estados vazios, sem gráfico nem dados fictícios', async () => {
    lista.mockReturnValue(estadoLista({ exercicios: [] }));
    avaliacoes.mockReturnValue(estadoAvaliacoes({ avaliacoes: [] }));
    desempenho.mockReturnValue(estadoDesempenho({ evolucao: null }));

    await renderizar(<EvolucaoAluno />);

    expect(screen.getByText('Sem evolução ainda')).toBeTruthy();
    expect(screen.queryByTestId('grafico-treino')).toBeNull();
    expect(screen.queryByTestId('resumo-evolucao')).toBeNull();

    await irParaCorpo();
    expect(screen.getByText('Nenhuma avaliação')).toBeTruthy();
    expect(screen.queryByTestId('grafico-fisico')).toBeNull();
    expect(screen.queryByTestId('secao-avaliacoes')).toBeNull();
  });

  it('período sem registros mostra o vazio do gráfico, sem esconder o cabeçalho', async () => {
    desempenho.mockReturnValue(
      estadoDesempenho({ evolucao: { ...evolucao, periodo: '7d', pontos: [] } })
    );

    await renderizar(<EvolucaoAluno />);

    expect(screen.getByTestId('grafico-treino-vazio')).toBeTruthy();
    expect(screen.getByTestId('comparacao-treino')).toBeTruthy();
    expect(screen.queryByTestId('historico-desempenho')).toBeNull();
    expect(screen.getByTestId('progresso-periodo-vazio')).toBeTruthy();
  });

  it('trocar para Corpo mostra o cartão do indicador e a lista compacta; voltar mantém os filtros', async () => {
    await renderizar(<EvolucaoAluno />);
    await fireEvent.press(screen.getByTestId('periodo-30d'));
    await irParaCorpo();

    expect(screen.getByTestId('segmento-corpo').props.accessibilityState.selected).toBe(true);
    expect(screen.queryByTestId('secao-treinos')).toBeNull();
    expect(screen.getByTestId('grafico-fisico')).toBeTruthy();
    expect(screen.getByTestId('comparacao-fisica-atual')).toHaveTextContent(/^70.kg$/);
    expect(screen.getByTestId('comparacao-fisica-variacao')).toHaveTextContent('−2 kg (−2,8%)');
    expect(screen.getByTestId('comparacao-fisica-anterior')).toHaveTextContent(/72.kg/);
    expect(screen.getByTestId('secao-avaliacoes')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('segmento-treinos'));
    expect(desempenho).toHaveBeenLastCalledWith(1, '30d');
    expect(screen.getByTestId('periodo-30d').props.accessibilityState.selected).toBe(true);
  });

  it('alternar Treinos/Corpo preserva métrica, período, indicador e avaliação aberta, sem novas buscas', async () => {
    await renderizar(<EvolucaoAluno />);
    await fireEvent.press(screen.getByTestId('segmento-volume'));
    await fireEvent.press(screen.getByTestId('periodo-30d'));
    await irParaCorpo();
    await fireEvent.press(screen.getByTestId('segmento-percentual_gordura'));
    await fireEvent.press(screen.getByTestId('avaliacao-2-linha'));
    recarregar.mockClear();
    desempenho.mockClear();

    await fireEvent.press(screen.getByTestId('segmento-treinos'));
    expect(screen.getByTestId('segmento-volume').props.accessibilityState.selected).toBe(true);
    expect(screen.getByTestId('periodo-30d').props.accessibilityState.selected).toBe(true);
    expect(desempenho).toHaveBeenLastCalledWith(1, '30d');

    await irParaCorpo();
    expect(screen.getByTestId('segmento-percentual_gordura').props.accessibilityState.selected).toBe(true);
    expect(screen.getByTestId('avaliacao-2-linha').props.accessibilityState.expanded).toBe(true);
    expect(screen.getByTestId('avaliacao-2-detalhe')).toBeTruthy();
    // nenhuma recarga disparada pela troca (os hooks vivem na tela)
    expect(recarregar).not.toHaveBeenCalled();
    expect(desempenho.mock.calls.every(([id, p]) => id === 1 && p === '30d')).toBe(true);
  });

  it('falha na busca de desempenho mantém o link do histórico completo do exercício', async () => {
    const { router } = jest.requireMock('expo-router');

    desempenho.mockReturnValue(estadoDesempenho({ evolucao: null, erro: 'Falha no exercício.' }));
    await renderizar(<EvolucaoAluno />);

    expect(screen.getByTestId('erro-desempenho')).toBeTruthy();
    expect(screen.queryByTestId('historico-desempenho')).toBeNull();
    await fireEvent.press(screen.getByTestId('link-detalhe-exercicio'));
    expect(router.push).toHaveBeenCalledWith('/aluno/evolucao/1');
  });

  it('indicador sem nenhuma medição mostra vazio em vez de zero', async () => {
    await renderizar(<EvolucaoAluno />);
    await irParaCorpo();
    await fireEvent.press(screen.getByTestId('segmento-massa_muscular'));

    expect(screen.getByTestId('grafico-fisico-vazio')).toBeTruthy();
    expect(screen.queryByTestId('comparacao-fisica')).toBeNull();
  });

  it('um exercício com um registro só mostra "Primeiro registro"', async () => {
    desempenho.mockReturnValue(
      estadoDesempenho({
        evolucao: { ...evolucao, pontos: [ponto('2026-11-01', 45)], comparacao: { atual: ponto('2026-11-01', 45), anterior: null } },
      })
    );

    await renderizar(<EvolucaoAluno />);

    expect(screen.getByTestId('comparacao-treino-sem-anterior')).toHaveTextContent('Primeiro registro');
    expect(screen.queryByTestId('progresso-periodo')).toBeNull();
  });

  it('o alternador principal são abas com estado selecionado; os filtros são um segmentado compacto', async () => {
    await renderizar(<EvolucaoAluno />);

    const treinos = screen.getByTestId('segmento-treinos');

    expect(treinos.props.accessibilityRole).toBe('tab');
    expect(treinos.props.accessibilityState.selected).toBe(true);
    expect(screen.getByTestId('segmento-corpo').props.accessibilityState.selected).toBe(false);
    // filtro da métrica: mesmo componente de antes, em tamanho compacto e alvo de 44 pt (32 + 6 + 6)
    const metrica = screen.getByTestId('segmento-carga_maxima');

    expect(StyleSheet.flatten(metrica.props.style).height).toBe(32);
    expect(metrica.props.hitSlop).toEqual({ top: 6, bottom: 6 });
  });

  it('a variação tem legenda de contexto e o treino anterior mostra valor e data', async () => {
    await renderizar(<EvolucaoAluno />);

    expect(screen.getByText('vs. treino anterior')).toBeTruthy();
    expect(screen.getByText('Treino anterior')).toBeTruthy();
    expect(screen.getByTestId('comparacao-treino-anterior')).toHaveTextContent(/40.kg.*25\/10/);
    expect(screen.queryByText('Último × anterior')).toBeNull();
  });

  it('Corpo: a avaliação anterior vai para o cabeçalho do cartão, sem cartão solto', async () => {
    await renderizar(<EvolucaoAluno />);
    await irParaCorpo();

    expect(screen.getByText('vs. avaliação anterior')).toBeTruthy();
    expect(screen.getByTestId('comparacao-fisica-anterior')).toHaveTextContent(/Avaliação anterior:.*72.kg.*01\/10/);
    expect(screen.queryByText('Último × anterior')).toBeNull();
  });
});

function ListaControlada({ avaliacoes }: { avaliacoes: AvaliacaoResposta[] }) {
  const [aberta, setAberta] = useState<number | null>(null);

  return <ListaAvaliacoes avaliacoes={avaliacoes} aberta={aberta} aoAlternar={setAberta} />;
}

describe('ListaAvaliacoes', () => {
  const lista = [
    avaliacao(1, '2026-10-01', { peso: 72, imc: 23.51, observacao: 'Inicial' }),
    avaliacao(3, '2026-10-31', { peso: 70.5, imc: 23.02, percentual_gordura: 18, massa_muscular: 41 }),
    avaliacao(4, '2026-10-31', { peso: 71, imc: 23.18 }),
  ];

  it('uma linha por avaliação, mais recente primeiro, com selo e "—" discreto', async () => {
    await renderizar(<ListaControlada avaliacoes={lista} />);

    const linhas = screen.getAllByTestId(/^avaliacao-\d+$/);

    expect(linhas.map((l) => l.props.testID)).toEqual(['avaliacao-4', 'avaliacao-3', 'avaliacao-1']);
    expect(screen.getAllByText('Mais recente')).toHaveLength(1);
    expect(screen.getByTestId('avaliacao-4')).toHaveTextContent(/71 kg/);
    expect(screen.getByTestId('avaliacao-4')).toHaveTextContent(/—/);
    expect(screen.getByTestId('avaliacao-3')).toHaveTextContent(/18%/);
    expect(screen.queryByTestId('avaliacao-4-detalhe')).toBeNull();
  });

  it('tocar expande o detalhe com altura, massa muscular e observação; tocar de novo recolhe', async () => {
    await renderizar(<ListaControlada avaliacoes={lista} />);

    const linha = screen.getByTestId('avaliacao-3-linha');

    expect(linha.props.accessibilityState.expanded).toBe(false);
    await fireEvent.press(linha);
    expect(screen.getByTestId('avaliacao-3-linha').props.accessibilityState.expanded).toBe(true);
    expect(screen.getByTestId('avaliacao-3-detalhe')).toHaveTextContent(/1,75 m/);
    expect(screen.getByTestId('avaliacao-3-detalhe')).toHaveTextContent(/41 kg/);

    await fireEvent.press(screen.getByTestId('avaliacao-1-linha'));
    expect(screen.queryByTestId('avaliacao-3-detalhe')).toBeNull();
    expect(screen.getByTestId('avaliacao-1-detalhe')).toHaveTextContent(/Inicial/);

    await fireEvent.press(screen.getByTestId('avaliacao-1-linha'));
    expect(screen.queryByTestId('avaliacao-1-detalhe')).toBeNull();
  });
});
