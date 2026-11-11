import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react-native';
import { ReactElement } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import PainelProfessor from '@/app/(professor)/(abas)/painel';
import MontarFichaExistente from '@/app/(professor)/fichas/[id]/montar';
import EditarTreino from '@/app/(professor)/fichas/[id]/treinos/editar';
import VersoesFicha from '@/app/(professor)/fichas/[id]/versoes';
import { CardExercicio } from '@/components/CardExercicio';
import { CardFicha } from '@/components/CardFicha';
import { TelaMontador } from '@/components/professor/TelaMontador';
import { useAvisoSaidaSemSalvar } from '@/hooks/useAvisoSaidaSemSalvar';
import { buscarAlunos } from '@/services/aluno.service';
import { buscarExercicios } from '@/services/exercicio.service';
import {
  buscarFichaCompleta,
  buscarVersaoFicha,
  criarFicha,
  listarVersoesFicha,
  publicarFicha,
  salvarFichaCompleta,
} from '@/services/ficha.service';
import { buscarDashboardProfessor } from '@/services/paineis.service';
import { atualizarTreino } from '@/services/treino.service';
import { mostrarAlerta } from '@/utils/alerta';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success' },
}));

const mockAddListener = jest.fn(() => jest.fn());
const mockDispatch = jest.fn();

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), push: jest.fn(), navigate: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: jest.fn(() => ({ id: '50' })),
  useFocusEffect: jest.fn(),
  useNavigation: () => ({ addListener: mockAddListener, dispatch: mockDispatch }),
}));

jest.mock('@/utils/alerta', () => ({ mostrarAlerta: jest.fn() }));
jest.mock('@/services/aluno.service');
jest.mock('@/services/exercicio.service');
jest.mock('@/services/ficha.service');
jest.mock('@/services/treino.service');
jest.mock('@/services/paineis.service');
jest.mock('@/services/usuario.service', () => ({
  buscarPerfilProfessor: jest.fn(() => Promise.resolve({ id: 1, nome: 'Prof', telefone: '1' })),
}));
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ usuario: { email: 'p@x.com', foto: null } }) }));
jest.mock('@/hooks/usePerfil', () => ({ usePerfil: () => ({ nome: 'Paulo Prof' }) }));
jest.mock('@/components/ui/useLarguraTela', () => {
  const { classificarLargura } = jest.requireActual('@/utils/larguraTela');

  return { useLarguraTela: () => classificarLargura(390) };
});

const METRICAS = {
  frame: { x: 0, y: 0, width: 390, height: 800 },
  insets: { top: 24, left: 0, right: 0, bottom: 16 },
};

async function renderizar(elemento: ReactElement) {
  return render(<SafeAreaProvider initialMetrics={METRICAS}>{elemento}</SafeAreaProvider>);
}

const exercicioSupino = {
  id: 10,
  nome: 'Supino reto',
  descricao: 'Peito',
  grupo_muscular: 'Peito',
  imagem: null,
  video: null,
  criado_por_professor_id: null,
};
const exercicioRemada = { ...exercicioSupino, id: 11, nome: 'Remada curvada', grupo_muscular: 'Costas' };

const fichaServidor = {
  id: 50,
  nome: 'Hipertrofia',
  data_criacao: '2026-11-10T10:00:00-03:00',
  data_inicio: '2026-11-10',
  data_fim: null,
  vigente: true,
  aluno_id: 5,
  status: 'rascunho',
  objetivo: null,
  treinos: [
    {
      id: 500,
      ficha_id: 50,
      nome: 'Treino A',
      dia_semana: null,
      ordem: 1,
      total_itens: 2,
      itens: [10, 11].map((exercicio, i) => ({
        id: 5000 + i,
        ficha_id: 50,
        treino_id: 500,
        exercicio_id: exercicio,
        series: 3,
        repeticoes: 12,
        carga: 0,
        descanso: 60,
        ordem: i + 1,
        nome: exercicio === 10 ? 'Supino reto' : 'Remada curvada',
        descricao: '',
        grupo_muscular: 'x',
        imagem: null,
        video: null,
      })),
    },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  (buscarAlunos as jest.Mock).mockResolvedValue([
    { id: 5, nome: 'Aluno Demo', telefone: '1', data_nascimento: '2000-01-01' },
  ]);
  (buscarExercicios as jest.Mock).mockResolvedValue({
    itens: [exercicioSupino, exercicioRemada],
    pagina: 1,
    limite: 50,
    total: 2,
    total_paginas: 1,
  });
});

describe('TelaMontador (ficha nova, celular)', () => {
  it('monta uma ficha, salva como rascunho e depois publica mostrando a versão criada', async () => {
    (criarFicha as jest.Mock).mockResolvedValue({ id: 50 });
    (salvarFichaCompleta as jest.Mock).mockResolvedValue({ ...fichaServidor, status: 'rascunho' });
    (buscarFichaCompleta as jest.Mock).mockResolvedValue({ ...fichaServidor, status: 'rascunho' });
    (publicarFicha as jest.Mock).mockResolvedValue({ numero: 1, publicada_em: 'x', publicada_por: null });

    await renderizar(<TelaMontador fichaId={null} alunoIdInicial={5} />);

    await fireEvent.changeText(screen.getByPlaceholderText('Ex.: Hipertrofia - ciclo 1'), 'Hipertrofia');
    expect(screen.getByText('Nenhum exercício nesta divisão')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('abrir-biblioteca'));
    await waitFor(() => expect(screen.getByTestId('biblioteca-adicionar-10')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('biblioteca-adicionar-10'));
    await fireEvent.press(screen.getByTestId('biblioteca-adicionar-11'));

    expect(screen.getByLabelText('Séries de Supino reto')).toBeTruthy();
    expect(screen.getByLabelText('Subir Remada curvada')).toBeTruthy();
    expect(screen.getByTestId('montador-resumo').props.children.join('')).toContain('2 exercício(s)');
    expect(screen.getByTestId('montador-resumo').props.children.join('')).toContain('alterações não salvas');

    // salvar rascunho
    await fireEvent.press(screen.getByTestId('montador-salvar'));
    await waitFor(() => expect(criarFicha).toHaveBeenCalledTimes(1));

    expect(criarFicha).toHaveBeenCalledWith(expect.objectContaining({ aluno_id: 5, status: 'rascunho', nome: 'Hipertrofia' }));
    expect(publicarFicha).not.toHaveBeenCalled();
    expect(salvarFichaCompleta).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(mostrarAlerta).toHaveBeenCalledWith('Rascunho salvo', expect.stringContaining('ainda não vê'), expect.any(Array)));

    // publicar: pede confirmação e só então chama a API
    (mostrarAlerta as jest.Mock).mockClear();
    await fireEvent.press(screen.getByTestId('montador-publicar'));

    const [titulo, , botoes] = (mostrarAlerta as jest.Mock).mock.calls[0];

    expect(titulo).toBe('Publicar ficha');
    expect(publicarFicha).not.toHaveBeenCalled();

    await act(async () => {
      await botoes.find((b: { text: string }) => b.text === 'Publicar').onPress();
    });

    await waitFor(() => expect(publicarFicha).toHaveBeenCalledWith(50));
    await waitFor(() =>
      expect(mostrarAlerta).toHaveBeenCalledWith('Ficha publicada', expect.stringContaining('Versão 1'), expect.any(Array))
    );
  });

  it('sem nome não chama a API e orienta a revisar', async () => {
    await renderizar(<TelaMontador fichaId={null} alunoIdInicial={5} />);

    await fireEvent.press(screen.getByTestId('montador-salvar'));

    await waitFor(() => expect(mostrarAlerta).toHaveBeenCalledWith('Revise a ficha', expect.any(String)));

    expect(criarFicha).not.toHaveBeenCalled();
    expect(screen.getByText('Informe o nome da ficha.')).toBeTruthy();
  });

  it('publicar sem exercícios é recusado com mensagem clara', async () => {
    await renderizar(<TelaMontador fichaId={null} alunoIdInicial={5} />);

    await fireEvent.changeText(screen.getByPlaceholderText('Ex.: Hipertrofia - ciclo 1'), 'Vazia');
    await fireEvent.press(screen.getByTestId('montador-publicar'));

    expect(mostrarAlerta).toHaveBeenCalledWith('Revise a ficha', 'Adicione ao menos um exercício antes de publicar.');
    expect(publicarFicha).not.toHaveBeenCalled();
  });

  it('erro da API ao salvar vira alerta e a digitação continua na tela', async () => {
    const { AxiosError } = jest.requireActual('axios');

    (criarFicha as jest.Mock).mockRejectedValue(
      Object.assign(new AxiosError('x'), { response: { status: 403, data: { detail: 'Aluno não vinculado a você' } } })
    );

    await renderizar(<TelaMontador fichaId={null} alunoIdInicial={5} />);

    await fireEvent.changeText(screen.getByPlaceholderText('Ex.: Hipertrofia - ciclo 1'), 'Plano de teste');
    await fireEvent.press(screen.getByTestId('montador-salvar'));

    await waitFor(() =>
      expect(mostrarAlerta).toHaveBeenCalledWith('Não foi possível salvar', 'Aluno não vinculado a você')
    );
    expect(screen.getByDisplayValue('Plano de teste')).toBeTruthy();
  });

  it('adiciona divisões A/B e permite escolher "Sem dia fixo" ou um dia', async () => {
    await renderizar(<TelaMontador fichaId={null} alunoIdInicial={5} />);

    expect(screen.getByTestId('divisao-aba-0')).toBeTruthy();
    expect(screen.getByText('Sem dia fixo')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('divisao-adicionar'));

    expect(screen.getByTestId('divisao-aba-1')).toBeTruthy();
    expect(screen.getByDisplayValue('Treino B')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('divisao-dia-quarta'));
    expect(screen.getByTestId('divisao-dia-quarta').props.accessibilityState.selected).toBe(true);
    expect(screen.getByTestId('divisao-dia-sem').props.accessibilityState.selected).toBe(false);
  });
});

describe('TelaMontador (aluno da URL, GR-07)', () => {
  it('ignora ?alunoId= de quem não é aluno vinculado e não oferece "Aluno #id"', async () => {
    await renderizar(<TelaMontador fichaId={null} alunoIdInicial={7} />);

    await waitFor(() => expect(buscarAlunos).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText('Selecione um aluno vinculado')).toBeTruthy());
    expect(screen.queryByText('Aluno #7')).toBeNull();
  });

  it('mantém o aluno da URL quando ele é vinculado ao professor', async () => {
    await renderizar(<TelaMontador fichaId={null} alunoIdInicial={5} />);

    await waitFor(() => expect(screen.getAllByText('Aluno Demo').length).toBeGreaterThan(0));
    expect(screen.queryByText('Selecione um aluno vinculado')).toBeNull();
  });
});

describe('Rota de edição do montador (GR-08)', () => {
  it('id que não é inteiro positivo mostra "Ficha não encontrada" em vez de abrir uma ficha nova', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'abc' });

    await renderizar(<MontarFichaExistente />);

    expect(screen.getByText('Ficha não encontrada.')).toBeTruthy();
    expect(screen.queryByTestId('abrir-biblioteca')).toBeNull();
    expect(buscarFichaCompleta).not.toHaveBeenCalled();
  });

  it('id válido abre o montador da ficha', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: '50' });
    (buscarFichaCompleta as jest.Mock).mockResolvedValue(fichaServidor);

    await renderizar(<MontarFichaExistente />);

    await waitFor(() => expect(buscarFichaCompleta).toHaveBeenCalledWith(50));
    expect(screen.queryByText('Ficha não encontrada.')).toBeNull();
  });
});

describe('TelaMontador (ficha existente)', () => {
  it('carrega, reordena com os botões subir/descer e remove com confirmação', async () => {
    (buscarFichaCompleta as jest.Mock).mockResolvedValue(fichaServidor);

    await renderizar(<TelaMontador fichaId={50} />);

    await waitFor(() => expect(screen.getByDisplayValue('Hipertrofia')).toBeTruthy());

    expect(screen.getByTestId('item-0')).toBeTruthy();
    expect(screen.getByTestId('montador-resumo').props.children.join('')).not.toContain('alterações não salvas');

    // o primeiro item não sobe; o último não desce
    expect(screen.getByTestId('item-0-subir').props.accessibilityState.disabled).toBe(true);
    expect(screen.getByTestId('item-1-descer').props.accessibilityState.disabled).toBe(true);

    await fireEvent.press(screen.getByTestId('item-0-descer'));

    expect(screen.getByTestId('montador-resumo').props.children.join('')).toContain('alterações não salvas');
    expect(screen.getByLabelText('Subir Supino reto')).toBeTruthy();

    // remover pede confirmação
    await fireEvent.press(screen.getByTestId('item-0-remover'));

    const [titulo, , botoes] = (mostrarAlerta as jest.Mock).mock.calls.at(-1);

    expect(titulo).toBe('Remover exercício');
    expect(screen.getByTestId('item-1')).toBeTruthy();

    await act(async () => {
      await botoes.find((b: { text: string }) => b.text === 'Remover').onPress();
    });

    await waitFor(() => expect(screen.queryByTestId('item-1')).toBeNull());
  });

  it('ficha publicada oferece "Salvar alterações" e "Publicar nova versão"', async () => {
    (buscarFichaCompleta as jest.Mock).mockResolvedValue({ ...fichaServidor, status: 'publicada' });
    (salvarFichaCompleta as jest.Mock).mockResolvedValue({ ...fichaServidor, status: 'publicada' });

    await renderizar(<TelaMontador fichaId={50} />);

    await waitFor(() => expect(screen.getByText('Salvar alterações')).toBeTruthy());

    expect(screen.getByText('Publicar nova versão')).toBeTruthy();
    expect(screen.getByTestId('montador-aviso-publicada')).toBeTruthy();
  });

  it('mostra erro de carga com "Tentar novamente"', async () => {
    const { AxiosError } = jest.requireActual('axios');

    (buscarFichaCompleta as jest.Mock).mockRejectedValue(new AxiosError('Network Error'));

    await renderizar(<TelaMontador fichaId={50} />);

    await waitFor(() => expect(screen.getByTestId('estado-erro')).toBeTruthy());
  });
});

describe('useAvisoSaidaSemSalvar', () => {
  async function disparar(ativo: boolean) {
    const preventDefault = jest.fn();
    const { rerender } = await renderHook(({ a }: { a: boolean }) => useAvisoSaidaSemSalvar(a), { initialProps: { a: ativo } });
    const ouvinte = (mockAddListener.mock.calls[0] as unknown as [string, (e: unknown) => void])[1];

    ouvinte({ preventDefault, data: { action: { type: 'GO_BACK' } } });

    return { preventDefault, rerender };
  }

  it('com alterações: impede a saída e pergunta; confirmar repassa a ação original', async () => {
    const { preventDefault } = await disparar(true);

    expect(preventDefault).toHaveBeenCalled();

    const [titulo, , botoes] = (mostrarAlerta as jest.Mock).mock.calls[0];

    expect(titulo).toBe('Sair sem salvar?');

    botoes.find((b: { text: string }) => b.text === 'Sair sem salvar').onPress();

    expect(mockDispatch).toHaveBeenCalledWith({ type: 'GO_BACK' });
  });

  it('sem alterações: deixa sair sem perguntar', async () => {
    const { preventDefault } = await disparar(false);

    expect(preventDefault).not.toHaveBeenCalled();
    expect(mostrarAlerta).not.toHaveBeenCalled();
  });
});

describe('Versões da ficha', () => {
  it('lista as versões (mais nova primeiro) e abre uma em modo somente leitura', async () => {
    (listarVersoesFicha as jest.Mock).mockResolvedValue([
      { numero: 1, publicada_em: '2026-11-09T10:00:00-03:00', publicada_por: { id: 1, nome: 'Paulo Prof', tipo: 'professor' } },
      { numero: 2, publicada_em: '2026-11-10T11:30:00-03:00', publicada_por: { id: 1, nome: 'Paulo Prof', tipo: 'professor' } },
    ]);
    (buscarVersaoFicha as jest.Mock).mockResolvedValue({
      numero: 1,
      publicada_em: '2026-11-09T10:00:00-03:00',
      publicada_por: { id: 1, nome: 'Paulo Prof', tipo: 'professor' },
      conteudo: { ...fichaServidor, treinos: [{ ...fichaServidor.treinos[0], dia_semana: null }] },
    });

    await renderizar(<VersoesFicha />);

    await waitFor(() => expect(screen.getByTestId('versao-2')).toBeTruthy());

    expect(screen.getByText('Versão 2 · atual')).toBeTruthy();
    expect(screen.getByText('Versão 1')).toBeTruthy();
    expect(screen.getByText('10/11/2026 às 11:30 · Paulo Prof')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('versao-1'));

    await waitFor(() => expect(screen.getByTestId('versao-conteudo')).toBeTruthy());

    expect(buscarVersaoFicha).toHaveBeenCalledWith(50, 1);
    expect(screen.getByTestId('versao-somente-leitura')).toBeTruthy();
    expect(screen.getByText('Sem dia fixo')).toBeTruthy();
    expect(screen.getByText('1. Supino reto')).toBeTruthy();
    expect(screen.getAllByText('3 × 12 · sem carga · descanso 60 s')).toHaveLength(2);
    // somente leitura: nenhum campo editável
    expect(screen.queryByTestId('montador-salvar')).toBeNull();
  });

  it('sem versões publicadas mostra o estado vazio', async () => {
    (listarVersoesFicha as jest.Mock).mockResolvedValue([]);

    await renderizar(<VersoesFicha />);

    await waitFor(() => expect(screen.getByText('Nenhuma versão publicada')).toBeTruthy());
  });
});

describe('Painel do professor', () => {
  it('mostra os indicadores do dashboard, últimos alunos e próximas avaliações', async () => {
    (buscarDashboardProfessor as jest.Mock).mockResolvedValue({
      total_alunos: 8,
      alunos_ativos: 6,
      avaliacoes_pendentes: 2,
      fichas_ativas: 5,
      fichas_rascunho: 1,
      fichas_desatualizadas: 3,
      ultimos_alunos: [{ id: 5, nome: 'Aluno Demo' }],
      proximas_avaliacoes: [{ aluno: { id: 5, nome: 'Aluno Demo' }, ultima: '2026-08-01', proxima: '2026-11-01' }],
    });

    await renderizar(<PainelProfessor />);

    await waitFor(() => expect(screen.getAllByText('Aluno Demo').length).toBeGreaterThan(1));
    // GR-01: o E2E-10 procura exatamente este título da seção.
    expect(screen.getByText('Alunos recentes')).toBeTruthy();

    for (const [id, rotulo, valor] of [
      ['indicador-total-alunos', 'Alunos vinculados', '8'],
      ['indicador-alunos-ativos', 'Alunos ativos', '6'],
      ['indicador-avaliacoes-pendentes', 'Avaliações pendentes', '2'],
      ['indicador-fichas-ativas', 'Fichas ativas', '5'],
      ['indicador-fichas-rascunho', 'Rascunhos', '1'],
      ['indicador-fichas-desatualizadas', 'Desatualizadas', '3'],
    ] as const) {
      expect(screen.getByTestId(id)).toHaveTextContent(new RegExp(`${rotulo}.*${valor}$`));
    }

    expect(screen.getByText('Última: 01/08/2026 · Próxima: 01/11/2026')).toBeTruthy();
    expect(screen.getByText('Montar ficha')).toBeTruthy();
  });

  it('erro do dashboard mostra "Tentar novamente"', async () => {
    const { AxiosError } = jest.requireActual('axios');

    (buscarDashboardProfessor as jest.Mock).mockRejectedValue(new AxiosError('Network Error'));

    await renderizar(<PainelProfessor />);

    await waitFor(() => expect(screen.getByTestId('estado-erro')).toBeTruthy());
  });
});

describe('cartões do professor', () => {
  it('CardFicha mostra o selo Rascunho e o botão Duplicar', async () => {
    const onDuplicar = jest.fn();

    await renderizar(
      <CardFicha
        ficha={{
          id: 3,
          nome: 'Plano',
          data_criacao: '2026-11-01',
          aluno_id: 5,
          aluno_nome: 'Aluno Demo',
          data_inicio: '2026-11-01',
          data_fim: null,
          vigente: true,
          total_treinos: 2,
          status: 'rascunho',
        }}
        onPress={jest.fn()}
        onDuplicar={onDuplicar}
      />
    );

    expect(screen.getByText('Rascunho')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Duplicar ficha Plano'));

    expect(onDuplicar).toHaveBeenCalled();
  });

  it('CardExercicio de outro professor não tem botão de editar', async () => {
    await renderizar(
      <CardExercicio exercicio={exercicioSupino} podeEditar={false} origem="Outro professor" onPress={jest.fn()} onEditar={jest.fn()} />
    );

    expect(screen.queryByLabelText('Editar Supino reto')).toBeNull();
    expect(screen.getByText('Outro professor')).toBeTruthy();
  });

  it('CardExercicio próprio mantém o botão de editar', async () => {
    const onEditar = jest.fn();

    await renderizar(<CardExercicio exercicio={exercicioSupino} onPress={jest.fn()} onEditar={onEditar} />);

    await fireEvent.press(screen.getByLabelText('Editar Supino reto'));

    expect(onEditar).toHaveBeenCalled();
  });
});

describe('Editar treino sem dia fixo (GB-11)', () => {
  afterEach(() => (useLocalSearchParams as jest.Mock).mockReturnValue({ id: '50' }));

  it('dia vazio na rota mantém "Sem dia fixo" e salva dia_semana nulo (não vira segunda)', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: '50', treinoId: '9', nome: 'Treino A', dia: '', ordem: '1' });
    (atualizarTreino as jest.Mock).mockResolvedValue({ id: 9 });

    await renderizar(<EditarTreino />);

    expect(screen.getByTestId('treino-dia-sem-dia-fixo').props.accessibilityState.checked).toBe(true);

    await fireEvent.press(screen.getByText('SALVAR'));

    await waitFor(() => expect(atualizarTreino).toHaveBeenCalledWith(9, { nome: 'Treino A', dia_semana: null, ordem: 1 }));
  });

  it('treino com dia na rota continua com o dia e o envia ao salvar', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: '50', treinoId: '10', nome: 'Treino B', dia: 'sexta', ordem: '2' });
    (atualizarTreino as jest.Mock).mockResolvedValue({ id: 10 });

    await renderizar(<EditarTreino />);

    expect(screen.getByTestId('treino-dia-sem-dia-fixo').props.accessibilityState.checked).toBe(false);

    await fireEvent.press(screen.getByText('SALVAR'));

    await waitFor(() => expect(atualizarTreino).toHaveBeenCalledWith(10, { nome: 'Treino B', dia_semana: 'sexta', ordem: 2 }));
  });
});
