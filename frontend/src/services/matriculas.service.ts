import { api } from './api';
import { limparParametros } from './gestaoAlunos.service';

import {
  FiltrosMatriculas,
  MatriculaAlterarPlano,
  MatriculaCancelar,
  MatriculaCriar,
  MatriculaRenovar,
  MatriculaResposta,
  Paginado,
} from '@/types/gestao.types';

export async function listarMatriculas(
  filtros?: FiltrosMatriculas
): Promise<Paginado<MatriculaResposta>> {
  const resposta = await api.get<Paginado<MatriculaResposta>>('/matriculas', {
    params: limparParametros(filtros),
  });

  return resposta.data;
}

export async function criarMatricula(
  dados: MatriculaCriar
): Promise<MatriculaResposta> {
  const resposta = await api.post<MatriculaResposta>('/matriculas', dados);

  return resposta.data;
}

export async function renovarMatricula(
  id: number,
  dados: MatriculaRenovar = {}
): Promise<MatriculaResposta> {
  const resposta = await api.post<MatriculaResposta>(
    `/matriculas/${id}/renovar`,
    dados
  );

  return resposta.data;
}

export async function alterarPlanoMatricula(
  id: number,
  dados: MatriculaAlterarPlano
): Promise<MatriculaResposta> {
  const resposta = await api.post<MatriculaResposta>(
    `/matriculas/${id}/alterar-plano`,
    dados
  );

  return resposta.data;
}

export async function cancelarMatricula(
  id: number,
  dados: MatriculaCancelar
): Promise<MatriculaResposta> {
  const resposta = await api.post<MatriculaResposta>(
    `/matriculas/${id}/cancelar`,
    dados
  );

  return resposta.data;
}
