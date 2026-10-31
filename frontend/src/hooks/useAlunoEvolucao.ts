import { useCallback, useEffect, useState } from 'react';

import { buscarEvolucaoDoAluno } from '@/services/evolucao.service';
import { EvolucaoExercicio } from '@/types/evolucao.types';
import { mensagemErro } from '@/utils/erroApi';

export function useAlunoEvolucao(alunoId: number, exercicioId: number) {
  const [evolucao, setEvolucao] = useState<EvolucaoExercicio | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      setCarregando(true);
      setErro(null);

      setEvolucao(await buscarEvolucaoDoAluno(alunoId, exercicioId));
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao carregar evolução.'));
    } finally {
      setCarregando(false);
    }
  }, [alunoId, exercicioId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return { evolucao, carregando, erro, recarregar: carregar };
}
