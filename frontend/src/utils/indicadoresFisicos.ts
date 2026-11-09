import { AvaliacaoResposta } from '@/types/avaliacao.types';

import { PontoGrafico } from './graficoLinha';
import { DirecaoFavoravel } from './variacaoEvolucao';

export type ChaveIndicador = 'peso' | 'percentual_gordura' | 'massa_muscular' | 'imc';

export interface IndicadorFisico {
  chave: ChaveIndicador;
  rotulo: string;
  /** Rótulo curto para o seletor segmentado. */
  rotuloCurto: string;
  unidade: string;
  direcao: DirecaoFavoravel;
}

/** Indicadores do contrato: um por gráfico, nunca duas unidades no mesmo eixo. */
export const INDICADORES_FISICOS: IndicadorFisico[] = [
  { chave: 'peso', rotulo: 'Peso', rotuloCurto: 'Peso', unidade: 'kg', direcao: 'neutra' },
  { chave: 'percentual_gordura', rotulo: 'Gordura', rotuloCurto: 'Gordura', unidade: '%', direcao: 'queda' },
  { chave: 'massa_muscular', rotulo: 'Massa muscular', rotuloCurto: 'Músculo', unidade: 'kg', direcao: 'alta' },
  { chave: 'imc', rotulo: 'IMC', rotuloCurto: 'IMC', unidade: '', direcao: 'neutra' },
];

export function indicadorPorChave(chave: ChaveIndicador): IndicadorFisico {
  return INDICADORES_FISICOS.find((i) => i.chave === chave) ?? INDICADORES_FISICOS[0];
}

/**
 * Pontos de um indicador em ordem crescente de data. Avaliações sem o indicador (`null`/ausente)
 * são ignoradas: nunca viram ponto nem zero.
 */
export function pontosDoIndicador(
  avaliacoes: AvaliacaoResposta[],
  chave: ChaveIndicador
): PontoGrafico[] {
  const pontos: PontoGrafico[] = [];

  // Ordem explícita (data, id): não depende da ordem em que a API entrega a lista.
  for (const avaliacao of [...avaliacoes].sort(compararAvaliacoes)) {
    const valor = avaliacao[chave];

    if (typeof valor === 'number' && Number.isFinite(valor)) {
      pontos.push({ data: avaliacao.data_avaliacao, valor });
    }
  }

  return pontos;
}

/** Ordem crescente por (data_avaliacao, id). */
function compararAvaliacoes(a: AvaliacaoResposta, b: AvaliacaoResposta): number {
  return a.data_avaliacao.localeCompare(b.data_avaliacao) || a.id - b.id;
}

/** As duas medições mais recentes que têm o indicador (`anterior` é `null` com uma só). */
export function ultimasDuasMedicoes(
  pontos: PontoGrafico[]
): { atual: PontoGrafico; anterior: PontoGrafico | null } | null {
  if (pontos.length === 0) {
    return null;
  }

  return { atual: pontos[pontos.length - 1], anterior: pontos[pontos.length - 2] ?? null };
}

/** Avaliações da mais recente para a mais antiga (não altera a lista recebida). */
export function avaliacoesRecentesPrimeiro(avaliacoes: AvaliacaoResposta[]): AvaliacaoResposta[] {
  return [...avaliacoes].sort((a, b) => compararAvaliacoes(b, a));
}
