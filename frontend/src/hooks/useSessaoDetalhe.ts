import { useCallback, useEffect, useState } from 'react';

import { buscarSessao } from '@/services/sessao.service';
import { SessaoResposta } from '@/types/sessao.types';
import { mensagemErro } from '@/utils/erroApi';

export function useSessaoDetalhe(id: number) {
  const [sessao, setSessao] = useState<SessaoResposta | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    try {
      setCarregando(true);
      setErro(null);
      setSessao(await buscarSessao(id));
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao carregar a sessão.'));
    } finally {
      setCarregando(false);
    }
  }, [id]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return { sessao, carregando, erro, recarregar };
}
