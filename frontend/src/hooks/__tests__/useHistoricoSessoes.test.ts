import { act, renderHook, waitFor } from '@testing-library/react-native';

import { TAMANHO_PAGINA_HISTORICO, useHistoricoSessoes } from '@/hooks/useHistoricoSessoes';
import { listarMinhasSessoes } from '@/services/sessao.service';
import { SessaoResumo } from '@/types/sessao.types';

jest.mock('@/services/sessao.service');

const listar = listarMinhasSessoes as jest.Mock;

function sessao(id: number): SessaoResumo {
  return {
    id,
    treino_id: 1,
    treino_nome: 'A',
    ficha_id: 1,
    iniciada_em: '2026-10-30T08:00:00',
    finalizada_em: '2026-10-30T09:00:00',
    esforco: null,
    comentario: null,
    total_execucoes: 1,
    total_series: 3,
    volume_total: 100,
    duracao_segundos: 3600,
  };
}

function pagina(inicio: number, quantidade: number) {
  return Array.from({ length: quantidade }, (_, i) => sessao(inicio - i));
}

beforeEach(() => {
  listar.mockReset();
});

describe('useHistoricoSessoes (rolagem infinita)', () => {
  it('carrega a primeira página de 20 e indica que há mais', async () => {
    listar.mockResolvedValueOnce(pagina(100, TAMANHO_PAGINA_HISTORICO));

    const { result } = await renderHook(() => useHistoricoSessoes());

    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(listar).toHaveBeenCalledWith({ limite: 20, deslocamento: 0 });
    expect(result.current.sessoes).toHaveLength(20);
    expect(result.current.temMais).toBe(true);
  });

  it('página incompleta encerra: temMais = false e carregarMais não chama a API', async () => {
    listar.mockResolvedValueOnce(pagina(5, 5));

    const { result } = await renderHook(() => useHistoricoSessoes());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.temMais).toBe(false);

    await act(async () => {
      await result.current.carregarMais();
    });

    expect(listar).toHaveBeenCalledTimes(1);
  });

  it('carregarMais pede o próximo deslocamento e acrescenta sem duplicar', async () => {
    listar
      .mockResolvedValueOnce(pagina(100, 20))
      .mockResolvedValueOnce([sessao(81), ...pagina(80, 4)]); // 81 repete a última da página 1

    const { result } = await renderHook(() => useHistoricoSessoes());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(async () => {
      await result.current.carregarMais();
    });

    expect(listar).toHaveBeenLastCalledWith({ limite: 20, deslocamento: 20 });
    expect(result.current.sessoes).toHaveLength(24);
    expect(new Set(result.current.sessoes.map((s) => s.id)).size).toBe(24);
    expect(result.current.temMais).toBe(false);
  });

  it('falha ao carregar a primeira página expõe o erro', async () => {
    listar.mockRejectedValueOnce(new Error('x'));

    const { result } = await renderHook(() => useHistoricoSessoes());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.erro).toBe('Ocorreu um erro inesperado.');
    expect(result.current.sessoes).toEqual([]);
  });

  it('falha em carregarMais mantém a lista e expõe erroMais', async () => {
    listar.mockResolvedValueOnce(pagina(100, 20)).mockRejectedValueOnce(new Error('x'));

    const { result } = await renderHook(() => useHistoricoSessoes());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(async () => {
      await result.current.carregarMais();
    });

    expect(result.current.sessoes).toHaveLength(20);
    expect(result.current.erroMais).not.toBeNull();
    expect(result.current.erro).toBeNull();
  });

  it('recarregar volta à primeira página sem acender o esqueleto', async () => {
    listar.mockResolvedValueOnce(pagina(100, 20)).mockResolvedValueOnce(pagina(101, 20));

    const { result } = await renderHook(() => useHistoricoSessoes());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(async () => {
      await result.current.recarregar();
    });

    expect(result.current.carregando).toBe(false);
    expect(result.current.sessoes[0].id).toBe(101);
    expect(listar).toHaveBeenLastCalledWith({ limite: 20, deslocamento: 0 });
  });
});
