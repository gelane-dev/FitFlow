import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useRecepcaoPagamentos } from '@/hooks/useRecepcaoPagamentos';
import { listarPagamentos } from '@/services/pagamentos.service';

jest.mock('@/services/pagamentos.service');

describe('useRecepcaoPagamentos', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (listarPagamentos as jest.Mock).mockResolvedValue({ itens: [], total: 0, pagina: 1, por_pagina: 20 });
  });

  it('filtro de status vira o parâmetro status', async () => {
    const { result } = await renderHook(() => useRecepcaoPagamentos());

    await waitFor(() => expect(result.current.carregando).toBe(false));
    await act(async () => result.current.setFiltro('pendente'));
    await waitFor(() =>
      expect(listarPagamentos).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'pendente', inadimplentes: undefined })
      )
    );
  });

  it('inadimplentes usa o parâmetro próprio, sem status', async () => {
    const { result } = await renderHook(() => useRecepcaoPagamentos());

    await act(async () => result.current.setFiltro('inadimplentes'));
    await waitFor(() =>
      expect(listarPagamentos).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: undefined, inadimplentes: true })
      )
    );
  });

  it('período em DD/MM/AAAA vira ISO; período invertido não consulta', async () => {
    const { result } = await renderHook(() => useRecepcaoPagamentos());

    await act(async () => result.current.setInicio('01/11/2026'));
    await act(async () => result.current.setFim('09/11/2026'));
    await waitFor(() =>
      expect(listarPagamentos).toHaveBeenLastCalledWith(
        expect.objectContaining({ inicio: '2026-11-01', fim: '2026-11-09' })
      )
    );

    const chamadas = (listarPagamentos as jest.Mock).mock.calls.length;

    await act(async () => result.current.setInicio('20/11/2026'));
    await waitFor(() => expect(result.current.periodoInvalido).toBe(true));
    expect((listarPagamentos as jest.Mock).mock.calls.length).toBe(chamadas);
  });
});
