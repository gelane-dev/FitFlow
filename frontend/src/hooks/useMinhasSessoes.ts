import { useCallback, useEffect, useState } from 'react';

import { listarMinhasSessoes } from '@/services/sessao.service';
import { SessaoResumo } from '@/types/sessao.types';
import { mensagemErro } from '@/utils/erroApi';

export function useMinhasSessoes() {
  const [sessoes, setSessoes] = useState<SessaoResumo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    try {
      setCarregando(true);
      setErro(null);
      setSessoes(await listarMinhasSessoes());
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao carregar o histórico.'));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return { sessoes, carregando, erro, recarregar };
}
