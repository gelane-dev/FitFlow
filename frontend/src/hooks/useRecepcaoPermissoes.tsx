import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { buscarPerfilRecepcao } from '@/services/usuario.service';
import type { PerfilRecepcao, PermissaoRecepcao } from '@/types/gestao.types';
import { mensagemErro } from '@/utils/erroApi';
import { temPermissao } from '@/utils/gestaoRecepcao';

interface ValorPermissoes {
  perfil: PerfilRecepcao | null;
  permissoes: PermissaoRecepcao[];
  carregando: boolean;
  erro: string | null;
  recarregar: () => Promise<void>;
  /** Só esconde ou mostra a ação; o backend continua decidindo (403 mostra a mensagem). */
  pode: (permissao: PermissaoRecepcao) => boolean;
}

const Contexto = createContext<ValorPermissoes | null>(null);

/** Carrega GET /perfil/recepcao uma vez para toda a área da recepção. */
export function ProvedorPermissoesRecepcao({ children }: { children: ReactNode }) {
  const [perfil, setPerfil] = useState<PerfilRecepcao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);

    try {
      setPerfil(await buscarPerfilRecepcao());
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao carregar as permissões.'));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  const valor = useMemo<ValorPermissoes>(() => {
    const permissoes = perfil?.permissoes ?? [];

    return {
      perfil,
      permissoes,
      carregando,
      erro,
      recarregar,
      pode: (p) => temPermissao(permissoes, p),
    };
  }, [perfil, carregando, erro, recarregar]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useRecepcaoPermissoes(): ValorPermissoes {
  const valor = useContext(Contexto);

  if (!valor) {
    throw new Error('useRecepcaoPermissoes precisa do ProvedorPermissoesRecepcao.');
  }

  return valor;
}
