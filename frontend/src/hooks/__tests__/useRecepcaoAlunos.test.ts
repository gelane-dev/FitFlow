import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AxiosError } from 'axios';

import { useGestaoAprovacao } from '@/hooks/useGestaoAprovacao';
import { useRecepcaoAlunos } from '@/hooks/useRecepcaoAlunos';
import { aprovarAluno, listarGestaoAlunos, recusarAluno } from '@/services/gestaoAlunos.service';
import { mostrarAlerta } from '@/utils/alerta';

jest.mock('@/services/gestaoAlunos.service');
jest.mock('@/utils/alerta');

const resposta = (total = 0) => ({ itens: [], total, pagina: 1, por_pagina: 20 });

describe('useRecepcaoAlunos', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (listarGestaoAlunos as jest.Mock).mockResolvedValue(resposta(45));
  });

  it('carrega a primeira página', async () => {
    const { result } = await renderHook(() => useRecepcaoAlunos());

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.total).toBe(45);
    expect(listarGestaoAlunos).toHaveBeenCalledWith({
      busca: undefined,
      situacao: undefined,
      pagina: 1,
      por_pagina: 20,
    });
  });

  it('filtra por situação e busca, voltando à página 1', async () => {
    const { result } = await renderHook(() => useRecepcaoAlunos());

    await waitFor(() => expect(result.current.carregando).toBe(false));
    await act(async () => result.current.setPagina(3));
    await waitFor(() => expect(result.current.pagina).toBe(3));

    await act(async () => result.current.setSituacao('pendente'));
    await waitFor(() => expect(result.current.pagina).toBe(1));
    expect(listarGestaoAlunos).toHaveBeenLastCalledWith(expect.objectContaining({ situacao: 'pendente', pagina: 1 }));

    await act(async () => result.current.setBusca(' Ana '));
    await waitFor(() =>
      expect(listarGestaoAlunos).toHaveBeenLastCalledWith(
        expect.objectContaining({ busca: 'Ana', situacao: 'pendente' })
      )
    );
  });

  it('expõe o erro da API', async () => {
    const falha = new AxiosError('x');

    falha.response = { status: 500, data: { detail: 'Falha no servidor' } } as never;
    (listarGestaoAlunos as jest.Mock).mockRejectedValue(falha);

    const { result } = await renderHook(() => useRecepcaoAlunos());

    await waitFor(() => expect(result.current.erro).toBe('Falha no servidor'));
    expect(result.current.alunos).toEqual([]);
  });
});

describe('useGestaoAprovacao', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  /** Executa o botão de um alerta de confirmação, como o usuário faria. */
  function confirmar(estilo: 'default' | 'destructive') {
    const chamadas = (mostrarAlerta as jest.Mock).mock.calls;
    const botoes = chamadas[chamadas.length - 1][2] as { style?: string; onPress?: () => void }[];

    return botoes.find((b) => (b.style ?? 'default') === estilo)?.onPress?.();
  }

  it('aprovar só chama a API depois da confirmação e recarrega', async () => {
    (aprovarAluno as jest.Mock).mockResolvedValue({});

    const aoConcluir = jest.fn();
    const { result } = await renderHook(() => useGestaoAprovacao(aoConcluir));

    await act(async () => result.current.aprovar({ id: 7, nome: 'Ana' }));
    expect(aprovarAluno).not.toHaveBeenCalled();

    await act(async () => {
      await confirmar('default');
    });

    expect(aprovarAluno).toHaveBeenCalledWith(7);
    expect(aoConcluir).toHaveBeenCalled();
  });

  it('recusar usa botão destrutivo e a rota de recusa', async () => {
    (recusarAluno as jest.Mock).mockResolvedValue({});

    const { result } = await renderHook(() => useGestaoAprovacao());

    await act(async () => result.current.recusar({ id: 7, nome: 'Ana' }));
    await act(async () => {
      await confirmar('destructive');
    });

    expect(recusarAluno).toHaveBeenCalledWith(7);
  });

  it('erro do servidor (409) aparece em alerta e não recarrega', async () => {
    const conflito = new AxiosError('x');

    conflito.response = { status: 409, data: { detail: 'Cadastro não está pendente' } } as never;
    (aprovarAluno as jest.Mock).mockRejectedValue(conflito);

    const aoConcluir = jest.fn();
    const { result } = await renderHook(() => useGestaoAprovacao(aoConcluir));

    await act(async () => result.current.aprovar({ id: 7, nome: 'Ana' }));
    await act(async () => {
      await confirmar('default');
    });

    expect(mostrarAlerta).toHaveBeenLastCalledWith('Erro', 'Cadastro não está pendente');
    expect(aoConcluir).not.toHaveBeenCalled();
  });
});
