import { Modal } from '@/components/ui/Modal';
import type { GestaoAlunoDetalhe, MatriculaResposta, PagamentoResposta, PlanoResposta } from '@/types/gestao.types';

import { DialogoMatricula, ModoDialogoMatricula, ResultadoDialogoMatricula } from './DialogoMatricula';
import { DialogoPagamento, ModoDialogoPagamento, ResultadoDialogoPagamento } from './DialogoPagamento';
import { FormularioAluno, FormularioAlunoProps } from './FormularioAluno';

export interface EstadoDialogoPagamento {
  modo: ModoDialogoPagamento;
  pagamento: PagamentoResposta | null;
}

export interface DialogosAlunoGestaoProps {
  aluno: GestaoAlunoDetalhe;
  matriculaAtual: MatriculaResposta | null;
  planos: { dados: PlanoResposta[] | null; carregando: boolean; erro: string | null };
  /** `null` = diálogo de matrícula fechado. */
  modoMatricula: ModoDialogoMatricula | null;
  aoFecharMatricula: () => void;
  aoConfirmarMatricula: (resultado: ResultadoDialogoMatricula) => Promise<string | null>;
  /** `null` = diálogo de pagamento fechado. */
  dialogoPagamento: EstadoDialogoPagamento | null;
  aoFecharPagamento: () => void;
  aoConfirmarPagamento: (resultado: ResultadoDialogoPagamento) => Promise<string | null>;
  editando: boolean;
  aoFecharEdicao: () => void;
  /** Props do formulário de edição (salvar, enviando, erro, rótulo do botão). */
  formulario: Pick<FormularioAlunoProps, 'aoAtualizar' | 'enviando' | 'erroGeral' | 'rotuloEnviar'>;
}

/** Diálogos do detalhe do aluno: matrícula, pagamento e edição dos dados. O estado de abertura fica na tela. */
export function DialogosAlunoGestao({
  aluno,
  matriculaAtual,
  planos,
  modoMatricula,
  aoFecharMatricula,
  aoConfirmarMatricula,
  dialogoPagamento,
  aoFecharPagamento,
  aoConfirmarPagamento,
  editando,
  aoFecharEdicao,
  formulario,
}: DialogosAlunoGestaoProps) {
  return (
    <>
      <DialogoMatricula
        visivel={modoMatricula !== null}
        modo={modoMatricula ?? 'nova'}
        aluno={{ id: aluno.id, nome: aluno.nome }}
        matricula={matriculaAtual}
        planos={planos.dados ?? []}
        carregandoPlanos={planos.carregando}
        erroPlanos={planos.erro}
        aoFechar={aoFecharMatricula}
        aoConfirmar={aoConfirmarMatricula}
      />

      <DialogoPagamento
        visivel={dialogoPagamento !== null}
        modo={dialogoPagamento?.modo ?? 'registrar'}
        pagamento={dialogoPagamento?.pagamento}
        aluno={{ id: aluno.id, nome: aluno.nome }}
        aoFechar={aoFecharPagamento}
        aoConfirmar={aoConfirmarPagamento}
      />

      <Modal visivel={editando} titulo="Editar aluno" aoFechar={aoFecharEdicao} testID="modal-editar-aluno">
        <FormularioAluno modo="editar" valoresIniciais={aluno} {...formulario} />
      </Modal>
    </>
  );
}
