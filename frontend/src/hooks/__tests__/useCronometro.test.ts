import { act, renderHook } from '@testing-library/react-native';
import { Vibration } from 'react-native';

import { useCronometro } from '@/hooks/useCronometro';

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-10-30T10:00:00Z'));
  jest.spyOn(Vibration, 'vibrate').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

/** Avança em passos de 250ms (o intervalo do hook), um render por passo, como no app. */
async function avancar(ms: number) {
  for (let t = 0; t < ms; t += 250) {
    await act(async () => {
      jest.advanceTimersByTime(Math.min(250, ms - t));
    });
  }
}

describe('useCronometro', () => {
  it('começa parado', async () => {
    const { result } = await renderHook(() => useCronometro());

    expect(result.current.ativo).toBe(false);
    expect(result.current.pausado).toBe(false);
    expect(result.current.restante).toBe(0);
  });

  it('conta regressivamente após iniciar', async () => {
    const { result } = await renderHook(() => useCronometro());

    await act(async () => result.current.iniciar(30));
    expect(result.current.ativo).toBe(true);
    expect(result.current.restante).toBe(30);

    await avancar(10_000);
    expect(result.current.restante).toBe(20);
  });

  it('pausar congela o tempo e retomar continua do que restava', async () => {
    const { result } = await renderHook(() => useCronometro());

    await act(async () => result.current.iniciar(30));
    await avancar(10_000);
    await act(async () => result.current.pausar());

    expect(result.current.pausado).toBe(true);
    expect(result.current.restante).toBe(20);

    await avancar(60_000);
    expect(result.current.restante).toBe(20);

    await act(async () => result.current.retomar());
    expect(result.current.pausado).toBe(false);

    await avancar(5_000);
    expect(result.current.restante).toBe(15);
  });

  it('+15s aumenta o restante, rodando ou pausado', async () => {
    const { result } = await renderHook(() => useCronometro());

    await act(async () => result.current.iniciar(30));
    await avancar(10_000);
    await act(async () => result.current.adicionar(15));
    await avancar(250);
    expect(result.current.restante).toBe(35);

    await act(async () => result.current.pausar());
    await act(async () => result.current.adicionar(15));
    expect(result.current.restante).toBe(50);
  });

  it('ao terminar vibra uma vez e volta a parado', async () => {
    const { result } = await renderHook(() => useCronometro());

    await act(async () => result.current.iniciar(5));
    await avancar(4_000);
    expect(Vibration.vibrate).not.toHaveBeenCalled();
    expect(result.current.ativo).toBe(true);

    await avancar(1_500);
    expect(Vibration.vibrate).toHaveBeenCalledTimes(1);
    expect(result.current.ativo).toBe(false);
    expect(result.current.restante).toBe(0);

    await avancar(5_000);
    expect(Vibration.vibrate).toHaveBeenCalledTimes(1);
  });

  it('pular zera sem vibrar', async () => {
    const { result } = await renderHook(() => useCronometro());

    await act(async () => result.current.iniciar(30));
    await act(async () => result.current.pular());

    expect(result.current.ativo).toBe(false);
    await avancar(60_000);
    expect(Vibration.vibrate).not.toHaveBeenCalled();
  });

  it('pausado não vibra mesmo depois de passar o horário original', async () => {
    const { result } = await renderHook(() => useCronometro());

    await act(async () => result.current.iniciar(5));
    await avancar(2_000);
    await act(async () => result.current.pausar());
    await avancar(30_000);

    expect(Vibration.vibrate).not.toHaveBeenCalled();
    expect(result.current.restante).toBe(3);
  });
});
