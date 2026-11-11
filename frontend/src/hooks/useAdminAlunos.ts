import { useCallback, useState } from 'react';

import {
  alterarRestricaoAluno,
  alterarStatusAluno,
  atualizarGestaoAluno,
  buscarFrequenciaGestaoAluno,
  buscarGestaoAluno,
  listarAcessosAluno,
  listarGestaoAlunos,
  listarMatriculasAluno,
  listarPagamentosAluno,
  trocarProfessorAluno,
} from '@/services/gestaoAlunos.service';
import { listarProfessores } from '@/services/equipe.service';
import { listarPlanos } from '@/services/planos.service';
import { FrequenciaAluno } from '@/types/professorWeb.types';
import { GestaoAlunoAtualizar, SituacaoAluno } from '@/types/gestao.types';

import { useAdminAcao, useAdminRecurso } from './useAdminBase';
import { useGestaoCriarAluno } from './useGestaoCriarAluno';

export const POR_PAGINA_ALUNOS = 20;

/** Professor "0" da API = alunos sem professor. */
export const FILTRO_SEM_PROFESSOR = 0;

export interface FiltrosAlunosAdmin {
  busca: string;
  situacao: SituacaoAluno | null;
  /** `0` = sem professor. */
  professorId: number | null;
  planoId: number | null;
  pagina: number;
}

export const FILTROS_ALUNOS_VAZIOS: FiltrosAlunosAdmin = {
  busca: '',
  situacao: null,
  professorId: null,
  planoId: null,
  pagina: 1,
};

/** Lista paginada de alunos com busca e filtros; mudar um filtro volta para a página 1. */
export function useAdminAlunos() {
  const [filtros, setFiltros] = useState<FiltrosAlunosAdmin>(FILTROS_ALUNOS_VAZIOS);

  const lista = useAdminRecurso(
    () =>
      listarGestaoAlunos({
        busca: filtros.busca.trim() || undefined,
        situacao: filtros.situacao ?? undefined,
        professor_id: filtros.professorId ?? undefined,
        plano_id: filtros.planoId ?? undefined,
        pagina: filtros.pagina,
        por_pagina: POR_PAGINA_ALUNOS,
      }),
    JSON.stringify(filtros),
    'Erro ao carregar os alunos.'
  );
  const professores = useAdminRecurso(listarProfessores, 'alunos-professores', 'Erro ao carregar os professores.');
  const planos = useAdminRecurso(() => listarPlanos(), 'alunos-planos', 'Erro ao carregar os planos.');

  const definirFiltros = useCallback((parcial: Partial<Omit<FiltrosAlunosAdmin, 'pagina'>>) => {
    setFiltros((atual) => ({ ...atual, ...parcial, pagina: 1 }));
  }, []);

  const mudarPagina = useCallback((pagina: number) => setFiltros((atual) => ({ ...atual, pagina })), []);
  const limparFiltros = useCallback(() => setFiltros(FILTROS_ALUNOS_VAZIOS), []);

  const filtrosAtivos =
    filtros.busca.trim() !== '' || filtros.situacao !== null || filtros.professorId !== null || filtros.planoId !== null;

  const { recarregar: recarregarLista } = lista;
  const { recarregar: recarregarProfessores } = professores;
  const { recarregar: recarregarPlanos } = planos;
  const recarregar = useCallback(async () => {
    await Promise.all([recarregarLista(), recarregarProfessores(), recarregarPlanos()]);
  }, [recarregarLista, recarregarProfessores, recarregarPlanos]);

  return {
    alunos: lista.dados?.itens ?? [],
    total: lista.dados?.total ?? 0,
    filtros,
    filtrosAtivos,
    definirFiltros,
    mudarPagina,
    limparFiltros,
    professores: professores.dados ?? [],
    planos: planos.dados ?? [],
    carregando: lista.carregando,
    erro: lista.erro,
    recarregar,
  };
}

/** Professores ativos para escolher o responsável de um novo aluno. */
export function useAdminProfessoresAtivos() {
  const professores = useAdminRecurso(listarProfessores, 'novo-aluno-professores', 'Erro ao carregar os professores.');

  return {
    professores: (professores.dados ?? []).filter((p) => p.ativo),
    carregando: professores.carregando,
    erro: professores.erro,
    recarregar: professores.recarregar,
  };
}

/** Criação de aluno pelo admin (nasce aprovado): o mesmo hook da recepção. */
export const useAdminCriarAluno = useGestaoCriarAluno;

/** Dados do aluno + seções independentes (matrículas, pagamentos, entradas, frequência) e as ações do admin. */
export function useAdminAlunoDetalhe(id: number) {
  const aluno = useAdminRecurso(() => buscarGestaoAluno(id), `aluno-${id}`, 'Erro ao carregar o aluno.');
  const matriculas = useAdminRecurso(() => listarMatriculasAluno(id), `aluno-${id}-matriculas`, 'Erro ao carregar as matrículas.');
  const pagamentos = useAdminRecurso(() => listarPagamentosAluno(id), `aluno-${id}-pagamentos`, 'Erro ao carregar os pagamentos.');
  const acessos = useAdminRecurso(
    () => listarAcessosAluno(id, { pagina: 1, por_pagina: 10 }),
    `aluno-${id}-acessos`,
    'Erro ao carregar as entradas.'
  );
  const frequencia = useAdminRecurso(
    () => buscarFrequenciaGestaoAluno(id, 6),
    `aluno-${id}-frequencia`,
    'Erro ao carregar a frequência.'
  );
  const professores = useAdminRecurso(listarProfessores, `aluno-${id}-professores`, 'Erro ao carregar os professores.');
  const { processando, executar } = useAdminAcao();

  const { recarregar: recarregarAluno } = aluno;
  const { recarregar: recarregarMatriculas } = matriculas;
  const { recarregar: recarregarPagamentos } = pagamentos;
  const { recarregar: recarregarAcessos } = acessos;
  const { recarregar: recarregarFrequencia } = frequencia;

  /** Depois de matrícula/pagamento, o aluno (situação) e as duas listas mudam. */
  const recarregarFinanceiro = useCallback(async () => {
    await Promise.all([recarregarAluno(), recarregarMatriculas(), recarregarPagamentos()]);
  }, [recarregarAluno, recarregarMatriculas, recarregarPagamentos]);

  const recarregar = useCallback(async () => {
    await Promise.all([recarregarFinanceiro(), recarregarAcessos(), recarregarFrequencia()]);
  }, [recarregarFinanceiro, recarregarAcessos, recarregarFrequencia]);

  const comRecarga = useCallback(
    async <R,>(operacao: () => Promise<R>, padrao: string) => {
      const resultado = await executar(operacao, padrao);

      if (resultado.ok) await recarregarAluno();

      return resultado;
    },
    [executar, recarregarAluno]
  );

  const alternarStatus = useCallback(
    (ativo: boolean) =>
      comRecarga(() => alterarStatusAluno(id, { ativo }), ativo ? 'Erro ao ativar o aluno.' : 'Erro ao desativar o aluno.'),
    [comRecarga, id]
  );

  const trocarProfessor = useCallback(
    (professorId: number | null) =>
      comRecarga(() => trocarProfessorAluno(id, { professor_id: professorId }), 'Erro ao trocar o professor.'),
    [comRecarga, id]
  );

  const alterarRestricao = useCallback(
    (restricao: string | null) =>
      comRecarga(() => alterarRestricaoAluno(id, { restricao_acesso: restricao }), 'Erro ao alterar a restrição.'),
    [comRecarga, id]
  );

  const atualizar = useCallback(
    (dados: GestaoAlunoAtualizar) => comRecarga(() => atualizarGestaoAluno(id, dados), 'Erro ao salvar o aluno.'),
    [comRecarga, id]
  );

  return {
    aluno: aluno.dados,
    carregandoAluno: aluno.carregando,
    erroAluno: aluno.erro,
    matriculas: matriculas.dados ?? [],
    secaoMatriculas: { carregando: matriculas.carregando, erro: matriculas.erro, recarregar: matriculas.recarregar },
    pagamentos: pagamentos.dados ?? [],
    secaoPagamentos: { carregando: pagamentos.carregando, erro: pagamentos.erro, recarregar: pagamentos.recarregar },
    acessos: acessos.dados?.itens ?? [],
    totalAcessos: acessos.dados?.total ?? 0,
    secaoAcessos: { carregando: acessos.carregando, erro: acessos.erro, recarregar: acessos.recarregar },
    frequencia: frequencia.dados,
    secaoFrequencia: { carregando: frequencia.carregando, erro: frequencia.erro, recarregar: frequencia.recarregar },
    professores: professores.dados ?? [],
    processando,
    recarregar,
    recarregarFinanceiro,
    alternarStatus,
    trocarProfessor,
    alterarRestricao,
    atualizar,
  };
}
