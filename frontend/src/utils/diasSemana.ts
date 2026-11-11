import { DIAS_SEMANA, DiaSemana } from '@/types/ficha.types';

const ABREVIACOES: Record<DiaSemana, string> = {
  segunda: 'Seg',
  terça: 'Ter',
  quarta: 'Qua',
  quinta: 'Qui',
  sexta: 'Sex',
  sábado: 'Sáb',
  domingo: 'Dom',
};

/** "sábado" → "Sáb". O valor enviado à API continua sendo o dia completo. */
export function rotuloDiaCurto(dia: DiaSemana): string {
  return ABREVIACOES[dia];
}

/** Rótulo do treino cujo `dia_semana` é nulo (divisão A/B/C sem dia fixo). */
export const ROTULO_SEM_DIA_FIXO = 'Sem dia fixo';

/** "terça" → "Terça"; sem dia (`null`) → "Sem dia fixo". */
export function rotuloDiaCompleto(dia: string | null | undefined): string {
  if (!dia) {
    return ROTULO_SEM_DIA_FIXO;
  }

  return dia.charAt(0).toUpperCase() + dia.slice(1);
}

/** "Treino de Segunda", "Treino · Sem dia fixo" (`null`) ou só "Treino" enquanto o dia não carregou. */
export function tituloTelaTreino(dia?: DiaSemana | null): string {
  if (dia === null) {
    return `Treino · ${ROTULO_SEM_DIA_FIXO}`;
  }

  return dia ? `Treino de ${rotuloDiaCompleto(dia)}` : 'Treino';
}

/**
 * Dia vindo de um parâmetro de rota ("segunda"...). Vazio ou inválido = `null` (sem dia fixo):
 * nunca inventa um dia, para não trocar a divisão A/B/C do treino em silêncio ao editar.
 */
export function diaDoParametro(texto: string | null | undefined): DiaSemana | null {
  return DIAS_SEMANA.find((dia) => dia === texto) ?? null;
}

/** "Ana Demo · Hipertrofia - ciclo 1". */
export function subtituloTreino(alunoNome: string, fichaNome: string): string {
  return `${alunoNome} · ${fichaNome}`;
}
