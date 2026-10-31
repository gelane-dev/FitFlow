import { useCallback, useEffect, useState } from 'react';

import { listarMinhasFichas } from '@/services/fichaAluno.service';
import { FichaAlunoLista } from '@/types/fichaAluno.types';
import { mensagemErro } from '@/utils/erroApi';

export function useMinhasFichas() {
  const [fichas, setFichas] = useState<FichaAlunoLista[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    try {
      setCarregando(true);
      setErro(null);
      setFichas(await listarMinhasFichas());
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao carregar fichas.'));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  const fichaVigente = fichas.find((f) => f.vigente) ?? null;

  return { fichas, fichaVigente, carregando, erro, recarregar };
}
