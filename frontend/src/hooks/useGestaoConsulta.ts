import { DependencyList, useCallback, useEffect, useRef, useState } from 'react';

import { mensagemErro } from '@/utils/erroApi';

export interface ConsultaGestao<T> {
  dados: T | null;
  carregando: boolean;
  erro: string | null;
  recarregar: () => Promise<void>;
}

/**
 * Carrega dados de uma chamada de service, com estados de carregamento/erro e **descarte de respostas
 * antigas**: se os parâmetros mudam (ou a tela desmonta) enquanto uma chamada está em voo, a resposta
 * dela é ignorada. `buscar` com `null` (não habilitado) limpa os dados sem chamar a API.
 * `deps` é a lista que dispara nova carga (parâmetros da consulta).
 */
export function useGestaoConsulta<T>(
  buscar: (() => Promise<T>) | null,
  mensagemPadrao: string,
  deps: DependencyList
): ConsultaGestao<T> {
  const [dados, setDados] = useState<T | null>(null);
  const [carregando, setCarregando] = useState(buscar !== null);
  const [erro, setErro] = useState<string | null>(null);
  const geracao = useRef(0);
  const funcao = useRef(buscar);

  // Atualiza a função fora do render; este efeito vem antes do que dispara a carga.
  useEffect(() => {
    funcao.current = buscar;
  });

  const recarregar = useCallback(async () => {
    const minha = ++geracao.current;
    const chamada = funcao.current;

    if (!chamada) {
      setDados(null);
      setErro(null);
      setCarregando(false);

      return;
    }

    setCarregando(true);
    setErro(null);

    try {
      const resultado = await chamada();

      if (minha === geracao.current) {
        setDados(resultado);
      }
    } catch (e) {
      if (minha === geracao.current) {
        setErro(mensagemErro(e, mensagemPadrao));
      }
    } finally {
      if (minha === geracao.current) {
        setCarregando(false);
      }
    }
  }, [mensagemPadrao]);

  useEffect(() => {
    recarregar();

    return () => {
      geracao.current += 1;
    };
    // `deps` são os parâmetros da consulta, informados por quem chama.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recarregar, ...deps]);

  return { dados, carregando, erro, recarregar };
}
