import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ListaExerciciosTreino } from '@/components/aluno/ListaExerciciosTreino';
import { ResumoTreino } from '@/components/aluno/ResumoTreino';
import { Segmentado } from '@/components/aluno/Segmentado';
import { SemanaPontos } from '@/components/aluno/SemanaPontos';
import { CronometroDescanso } from '@/components/CronometroDescanso';
import { GraficoEvolucao } from '@/components/GraficoEvolucao';
import { diasDaSemana } from '@/utils/painelAluno';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success' },
}));
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children?: React.ReactNode }) => children ?? null,
}));

async function renderizar(ui: React.ReactElement) {
  return render(
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 360, height: 640 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}
    >
      {ui}
    </SafeAreaProvider>
  );
}

describe('CronometroDescanso', () => {
  const acoes = { onPausar: jest.fn(), onRetomar: jest.fn(), onAdicionar: jest.fn(), onPular: jest.fn() };

  it('mostra o tempo, +15 s e pular', async () => {
    await renderizar(<CronometroDescanso restante={75} pausado={false} total={90} {...acoes} />);

    expect(screen.getByText('DESCANSO')).toBeTruthy();
    expect(screen.getByText('1:15')).toBeTruthy();

    await fireEvent.press(screen.getByText('+15 s'));
    await fireEvent.press(screen.getByText('Pular descanso'));

    expect(acoes.onAdicionar).toHaveBeenCalledTimes(1);
    expect(acoes.onPular).toHaveBeenCalledTimes(1);
  });

  it('alterna entre pausar e retomar', async () => {
    await renderizar(<CronometroDescanso restante={30} pausado total={30} {...acoes} />);

    await fireEvent.press(screen.getByText('Retomar'));

    expect(acoes.onRetomar).toHaveBeenCalledTimes(1);
  });
});

describe('SemanaPontos', () => {
  it('renderiza as 7 letras da semana', async () => {
    const dias = diasDaSemana(new Date(2026, 9, 31));

    await renderizar(<SemanaPontos dias={dias} treinados={new Set(['2026-10-30'])} />);

    expect(screen.getAllByText(/^[STQD]$/)).toHaveLength(7);
    expect(screen.getAllByText('✓')).toHaveLength(1);
  });
});

describe('GraficoEvolucao', () => {
  const pontos = [
    { data: '2026-10-01', carga_maxima: 40, volume: 400, registros: 3 },
    { data: '2026-10-08', carga_maxima: 50, volume: 500, registros: 3 },
  ];

  it('destaca o valor mais recente e troca ao tocar numa barra', async () => {
    await renderizar(<GraficoEvolucao pontos={pontos} metrica="carga_maxima" />);

    // Padrão: a barra mais recente está selecionada (data no topo e no eixo).
    expect(screen.getAllByText('08/10')).toHaveLength(2);
    expect(screen.getByLabelText('50 kg em 08/10')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('01/10: 40'));

    expect(screen.getByLabelText('40 kg em 01/10')).toBeTruthy();
  });

  it('mostra aviso sem registros', async () => {
    await renderizar(<GraficoEvolucao pontos={[]} metrica="volume" />);

    expect(screen.getByText('Sem registros para exibir.')).toBeTruthy();
  });
});

describe('Segmentado', () => {
  it('chama onChange com o valor tocado', async () => {
    const onChange = jest.fn();

    await renderizar(
      <Segmentado
        opcoes={[
          { valor: 'a', rotulo: 'Carga' },
          { valor: 'b', rotulo: 'Volume' },
        ]}
        valor="a"
        onChange={onChange}
      />
    );

    await fireEvent.press(screen.getByText('Volume'));

    expect(onChange).toHaveBeenCalledWith('b');
  });
});

describe('ListaExerciciosTreino', () => {
  it('seleciona o exercício tocado', async () => {
    const onSelecionar = jest.fn();

    await renderizar(
      <ListaExerciciosTreino
        linhas={[
          { id: 1, nome: 'Supino', feitas: 3, total: 3, estado: 'feito' },
          { id: 2, nome: 'Remada', feitas: 1, total: 3, estado: 'atual' },
        ]}
        onSelecionar={onSelecionar}
      />
    );

    await fireEvent.press(screen.getByText('Remada'));

    expect(onSelecionar).toHaveBeenCalledWith(1);
    expect(screen.getByText('1/3')).toBeTruthy();
  });
});

describe('ResumoTreino', () => {
  const props = {
    treinoNome: 'Treino A',
    duracao: '42 min',
    series: '4/4',
    volume: '1.200',
    incompleto: false,
    esforco: undefined,
    comentario: '',
    finalizando: false,
  };

  it('permite escolher o esforço e finalizar', async () => {
    const onEsforco = jest.fn();
    const onFinalizar = jest.fn();

    await renderizar(
      <ResumoTreino
        {...props}
        onEsforco={onEsforco}
        onComentario={jest.fn()}
        onFinalizar={onFinalizar}
        onVoltar={jest.fn()}
      />
    );

    expect(screen.getByText('Treino concluído!')).toBeTruthy();
    expect(screen.getByText('42 min')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('esforco-7'));
    await fireEvent.press(screen.getByTestId('botao-finalizar'));

    expect(onEsforco).toHaveBeenCalledWith(7);
    expect(onFinalizar).toHaveBeenCalledTimes(1);
  });

  it('muda o título quando o treino ficou incompleto', async () => {
    await renderizar(
      <ResumoTreino
        {...props}
        incompleto
        onEsforco={jest.fn()}
        onComentario={jest.fn()}
        onFinalizar={jest.fn()}
        onVoltar={jest.fn()}
      />
    );

    expect(screen.getByText('Bom trabalho!')).toBeTruthy();
  });
});
