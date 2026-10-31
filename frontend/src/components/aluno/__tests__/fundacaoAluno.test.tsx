import { fireEvent, render, screen } from '@testing-library/react-native';
import { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { CartaoTreinoDia } from '@/components/aluno/CartaoTreinoDia';
import { estadoDoHero, HeroTreinoDia, rotuloHero } from '@/components/aluno/HeroTreinoDia';
import { PreviaTreino, totalSeriesDoTreino } from '@/components/aluno/PreviaTreino';
import { GraficoEvolucao } from '@/components/GraficoEvolucao';
import { ESPACO_FIXO } from '@/utils/pluralizacao';
import { SessaoResumo } from '@/types/sessao.types';
import { TreinoAluno } from '@/types/fichaAluno.types';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success' },
}));
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children?: React.ReactNode }) => children ?? null,
}));

async function renderizar(ui: ReactElement) {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 360, height: 640 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      {ui}
    </SafeAreaProvider>
  );
}

function treino(parcial: Partial<TreinoAluno> = {}): TreinoAluno {
  const item = (id: number, series: number, nome: string) => ({
    id,
    ficha_id: 2,
    treino_id: 7,
    exercicio_id: id,
    series,
    repeticoes: 10,
    carga: 12.5,
    descanso: 60,
    ordem: id,
    nome,
  });

  return {
    id: 7,
    ficha_id: 2,
    nome: 'Treino A',
    dia_semana: 'terça',
    ordem: 1,
    itens: [item(2, 3, 'Remada'), item(1, 4, 'Supino')],
    ...parcial,
  };
}

const sessaoFinalizada: SessaoResumo = {
  id: 9,
  treino_id: 7,
  treino_nome: 'Treino A',
  ficha_id: 2,
  iniciada_em: '2026-10-31T08:00:00',
  finalizada_em: '2026-10-31T08:42:00',
  esforco: 7,
  comentario: null,
  total_execucoes: 5,
  total_series: 10,
  volume_total: 5436,
  duracao_segundos: 2520,
};

describe('CartaoTreinoDia (I-03)', () => {
  it('mostra "3 exercícios · ~N min" no plural certo, sem capitalizar tudo', async () => {
    await renderizar(<CartaoTreinoDia treino={treino()} onPress={() => {}} />);

    const detalhe = screen.getByText(/^Terça · 2/);

    expect(detalhe.props.children.join?.('') ?? String(detalhe.props.children)).toContain(
      `2${ESPACO_FIXO}exercícios`
    );
    expect(JSON.stringify(detalhe.props.style)).not.toContain('capitalize');
    expect(JSON.stringify(detalhe.props.style)).not.toContain('textTransform');
  });

  it('usa o singular com 1 exercício', async () => {
    const um = treino({ itens: [treino().itens[0]] });

    await renderizar(<CartaoTreinoDia treino={um} onPress={() => {}} />);

    expect(screen.getByText(/1\sexercício\s·/)).toBeTruthy();
  });
});

describe('HeroTreinoDia (I-04)', () => {
  const acoes = { onComecar: jest.fn(), onContinuar: jest.fn(), onTreinarDeNovo: jest.fn() };

  beforeEach(() => jest.clearAllMocks());

  it('estadoDoHero: andamento > concluído > novo', () => {
    expect(estadoDoHero(true, sessaoFinalizada)).toBe('andamento');
    expect(estadoDoHero(false, sessaoFinalizada)).toBe('concluido');
    expect(estadoDoHero(false, undefined)).toBe('novo');
    expect(rotuloHero('andamento')).toBe('Treino em andamento');
    expect(rotuloHero('novo')).toBe('Treino de hoje');
  });

  it('novo: "Treino de hoje", descrição e "Começar treino"', async () => {
    await renderizar(
      <HeroTreinoDia nome="Treino A" exercicios={3} duracaoEstimadaMin={16} emAndamento={false} {...acoes} />
    );

    expect(screen.getByText('Treino de hoje')).toBeTruthy();
    expect(screen.getByText(`3${ESPACO_FIXO}exercícios · ~16${ESPACO_FIXO}min`)).toBeTruthy();

    await fireEvent.press(screen.getByTestId('botao-comecar-treino'));

    expect(acoes.onComecar).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Começar treino')).toBeTruthy();
  });

  it('em andamento: "Continuar treino" chama onContinuar', async () => {
    await renderizar(
      <HeroTreinoDia nome="Treino A" exercicios={3} duracaoEstimadaMin={16} emAndamento {...acoes} />
    );

    await fireEvent.press(screen.getByText('Continuar treino'));

    expect(acoes.onContinuar).toHaveBeenCalledTimes(1);
    expect(acoes.onComecar).not.toHaveBeenCalled();
  });

  it('concluído hoje: mostra o ✓, duração e volume, e "Treinar de novo" (sem "Começar")', async () => {
    await renderizar(
      <HeroTreinoDia
        nome="Treino A"
        exercicios={3}
        duracaoEstimadaMin={16}
        emAndamento={false}
        concluida={sessaoFinalizada}
        {...acoes}
      />
    );

    expect(screen.getByText('Treino de hoje concluído ✓')).toBeTruthy();
    expect(screen.getByText('42 min')).toBeTruthy();
    expect(screen.getByText(`5.436${ESPACO_FIXO}kg`)).toBeTruthy();
    expect(screen.queryByTestId('botao-comecar-treino')).toBeNull();

    await fireEvent.press(screen.getByTestId('botao-treinar-de-novo'));

    expect(acoes.onTreinarDeNovo).toHaveBeenCalledTimes(1);
  });
});

describe('PreviaTreino (P-15)', () => {
  it('lista os exercícios na ordem com séries × reps, carga e descanso', async () => {
    await renderizar(<PreviaTreino treino={treino()} />);

    expect(screen.getByText('Treino A')).toBeTruthy();
    expect(screen.getByText('Terça')).toBeTruthy();
    // ordenado por `ordem`: Supino (1) vem antes de Remada (2)
    expect(screen.getByText('1. Supino')).toBeTruthy();
    expect(screen.getByText('2. Remada')).toBeTruthy();
    expect(screen.getByText(/^4 × 10 · 12[.,]5\skg · descanso 60s$/)).toBeTruthy();
  });

  it('mostra totais de exercícios, séries e tempo estimado', async () => {
    await renderizar(<PreviaTreino treino={treino()} />);

    expect(screen.getByLabelText('Exercícios: 2')).toBeTruthy();
    expect(screen.getByLabelText('Séries: 7')).toBeTruthy();
    // 7 séries × (40 + 60) s = 700 s ≈ 12 min
    expect(screen.getByLabelText(`Tempo: ~12 min`)).toBeTruthy();
  });

  it('totalSeriesDoTreino soma as séries dos itens', () => {
    expect(totalSeriesDoTreino(treino())).toBe(7);
    expect(totalSeriesDoTreino({ itens: [] })).toBe(0);
  });
});

describe('GraficoEvolucao: largura total (P-07)', () => {
  const pontos = [
    { data: '2026-10-01', carga_maxima: 40, volume: 400, registros: 3 },
    { data: '2026-10-08', carga_maxima: 50, volume: 500, registros: 3 },
  ];

  it('as colunas dividem a largura medida com onLayout', async () => {
    await renderizar(<GraficoEvolucao pontos={pontos} metrica="carga_maxima" />);

    const area = screen.getByTestId('grafico-area');

    await fireEvent(area, 'layout', { nativeEvent: { layout: { width: 300, height: 200, x: 0, y: 0 } } });

    const botao = screen.getByLabelText(/01\/10.*40/);

    expect(JSON.stringify(botao.props.style)).toContain('"width":150');
  });

  it('com muitas barras mantém a largura mínima de 48 (rola)', async () => {
    const muitos = Array.from({ length: 12 }, (_, i) => ({
      data: `2026-10-${String(i + 1).padStart(2, '0')}`,
      carga_maxima: 10 + i,
      volume: 100,
      registros: 1,
    }));

    await renderizar(<GraficoEvolucao pontos={muitos} metrica="carga_maxima" />);
    await fireEvent(screen.getByTestId('grafico-area'), 'layout', {
      nativeEvent: { layout: { width: 300, height: 200, x: 0, y: 0 } },
    });

    expect(JSON.stringify(screen.getByLabelText(/01\/10/).props.style)).toContain('"width":48');
  });
});
