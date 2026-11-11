import { useCallback, useState } from 'react';

import { aprovarAluno, recusarAluno } from '@/services/gestaoAlunos.service';
import { mostrarAlerta } from '@/utils/alerta';
import { mensagemErro } from '@/utils/erroApi';

/**
 * Aprovar ou recusar um cadastro pendente, sempre com confirmação (mostrarAlerta).
 * `aoConcluir` roda depois do sucesso (recarregar a lista/detalhe).
 */
export function useGestaoAprovacao(aoConcluir?: () => unknown) {
  const [processando, setProcessando] = useState<number | null>(null);

  const executar = useCallback(
    async (id: number, acao: (id: number) => Promise<unknown>, falha: string) => {
      setProcessando(id);

      try {
        await acao(id);
        await aoConcluir?.();
      } catch (e) {
        mostrarAlerta('Erro', mensagemErro(e, falha));
      } finally {
        setProcessando(null);
      }
    },
    [aoConcluir]
  );

  const aprovar = useCallback(
    (aluno: { id: number; nome: string }) => {
      mostrarAlerta('Aprovar cadastro', `Aprovar o cadastro de ${aluno.nome}? O aluno poderá entrar no app.`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Aprovar', onPress: () => executar(aluno.id, aprovarAluno, 'Erro ao aprovar o cadastro.') },
      ]);
    },
    [executar]
  );

  const recusar = useCallback(
    (aluno: { id: number; nome: string }) => {
      mostrarAlerta('Recusar cadastro', `Recusar o cadastro de ${aluno.nome}?`, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Recusar',
          style: 'destructive',
          onPress: () => executar(aluno.id, recusarAluno, 'Erro ao recusar o cadastro.'),
        },
      ]);
    },
    [executar]
  );

  return { aprovar, recusar, processando };
}
