import {
  adicionarSegundos,
  ativo,
  CRONOMETRO_PARADO,
  formatarTempo,
  iniciarCronometro,
  pausado,
  pausarCronometro,
  restanteMs,
  restanteSegundos,
  retomarCronometro,
  terminou,
} from '@/utils/cronometro';

describe('cronometro', () => {
  it('inicia com fim = agora + segundos e não aceita negativo', () => {
    expect(iniciarCronometro(60, 1000)).toEqual({
      fimEm: 61000,
      restantePausadoMs: null,
    });
    expect(iniciarCronometro(-5, 1000).fimEm).toBe(1000);
  });

  it('parado não está ativo nem pausado e restante é 0', () => {
    expect(ativo(CRONOMETRO_PARADO)).toBe(false);
    expect(pausado(CRONOMETRO_PARADO)).toBe(false);
    expect(restanteMs(CRONOMETRO_PARADO, 5000)).toBe(0);
  });

  it('calcula o restante e arredonda segundos para cima', () => {
    const estado = iniciarCronometro(10, 0);

    expect(restanteMs(estado, 2500)).toBe(7500);
    expect(restanteSegundos(estado, 2500)).toBe(8);
    expect(restanteSegundos(estado, 10000)).toBe(0);
    expect(restanteMs(estado, 99999)).toBe(0);
  });

  it('pausa guardando o restante e retoma a partir do novo agora', () => {
    const rodando = iniciarCronometro(30, 0);
    const emPausa = pausarCronometro(rodando, 10000);

    expect(emPausa).toEqual({ fimEm: null, restantePausadoMs: 20000 });
    expect(pausado(emPausa)).toBe(true);
    expect(ativo(emPausa)).toBe(true);
    // O tempo pausado não corre.
    expect(restanteMs(emPausa, 500000)).toBe(20000);

    expect(retomarCronometro(emPausa, 50000)).toEqual({
      fimEm: 70000,
      restantePausadoMs: null,
    });
  });

  it('pausar parado e retomar rodando não mudam nada', () => {
    const rodando = iniciarCronometro(30, 0);

    expect(pausarCronometro(CRONOMETRO_PARADO, 1)).toBe(CRONOMETRO_PARADO);
    expect(retomarCronometro(rodando, 1)).toBe(rodando);
  });

  it('adiciona segundos rodando e pausado; parado ignora', () => {
    expect(adicionarSegundos(iniciarCronometro(10, 0), 15).fimEm).toBe(25000);
    expect(
      adicionarSegundos({ fimEm: null, restantePausadoMs: 4000 }, 15)
        .restantePausadoMs
    ).toBe(19000);
    expect(adicionarSegundos(CRONOMETRO_PARADO, 15)).toBe(CRONOMETRO_PARADO);
  });

  it('terminou só quando rodando e o fim foi alcançado', () => {
    const estado = iniciarCronometro(5, 0);

    expect(terminou(estado, 4999)).toBe(false);
    expect(terminou(estado, 5000)).toBe(true);
    expect(terminou(pausarCronometro(estado, 1000), 999999)).toBe(false);
    expect(terminou(CRONOMETRO_PARADO, 999999)).toBe(false);
  });

  it('formata minutos:segundos', () => {
    expect(formatarTempo(75)).toBe('1:15');
    expect(formatarTempo(5)).toBe('0:05');
    expect(formatarTempo(600)).toBe('10:00');
    expect(formatarTempo(-3)).toBe('0:00');
    expect(formatarTempo(59.9)).toBe('0:59');
  });
});
