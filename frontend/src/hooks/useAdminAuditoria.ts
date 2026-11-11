import { useCallback, useRef, useState } from 'react';

import { listarAuditoria } from '@/services/auditoria.service';
import { AuditoriaItem } from '@/types/gestao.types';

import { useAdminRecurso } from './useAdminBase';

export const POR_PAGINA_AUDITORIA = 20;

export interface FiltrosAuditoriaAdmin {
  userId: number | null;
  acao: string | null;
  entidade: string | null;
  /** ISO `YYYY-MM-DD`. */
  inicio: string | null;
  fim: string | null;
  pagina: number;
}

export const FILTROS_AUDITORIA_VAZIOS: FiltrosAuditoriaAdmin = {
  userId: null,
  acao: null,
  entidade: null,
  inicio: null,
  fim: null,
  pagina: 1,
};

export interface UsuarioAuditoria {
  id: number;
  nome: string;
  tipo: string;
}

/** Auditoria paginada com filtros; mudar um filtro volta para a página 1. */
export function useAdminAuditoria(inicial: Partial<FiltrosAuditoriaAdmin> = {}) {
  const [filtros, setFiltros] = useState<FiltrosAuditoriaAdmin>({ ...FILTROS_AUDITORIA_VAZIOS, ...inicial });
  // Usuários vistos nos resultados: a API não tem listagem de usuários, então o filtro se alimenta daqui.
  const usuariosVistos = useRef(new Map<number, UsuarioAuditoria>());
  const [usuarios, setUsuarios] = useState<UsuarioAuditoria[]>([]);

  const buscar = useCallback(async () => {
    const resposta = await listarAuditoria({
      user_id: filtros.userId ?? undefined,
      acao: filtros.acao ?? undefined,
      entidade: filtros.entidade ?? undefined,
      inicio: filtros.inicio ?? undefined,
      fim: filtros.fim ?? undefined,
      pagina: filtros.pagina,
      por_pagina: POR_PAGINA_AUDITORIA,
    });

    let mudou = false;

    for (const item of resposta.itens) {
      if (item.usuario && !usuariosVistos.current.has(item.usuario.id)) {
        usuariosVistos.current.set(item.usuario.id, item.usuario);
        mudou = true;
      }
    }

    if (mudou) setUsuarios([...usuariosVistos.current.values()]);

    return resposta;
  }, [filtros]);

  const recurso = useAdminRecurso(
    buscar,
    JSON.stringify(filtros),
    'Erro ao carregar a auditoria.'
  );

  const definirFiltros = useCallback((parcial: Partial<Omit<FiltrosAuditoriaAdmin, 'pagina'>>) => {
    setFiltros((atual) => ({ ...atual, ...parcial, pagina: 1 }));
  }, []);

  const limparFiltros = useCallback(() => setFiltros(FILTROS_AUDITORIA_VAZIOS), []);
  const mudarPagina = useCallback((pagina: number) => setFiltros((atual) => ({ ...atual, pagina })), []);

  const itens: AuditoriaItem[] = recurso.dados?.itens ?? [];
  const filtrosAtivos = [filtros.userId, filtros.acao, filtros.entidade, filtros.inicio, filtros.fim].some(
    (valor) => valor !== null
  );

  return {
    itens,
    total: recurso.dados?.total ?? 0,
    filtros,
    filtrosAtivos,
    usuarios,
    definirFiltros,
    limparFiltros,
    mudarPagina,
    carregando: recurso.carregando,
    erro: recurso.erro,
    recarregar: recurso.recarregar,
  };
}
