import { useCallback, useEffect, useRef, useState } from 'react';

import { listarMinhasSessoes } from '@/services/sessao.service';
import { SessaoResumo } from '@/types/sessao.types';
import { mensagemErro } from '@/utils/erroApi';

export const TAMANHO_PAGINA_HISTORICO = 20;

/**
 * Histórico do aluno com rolagem infinita (páginas de 20 pelo `limite`/`deslocamento` da API).
 * `carregando` vale só para a primeira carga; recargas mantêm a lista na tela.
 */
export function useHistoricoSessoes() {
  const [sessoes, setSessoes] = useState<SessaoResumo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [temMais, setTemMais] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [erroMais, setErroMais] = useState<string | null>(null);
  const jaCarregou = useRef(false);
  const ocupado = useRef(false);
  const quantidade = useRef(0);

  /** Volta à primeira página. */
  const recarregar = useCallback(async () => {
    if (ocupado.current) {
      return;
    }

    ocupado.current = true;

    try {
      if (!jaCarregou.current) {
        setCarregando(true);
      }

      setErro(null);
      setErroMais(null);

      const pagina = await listarMinhasSessoes({
        limite: TAMANHO_PAGINA_HISTORICO,
        deslocamento: 0,
      });

      jaCarregou.current = true;
      quantidade.current = pagina.length;
      setSessoes(pagina);
      setTemMais(pagina.length === TAMANHO_PAGINA_HISTORICO);
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao carregar o histórico.'));
    } finally {
      ocupado.current = false;
      setCarregando(false);
    }
  }, []);

  /** Próxima página, acrescentada ao fim (sem duplicar sessões já listadas). */
  const carregarMais = useCallback(async () => {
    if (ocupado.current || !jaCarregou.current || !temMais) {
      return;
    }

    ocupado.current = true;

    try {
      setCarregandoMais(true);
      setErroMais(null);

      const pagina = await listarMinhasSessoes({
        limite: TAMANHO_PAGINA_HISTORICO,
        deslocamento: quantidade.current,
      });

      quantidade.current += pagina.length;
      setSessoes((atual) => {
        const ids = new Set(atual.map((s) => s.id));

        return [...atual, ...pagina.filter((s) => !ids.has(s.id))];
      });
      setTemMais(pagina.length === TAMANHO_PAGINA_HISTORICO);
    } catch (e) {
      setErroMais(mensagemErro(e, 'Erro ao carregar mais sessões.'));
      setTemMais(false);
    } finally {
      ocupado.current = false;
      setCarregandoMais(false);
    }
  }, [temMais]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return { sessoes, carregando, carregandoMais, temMais, erro, erroMais, recarregar, carregarMais };
}
