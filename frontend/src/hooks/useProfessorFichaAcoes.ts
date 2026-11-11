import { useState } from 'react';

import { duplicarFicha, publicarFicha } from '@/services/ficha.service';
import { FichaLista } from '@/types/ficha.types';
import { FichaDuplicar, FichaVersaoResumo } from '@/types/professorWeb.types';
import { mensagemErro } from '@/utils/erroApi';

import type { ResultadoAcao } from './useAdminBase';

/** Ações de ficha do professor fora do montador: duplicar (para o mesmo ou outro aluno) e publicar. */
export function useProfessorFichaAcoes() {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  /** Devolve a mensagem de erro no resultado (o estado `erro` só aparece no render seguinte). */
  async function executar<T>(acao: () => Promise<T>, padrao: string): Promise<ResultadoAcao<T>> {
    try {
      setCarregando(true);
      setErro(null);

      return { ok: true, valor: await acao() };
    } catch (e) {
      const mensagem = mensagemErro(e, padrao);

      setErro(mensagem);

      return { ok: false, erro: mensagem };
    } finally {
      setCarregando(false);
    }
  }

  /** Devolve a ficha criada, ou `null` (o diálogo mostra `erro`). */
  async function duplicar(id: number, dados: FichaDuplicar = {}): Promise<FichaLista | null> {
    const resultado = await executar(() => duplicarFicha(id, dados), 'Erro ao duplicar a ficha.');

    return resultado.ok ? resultado.valor : null;
  }

  /** Devolve a versão criada ou o erro da API, para a tela mostrar na hora. */
  function publicar(id: number): Promise<ResultadoAcao<FichaVersaoResumo>> {
    return executar(() => publicarFicha(id), 'Erro ao publicar a ficha.');
  }

  return { duplicar, publicar, carregando, erro, limparErro: () => setErro(null) };
}
