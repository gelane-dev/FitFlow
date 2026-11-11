/** Horários de funcionamento da academia (formulário de configurações). Funções puras. */

import type { DiaHorario, HorarioFuncionamento } from '@/types/gestao.types';

/** Valores de `DiaSemana` do backend (com acento: `terça`, `sábado`). */
export const DIAS_HORARIO: { valor: DiaHorario; rotulo: string }[] = [
  { valor: 'segunda', rotulo: 'Segunda-feira' },
  { valor: 'terça', rotulo: 'Terça-feira' },
  { valor: 'quarta', rotulo: 'Quarta-feira' },
  { valor: 'quinta', rotulo: 'Quinta-feira' },
  { valor: 'sexta', rotulo: 'Sexta-feira' },
  { valor: 'sábado', rotulo: 'Sábado' },
  { valor: 'domingo', rotulo: 'Domingo' },
];

const HORA_VALIDA = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Digitação "0630" -> "06:30" (só dígitos, até 4). */
export function mascararHora(texto: string): string {
  const digitos = texto.replace(/\D/g, '').slice(0, 4);

  return digitos.length <= 2 ? digitos : `${digitos.slice(0, 2)}:${digitos.slice(2)}`;
}

export function horaValida(texto: string): boolean {
  return HORA_VALIDA.test(texto);
}

/**
 * Uma linha por dia da semana, na ordem de segunda a domingo. Dia sem registro vem fechado
 * (nada é inventado: o admin define o horário e salva).
 */
export function completarHorarios(salvos: HorarioFuncionamento[] | null | undefined): HorarioFuncionamento[] {
  return DIAS_HORARIO.map(({ valor }) => {
    const existente = (salvos ?? []).find((h) => h.dia === valor);

    return existente
      ? existente
      : { dia: valor, abre: '', fecha: '', fechado: true };
  });
}

/** Erro por dia (`dia` -> mensagem). Dia fechado não é validado. */
export function validarHorarios(horarios: HorarioFuncionamento[]): Record<string, string> {
  const erros: Record<string, string> = {};

  for (const h of horarios) {
    if (h.fechado) continue;

    if (!horaValida(h.abre) || !horaValida(h.fecha)) {
      erros[h.dia] = 'Use o formato HH:MM (ex.: 06:00).';
    } else if (h.abre >= h.fecha) {
      erros[h.dia] = 'A abertura precisa ser antes do fechamento.';
    }
  }

  return erros;
}

/** Fechado leva horários vazios para o valor padrão aceito pela API. */
export function prepararHorariosParaSalvar(horarios: HorarioFuncionamento[]): HorarioFuncionamento[] {
  return horarios.map((h) =>
    h.fechado ? { ...h, abre: HORA_VALIDA.test(h.abre) ? h.abre : '00:00', fecha: HORA_VALIDA.test(h.fecha) ? h.fecha : '00:00' } : h
  );
}
