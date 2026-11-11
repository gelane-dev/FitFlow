import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AxiosError } from 'axios';
import { router, useLocalSearchParams } from 'expo-router';
import { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AlunosAdmin from '@/app/(admin)/(abas)/admin/alunos';
import NovoAlunoAdmin from '@/app/(admin)/admin/alunos/novo';
import DetalheProfessorAdmin from '@/app/(admin)/admin/professores/[id]';
import AlunosRecepcao from '@/app/(recepcao)/(abas)/recepcao/alunos';
import NovoAlunoRecepcao from '@/app/(recepcao)/recepcao/alunos/novo';
import DetalheFicha from '@/app/(professor)/fichas/[id]';
import { useRecepcaoPermissoes } from '@/hooks/useRecepcaoPermissoes';
import { buscarAlunos } from '@/services/aluno.service';
import { buscarFicha, publicarFicha } from '@/services/ficha.service';
import { listarProfessores, alterarStatusProfessor, buscarProfessor } from '@/services/equipe.service';
import { aprovarAluno, criarGestaoAluno, listarGestaoAlunos } from '@/services/gestaoAlunos.service';
import { listarPlanos } from '@/services/planos.service';
import { buscarTreinos } from '@/services/treino.service';
import { mostrarAlerta } from '@/utils/alerta';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success' },
}));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), push: jest.fn(), navigate: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: jest.fn(() => ({ id: '1' })),
  useFocusEffect: jest.fn(),
  useNavigation: () => ({ addListener: jest.fn(() => jest.fn()), dispatch: jest.fn() }),
}));
jest.mock('@/utils/alerta', () => ({ mostrarAlerta: jest.fn() }));
jest.mock('@/hooks/useRecepcaoPermissoes');
jest.mock('@/services/gestaoAlunos.service');
jest.mock('@/services/aluno.service');
jest.mock('@/services/equipe.service');
jest.mock('@/services/planos.service');
jest.mock('@/services/ficha.service');
jest.mock('@/services/treino.service');
jest.mock('@/components/ui/useLarguraTela', () => {
  const { classificarLargura } = jest.requireActual('@/utils/larguraTela');

  return { useLarguraTela: () => classificarLargura(1200) };
});

const METRICAS = {
  frame: { x: 0, y: 0, width: 1200, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

async function renderizar(elemento: ReactElement) {
  return render(<SafeAreaProvider initialMetrics={METRICAS}>{elemento}</SafeAreaProvider>);
}

function erroApi(status: number, detail: string) {
  const erro = new AxiosError('falha');

  erro.response = { status, data: { detail } } as AxiosError['response'];

  return erro;
}

const aluno = (id: number, nome: string, extra: Record<string, unknown> = {}) => ({
  id,
  nome,
  email: `${nome.toLowerCase().replace(/ /g, '')}@x.com`,
  telefone: '11999990000',
  foto: null,
  ativo: true,
  status_cadastro: 'aprovado',
  professor: null,
  plano_atual: null,
  data_vencimento: null,
  situacao: 'sem_matricula',
  inadimplente: false,
  criado_em: null,
  ...extra,
});

const pagina = (itens: unknown[]) => ({ itens, total: itens.length, pagina: 1, por_pagina: 20 });

function permissoes(...lista: string[]) {
  (useRecepcaoPermissoes as jest.Mock).mockReturnValue({
    pode: (p: string) => lista.includes(p),
    permissoes: lista,
    carregando: false,
    erro: null,
    perfil: null,
    recarregar: jest.fn(),
  });
}

function botaoDoAlerta(chamada: number, texto: string) {
  return (mostrarAlerta as jest.Mock).mock.calls[chamada][2].find((b: { text: string }) => b.text === texto);
}

/** Aperta o botão do diálogo `mostrarAlerta` e espera a ação terminar. */
async function confirmar(chamada: number, texto: string) {
  await act(async () => {
    await botaoDoAlerta(chamada, texto).onPress();
  });
}

beforeEach(() => {
  // Não usar resetAllMocks: zeraria os mocks de fonte/ícones do jest-expo.
  jest.clearAllMocks();
  [
    useRecepcaoPermissoes,
    listarGestaoAlunos,
    aprovarAluno,
    criarGestaoAluno,
    listarProfessores,
    buscarProfessor,
    alterarStatusProfessor,
    listarPlanos,
    buscarAlunos,
    buscarFicha,
    publicarFicha,
    buscarTreinos,
  ].forEach((funcao) => (funcao as jest.Mock).mockReset());
  (useLocalSearchParams as jest.Mock).mockReturnValue({ id: '1' });
});

describe('Alunos da recepção (GR-06)', () => {
  it('mostra o carregamento e depois a lista', async () => {
    permissoes();
    (listarGestaoAlunos as jest.Mock).mockResolvedValue(pagina([aluno(1, 'Ana Souza')]));

    await renderizar(<AlunosRecepcao />);

    expect(await screen.findByText('Ana Souza')).toBeTruthy();
    expect(listarGestaoAlunos).toHaveBeenCalledWith(expect.objectContaining({ pagina: 1, por_pagina: 20 }));
  });

  it('erro da API aparece e "Tentar novamente" busca de novo', async () => {
    permissoes();
    (listarGestaoAlunos as jest.Mock)
      .mockRejectedValueOnce(erroApi(500, 'Falha ao listar'))
      .mockResolvedValueOnce(pagina([aluno(1, 'Ana Souza')]));

    await renderizar(<AlunosRecepcao />);

    expect(await screen.findByText('Falha ao listar')).toBeTruthy();

    await fireEvent.press(screen.getByText('Tentar novamente'));

    expect(await screen.findByText('Ana Souza')).toBeTruthy();
    expect(listarGestaoAlunos).toHaveBeenCalledTimes(2);
  });

  it('lista vazia mostra a mensagem de vazio', async () => {
    permissoes();
    (listarGestaoAlunos as jest.Mock).mockResolvedValue(pagina([]));

    await renderizar(<AlunosRecepcao />);

    expect(await screen.findByText('Nenhum aluno encontrado')).toBeTruthy();
  });

  it('sem permissões esconde "Novo aluno" e Aprovar/Recusar', async () => {
    permissoes();
    (listarGestaoAlunos as jest.Mock).mockResolvedValue(pagina([aluno(2, 'Beto Lima', { status_cadastro: 'pendente' })]));

    await renderizar(<AlunosRecepcao />);
    await screen.findByText('Beto Lima');

    expect(screen.queryByTestId('botao-novo-aluno')).toBeNull();
    expect(screen.queryByTestId('aprovar-2')).toBeNull();
    expect(screen.queryByTestId('recusar-2')).toBeNull();
  });

  it('com cadastrar_aluno e aprovar_aluno mostra as ações; aprovar confirma, chama o service e recarrega', async () => {
    permissoes('cadastrar_aluno', 'aprovar_aluno');
    (listarGestaoAlunos as jest.Mock).mockResolvedValue(pagina([aluno(2, 'Beto Lima', { status_cadastro: 'pendente' })]));
    (aprovarAluno as jest.Mock).mockResolvedValue({});

    await renderizar(<AlunosRecepcao />);
    await screen.findByText('Beto Lima');

    await fireEvent.press(screen.getByTestId('botao-novo-aluno'));
    expect(router.push).toHaveBeenCalledWith('/recepcao/alunos/novo');

    await fireEvent.press(screen.getByTestId('aprovar-2'));
    expect(aprovarAluno).not.toHaveBeenCalled();

    await confirmar(0, 'Aprovar');

    expect(aprovarAluno).toHaveBeenCalledWith(2);
    await waitFor(() => expect(listarGestaoAlunos).toHaveBeenCalledTimes(2));
  });

  it('erro ao aprovar (403) aparece em alerta', async () => {
    permissoes('aprovar_aluno');
    (listarGestaoAlunos as jest.Mock).mockResolvedValue(pagina([aluno(2, 'Beto Lima', { status_cadastro: 'pendente' })]));
    (aprovarAluno as jest.Mock).mockRejectedValue(erroApi(403, 'Permissão insuficiente'));

    await renderizar(<AlunosRecepcao />);
    await screen.findByText('Beto Lima');
    await fireEvent.press(screen.getByTestId('aprovar-2'));
    await confirmar(0, 'Aprovar');

    expect(mostrarAlerta).toHaveBeenLastCalledWith('Erro', 'Permissão insuficiente');
  });
});

describe('Novo aluno na recepção (GR-03/GR-06)', () => {
  it('sem cadastrar_aluno mostra "Sem permissão" e não o formulário', async () => {
    permissoes();

    await renderizar(<NovoAlunoRecepcao />);

    expect(screen.getByText('Sem permissão')).toBeTruthy();
    expect(criarGestaoAluno).not.toHaveBeenCalled();
  });

  it('com a permissão mostra o formulário de cadastro', async () => {
    permissoes('cadastrar_aluno');

    await renderizar(<NovoAlunoRecepcao />);

    expect(screen.queryByText('Sem permissão')).toBeNull();
    expect(screen.getByTestId('tela-novo-aluno')).toBeTruthy();
  });
});

describe('Alunos do admin (GR-06)', () => {
  beforeEach(() => {
    (listarProfessores as jest.Mock).mockResolvedValue([]);
    (listarPlanos as jest.Mock).mockResolvedValue([]);
  });

  it('lista os alunos e abre o detalhe ao tocar', async () => {
    (listarGestaoAlunos as jest.Mock).mockResolvedValue(pagina([aluno(7, 'Carla Dias')]));

    await renderizar(<AlunosAdmin />);

    await fireEvent.press(await screen.findByText('Carla Dias'));
    expect(router.push).toHaveBeenCalledWith(expect.stringContaining('/admin/alunos/7'));
  });

  it('erro mostra a mensagem e permite tentar de novo; vazio mostra o estado vazio', async () => {
    (listarGestaoAlunos as jest.Mock).mockRejectedValueOnce(erroApi(500, 'Falha no admin')).mockResolvedValueOnce(pagina([]));

    await renderizar(<AlunosAdmin />);

    expect(await screen.findByText('Falha no admin')).toBeTruthy();

    await fireEvent.press(screen.getByText('Tentar novamente'));

    await waitFor(() => expect(screen.queryByText('Falha no admin')).toBeNull());
    expect(await screen.findByText('Nenhum aluno cadastrado')).toBeTruthy();
  });
});

describe('Novo aluno no admin (GR-03)', () => {
  it('carrega os professores ativos pelo hook e mostra o seletor', async () => {
    (listarProfessores as jest.Mock).mockResolvedValue([
      { id: 1, nome: 'Prof Ativo', ativo: true },
      { id: 2, nome: 'Prof Inativo', ativo: false },
    ]);

    await renderizar(<NovoAlunoAdmin />);

    await waitFor(() => expect(listarProfessores).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('novo-aluno-professor')).toBeTruthy();
  });
});

describe('Detalhe do professor no admin (GR-06)', () => {
  const professor = {
    id: 1,
    nome: 'Paulo Prof',
    email: 'paulo@x.com',
    telefone: '11999990000',
    foto: null,
    ativo: true,
    criado_em: null,
    total_alunos: 0,
    total_fichas: 0,
    total_avaliacoes: 0,
    alunos: [],
    fichas: [],
    avaliacoes_recentes: [],
    atividade: [],
  };

  beforeEach(() => {
    (buscarProfessor as jest.Mock).mockResolvedValue(professor);
    (listarProfessores as jest.Mock).mockResolvedValue([professor]);
  });

  it('erro de carga mostra a mensagem da API', async () => {
    (buscarProfessor as jest.Mock).mockRejectedValue(erroApi(404, 'Professor não encontrado'));

    await renderizar(<DetalheProfessorAdmin />);

    expect(await screen.findByText('Professor não encontrado')).toBeTruthy();
  });

  it('desativar confirma, chama o service e recarrega', async () => {
    (alterarStatusProfessor as jest.Mock).mockResolvedValue({});

    await renderizar(<DetalheProfessorAdmin />);
    await fireEvent.press(await screen.findByTestId('professor-status'));

    expect(alterarStatusProfessor).not.toHaveBeenCalled();
    expect((mostrarAlerta as jest.Mock).mock.calls[0][0]).toBe('Desativar professor');

    await confirmar(0, 'Desativar');

    expect(alterarStatusProfessor).toHaveBeenCalledWith(1, { ativo: false });
    await waitFor(() => expect(buscarProfessor).toHaveBeenCalledTimes(2));
  });

  it('erro da API ao desativar aparece em alerta', async () => {
    (alterarStatusProfessor as jest.Mock).mockRejectedValue(erroApi(403, 'Somente administradores'));

    await renderizar(<DetalheProfessorAdmin />);
    await fireEvent.press(await screen.findByTestId('professor-status'));
    await confirmar(0, 'Desativar');

    expect(mostrarAlerta).toHaveBeenLastCalledWith('Não foi possível alterar', 'Somente administradores');
  });
});

describe('Detalhe da ficha do professor: publicar (GR-02)', () => {
  const ficha = {
    id: 1,
    nome: 'Hipertrofia',
    aluno_id: 5,
    aluno_nome: 'Aluno Demo',
    data_criacao: '2026-11-10T10:00:00-03:00',
    data_inicio: '2026-11-10',
    data_fim: null,
    vigente: true,
    status: 'rascunho',
    objetivo: null,
  };

  beforeEach(() => {
    (buscarFicha as jest.Mock).mockResolvedValue(ficha);
    (buscarTreinos as jest.Mock).mockResolvedValue([]);
    (buscarAlunos as jest.Mock).mockResolvedValue([]);
  });

  it('erro da API ao publicar aparece em alerta com o detail (409)', async () => {
    (publicarFicha as jest.Mock).mockRejectedValue(erroApi(409, 'Ficha sem exercícios'));

    await renderizar(<DetalheFicha />);
    await fireEvent.press(await screen.findByTestId('ficha-publicar'));
    await confirmar(0, 'Publicar');

    expect(publicarFicha).toHaveBeenCalledWith(1);
    expect(mostrarAlerta).toHaveBeenLastCalledWith('Erro', 'Ficha sem exercícios');
  });

  it('publicar com sucesso informa a versão criada e recarrega a ficha', async () => {
    (publicarFicha as jest.Mock).mockResolvedValue({ numero: 4 });

    await renderizar(<DetalheFicha />);
    await fireEvent.press(await screen.findByTestId('ficha-publicar'));
    await confirmar(0, 'Publicar');

    expect(mostrarAlerta).toHaveBeenLastCalledWith('Ficha publicada', 'Versão 4 criada.');
    expect(buscarFicha).toHaveBeenCalledTimes(2);
  });
});
