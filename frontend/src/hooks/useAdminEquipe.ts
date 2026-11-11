import { useCallback } from 'react';

import {
  alterarStatusProfessor,
  alterarStatusRecepcionista,
  atualizarPermissoesRecepcionista,
  atualizarProfessor,
  atualizarRecepcionista,
  buscarProfessor,
  buscarRecepcionista,
  criarProfessor,
  criarRecepcionista,
  listarProfessores,
  listarRecepcionistas,
  transferirAlunosProfessor,
} from '@/services/equipe.service';
import {
  PermissaoRecepcao,
  ProfessorAtualizar,
  ProfessorCriar,
  RecepcionistaAtualizar,
  RecepcionistaCriar,
  TransferirAlunos,
} from '@/types/gestao.types';


import { useAdminAcao, useAdminRecurso } from './useAdminBase';

/** Lista de professores com totais; criar, editar, ativar/desativar e transferir alunos. */
export function useAdminProfessores() {
  const lista = useAdminRecurso(listarProfessores, 'professores', 'Erro ao carregar os professores.');
  const { processando, executar } = useAdminAcao();
  const { recarregar } = lista;

  const criar = useCallback(
    async (dados: ProfessorCriar) => {
      const resultado = await executar(() => criarProfessor(dados), 'Erro ao criar o professor.');

      if (resultado.ok) await recarregar();

      return resultado;
    },
    [executar, recarregar]
  );

  const alternarStatus = useCallback(
    async (id: number, ativo: boolean) => {
      const resultado = await executar(
        () => alterarStatusProfessor(id, { ativo }),
        ativo ? 'Erro ao ativar o professor.' : 'Erro ao desativar o professor.'
      );

      if (resultado.ok) await recarregar();

      return resultado;
    },
    [executar, recarregar]
  );

  const transferir = useCallback(
    async (origemId: number, dados: TransferirAlunos) => {
      const resultado = await executar(
        () => transferirAlunosProfessor(origemId, dados),
        'Erro ao transferir os alunos.'
      );

      if (resultado.ok) await recarregar();

      return resultado;
    },
    [executar, recarregar]
  );

  return {
    professores: lista.dados ?? [],
    carregado: lista.dados !== null,
    carregando: lista.carregando,
    erro: lista.erro,
    recarregar,
    processando,
    criar,
    alternarStatus,
    transferir,
  };
}

/** Detalhe de um professor (alunos, fichas, avaliações, atividade) e as operações sobre ele. */
export function useAdminProfessorDetalhe(id: number) {
  const detalhe = useAdminRecurso(() => buscarProfessor(id), `professor-${id}`, 'Erro ao carregar o professor.');
  const { processando, executar } = useAdminAcao();
  const { recarregar } = detalhe;

  const atualizar = useCallback(
    async (dados: ProfessorAtualizar) => {
      const resultado = await executar(() => atualizarProfessor(id, dados), 'Erro ao salvar o professor.');

      if (resultado.ok) await recarregar();

      return resultado;
    },
    [executar, id, recarregar]
  );

  const alternarStatus = useCallback(
    async (ativo: boolean) => {
      const resultado = await executar(
        () => alterarStatusProfessor(id, { ativo }),
        ativo ? 'Erro ao ativar o professor.' : 'Erro ao desativar o professor.'
      );

      if (resultado.ok) await recarregar();

      return resultado;
    },
    [executar, id, recarregar]
  );

  const transferir = useCallback(
    async (dados: TransferirAlunos) => {
      const resultado = await executar(() => transferirAlunosProfessor(id, dados), 'Erro ao transferir os alunos.');

      if (resultado.ok) await recarregar();

      return resultado;
    },
    [executar, id, recarregar]
  );

  return {
    professor: detalhe.dados,
    carregando: detalhe.carregando,
    erro: detalhe.erro,
    recarregar,
    processando,
    atualizar,
    alternarStatus,
    transferir,
  };
}

/** Lista de recepcionistas e criação. */
export function useAdminRecepcionistas() {
  const lista = useAdminRecurso(listarRecepcionistas, 'recepcionistas', 'Erro ao carregar a recepção.');
  const { processando, executar } = useAdminAcao();
  const { recarregar } = lista;

  const criar = useCallback(
    async (dados: RecepcionistaCriar) => {
      const resultado = await executar(() => criarRecepcionista(dados), 'Erro ao criar o recepcionista.');

      if (resultado.ok) await recarregar();

      return resultado;
    },
    [executar, recarregar]
  );

  const alternarStatus = useCallback(
    async (id: number, ativo: boolean) => {
      const resultado = await executar(
        () => alterarStatusRecepcionista(id, { ativo }),
        ativo ? 'Erro ao ativar o recepcionista.' : 'Erro ao desativar o recepcionista.'
      );

      if (resultado.ok) await recarregar();

      return resultado;
    },
    [executar, recarregar]
  );

  return {
    recepcionistas: lista.dados ?? [],
    carregado: lista.dados !== null,
    carregando: lista.carregando,
    erro: lista.erro,
    recarregar,
    processando,
    criar,
    alternarStatus,
  };
}

/** Detalhe do recepcionista: dados, permissões e atividade. */
export function useAdminRecepcionistaDetalhe(id: number) {
  const detalhe = useAdminRecurso(
    () => buscarRecepcionista(id),
    `recepcionista-${id}`,
    'Erro ao carregar o recepcionista.'
  );
  const { processando, executar } = useAdminAcao();
  const { recarregar } = detalhe;

  const atualizar = useCallback(
    async (dados: RecepcionistaAtualizar) => {
      const resultado = await executar(() => atualizarRecepcionista(id, dados), 'Erro ao salvar o recepcionista.');

      if (resultado.ok) await recarregar();

      return resultado;
    },
    [executar, id, recarregar]
  );

  const alternarStatus = useCallback(
    async (ativo: boolean) => {
      const resultado = await executar(
        () => alterarStatusRecepcionista(id, { ativo }),
        ativo ? 'Erro ao ativar o recepcionista.' : 'Erro ao desativar o recepcionista.'
      );

      if (resultado.ok) await recarregar();

      return resultado;
    },
    [executar, id, recarregar]
  );

  const salvarPermissoes = useCallback(
    async (permissoes: PermissaoRecepcao[]) => {
      const resultado = await executar(
        () => atualizarPermissoesRecepcionista(id, { permissoes }),
        'Erro ao salvar as permissões.'
      );

      if (resultado.ok) await recarregar();

      return resultado;
    },
    [executar, id, recarregar]
  );

  return {
    recepcionista: detalhe.dados,
    carregando: detalhe.carregando,
    erro: detalhe.erro,
    recarregar,
    processando,
    atualizar,
    alternarStatus,
    salvarPermissoes,
  };
}
