import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Botao } from '@/components/ui/Botao';
import { CampoMoeda } from '@/components/ui/CampoMoeda';
import { CampoSelecao } from '@/components/ui/CampoSelecao';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { Modal } from '@/components/ui/Modal';
import { cores } from '@/theme';
import type {
  FormaPagamento,
  PagamentoAvulsoCriar,
  PagamentoEstornar,
  PagamentoRegistrar,
  PagamentoResposta,
} from '@/types/gestao.types';
import { mostrarAlerta } from '@/utils/alerta';
import { decimalParaCampo } from '@/utils/campoMoeda';
import { validarAvulso, validarMotivo, validarRecebimento } from '@/utils/gestaoRecepcao';
import { formatarMoeda } from '@/utils/moeda';
import { FORMAS_PAGAMENTO } from '@/utils/situacao';

export type ModoDialogoPagamento = 'registrar' | 'avulso' | 'estornar';

export type ResultadoDialogoPagamento =
  | { modo: 'registrar'; dados: PagamentoRegistrar }
  | { modo: 'avulso'; dados: PagamentoAvulsoCriar }
  | { modo: 'estornar'; dados: PagamentoEstornar };

export interface DialogoPagamentoProps {
  visivel: boolean;
  modo: ModoDialogoPagamento;
  /** Pagamento pendente (registrar) ou pago (estornar). */
  pagamento?: PagamentoResposta | null;
  /** Aluno do pagamento avulso. */
  aluno?: { id: number; nome: string } | null;
  aoFechar: () => void;
  /** Devolve null no sucesso (o diálogo fecha) ou a mensagem de erro (fica aberto e mostra). */
  aoConfirmar: (resultado: ResultadoDialogoPagamento) => Promise<string | null>;
}

const TITULOS: Record<ModoDialogoPagamento, string> = {
  registrar: 'Registrar recebimento',
  avulso: 'Pagamento avulso',
  estornar: 'Estornar pagamento',
};

const OPCOES_FORMA = (Object.keys(FORMAS_PAGAMENTO) as FormaPagamento[]).map((forma) => ({
  valor: forma,
  rotulo: FORMAS_PAGAMENTO[forma].rotulo,
}));

/** Registrar recebimento de pendente, lançar pagamento avulso (já pago) ou estornar. */
export function DialogoPagamento({ visivel, modo, pagamento, aluno, aoFechar, aoConfirmar }: DialogoPagamentoProps) {
  const [forma, setForma] = useState<FormaPagamento | null>(null);
  const [campoValor, setCampoValor] = useState('');
  const [valor, setValor] = useState<string | null>(null);
  const [descricao, setDescricao] = useState('');
  const [motivo, setMotivo] = useState('');
  const [tentou, setTentou] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (visivel) {
      const inicial = modo === 'registrar' && pagamento ? pagamento.valor : null;

      setForma(null);
      setCampoValor(inicial ? decimalParaCampo(inicial) : '');
      setValor(inicial);
      setDescricao('');
      setMotivo('');
      setTentou(false);
      setErro(null);
    }
    // Só reinicia ao abrir ou trocar de pagamento (uma recarga da lista não pode apagar o que foi digitado).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visivel, modo, pagamento?.id, pagamento?.valor]);

  const errosRecebimento = validarRecebimento({ forma, valor });
  const errosAvulso = validarAvulso({ alunoId: aluno?.id ?? null, descricao, valor, forma });
  const erros = modo === 'registrar' ? errosRecebimento : modo === 'avulso' ? errosAvulso : validarMotivo(motivo);
  const mostrar = (campo: string) => (tentou ? (erros as Record<string, string | undefined>)[campo] ?? null : null);

  async function executar(resultado: ResultadoDialogoPagamento) {
    setEnviando(true);
    setErro(null);

    const falha = await aoConfirmar(resultado);

    setEnviando(false);

    if (falha) {
      setErro(falha);

      return;
    }

    aoFechar();
  }

  function confirmar() {
    setTentou(true);

    if (Object.values(erros).some(Boolean)) return;

    if (modo === 'registrar') {
      executar({
        modo,
        dados: { forma: forma as FormaPagamento, ...(valor !== null ? { valor_recebido: valor } : {}) },
      });
    } else if (modo === 'avulso') {
      executar({
        modo,
        dados: {
          aluno_id: (aluno as { id: number }).id,
          descricao: descricao.trim(),
          valor: valor as string,
          forma: forma as FormaPagamento,
        },
      });
    } else {
      mostrarAlerta('Estornar pagamento', 'O pagamento será marcado como estornado. Essa ação não pode ser desfeita.', [
        { text: 'Voltar', style: 'cancel' },
        {
          text: 'Estornar',
          style: 'destructive',
          onPress: () => executar({ modo, dados: { motivo: motivo.trim() } }),
        },
      ]);
    }
  }

  return (
    <Modal
      visivel={visivel}
      titulo={TITULOS[modo]}
      aoFechar={aoFechar}
      testID="dialogo-pagamento"
      rodape={
        <>
          <Botao variante="secundario" larguraTotal={false} onPress={aoFechar} testID="pagamento-voltar">
            Voltar
          </Botao>
          <Botao
            variante={modo === 'estornar' ? 'perigo' : 'primario'}
            larguraTotal={false}
            carregando={enviando}
            onPress={confirmar}
            testID="pagamento-confirmar"
          >
            {modo === 'estornar' ? 'ESTORNAR' : modo === 'avulso' ? 'LANÇAR PAGAMENTO' : 'CONFIRMAR RECEBIMENTO'}
          </Botao>
        </>
      }
    >
      {pagamento && modo !== 'avulso' ? (
        <Text style={estilos.resumo}>
          {pagamento.descricao} · {pagamento.aluno.nome} · {formatarMoeda(pagamento.valor)}
        </Text>
      ) : null}
      {aluno && modo === 'avulso' ? <Text style={estilos.resumo}>Aluno: {aluno.nome}</Text> : null}

      {modo === 'estornar' ? (
        <CampoTexto
          rotulo="Motivo do estorno"
          value={motivo}
          onChangeText={setMotivo}
          multiline
          erro={mostrar('motivo')}
          testID="pagamento-motivo"
        />
      ) : (
        <>
          {modo === 'avulso' ? (
            <CampoTexto
              rotulo="Descrição"
              value={descricao}
              onChangeText={setDescricao}
              erro={mostrar('descricao')}
              testID="pagamento-descricao"
            />
          ) : null}
          <CampoMoeda
            rotulo={modo === 'registrar' ? 'Valor recebido' : 'Valor'}
            value={campoValor}
            onChangeValor={(texto, decimal) => {
              setCampoValor(texto);
              setValor(decimal);
            }}
            erro={mostrar('valor')}
            testID="pagamento-valor"
          />
          <CampoSelecao
            rotulo="Forma de pagamento"
            opcoes={OPCOES_FORMA}
            valor={forma}
            aoMudar={setForma}
            placeholder="Selecione a forma"
            erro={mostrar('forma')}
            testID="pagamento-forma"
          />
        </>
      )}

      {erro ? (
        <Text style={estilos.erro} accessibilityRole="alert" testID="pagamento-erro">
          {erro}
        </Text>
      ) : null}
    </Modal>
  );
}

const estilos = StyleSheet.create({
  resumo: { color: cores.textoSecundario, fontSize: 14, marginBottom: 16 },
  erro: { color: cores.perigo, fontSize: 14, marginTop: 4 },
});
