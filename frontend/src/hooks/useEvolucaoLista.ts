import { useCallback, useEffect, useState } from 'react';

import { listarMinhaEvolucao } from '@/services/evolucao.service';
import { EvolucaoExercicioResumo } from '@/types/evolucao.types';
import { mensagemErro } from '@/utils/erroApi';

export function useEvolucaoLista() {
  const [exercicios, setExercicios] = useState<EvolucaoExercicioResumo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    try {
      setCarregando(true);
      setErro(null);
      setExercicios(await listarMinhaEvolucao());
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao carregar a evolução.'));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return { exercicios, carregando, erro, recarregar };
}
