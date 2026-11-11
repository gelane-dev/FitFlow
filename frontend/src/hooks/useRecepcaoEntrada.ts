import { useCallback, useState } from 'react';

import { listarAcessos, registrarAcesso, verificarAcesso } from '@/services/acessos.service';
import { listarGestaoAlunos } from '@/services/gestaoAlunos.service';
import type { AcessoResposta, ConsultaAcesso } from '@/types/gestao.types';
import { mensagemErro } from '@/utils/erroApi';

import { useGestaoConsulta } from './useGestaoConsulta';

/** Código de acesso do aluno: token_hex(8) = 16 hexadecimais. */
export function ehCodigoAcesso(texto: string): boolean {
  return /^[0-9a-f]{16}$/i.test(texto.trim());
}

const MINIMO_BUSCA = 2;

/**
 * Fluxo de entrada: busca (nome/CPF/telefone ou código) → verificação → registro (POST /acessos).
 * Respostas antigas de busca/verificação são descartadas por `useGestaoConsulta`.
 */
export function useRecepcaoEntrada() {
  const [termo, setTermo] = useState('');
  const [alvo, setAlvo] = useState<ConsultaAcesso | null>(null);
  const [registro, setRegistro] = useState<AcessoResposta | null>(null);
  const [registrando, setRegistrando] = useState(false);
  const [erroRegistro, setErroRegistro] = useState<string | null>(null);
  const [chaveBusca, setChaveBusca] = useState(0);

  const termoLimpo = termo.trim();
  const porCodigo = ehCodigoAcesso(termoLimpo);
  const buscaAtiva = termoLimpo.length >= MINIMO_BUSCA && !porCodigo;

  const resultados = useGestaoConsulta(
    buscaAtiva ? () => listarGestaoAlunos({ busca: termoLimpo, por_pagina: 8 }) : null,
    'Erro ao buscar alunos.',
    [termoLimpo, buscaAtiva]
  );

  const verificacao = useGestaoConsulta(
    alvo ? () => verificarAcesso(alvo) : null,
    'Erro ao verificar o acesso.',
    [alvo?.aluno_id, alvo?.codigo]
  );

  const entradasHoje = useGestaoConsulta(
    () => listarAcessos({ por_pagina: 30 }),
    'Erro ao carregar as entradas de hoje.',
    []
  );

  const buscar = useCallback((texto: string) => {
    setTermo(texto);
    setRegistro(null);
    setErroRegistro(null);
    setAlvo(ehCodigoAcesso(texto) ? { codigo: texto.trim().toLowerCase() } : null);
  }, []);

  const selecionarAluno = useCallback((alunoId: number) => {
    setRegistro(null);
    setErroRegistro(null);
    setAlvo({ aluno_id: alunoId });
  }, []);

  const proximo = useCallback(() => {
    setTermo('');
    setAlvo(null);
    setRegistro(null);
    setErroRegistro(null);
    setChaveBusca((c) => c + 1);
  }, []);

  const { recarregar: recarregarEntradas } = entradasHoje;
  const { recarregar: recarregarVerificacao } = verificacao;

  /** Toda tentativa chama POST /acessos; `forcar` só funciona com a permissão (o servidor confere). */
  const registrar = useCallback(
    async (forcar = false) => {
      if (!alvo) return false;

      setRegistrando(true);
      setErroRegistro(null);

      try {
        const resposta = await registrarAcesso({ ...alvo, origem: 'manual', forcar });

        setRegistro(resposta);
        await Promise.all([recarregarEntradas(), recarregarVerificacao()]);

        return true;
      } catch (e) {
        setErroRegistro(mensagemErro(e, 'Erro ao registrar a entrada.'));

        return false;
      } finally {
        setRegistrando(false);
      }
    },
    [alvo, recarregarEntradas, recarregarVerificacao]
  );

  return {
    termo,
    chaveBusca,
    buscar,
    resultados,
    selecionarAluno,
    alvo,
    verificacao,
    registro,
    registrando,
    erroRegistro,
    registrar,
    proximo,
    entradasHoje,
  };
}
