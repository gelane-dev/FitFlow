import { AxiosError } from 'axios';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useProfessorBiblioteca } from '@/hooks/useProfessorBiblioteca';
import { useProfessorDashboard } from '@/hooks/useProfessorDashboard';
import { useProfessorFrequencia } from '@/hooks/useProfessorFrequencia';
import { useProfessorVersoes } from '@/hooks/useProfessorVersoes';
import { buscarExercicios } from '@/services/exercicio.service';
import { buscarVersaoFicha, listarVersoesFicha } from '@/services/ficha.service';
import { buscarDashboardProfessor, buscarFrequenciaAluno } from '@/services/paineis.service';

jest.mock('@/services/paineis.service', () => ({ buscarDashboardProfessor: jest.fn(), buscarFrequenciaAluno: jest.fn() }));
jest.mock('@/services/ficha.service', () => ({ listarVersoesFicha: jest.fn(), buscarVersaoFicha: jest.fn() }));
jest.mock('@/services/exercicio.service', () => ({ buscarExercicios: jest.fn() }));

const mock = (fn: unknown) => fn as jest.Mock;

/** Erro de API sem `detail`: o hook cai na mensagem padrão. */
function erroApi() {
  const e = new AxiosError('falhou');

  e.response = { status: 500, data: {} } as never;

  return e;
}

beforeEach(() => {
  jest.resetAllMocks();
});

describe('useProfessorDashboard', () => {
  it('carrega o painel e devolve o formato antigo', async () => {
    mock(buscarDashboardProfessor).mockResolvedValue({ total_alunos: 3 });

    const { result } = await renderHook(() => useProfessorDashboard());

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.dashboard).toEqual({ total_alunos: 3 });
    expect(result.current.erro).toBeNull();
  });

  it('usa a mensagem padrão no erro e se recupera ao recarregar', async () => {
    mock(buscarDashboardProfessor).mockRejectedValueOnce(erroApi()).mockResolvedValueOnce({ total_alunos: 1 });

    const { result } = await renderHook(() => useProfessorDashboard());

    await waitFor(() => expect(result.current.erro).toBe('Erro ao carregar o painel.'));
    await act(async () => {
      await result.current.recarregar();
    });
    expect(result.current.erro).toBeNull();
    expect(result.current.dashboard).toEqual({ total_alunos: 1 });
  });
});

describe('useProfessorFrequencia', () => {
  it('recarrega ao trocar o período e descarta a resposta antiga', async () => {
    let resolverAntiga!: (v: unknown) => void;

    mock(buscarFrequenciaAluno)
      .mockImplementationOnce(() => new Promise((r) => (resolverAntiga = r)))
      .mockResolvedValueOnce({ total_periodo: 12 });

    const { result, rerender } = await renderHook(({ meses }: { meses: number }) => useProfessorFrequencia(5, meses), {
      initialProps: { meses: 3 },
    });

    await rerender({ meses: 6 });
    await waitFor(() => expect(result.current.frequencia).toEqual({ total_periodo: 12 }));

    await act(async () => resolverAntiga({ total_periodo: 1 }));
    expect(result.current.frequencia).toEqual({ total_periodo: 12 });
    expect(buscarFrequenciaAluno).toHaveBeenLastCalledWith(5, 6);
  });

  it('mensagem padrão de erro', async () => {
    mock(buscarFrequenciaAluno).mockRejectedValue(erroApi());

    const { result } = await renderHook(() => useProfessorFrequencia(5, 6));

    await waitFor(() => expect(result.current.erro).toBe('Erro ao carregar a frequência.'));
  });
});

describe('useProfessorVersoes', () => {
  it('ordena da versão mais nova para a mais antiga e abre/fecha uma versão', async () => {
    mock(listarVersoesFicha).mockResolvedValue([{ numero: 1 }, { numero: 3 }, { numero: 2 }]);
    mock(buscarVersaoFicha).mockResolvedValue({ numero: 3, treinos: [] });

    const { result } = await renderHook(() => useProfessorVersoes(9));

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.versoes.map((v) => v.numero)).toEqual([3, 2, 1]);

    await act(async () => {
      await result.current.abrir(3);
    });
    expect(result.current.numeroAberto).toBe(3);
    expect(result.current.versao).toEqual({ numero: 3, treinos: [] });

    await act(async () => result.current.fechar());
    expect(result.current.numeroAberto).toBeNull();
    expect(result.current.versao).toBeNull();
  });

  it('erro na lista e na versão usam mensagens próprias', async () => {
    mock(listarVersoesFicha).mockRejectedValue(erroApi());
    mock(buscarVersaoFicha).mockRejectedValue(erroApi());

    const { result } = await renderHook(() => useProfessorVersoes(9));

    await waitFor(() => expect(result.current.erro).toBe('Erro ao carregar as versões.'));
    expect(result.current.versoes).toEqual([]);

    await act(async () => {
      await result.current.abrir(1);
    });
    expect(result.current.erroVersao).toBe('Erro ao carregar a versão.');
  });
});

describe('useProfessorBiblioteca', () => {
  const ex = (id: number) => ({ id, nome: `Ex ${id}` });
  const pagina = (n: number, ids: number[]) => ({ itens: ids.map(ex), pagina: n, total_paginas: 2, total: 3 });

  it('carrega a primeira página e acrescenta a seguinte em carregarMais', async () => {
    mock(buscarExercicios).mockResolvedValueOnce(pagina(1, [1, 2])).mockResolvedValueOnce(pagina(2, [3]));

    const { result } = await renderHook(() => useProfessorBiblioteca({ busca: '', origem: null }));

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.exercicios.map((e) => e.id)).toEqual([1, 2]);
    expect(result.current.temMais).toBe(true);
    expect(result.current.total).toBe(3);

    await act(async () => {
      await result.current.carregarMais();
    });
    expect(result.current.exercicios.map((e) => e.id)).toEqual([1, 2, 3]);
    expect(result.current.temMais).toBe(false);
    expect(buscarExercicios).toHaveBeenLastCalledWith(2, { busca: undefined, origem: undefined, limite: 50 });
  });

  it('nova busca descarta as páginas acrescentadas', async () => {
    mock(buscarExercicios)
      .mockResolvedValueOnce(pagina(1, [1, 2]))
      .mockResolvedValueOnce(pagina(2, [3]))
      .mockResolvedValueOnce({ itens: [ex(9)], pagina: 1, total_paginas: 1, total: 1 });

    const { result, rerender } = await renderHook(({ busca }: { busca: string }) => useProfessorBiblioteca({ busca, origem: null }), {
      initialProps: { busca: '' },
    });

    await waitFor(() => expect(result.current.carregando).toBe(false));
    await act(async () => {
      await result.current.carregarMais();
    });

    await rerender({ busca: 'supino' });
    await waitFor(() => expect(result.current.exercicios.map((e) => e.id)).toEqual([9]));
    expect(result.current.temMais).toBe(false);
  });

  it('erro na primeira página', async () => {
    mock(buscarExercicios).mockRejectedValueOnce(erroApi());

    const { result } = await renderHook(() => useProfessorBiblioteca({ busca: '', origem: null }));

    await waitFor(() => expect(result.current.erro).toBe('Erro ao carregar exercícios.'));
  });

  it('erro ao carregar mais mantém a lista e mostra a mensagem', async () => {
    mock(buscarExercicios).mockResolvedValueOnce(pagina(1, [1, 2])).mockRejectedValueOnce(erroApi());

    const { result } = await renderHook(() => useProfessorBiblioteca({ busca: '', origem: null }));

    await waitFor(() => expect(result.current.carregando).toBe(false));
    await act(async () => {
      await result.current.carregarMais();
    });
    expect(result.current.erro).toBe('Erro ao carregar mais exercícios.');
    expect(result.current.exercicios).toHaveLength(2);
  });
});
