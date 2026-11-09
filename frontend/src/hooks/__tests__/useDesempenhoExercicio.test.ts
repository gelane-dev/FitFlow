import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useDesempenhoExercicio } from '@/hooks/useDesempenhoExercicio';
import { api } from '@/services/api';
import { buscarMinhaEvolucao } from '@/services/evolucao.service';
import { EvolucaoExercicio, PeriodoEvolucao } from '@/types/evolucao.types';

jest.mock('@/services/evolucao.service');
jest.mock('@/services/api', () => ({ api: { get: jest.fn() } }));

const buscar = buscarMinhaEvolucao as jest.Mock;

function evolucao(exercicioId: number, periodo: PeriodoEvolucao | null): EvolucaoExercicio {
  return { exercicio_id: exercicioId, nome: `Ex ${exercicioId}`, periodo, pontos: [], comparacao: null };
}

function pendente() {
  let resolver!: (valor: EvolucaoExercicio) => void;
  let rejeitar!: (erro: unknown) => void;
  const promessa = new Promise<EvolucaoExercicio>((res, rej) => {
    resolver = res;
    rejeitar = rej;
  });

  return { promessa, resolver, rejeitar };
}

beforeEach(() => buscar.mockReset());

describe('useDesempenhoExercicio', () => {
  it('carrega o exercício no período escolhido', async () => {
    buscar.mockResolvedValueOnce(evolucao(1, '30d'));

    const { result } = await renderHook(() => useDesempenhoExercicio(1, '30d'));

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(buscar).toHaveBeenCalledWith(1, '30d');
    expect(result.current.evolucao?.exercicio_id).toBe(1);
    expect(result.current.erro).toBeNull();
  });

  it('sem exercício, não chama a API nem fica carregando', async () => {
    const { result } = await renderHook(() => useDesempenhoExercicio(null, null));

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(buscar).not.toHaveBeenCalled();
    expect(result.current.evolucao).toBeNull();
  });

  it('troca rápida de filtro: a resposta antiga chega depois e é descartada', async () => {
    const antiga = pendente();
    const nova = pendente();

    buscar.mockReturnValueOnce(antiga.promessa).mockReturnValueOnce(nova.promessa);

    const { result, rerender } = await renderHook(
      ({ periodo }: { periodo: PeriodoEvolucao | null }) => useDesempenhoExercicio(1, periodo),
      { initialProps: { periodo: '7d' as PeriodoEvolucao | null } }
    );

    await rerender({ periodo: '1a' });
    expect(buscar).toHaveBeenCalledTimes(2);

    // A segunda (atual) responde primeiro; depois a primeira (obsoleta) chega atrasada.
    await act(async () => nova.resolver(evolucao(1, '1a')));
    await act(async () => antiga.resolver(evolucao(1, '7d')));

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.evolucao?.periodo).toBe('1a');
  });

  it('erro da resposta antiga não derruba a tela do filtro novo', async () => {
    const antiga = pendente();
    const nova = pendente();

    buscar.mockReturnValueOnce(antiga.promessa).mockReturnValueOnce(nova.promessa);

    const { result, rerender } = await renderHook(
      ({ id }: { id: number }) => useDesempenhoExercicio(id, null),
      { initialProps: { id: 1 } }
    );

    await rerender({ id: 2 });
    await act(async () => antiga.rejeitar(new Error('falhou')));
    await act(async () => nova.resolver(evolucao(2, null)));

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.erro).toBeNull();
    expect(result.current.evolucao?.exercicio_id).toBe(2);
  });

  it('ao trocar de filtro, some com os dados do filtro antigo enquanto carrega', async () => {
    const segunda = pendente();

    buscar.mockResolvedValueOnce(evolucao(1, null)).mockReturnValueOnce(segunda.promessa);

    const { result, rerender } = await renderHook(
      ({ id }: { id: number }) => useDesempenhoExercicio(id, null),
      { initialProps: { id: 1 } }
    );

    await waitFor(() => expect(result.current.evolucao?.exercicio_id).toBe(1));
    await rerender({ id: 2 });

    await waitFor(() => expect(result.current.carregando).toBe(true));
    expect(result.current.evolucao).toBeNull();
  });

  it('no primeiro render após trocar o filtro, não devolve o dado do filtro antigo', async () => {
    buscar.mockResolvedValueOnce(evolucao(1, '7d')).mockReturnValueOnce(pendente().promessa);

    const { result, rerender } = await renderHook(
      ({ periodo }: { periodo: PeriodoEvolucao | null }) => useDesempenhoExercicio(1, periodo),
      { initialProps: { periodo: '7d' as PeriodoEvolucao | null } }
    );

    await waitFor(() => expect(result.current.evolucao?.periodo).toBe('7d'));

    const vistos: { periodo: unknown; carregando: boolean }[] = [];

    await rerender({ periodo: '30d' });
    await waitFor(() => expect(result.current.carregando).toBe(true));
    vistos.push({ periodo: result.current.evolucao?.periodo, carregando: result.current.carregando });

    expect(vistos[0]).toEqual({ periodo: undefined, carregando: true });
  });

  it('o render síncrono com filtro novo já vem sem dados e carregando (sem frame com dado antigo)', async () => {
    buscar.mockResolvedValueOnce(evolucao(1, null)).mockReturnValueOnce(pendente().promessa);

    const renders: { id: number | undefined; carregando: boolean }[] = [];
    const { result, rerender } = await renderHook(
      ({ id }: { id: number }) => {
        const estado = useDesempenhoExercicio(id, null);

        renders.push({ id: estado.evolucao?.exercicio_id, carregando: estado.carregando });

        return estado;
      },
      { initialProps: { id: 1 } }
    );

    await waitFor(() => expect(result.current.evolucao?.exercicio_id).toBe(1));
    renders.length = 0;
    await rerender({ id: 2 });

    // Nenhum render do exercício 2 pode exibir o dado do exercício 1.
    expect(renders.length).toBeGreaterThan(0);
    expect(renders.every((r) => r.id !== 1)).toBe(true);
    expect(renders[0].carregando).toBe(true);
  });

  it('erro da API vira mensagem e "tentar novamente" recarrega', async () => {
    buscar.mockRejectedValueOnce(new Error('rede')).mockResolvedValueOnce(evolucao(1, null));

    const { result } = await renderHook(() => useDesempenhoExercicio(1, null));

    await waitFor(() => expect(result.current.erro).not.toBeNull());
    expect(result.current.evolucao).toBeNull();
    expect(result.current.carregando).toBe(false);

    await act(async () => {
      await result.current.recarregar();
    });

    expect(result.current.erro).toBeNull();
    expect(result.current.evolucao?.exercicio_id).toBe(1);
  });
});

describe('buscarMinhaEvolucao (service)', () => {
  const real = jest.requireActual('@/services/evolucao.service') as typeof import('@/services/evolucao.service');
  const get = api.get as jest.Mock;

  beforeEach(() => get.mockReset().mockResolvedValue({ data: {} }));

  it('sem período mantém a chamada de antes, sem parâmetros', async () => {
    await real.buscarMinhaEvolucao(7);

    expect(get).toHaveBeenCalledWith('/evolucao/exercicios/7');
  });

  it('com período envia ?periodo=', async () => {
    await real.buscarMinhaEvolucao(7, '3m');

    expect(get).toHaveBeenCalledWith('/evolucao/exercicios/7', { params: { periodo: '3m' } });
  });

  it('período null (tudo) também não envia parâmetro', async () => {
    await real.buscarMinhaEvolucao(7, null);

    expect(get).toHaveBeenCalledWith('/evolucao/exercicios/7');
  });
});
