import { useCallback, useEffect, useRef, useState } from 'react';

import { buscarMinhaEvolucao } from '@/services/evolucao.service';
import { EvolucaoExercicio, PeriodoEvolucao } from '@/types/evolucao.types';
import { mensagemErro } from '@/utils/erroApi';

/**
 * Evolução de um exercício num período. Ao trocar o exercício ou o período, a resposta da
 * chamada anterior é descartada (só a última requisição pode atualizar o estado), então
 * trocar de filtro rapidamente nunca mostra dados do filtro antigo.
 */
export function useDesempenhoExercicio(exercicioId: number | null, periodo: PeriodoEvolucao | null) {
  const chave = exercicioId === null ? null : `${exercicioId}|${periodo ?? 'tudo'}`;
  // Cada dado guarda o filtro a que pertence: no primeiro render após trocar de filtro (antes do
  // efeito rodar) o dado do filtro antigo é ignorado em vez de aparecer por um frame.
  const [dados, setDados] = useState<{ chave: string; evolucao: EvolucaoExercicio } | null>(null);
  const [carregandoEstado, setCarregando] = useState(exercicioId !== null);
  const [erroEstado, setErroEstado] = useState<{ chave: string; mensagem: string } | null>(null);
  const [resolvida, setResolvida] = useState<string | null>(null);
  const ultimaRequisicao = useRef(0);

  const invalidar = useCallback(() => {
    ultimaRequisicao.current++;
  }, []);

  const recarregar = useCallback(async () => {
    const requisicao = ++ultimaRequisicao.current;

    if (exercicioId === null) {
      setDados(null);
      setErroEstado(null);
      setCarregando(false);

      return;
    }

    const chaveRequisicao = `${exercicioId}|${periodo ?? 'tudo'}`;

    try {
      setCarregando(true);
      setErroEstado(null);

      const resposta = await buscarMinhaEvolucao(exercicioId, periodo);

      if (requisicao === ultimaRequisicao.current) {
        setDados({ chave: chaveRequisicao, evolucao: resposta });
      }
    } catch (e) {
      if (requisicao === ultimaRequisicao.current) {
        setErroEstado({
          chave: chaveRequisicao,
          mensagem: mensagemErro(e, 'Erro ao carregar o desempenho do exercício.'),
        });
      }
    } finally {
      if (requisicao === ultimaRequisicao.current) {
        setCarregando(false);
        setResolvida(chaveRequisicao);
      }
    }
  }, [exercicioId, periodo]);

  useEffect(() => {
    // Filtro novo: some com os dados do filtro antigo enquanto o novo carrega.
    setDados(null);
    recarregar();

    // Desmontagem ou novo filtro: invalida qualquer resposta ainda em voo.
    return invalidar;
  }, [recarregar, invalidar]);

  const evolucao = dados !== null && dados.chave === chave ? dados.evolucao : null;
  const erro = erroEstado !== null && erroEstado.chave === chave ? erroEstado.mensagem : null;
  // Filtro novo ainda sem resposta (inclusive o primeiro render, antes do efeito) conta como carregando.
  const carregando = carregandoEstado || (chave !== null && resolvida !== chave);

  return { evolucao, carregando, erro, recarregar };
}
