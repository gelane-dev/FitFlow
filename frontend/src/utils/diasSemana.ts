import { DiaSemana } from '@/types/ficha.types';

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

/** "terça" → "Terça". */
export function rotuloDiaCompleto(dia: string): string {
  return dia.charAt(0).toUpperCase() + dia.slice(1);
}

/** "Treino de Segunda" (ou só "Treino" enquanto o dia não carregou). */
export function tituloTelaTreino(dia?: DiaSemana | null): string {
  return dia ? `Treino de ${rotuloDiaCompleto(dia)}` : 'Treino';
}

/** "Ana Demo · Hipertrofia - ciclo 1". */
export function subtituloTreino(alunoNome: string, fichaNome: string): string {
  return `${alunoNome} · ${fichaNome}`;
}
