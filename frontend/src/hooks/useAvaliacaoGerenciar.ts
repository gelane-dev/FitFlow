import { useState } from 'react';

import {
  atualizarAvaliacao,
  criarAvaliacao,
  excluirAvaliacao,
} from '@/services/avaliacao.service';
import {
  AvaliacaoCriar,
  AvaliacaoResposta,
} from '@/types/avaliacao.types';
import { mensagemErro } from '@/utils/erroApi';

export function useAvaliacaoGerenciar() {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function executar<T>(
    acao: () => Promise<T>,
    padrao: string
  ): Promise<T | null> {
    try {
      setCarregando(true);
      setErro(null);

      return await acao();
    } catch (e) {
      setErro(mensagemErro(e, padrao));

      return null;
    } finally {
      setCarregando(false);
    }
  }

  function criar(
    alunoId: number,
    dados: AvaliacaoCriar
  ): Promise<AvaliacaoResposta | null> {
    return executar(
      () => criarAvaliacao(alunoId, dados),
      'Erro ao salvar avaliação.'
    );
  }

  function atualizar(
    id: number,
    dados: AvaliacaoCriar
  ): Promise<AvaliacaoResposta | null> {
    return executar(
      () => atualizarAvaliacao(id, dados),
      'Erro ao atualizar avaliação.'
    );
  }

  async function excluir(id: number): Promise<boolean> {
    const resultado = await executar(async () => {
      await excluirAvaliacao(id);

      return true;
    }, 'Erro ao excluir avaliação.');

    return resultado === true;
  }

  return { criar, atualizar, excluir, carregando, erro };
}
