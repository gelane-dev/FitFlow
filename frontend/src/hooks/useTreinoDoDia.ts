import { useCallback, useEffect, useState } from 'react';

import { buscarTreinosDeHoje } from '@/services/fichaAluno.service';
import { TreinoAluno } from '@/types/fichaAluno.types';
import { mensagemErro } from '@/utils/erroApi';

/** Treinos do dia da ficha (pode vir vazio). Sem `fichaId`, não busca. */
export function useTreinoDoDia(fichaId: number | null | undefined) {
  const [treinos, setTreinos] = useState<TreinoAluno[]>([]);
  const [carregando, setCarregando] = useState(fichaId != null);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    if (fichaId == null) {
      setTreinos([]);
      setCarregando(false);
      return;
    }

    try {
      setCarregando(true);
      setErro(null);
      setTreinos(await buscarTreinosDeHoje(fichaId));
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao carregar o treino de hoje.'));
    } finally {
      setCarregando(false);
    }
  }, [fichaId]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return { treinos, carregando, erro, recarregar };
}
