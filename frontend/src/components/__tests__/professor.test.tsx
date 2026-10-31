import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { CardExercicio } from '@/components/CardExercicio';
import { CardFicha } from '@/components/CardFicha';
import { CardItemTreino } from '@/components/CardItemTreino';
import { CardTreino, rotuloDia, rotuloExercicios } from '@/components/CardTreino';
import { CamposVigencia } from '@/components/CamposVigencia';
import { FormularioRascunhoItem } from '@/components/FormularioRascunhoItem';
import { FormularioTreino } from '@/components/FormularioTreino';
import { ItemFicha, RascunhoItem, Treino } from '@/types/ficha.types';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success' },
}));

const item: ItemFicha = {
  id: 1,
  ficha_id: 1,
  treino_id: 1,
  exercicio_id: 1,
  series: 4,
  repeticoes: 12,
  carga: 40,
  descanso: 60,
  ordem: 2,
  nome: 'Supino reto',
  descricao: 'Peito',
  grupo_muscular: 'Peito',
  imagem: null,
  video: null,
};

describe('CardItemTreino', () => {
  it('mostra as pílulas e só renderiza as setas que têm ação', async () => {
    await render(<CardItemTreino item={item} onRemover={jest.fn()} onDescer={jest.fn()} />);

    expect(screen.getByText('Supino reto')).toBeTruthy();
    expect(screen.getByText('40 kg')).toBeTruthy();
    expect(screen.getByText('60 s')).toBeTruthy();
    expect(screen.getByText('↓')).toBeTruthy();
    expect(screen.queryByText('↑')).toBeNull();
  });

  it('chama remover com id e nome, e reordena pelas setas', async () => {
    const onRemover = jest.fn();
    const onSubir = jest.fn();
    await render(<CardItemTreino item={item} onRemover={onRemover} onSubir={onSubir} />);

    await fireEvent.press(screen.getByText('↑'));
    await fireEvent.press(screen.getByText('Remover'));

    expect(onSubir).toHaveBeenCalledTimes(1);
    expect(onRemover).toHaveBeenCalledWith(1, 'Supino reto');
  });
});

describe('CardFicha', () => {
  const ficha = {
    id: 3,
    nome: 'Hipertrofia',
    data_criacao: '2026-10-01',
    aluno_id: 9,
    aluno_nome: 'Maria da Silva',
    data_inicio: '2026-10-01',
    data_fim: '2026-11-01',
    vigente: true,
    total_treinos: 3,
  };

  it('mostra aluno, selo de vigência, período e total de treinos', async () => {
    await render(<CardFicha ficha={ficha} onPress={jest.fn()} />);

    expect(screen.getByText('3 treinos')).toBeTruthy();

    expect(screen.getByText('Maria da Silva')).toBeTruthy();
    expect(screen.getByText('Vigente')).toBeTruthy();
    expect(screen.getByText('01/10/2026 → 01/11/2026')).toBeTruthy();
  });

  it('esconde o aluno quando pedido e abre ao tocar', async () => {
    const onPress = jest.fn();
    await render(
      <CardFicha ficha={{ ...ficha, vigente: false }} mostrarAluno={false} onPress={onPress} />
    );

    expect(screen.queryByText('Maria da Silva')).toBeNull();
    expect(screen.queryByText('Vigente')).toBeNull();

    await fireEvent.press(screen.getByText('Hipertrofia'));
    expect(onPress).toHaveBeenCalled();
  });
});

describe('CardTreino', () => {
  const treino: Treino = {
    id: 1,
    ficha_id: 1,
    nome: 'Treino A',
    dia_semana: 'terça',
    ordem: 1,
    total_itens: 4,
  };

  it('mostra o dia em chip capitalizado', async () => {
    await render(<CardTreino treino={treino} onPress={jest.fn()} />);

    expect(screen.getByText('Terça')).toBeTruthy();
    expect(screen.getByText('Treino A')).toBeTruthy();
    expect(screen.getByText('Treino 1 · 4 exercícios')).toBeTruthy();
    expect(rotuloDia('sábado')).toBe('Sábado');
  });

  it('usa o singular com um exercício e zero sem itens', async () => {
    expect(rotuloExercicios(1)).toBe('1 exercício');
    expect(rotuloExercicios(0)).toBe('0 exercícios');
  });
});

describe('CardExercicio', () => {
  it('mostra nome, grupo e dispara editar', async () => {
    const onEditar = jest.fn();
    await render(
      <CardExercicio
        exercicio={{
          id: 1,
          nome: 'Agachamento',
          descricao: 'Pernas',
          grupo_muscular: 'Quadríceps',
          imagem: null,
          video: null,
        }}
        onPress={jest.fn()}
        onEditar={onEditar}
      />
    );

    expect(screen.getByText('Agachamento')).toBeTruthy();
    expect(screen.getByText('Quadríceps')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Editar Agachamento'));
    expect(onEditar).toHaveBeenCalled();
  });
});

describe('FormularioRascunhoItem', () => {
  const rascunho: RascunhoItem = {
    chave: 'a',
    exercicioId: null,
    exercicioNome: '',
    grupoMuscular: '',
    series: '',
    repeticoes: '',
    carga: '',
    descanso: '',
  };

  it('mostra um erro por campo e não salva quando inválido', async () => {
    const onSalvar = jest.fn();
    await render(
      <FormularioRascunhoItem
        rascunho={rascunho}
        onAtualizar={jest.fn()}
        onAbrirSeletor={jest.fn()}
        onSalvar={onSalvar}
        onCancelar={jest.fn()}
        salvando={false}
      />
    );

    await fireEvent.press(screen.getByText('SALVAR EXERCÍCIO'));

    expect(screen.getByText('Selecione um exercício.')).toBeTruthy();
    expect(screen.getByText('Informe as séries.')).toBeTruthy();
    expect(screen.getByText('Informe o descanso em segundos.')).toBeTruthy();
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it('salva quando tudo está preenchido', async () => {
    const onSalvar = jest.fn();
    await render(
      <FormularioRascunhoItem
        rascunho={{
          ...rascunho,
          exercicioId: 5,
          exercicioNome: 'Supino',
          series: '4',
          repeticoes: '12',
          carga: '40',
          descanso: '60',
        }}
        onAtualizar={jest.fn()}
        onAbrirSeletor={jest.fn()}
        onSalvar={onSalvar}
        onCancelar={jest.fn()}
        salvando={false}
      />
    );

    await fireEvent.press(screen.getByText('SALVAR EXERCÍCIO'));
    expect(onSalvar).toHaveBeenCalledTimes(1);
  });
});

describe('FormularioRascunhoItem: erro some quando o campo fica válido', () => {
  const base: RascunhoItem = {
    chave: 'a',
    exercicioId: 5,
    exercicioNome: 'Supino',
    grupoMuscular: 'Peito',
    series: '',
    repeticoes: '12',
    carga: '40',
    descanso: '60',
  };

  function formulario(rascunho: RascunhoItem) {
    return (
      <FormularioRascunhoItem
        rascunho={rascunho}
        onAtualizar={jest.fn()}
        onAbrirSeletor={jest.fn()}
        onSalvar={jest.fn()}
        onCancelar={jest.fn()}
        salvando={false}
      />
    );
  }

  it('mostra o erro após a tentativa e o remove assim que o campo é corrigido', async () => {
    const { rerender } = await render(formulario(base));

    expect(screen.queryByText('Informe as séries.')).toBeNull();

    await fireEvent.press(screen.getByText('SALVAR EXERCÍCIO'));
    expect(screen.getByText('Informe as séries.')).toBeTruthy();

    await rerender(formulario({ ...base, series: '4' }));
    expect(screen.queryByText('Informe as séries.')).toBeNull();
  });
});

describe('FormularioTreino', () => {
  it('mostra os dias abreviados e capitalizados e o erro some ao digitar o nome', async () => {
    const onSalvar = jest.fn();
    await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 360, height: 800 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}
      >
        <FormularioTreino
          titulo="Novo treino"
          rotuloBotao="CRIAR TREINO"
          salvando={false}
          onSalvar={onSalvar}
        />
      </SafeAreaProvider>
    );

    for (const dia of ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']) {
      expect(screen.getByText(dia)).toBeTruthy();
    }

    await fireEvent.press(screen.getByText('CRIAR TREINO'));
    expect(screen.getByText('Informe o nome do treino.')).toBeTruthy();
    expect(onSalvar).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByPlaceholderText('Ex.: Treino A'), 'Treino A');
    expect(screen.queryByText('Informe o nome do treino.')).toBeNull();

    // O valor enviado à API continua sendo o dia completo.
    await fireEvent.press(screen.getByText('Sáb'));
    await fireEvent.press(screen.getByText('CRIAR TREINO'));
    expect(onSalvar).toHaveBeenCalledWith({ nome: 'Treino A', dia_semana: 'sábado', ordem: 1 });
  });
});

describe('CamposVigencia', () => {
  it('aplica a máscara DD/MM/AAAA ao digitar', async () => {
    const onChangeInicio = jest.fn();
    await render(
      <CamposVigencia
        dataInicio=""
        dataFim=""
        onChangeInicio={onChangeInicio}
        onChangeFim={jest.fn()}
      />
    );

    await fireEvent.changeText(screen.getByPlaceholderText('DD/MM/AAAA (padrão: hoje)'), '31102026');
    expect(onChangeInicio).toHaveBeenCalledWith('31/10/2026');
  });
});
