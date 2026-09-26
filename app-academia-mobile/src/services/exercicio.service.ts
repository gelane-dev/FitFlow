import { api } from './api';

import {
  Exercicio,
  ExercicioAtualizar,
  ExercicioCriar,
  ExerciciosListaResposta,
} from '@/types/exercicio.types';

export async function buscarExercicios(
  paginaSolicitada: number
): Promise<ExerciciosListaResposta> {
  const resposta = await api.get<ExerciciosListaResposta>(
    '/exercicios',
    {
      params: {
        pagina: paginaSolicitada,
      },
    }
  );

  return resposta.data;
}

export async function buscarExercicio(
  id: number
): Promise<Exercicio> {
  const resposta = await api.get<Exercicio>(
    `/exercicios/${id}`
  );

  return resposta.data;
}

export async function criarExercicio(
  dados: ExercicioCriar
): Promise<Exercicio> {
  const resposta = await api.post<Exercicio>(
    '/exercicios',
    dados
  );

  return resposta.data;
}

export async function atualizarExercicio(
  id: number,
  dados: ExercicioAtualizar
): Promise<Exercicio> {
  const resposta = await api.put<Exercicio>(
    `/exercicios/${id}`,
    dados
  );

  return resposta.data;
}

export async function deletarExercicio(
  id: number
): Promise<void> {
  await api.delete(`/exercicios/${id}`);
}

export async function enviarImagemExercicio(
  id: number,
  imagem: {
    uri: string;
    name: string;
    type: string;
  }
): Promise<void> {
  const formulario = new FormData();

  formulario.append(
    'arquivo',
    imagem as unknown as Blob
  );

  await api.put(
    `/exercicios/${id}/imagem`,
    formulario,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
}