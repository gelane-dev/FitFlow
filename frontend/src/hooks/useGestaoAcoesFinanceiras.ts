import { useCallback } from 'react';

import type { ResultadoDialogoMatricula } from '@/components/gestao/DialogoMatricula';
import type { ResultadoDialogoPagamento } from '@/components/gestao/DialogoPagamento';
import { alterarPlanoMatricula, cancelarMatricula, criarMatricula, renovarMatricula } from '@/services/matriculas.service';
import { criarPagamentoAvulso, estornarPagamento, registrarPagamento } from '@/services/pagamentos.service';

import { useGestaoAcao } from './useGestaoAcao';

/**
 * Executa o que os diálogos de matrícula e de pagamento devolvem. Cada função devolve null no
 * sucesso ou a mensagem de erro do servidor (ex.: 403 "Permissão insuficiente", 409), que o
 * diálogo exibe sem fechar. `aoConcluir` roda depois do sucesso (recarregar as seções).
 */
export function useGestaoAcoesFinanceiras(aoConcluir?: () => unknown) {
  const { processando: executando, executar } = useGestaoAcao();

  const rodar = useCallback(
    async (acao: () => Promise<unknown>, falha: string): Promise<string | null> => {
      const resultado = await executar(async () => {
        await acao();
        await aoConcluir?.();
      }, falha);

      return resultado.ok ? null : resultado.erro;
    },
    [executar, aoConcluir]
  );

  const executarMatricula = useCallback(
    (resultado: ResultadoDialogoMatricula, matriculaId?: number) => {
      switch (resultado.modo) {
        case 'nova':
          return rodar(() => criarMatricula(resultado.dados), 'Erro ao matricular.');
        case 'renovar':
          return rodar(() => renovarMatricula(matriculaId as number, resultado.dados), 'Erro ao renovar a matrícula.');
        case 'alterar':
          return rodar(() => alterarPlanoMatricula(matriculaId as number, resultado.dados), 'Erro ao alterar o plano.');
        default:
          return rodar(() => cancelarMatricula(matriculaId as number, resultado.dados), 'Erro ao cancelar a matrícula.');
      }
    },
    [rodar]
  );

  const executarPagamento = useCallback(
    (resultado: ResultadoDialogoPagamento, pagamentoId?: number) => {
      switch (resultado.modo) {
        case 'registrar':
          return rodar(
            () => registrarPagamento(pagamentoId as number, resultado.dados),
            'Erro ao registrar o recebimento.'
          );
        case 'avulso':
          return rodar(() => criarPagamentoAvulso(resultado.dados), 'Erro ao registrar o pagamento avulso.');
        default:
          return rodar(() => estornarPagamento(pagamentoId as number, resultado.dados), 'Erro ao estornar o pagamento.');
      }
    },
    [rodar]
  );

  return { executando, executarMatricula, executarPagamento };
}
