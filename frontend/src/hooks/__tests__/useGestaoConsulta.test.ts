import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AxiosError } from 'axios';

import { useGestaoConsulta } from '@/hooks/useGestaoConsulta';

function adiada<T>() {
  let resolver!: (v: T) => void;
  const promessa = new Promise<T>((r) => {
    resolver = r;
  });

  return { promessa, resolver };
}

describe('useGestaoConsulta', () => {
  it('carrega os dados', async () => {
    const { result } = await renderHook(() => useGestaoConsulta(() => Promise.resolve(['a']), 'falhou', []));

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.dados).toEqual(['a']);
    expect(result.current.erro).toBeNull();
  });

  it('mostra o detail da API e usa a mensagem padrão sem ele', async () => {
    const comDetalhe = new AxiosError('x');

    comDetalhe.response = { data: { detail: 'Permissão insuficiente' }, status: 403 } as never;

    const { result } = await renderHook(() =>
      useGestaoConsulta(() => Promise.reject(comDetalhe), 'Erro padrão', [])
    );

    await waitFor(() => expect(result.current.erro).toBe('Permissão insuficiente'));
  });

  it('descarta a resposta antiga quando os parâmetros mudam', async () => {
    const lenta = adiada<string>();
    const rapida = adiada<string>();

    const { result, rerender } = await renderHook(
      ({ termo }: { termo: string }) =>
        useGestaoConsulta(() => (termo === 'an' ? lenta.promessa : rapida.promessa), 'erro', [termo]),
      { initialProps: { termo: 'an' } }
    );

    await rerender({ termo: 'ana' });

    await act(async () => {
      rapida.resolver('resultado de ana');
    });
    await act(async () => {
      lenta.resolver('resultado antigo de an');
    });

    expect(result.current.dados).toBe('resultado de ana');
    expect(result.current.carregando).toBe(false);
  });

  it('sem função (desabilitado) limpa os dados e não chama nada', async () => {
    const { result } = await renderHook(() => useGestaoConsulta<string>(null, 'erro', []));

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.dados).toBeNull();
  });
});
