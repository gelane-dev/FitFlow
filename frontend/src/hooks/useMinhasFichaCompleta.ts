import { useCallback, useEffect, useState } from 'react';

import { buscarFichaCompleta } from '@/services/fichaAluno.service';
import { FichaAlunoCompleta } from '@/types/fichaAluno.types';
import { mensagemErro } from '@/utils/erroApi';

/** Ficha completa (treinos → itens). Sem `id`, não busca. */
export function useMinhasFichaCompleta(id: number | null | undefined) {
  const [ficha, setFicha] = useState<FichaAlunoCompleta | null>(null);
  const [carregando, setCarregando] = useState(id != null);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    if (id == null) {
      setFicha(null);
      setCarregando(false);
      return;
    }

    try {
      setCarregando(true);
      setErro(null);
      setFicha(await buscarFichaCompleta(id));
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao carregar a ficha.'));
    } finally {
      setCarregando(false);
    }
  }, [id]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return { ficha, carregando, erro, recarregar };
}
