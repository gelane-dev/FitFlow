import { useState } from 'react';

import { atualizarFicha } from '@/services/ficha.service';
import { FichaAtualizar, FichaLista } from '@/types/ficha.types';
import { mensagemErro } from '@/utils/erroApi';

export function useFichaEdicao() {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function atualizar(
    id: number,
    dados: FichaAtualizar
  ): Promise<FichaLista | null> {
    try {
      setCarregando(true);
      setErro(null);

      return await atualizarFicha(id, dados);
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao atualizar ficha.'));

      return null;
    } finally {
      setCarregando(false);
    }
  }

  return { atualizar, carregando, erro };
}
