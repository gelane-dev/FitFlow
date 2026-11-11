import { completarHorarios, horaValida, mascararHora, prepararHorariosParaSalvar, validarHorarios } from '../horarios';

describe('horarios', () => {
  it('máscara de hora', () => {
    expect(mascararHora('0630')).toBe('06:30');
    expect(mascararHora('6')).toBe('6');
    expect(mascararHora('06:3a0')).toBe('06:30');
  });

  it('valida HH:MM', () => {
    expect(horaValida('06:00')).toBe(true);
    expect(horaValida('24:00')).toBe(false);
    expect(horaValida('6:00')).toBe(false);
  });

  it('completa os 7 dias; dias ausentes ficam fechados', () => {
    const lista = completarHorarios([{ dia: 'terça', abre: '06:00', fecha: '22:00', fechado: false }]);

    expect(lista).toHaveLength(7);
    expect(lista[0]).toEqual({ dia: 'segunda', abre: '', fecha: '', fechado: true });
    expect(lista[1].fechado).toBe(false);
    expect(lista[5].dia).toBe('sábado');
  });

  it('completa mesmo com lista vazia ou nula', () => {
    expect(completarHorarios([])).toHaveLength(7);
    expect(completarHorarios(null)).toHaveLength(7);
  });

  it('valida só os dias abertos', () => {
    const lista = completarHorarios([
      { dia: 'segunda', abre: '22:00', fecha: '06:00', fechado: false },
      { dia: 'terça', abre: '07:00', fecha: '', fechado: false },
      { dia: 'quarta', abre: '06:00', fecha: '22:00', fechado: false },
    ]);

    const erros = validarHorarios(lista);

    expect(Object.keys(erros).sort()).toEqual(['segunda', 'terça']);
  });

  it('dia fechado leva 00:00 quando sem horário', () => {
    const [segunda] = prepararHorariosParaSalvar(completarHorarios([]));

    expect(segunda).toEqual({ dia: 'segunda', abre: '00:00', fecha: '00:00', fechado: true });
  });
});
