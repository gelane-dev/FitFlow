import { useCallback, useState } from 'react';

import {
  atualizarGestaoAluno,
  buscarFrequenciaGestaoAluno,
  buscarGestaoAluno,
  listarAcessosAluno,
  listarMatriculasAluno,
  listarPagamentosAluno,
} from '@/services/gestaoAlunos.service';
import type { GestaoAlunoAtualizar } from '@/types/gestao.types';
import { mensagemErro } from '@/utils/erroApi';

import { useGestaoConsulta } from './useGestaoConsulta';

export const MESES_FREQUENCIA = 6;

/** Detalhe do aluno: cada seção carrega e falha sozinha, para a tela continuar útil. */
export function useRecepcaoAlunoDetalhe(id: number) {
  const aluno = useGestaoConsulta(() => buscarGestaoAluno(id), 'Erro ao carregar o aluno.', [id]);
  const matriculas = useGestaoConsulta(() => listarMatriculasAluno(id), 'Erro ao carregar as matrículas.', [id]);
  const pagamentos = useGestaoConsulta(() => listarPagamentosAluno(id), 'Erro ao carregar os pagamentos.', [id]);
  const acessos = useGestaoConsulta(
    () => listarAcessosAluno(id, { por_pagina: 10 }),
    'Erro ao carregar as entradas.',
    [id]
  );
  const frequencia = useGestaoConsulta(
    () => buscarFrequenciaGestaoAluno(id, MESES_FREQUENCIA),
    'Erro ao carregar a frequência.',
    [id]
  );
  const [salvando, setSalvando] = useState(false);

  const { recarregar: recarregarAluno } = aluno;
  const { recarregar: recarregarMatriculas } = matriculas;
  const { recarregar: recarregarPagamentos } = pagamentos;
  const { recarregar: recarregarAcessos } = acessos;
  const { recarregar: recarregarFrequencia } = frequencia;

  const recarregarTudo = useCallback(async () => {
    await Promise.all([
      recarregarAluno(),
      recarregarMatriculas(),
      recarregarPagamentos(),
      recarregarAcessos(),
      recarregarFrequencia(),
    ]);
  }, [recarregarAluno, recarregarMatriculas, recarregarPagamentos, recarregarAcessos, recarregarFrequencia]);

  /** Devolve null no sucesso ou a mensagem de erro. */
  const salvarDados = useCallback(
    async (dados: GestaoAlunoAtualizar): Promise<string | null> => {
      setSalvando(true);

      try {
        await atualizarGestaoAluno(id, dados);
        await recarregarAluno();

        return null;
      } catch (e) {
        return mensagemErro(e, 'Erro ao salvar os dados do aluno.');
      } finally {
        setSalvando(false);
      }
    },
    [id, recarregarAluno]
  );

  return { aluno, matriculas, pagamentos, acessos, frequencia, recarregarTudo, salvarDados, salvando };
}
