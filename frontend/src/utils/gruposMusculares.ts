import { normalizar } from '@/utils/busca';

export interface GrupoMuscular {
  /** Forma normalizada (sem acento, minúscula): usada para filtrar. */
  chave: string;
  /** Texto exibido no chip. */
  rotulo: string;
}

function capitalizar(texto: string): string {
  const limpo = texto.trim();

  return limpo.charAt(0).toUpperCase() + limpo.slice(1);
}

function acentos(texto: string): number {
  return texto.length - normalizar(texto).length === 0
    ? (texto.match(/[^\u0000-\u007f]/g) ?? []).length
    : 0;
}

/**
 * Agrupa nomes que só diferem por caixa ou acento ("peito", "Peito", "PEITO"
 * viram um chip só). O rótulo é a variante com mais acentos (a mais "correta"),
 * capitalizada; em empate vale a primeira vista. Não altera os dados.
 */
export function agruparGruposMusculares(nomes: string[]): GrupoMuscular[] {
  const porChave = new Map<string, string>();

  for (const nome of nomes) {
    const chave = normalizar(nome);

    if (!chave) {
      continue;
    }

    const atual = porChave.get(chave);

    if (atual === undefined || acentos(nome) > acentos(atual)) {
      porChave.set(chave, nome);
    }
  }

  return Array.from(porChave, ([chave, nome]) => ({ chave, rotulo: capitalizar(nome) })).sort(
    (a, b) => a.rotulo.localeCompare(b.rotulo, 'pt-BR')
  );
}

/** O exercício pertence ao grupo (comparação sem caixa nem acento)? */
export function pertenceAoGrupo(grupoMuscular: string, chave: string): boolean {
  return normalizar(grupoMuscular) === chave;
}
