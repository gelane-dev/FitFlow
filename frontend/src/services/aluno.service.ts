import { api } from './api';

import { AlunoDetalhe } from '@/types/aluno.types';
import { AlunoLista } from '@/types/ficha.types';
import { SessaoResumo } from '@/types/sessao.types';

export async function buscarAlunos(): Promise<AlunoLista[]> {
  const resposta = await api.get<AlunoLista[]>('/alunos');

  return resposta.data;
}

export async function buscarAluno(id: number): Promise<AlunoDetalhe> {
  const resposta = await api.get<AlunoDetalhe>(`/alunos/${id}`);

  return resposta.data;
}

export async function listarSessoesDoAluno(
  id: number
): Promise<SessaoResumo[]> {
  const resposta = await api.get<SessaoResumo[]>(`/alunos/${id}/sessoes`);

  return resposta.data;
}
