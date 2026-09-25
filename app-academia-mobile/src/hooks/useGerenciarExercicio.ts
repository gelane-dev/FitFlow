import axios from 'axios';
import { useState } from 'react';

import {
  atualizarExercicio,
  criarExercicio,
  deletarExercicio,
} from '@/services/exercicio.service';

import { ErroApi } from '@/types/api.types';

import {
  Exercicio,
  ExercicioAtualizar,
  ExercicioCriar,
} from '@/types/exercicio.types';

export function useGerenciarExercicio() {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function criar(
    dados: ExercicioCriar
  ): Promise<Exercicio | null> {
    try {
      setCarregando(true);
      setErro(null);

      const exercicio = await criarExercicio(dados);

      return exercicio;
    } catch (erro) {
      if (axios.isAxiosError<ErroApi>(erro)) {
        setErro(
          erro.response?.data?.detail ||
            'Erro ao criar exercício.'
        );

        return null;
      }

      setErro('Ocorreu um erro inesperado.');

      return null;
    } finally {
      setCarregando(false);
    }
  }

  async function atualizar(
    id: number,
    dados: ExercicioAtualizar
  ): Promise<Exercicio | null> {
    try {
      setCarregando(true);
      setErro(null);

      const exercicio = await atualizarExercicio(
        id,
        dados
      );

      return exercicio;
    } catch (erro) {
      if (axios.isAxiosError<ErroApi>(erro)) {
        setErro(
          erro.response?.data?.detail ||
            'Erro ao atualizar exercício.'
        );

        return null;
      }

      setErro('Ocorreu um erro inesperado.');

      return null;
    } finally {
      setCarregando(false);
    }
  }

  async function deletar(
    id: number
  ): Promise<boolean> {
    try {
      setCarregando(true);
      setErro(null);

      await deletarExercicio(id);

      return true;
    } catch (erro) {
      if (axios.isAxiosError<ErroApi>(erro)) {
        setErro(
          erro.response?.data?.detail ||
            'Erro ao excluir exercício.'
        );

        return false;
      }

      setErro('Ocorreu um erro inesperado.');

      return false;
    } finally {
      setCarregando(false);
    }
  }

  return {
    criar,
    atualizar,
    deletar,
    carregando,
    erro,
  };
}