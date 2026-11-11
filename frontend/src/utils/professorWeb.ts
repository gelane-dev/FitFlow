import { AvaliacaoCriar, AvaliacaoResposta } from '@/types/avaliacao.types';
import { FrequenciaAluno } from '@/types/professorWeb.types';
import { formatarData, lerInstante } from '@/utils/datas';
import { PontoGrafico } from '@/utils/graficoLinha';
import { lerNumero } from '@/utils/vigencia';

/** Funções puras das telas web do professor: circunferências, frequência, datas do dashboard. */

export type ChaveMedida =
  | 'cintura'
  | 'quadril'
  | 'abdomen'
  | 'peito'
  | 'braco_direito'
  | 'braco_esquerdo'
  | 'coxa_direita'
  | 'coxa_esquerda'
  | 'panturrilha';

export interface DefinicaoMedida {
  chave: ChaveMedida;
  rotulo: string;
}

/** As 9 circunferências opcionais da avaliação (cm), na ordem de exibição. */
export const MEDIDAS_CORPORAIS: DefinicaoMedida[] = [
  { chave: 'cintura', rotulo: 'Cintura' },
  { chave: 'quadril', rotulo: 'Quadril' },
  { chave: 'abdomen', rotulo: 'Abdômen' },
  { chave: 'peito', rotulo: 'Peito' },
  { chave: 'braco_direito', rotulo: 'Braço direito' },
  { chave: 'braco_esquerdo', rotulo: 'Braço esquerdo' },
  { chave: 'coxa_direita', rotulo: 'Coxa direita' },
  { chave: 'coxa_esquerda', rotulo: 'Coxa esquerda' },
  { chave: 'panturrilha', rotulo: 'Panturrilha' },
];

export const LIMITE_MEDIDA_CM = 300;

/** Texto digitado de cada circunferência (vazio = não medida). */
export type CamposMedidas = Record<ChaveMedida, string>;

export function medidasVazias(): CamposMedidas {
  return Object.fromEntries(MEDIDAS_CORPORAIS.map((m) => [m.chave, ''])) as CamposMedidas;
}

export function medidasDaAvaliacao(avaliacao: AvaliacaoResposta): CamposMedidas {
  const campos = medidasVazias();

  for (const { chave } of MEDIDAS_CORPORAIS) {
    const valor = avaliacao[chave];

    campos[chave] = valor == null ? '' : String(valor);
  }

  return campos;
}

/** Erros por medida: vazio é aceito; preenchida precisa estar entre 0 (exclusive) e 300 cm. */
export function errosMedidas(campos: CamposMedidas): Partial<Record<ChaveMedida, string>> {
  const erros: Partial<Record<ChaveMedida, string>> = {};

  for (const { chave, rotulo } of MEDIDAS_CORPORAIS) {
    const texto = campos[chave].trim();

    if (texto === '') {
      continue;
    }

    const valor = lerNumero(texto);

    if (!(valor > 0 && valor <= LIMITE_MEDIDA_CM)) {
      erros[chave] = `${rotulo}: informe entre 0 e ${LIMITE_MEDIDA_CM} cm.`;
    }
  }

  return erros;
}

/** Circunferências no formato da API (`null` quando não medida). Presume campos já validados. */
export function medidasParaApi(
  campos: CamposMedidas
): Pick<AvaliacaoCriar, ChaveMedida> {
  const saida = {} as Pick<AvaliacaoCriar, ChaveMedida>;

  for (const { chave } of MEDIDAS_CORPORAIS) {
    const texto = campos[chave].trim();

    saida[chave] = texto === '' ? null : lerNumero(texto);
  }

  return saida;
}

/** Medidas preenchidas da avaliação, para o detalhe ("Cintura · 82 cm"). */
export function medidasPreenchidas(
  avaliacao: AvaliacaoResposta
): { chave: ChaveMedida; rotulo: string; valor: number }[] {
  return MEDIDAS_CORPORAIS.flatMap(({ chave, rotulo }) => {
    const valor = avaliacao[chave];

    return valor == null ? [] : [{ chave, rotulo, valor }];
  });
}

/** Pontos (data crescente) de uma circunferência, ignorando avaliações sem a medida. */
export function pontosDaMedida(avaliacoes: AvaliacaoResposta[], chave: ChaveMedida): PontoGrafico[] {
  return avaliacoes
    .flatMap((a) => {
      const valor = a[chave];

      return valor == null ? [] : [{ data: a.data_avaliacao, valor }];
    })
    .sort((a, b) => lerInstante(a.data) - lerInstante(b.data));
}

/** Medidas que têm ao menos um registro. */
export function medidasComDados(avaliacoes: AvaliacaoResposta[]): ChaveMedida[] {
  return MEDIDAS_CORPORAIS.filter(({ chave }) => avaliacoes.some((a) => a[chave] != null)).map(
    (m) => m.chave
  );
}

// ---------- Frequência ----------

/** "2026-11-02" -> "02/11". */
export function rotuloSemana(semanaInicio: string): string {
  return formatarData(semanaInicio).slice(0, 5);
}

export function dadosFrequencia(frequencia: FrequenciaAluno): { rotulo: string; valor: number }[] {
  return [...frequencia.entradas_por_semana]
    .sort((a, b) => a.semana_inicio.localeCompare(b.semana_inicio))
    .map((s) => ({ rotulo: rotuloSemana(s.semana_inicio), valor: s.total }));
}

/** Média de entradas por semana no período (1 casa decimal), 0 sem semanas. */
export function mediaSemanal(frequencia: FrequenciaAluno): number {
  const semanas = frequencia.entradas_por_semana.length;

  return semanas === 0 ? 0 : Math.round((frequencia.total_periodo / semanas) * 10) / 10;
}

/** "10/11/2026 às 14:30" a partir de um datetime da API (com offset). */
export function formatarDataHora(iso: string | null | undefined): string {
  if (!iso) {
    return '—';
  }

  const hora = iso.length >= 16 ? iso.slice(11, 16) : '';

  return hora ? `${formatarData(iso)} às ${hora}` : formatarData(iso);
}

export const PERIODOS_FREQUENCIA = [
  { meses: 1, rotulo: '1 mês' },
  { meses: 3, rotulo: '3 meses' },
  { meses: 6, rotulo: '6 meses' },
] as const;

// ---------- Exercícios ----------

/**
 * O professor pode editar/excluir o exercício? Biblioteca (sem dono) e os próprios, sim; de outro
 * professor, não (o backend responde 403 de qualquer forma). Sem o id do professor, só a biblioteca.
 */
export function podeEditarExercicio(
  exercicio: { criado_por_professor_id?: number | null },
  professorId: number | null
): boolean {
  const dono = exercicio.criado_por_professor_id ?? null;

  return dono === null || (professorId !== null && dono === professorId);
}

/** "Biblioteca", "Meu exercício" ou "Outro professor". */
export function rotuloOrigemExercicio(
  exercicio: { criado_por_professor_id?: number | null },
  professorId: number | null
): string {
  const dono = exercicio.criado_por_professor_id ?? null;

  if (dono === null) {
    return 'Biblioteca';
  }

  return dono === professorId ? 'Meu exercício' : 'Outro professor';
}
