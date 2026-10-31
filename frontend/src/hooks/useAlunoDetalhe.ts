import { useCallback, useEffect, useState } from 'react';

import { buscarAluno, listarSessoesDoAluno } from '@/services/aluno.service';
import { listarAvaliacoesAluno } from '@/services/avaliacao.service';
import { listarEvolucaoDoAluno } from '@/services/evolucao.service';
import { buscarFichas } from '@/services/ficha.service';
import { AlunoDetalhe } from '@/types/aluno.types';
import { AvaliacaoResposta } from '@/types/avaliacao.types';
import { EvolucaoExercicioResumo } from '@/types/evolucao.types';
import { FichaLista } from '@/types/ficha.types';
import { SessaoResumo } from '@/types/sessao.types';
import { mensagemErro } from '@/utils/erroApi';

type NomeSecao = 'fichas' | 'sessoes' | 'evolucao' | 'avaliacoes';

interface Secao<T> {
  dados: T;
  erro: string | null;
}

function secao<T>(
  resultado: PromiseSettledResult<T>,
  vazio: T,
  padrao: string
): Secao<T> {
  return resultado.status === 'fulfilled'
    ? { dados: resultado.value, erro: null }
    : { dados: vazio, erro: mensagemErro(resultado.reason, padrao) };
}

/**
 * Carrega o aluno e suas seções. O aluno é obrigatório (erro = tela de erro);
 * as demais seções falham de forma independente.
 */
/** Uma seção do detalhe: dados, erro e se está recarregando só ela. */
export interface SecaoDetalhe<T> extends Secao<T> {
  carregando: boolean;
  recarregar: () => Promise<void>;
}

export function useAlunoDetalhe(alunoId: number) {
  const [aluno, setAluno] = useState<AlunoDetalhe | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [fichas, setFichas] = useState<Secao<FichaLista[]>>({ dados: [], erro: null });
  const [sessoes, setSessoes] = useState<Secao<SessaoResumo[]>>({ dados: [], erro: null });
  const [evolucao, setEvolucao] = useState<Secao<EvolucaoExercicioResumo[]>>({ dados: [], erro: null });
  const [avaliacoes, setAvaliacoes] = useState<Secao<AvaliacaoResposta[]>>({ dados: [], erro: null });
  const [secoesCarregando, setSecoesCarregando] = useState<Record<NomeSecao, boolean>>({
    fichas: false,
    sessoes: false,
    evolucao: false,
    avaliacoes: false,
  });

  /** Recarrega só uma seção (botão "Tentar novamente"), sem tocar nas outras. */
  const recarregarSecao = useCallback(
    async <T,>(
      nome: NomeSecao,
      buscar: () => Promise<T>,
      definir: (valor: Secao<T>) => void,
      vazio: T,
      padrao: string
    ) => {
      setSecoesCarregando((atual) => ({ ...atual, [nome]: true }));

      try {
        definir({ dados: await buscar(), erro: null });
      } catch (e) {
        definir({ dados: vazio, erro: mensagemErro(e, padrao) });
      } finally {
        setSecoesCarregando((atual) => ({ ...atual, [nome]: false }));
      }
    },
    []
  );

  const carregar = useCallback(async () => {
    if (!alunoId) {
      setCarregando(false);
      setErro('Aluno inválido.');

      return;
    }

    setCarregando(true);
    setErro(null);

    const [rAluno, rFichas, rSessoes, rEvolucao, rAvaliacoes] =
      await Promise.allSettled([
        buscarAluno(alunoId),
        buscarFichas(alunoId),
        listarSessoesDoAluno(alunoId),
        listarEvolucaoDoAluno(alunoId),
        listarAvaliacoesAluno(alunoId),
      ]);

    if (rAluno.status === 'rejected') {
      setErro(mensagemErro(rAluno.reason, 'Erro ao carregar aluno.'));
      setCarregando(false);

      return;
    }

    setAluno(rAluno.value);
    setFichas(secao(rFichas, [], 'Erro ao carregar fichas.'));
    setSessoes(secao(rSessoes, [], 'Erro ao carregar sessões.'));
    setEvolucao(secao(rEvolucao, [], 'Erro ao carregar evolução.'));
    setAvaliacoes(secao(rAvaliacoes, [], 'Erro ao carregar avaliações.'));
    setCarregando(false);
  }, [alunoId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const comRecarga = <T,>(
    nome: NomeSecao,
    secaoAtual: Secao<T>,
    recarregarEssa: () => Promise<void>
  ): SecaoDetalhe<T> => ({
    ...secaoAtual,
    carregando: secoesCarregando[nome],
    recarregar: recarregarEssa,
  });

  return {
    aluno,
    fichas: comRecarga('fichas', fichas, () =>
      recarregarSecao('fichas', () => buscarFichas(alunoId), setFichas, [], 'Erro ao carregar fichas.')
    ),
    sessoes: comRecarga('sessoes', sessoes, () =>
      recarregarSecao('sessoes', () => listarSessoesDoAluno(alunoId), setSessoes, [], 'Erro ao carregar sessões.')
    ),
    evolucao: comRecarga('evolucao', evolucao, () =>
      recarregarSecao('evolucao', () => listarEvolucaoDoAluno(alunoId), setEvolucao, [], 'Erro ao carregar evolução.')
    ),
    avaliacoes: comRecarga('avaliacoes', avaliacoes, () =>
      recarregarSecao('avaliacoes', () => listarAvaliacoesAluno(alunoId), setAvaliacoes, [], 'Erro ao carregar avaliações.')
    ),
    carregando,
    erro,
    recarregar: carregar,
  };
}
