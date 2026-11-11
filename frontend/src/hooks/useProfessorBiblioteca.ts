import { useEffect, useMemo, useRef, useState } from 'react';

import { buscarExercicios } from '@/services/exercicio.service';
import { Exercicio, OrigemExercicio } from '@/types/exercicio.types';
import { mensagemErro } from '@/utils/erroApi';

import { useGestaoConsulta } from './useGestaoConsulta';

export const POR_PAGINA_BIBLIOTECA = 50;

interface Filtros {
  busca: string;
  origem: OrigemExercicio | null;
}

/**
 * Biblioteca de exercícios para o montador/lista: busca no servidor (nome e origem) com
 * paginação incremental. O filtro de grupo muscular é feito na tela, sobre o que já foi carregado.
 * Respostas antigas (busca anterior) são descartadas.
 */
export function useProfessorBiblioteca({ busca, origem }: Filtros) {
  const consulta = useGestaoConsulta(
    () => buscarExercicios(1, { busca: busca.trim() || undefined, origem: origem ?? undefined, limite: POR_PAGINA_BIBLIOTECA }),
    'Erro ao carregar exercícios.',
    [busca, origem]
  );
  const primeira = consulta.dados;

  // Páginas seguintes ficam atreladas à primeira página que as originou: nova busca => `base` muda e elas somem.
  const [extras, setExtras] = useState<{ base: typeof primeira; itens: Exercicio[]; pagina: number } | null>(null);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erroMais, setErroMais] = useState<string | null>(null);
  const baseAtual = useRef(primeira);

  useEffect(() => {
    baseAtual.current = primeira;
  });

  const validos = extras && extras.base === primeira ? extras : null;
  const pagina = validos?.pagina ?? primeira?.pagina ?? 0;
  const totalPaginas = primeira?.total_paginas ?? 0;
  const exercicios = useMemo(() => [...(primeira?.itens ?? []), ...(validos?.itens ?? [])], [primeira, validos]);

  async function carregarMais() {
    if (carregandoMais || consulta.carregando || !primeira || pagina >= totalPaginas) {
      return;
    }

    const base = primeira;

    try {
      setCarregandoMais(true);
      setErroMais(null);

      const dados = await buscarExercicios(pagina + 1, {
        busca: busca.trim() || undefined,
        origem: origem ?? undefined,
        limite: POR_PAGINA_BIBLIOTECA,
      });

      if (base !== baseAtual.current) {
        return;
      }

      setExtras((antigo) => ({
        base,
        itens: [...(antigo && antigo.base === base ? antigo.itens : []), ...dados.itens],
        pagina: dados.pagina,
      }));
    } catch (e) {
      setErroMais(mensagemErro(e, 'Erro ao carregar mais exercícios.'));
    } finally {
      setCarregandoMais(false);
    }
  }

  return {
    exercicios,
    total: primeira?.total ?? 0,
    carregando: consulta.carregando,
    carregandoMais,
    temMais: pagina < totalPaginas,
    erro: consulta.erro ?? erroMais,
    recarregar: consulta.recarregar,
    carregarMais,
  };
}
