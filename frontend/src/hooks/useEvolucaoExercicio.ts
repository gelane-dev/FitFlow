import { useCallback, useEffect, useState } from 'react';

import { buscarMinhaEvolucao } from '@/services/evolucao.service';
import { EvolucaoExercicio } from '@/types/evolucao.types';
import { mensagemErro } from '@/utils/erroApi';

export function useEvolucaoExercicio(exercicioId: number) {
  const [evolucao, setEvolucao] = useState<EvolucaoExercicio | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    try {
      setCarregando(true);
      setErro(null);
      setEvolucao(await buscarMinhaEvolucao(exercicioId));
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao carregar a evolução.'));
    } finally {
      setCarregando(false);
    }
  }, [exercicioId]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return { evolucao, carregando, erro, recarregar };
}
