import { api } from './api';

import {
  PermissoesAtualizar,
  ProfessorAtualizar,
  ProfessorCriar,
  ProfessorGestaoDetalhe,
  ProfessorGestaoItem,
  RecepcionistaAtualizar,
  RecepcionistaCriar,
  RecepcionistaDetalhe,
  RecepcionistaItem,
  StatusAtualizar,
  TransferirAlunos,
  TransferirAlunosResposta,
} from '@/types/gestao.types';

/* ------------------------------- Professores ------------------------------ */

export async function listarProfessores(): Promise<ProfessorGestaoItem[]> {
  const resposta = await api.get<ProfessorGestaoItem[]>('/admin/professores');

  return resposta.data;
}

export async function buscarProfessor(
  id: number
): Promise<ProfessorGestaoDetalhe> {
  const resposta = await api.get<ProfessorGestaoDetalhe>(
    `/admin/professores/${id}`
  );

  return resposta.data;
}

export async function criarProfessor(
  dados: ProfessorCriar
): Promise<ProfessorGestaoItem> {
  const resposta = await api.post<ProfessorGestaoItem>(
    '/admin/professores',
    dados
  );

  return resposta.data;
}

export async function atualizarProfessor(
  id: number,
  dados: ProfessorAtualizar
): Promise<ProfessorGestaoItem> {
  const resposta = await api.put<ProfessorGestaoItem>(
    `/admin/professores/${id}`,
    dados
  );

  return resposta.data;
}

export async function alterarStatusProfessor(
  id: number,
  dados: StatusAtualizar
): Promise<ProfessorGestaoItem> {
  const resposta = await api.put<ProfessorGestaoItem>(
    `/admin/professores/${id}/status`,
    dados
  );

  return resposta.data;
}

export async function transferirAlunosProfessor(
  id: number,
  dados: TransferirAlunos
): Promise<TransferirAlunosResposta> {
  const resposta = await api.post<TransferirAlunosResposta>(
    `/admin/professores/${id}/transferir-alunos`,
    dados
  );

  return resposta.data;
}

/* ----------------------------- Recepcionistas ----------------------------- */

export async function listarRecepcionistas(): Promise<RecepcionistaItem[]> {
  const resposta = await api.get<RecepcionistaItem[]>(
    '/admin/recepcionistas'
  );

  return resposta.data;
}

export async function buscarRecepcionista(
  id: number
): Promise<RecepcionistaDetalhe> {
  const resposta = await api.get<RecepcionistaDetalhe>(
    `/admin/recepcionistas/${id}`
  );

  return resposta.data;
}

export async function criarRecepcionista(
  dados: RecepcionistaCriar
): Promise<RecepcionistaDetalhe> {
  const resposta = await api.post<RecepcionistaDetalhe>(
    '/admin/recepcionistas',
    dados
  );

  return resposta.data;
}

export async function atualizarRecepcionista(
  id: number,
  dados: RecepcionistaAtualizar
): Promise<RecepcionistaDetalhe> {
  const resposta = await api.put<RecepcionistaDetalhe>(
    `/admin/recepcionistas/${id}`,
    dados
  );

  return resposta.data;
}

export async function alterarStatusRecepcionista(
  id: number,
  dados: StatusAtualizar
): Promise<RecepcionistaDetalhe> {
  const resposta = await api.put<RecepcionistaDetalhe>(
    `/admin/recepcionistas/${id}/status`,
    dados
  );

  return resposta.data;
}

export async function atualizarPermissoesRecepcionista(
  id: number,
  dados: PermissoesAtualizar
): Promise<RecepcionistaDetalhe> {
  const resposta = await api.put<RecepcionistaDetalhe>(
    `/admin/recepcionistas/${id}/permissoes`,
    dados
  );

  return resposta.data;
}
