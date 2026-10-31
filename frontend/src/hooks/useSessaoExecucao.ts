import { useCallback, useEffect, useRef, useState } from 'react';

import axios from 'axios';

import { buscarFichaCompleta } from '@/services/fichaAluno.service';
import {
  buscarSessao,
  finalizarSessao,
  iniciarSessao,
  registrarExecucoes,
} from '@/services/sessao.service';
import { ItemFichaAluno } from '@/types/fichaAluno.types';
import { SessaoResposta } from '@/types/sessao.types';
import { mensagemErro } from '@/utils/erroApi';
import {
  aplicarExecucoes,
  lerNumero,
  montarSeries,
  reconciliarSeries,
  SerieExecucao,
} from '@/utils/sessao';

/** Abre (ou retoma) a sessão do treino e controla a execução série a série. */
export function useSessaoExecucao(treinoId: number) {
  const [sessao, setSessao] = useState<SessaoResposta | null>(null);
  const [treinoNome, setTreinoNome] = useState('');
  const [itens, setItens] = useState<ItemFichaAluno[]>([]);
  const [series, setSeries] = useState<Record<string, SerieExecucao>>({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const [enviando, setEnviando] = useState<string | null>(null);
  const [finalizando, setFinalizando] = useState(false);
  const travaEnvio = useRef(false);
  /** Falha sem resposta: o servidor pode ter gravado; reenvio só após reconciliar. */
  const seriesRef = useRef<Record<string, SerieExecucao>>({});
  const precisaReconciliar = useRef<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      setCarregando(true);
      setErro(null);

      const novaSessao = await iniciarSessao(treinoId);
      const ficha = await buscarFichaCompleta(novaSessao.ficha_id);
      const treino = ficha.treinos.find((t) => t.id === treinoId);

      if (!treino) {
        setErro('Treino não encontrado nesta ficha.');
        return;
      }

      const ordenados = [...treino.itens].sort((a, b) => a.ordem - b.ordem);

      setSessao(novaSessao);
      setTreinoNome(treino.nome);
      setItens(ordenados);
      const iniciais = aplicarExecucoes(
        montarSeries(ordenados),
        novaSessao.execucoes
      );

      seriesRef.current = iniciais;
      setSeries(iniciais);
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao iniciar o treino.'));
    } finally {
      setCarregando(false);
    }
  }, [treinoId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const editarSerie = useCallback(
    (chave: string, campo: 'repeticoes' | 'carga', valor: string) => {
      seriesRef.current = {
        ...seriesRef.current,
        [chave]: { ...seriesRef.current[chave], [campo]: valor },
      };
      setSeries(seriesRef.current);
    },
    []
  );

  /** Recarrega a sessão e marca as séries que o servidor já tem. */
  const reconciliar = useCallback(
    async (sessaoId: number, chave: string): Promise<boolean> => {
      const atual = await buscarSessao(sessaoId);
      const novas = reconciliarSeries(
        seriesRef.current,
        atual.execucoes,
        chave
      );

      seriesRef.current = novas;
      setSeries(novas);
      precisaReconciliar.current = null;

      return novas[chave]?.feita ?? false;
    },
    []
  );

  /** Grava a série (1 registro). Devolve true se gravou. */
  const concluirSerie = useCallback(
    async (chave: string): Promise<boolean> => {
      const serie = series[chave];

      if (!sessao || !serie || serie.feita || travaEnvio.current) {
        return false;
      }

      const repeticoes = lerNumero(serie.repeticoes);
      const carga = lerNumero(serie.carga);

      if (repeticoes === null || carga === null) {
        setErroAcao('Informe repetições e carga válidas.');
        return false;
      }

      travaEnvio.current = true;

      try {
        setEnviando(chave);
        setErroAcao(null);

        if (precisaReconciliar.current !== null) {
          // Tentativa anterior sem resposta: confere o que o servidor gravou.
          await reconciliar(sessao.id, precisaReconciliar.current);

          // Só conta como gravada se a reconciliação mostrou ESTA série no
          // servidor; senão segue e envia a série tocada.
          if (seriesRef.current[chave]?.feita) {
            return true;
          }
        }

        await registrarExecucoes(sessao.id, [
          {
            item_ficha_id: serie.itemId,
            series_realizadas: 1,
            repeticoes_realizadas: Math.round(repeticoes),
            carga_utilizada: carga,
          },
        ]);

        seriesRef.current = {
          ...seriesRef.current,
          [chave]: { ...seriesRef.current[chave], feita: true },
        };
        setSeries(seriesRef.current);

        return true;
      } catch (e) {
        if (axios.isAxiosError(e) && !e.response) {
          // Falha ambígua (rede/timeout): o registro pode ter sido gravado.
          precisaReconciliar.current ??= chave;

          try {
            setEnviando(chave);
            await reconciliar(sessao.id, precisaReconciliar.current);

            if (seriesRef.current[chave]?.feita) {
              return true;
            }

            setErroAcao('Sem conexão. Verifique a internet e tente de novo.');
          } catch {
            setErroAcao(
              'Sem conexão. Não foi possível confirmar a série; tente de novo.'
            );
          }

          return false;
        }

        setErroAcao(mensagemErro(e, 'Erro ao registrar a série.'));
        return false;
      } finally {
        travaEnvio.current = false;
        setEnviando(null);
      }
    },
    [reconciliar, series, sessao]
  );

  const finalizar = useCallback(
    async (esforco: number | undefined, comentario: string): Promise<boolean> => {
      if (!sessao) {
        return false;
      }

      try {
        setFinalizando(true);
        setErroAcao(null);

        await finalizarSessao(sessao.id, {
          esforco,
          comentario: comentario.trim() || undefined,
        });

        return true;
      } catch (e) {
        setErroAcao(mensagemErro(e, 'Erro ao finalizar o treino.'));
        return false;
      } finally {
        setFinalizando(false);
      }
    },
    [sessao]
  );

  const seriesFeitas = Object.values(series).filter((s) => s.feita).length;

  return {
    /** Início da sessão no servidor (base única da duração, igual à do histórico). */
    iniciadaEm: sessao?.iniciada_em ?? null,
    treinoNome,
    itens,
    series,
    totalSeries: Object.keys(series).length,
    seriesFeitas,
    carregando,
    erro,
    erroAcao,
    enviando,
    finalizando,
    editarSerie,
    concluirSerie,
    finalizar,
    recarregar: carregar,
  };
}
