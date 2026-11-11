import { api } from './api';
import { limparParametros } from './gestaoAlunos.service';

import {
  AuditoriaItem,
  FiltrosAuditoria,
  Paginado,
} from '@/types/gestao.types';

export async function listarAuditoria(
  filtros?: FiltrosAuditoria
): Promise<Paginado<AuditoriaItem>> {
  const resposta = await api.get<Paginado<AuditoriaItem>>('/admin/auditoria', {
    params: limparParametros(filtros),
  });

  return resposta.data;
}
