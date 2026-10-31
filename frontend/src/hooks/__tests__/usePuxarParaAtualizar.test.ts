import { act, renderHook } from '@testing-library/react-native';

import { usePuxarParaAtualizar } from '@/hooks/usePuxarParaAtualizar';

describe('usePuxarParaAtualizar', () => {
  it('liga atualizando só durante a recarga', async () => {
    let terminar: () => void = () => undefined;
    const recarregar = jest.fn(
      () => new Promise<void>((resolve) => (terminar = resolve))
    );
    const { result } = await renderHook(() => usePuxarParaAtualizar(recarregar));

    expect(result.current.atualizando).toBe(false);

    let promessa: Promise<void> = Promise.resolve();
    await act(async () => {
      promessa = result.current.aoAtualizar();
    });

    expect(recarregar).toHaveBeenCalledTimes(1);
    expect(result.current.atualizando).toBe(true);

    await act(async () => {
      terminar();
      await promessa;
    });

    expect(result.current.atualizando).toBe(false);
  });

  it('desliga atualizando mesmo se a recarga falhar', async () => {
    const recarregar = jest.fn(() => Promise.reject(new Error('falhou')));
    const { result } = await renderHook(() => usePuxarParaAtualizar(recarregar));

    await act(async () => {
      await result.current.aoAtualizar().catch(() => undefined);
    });

    expect(result.current.atualizando).toBe(false);
  });
});
