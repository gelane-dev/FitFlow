import { useCallback, useMemo, useRef, useState } from 'react';

import { buscarVersaoFicha, listarVersoesFicha } from '@/services/ficha.service';
import { FichaVersaoConteudo } from '@/types/professorWeb.types';
import { mensagemErro } from '@/utils/erroApi';

import { useGestaoConsulta } from './useGestaoConsulta';

/** Versões publicadas de uma ficha: lista e visualização somente leitura de uma versão. */
export function useProfessorVersoes(fichaId: number) {
  const consulta = useGestaoConsulta(() => listarVersoesFicha(fichaId), 'Erro ao carregar as versões.', [fichaId]);
  const versoes = useMemo(() => [...(consulta.dados ?? [])].sort((a, b) => b.numero - a.numero), [consulta.dados]);

  const [numeroAberto, setNumeroAberto] = useState<number | null>(null);
  const [versao, setVersao] = useState<FichaVersaoConteudo | null>(null);
  const [carregandoVersao, setCarregandoVersao] = useState(false);
  const [erroVersao, setErroVersao] = useState<string | null>(null);
  const requisicao = useRef(0);

  const abrir = useCallback(
    async (numero: number) => {
      const atual = ++requisicao.current;

      setNumeroAberto(numero);
      setVersao(null);
      setErroVersao(null);
      setCarregandoVersao(true);

      try {
        const dados = await buscarVersaoFicha(fichaId, numero);

        if (atual === requisicao.current) {
          setVersao(dados);
        }
      } catch (e) {
        if (atual === requisicao.current) {
          setErroVersao(mensagemErro(e, 'Erro ao carregar a versão.'));
        }
      } finally {
        if (atual === requisicao.current) {
          setCarregandoVersao(false);
        }
      }
    },
    [fichaId]
  );

  const fechar = useCallback(() => {
    requisicao.current += 1;
    setNumeroAberto(null);
    setVersao(null);
    setErroVersao(null);
    setCarregandoVersao(false);
  }, []);

  return {
    versoes,
    carregando: consulta.carregando,
    erro: consulta.erro,
    recarregar: consulta.recarregar,
    numeroAberto,
    versao,
    carregandoVersao,
    erroVersao,
    abrir,
    fechar,
  };
}
