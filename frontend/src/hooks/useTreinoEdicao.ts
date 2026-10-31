import { useState } from 'react';

import { atualizarTreino } from '@/services/treino.service';
import { Treino, TreinoAtualizar } from '@/types/ficha.types';
import { mensagemErro } from '@/utils/erroApi';

export function useTreinoEdicao() {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function atualizar(
    id: number,
    dados: TreinoAtualizar
  ): Promise<Treino | null> {
    try {
      setCarregando(true);
      setErro(null);

      return await atualizarTreino(id, dados);
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao atualizar treino.'));

      return null;
    } finally {
      setCarregando(false);
    }
  }

  return { atualizar, carregando, erro };
}
