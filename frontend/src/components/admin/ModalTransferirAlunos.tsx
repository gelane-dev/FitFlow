import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Botao } from '@/components/ui/Botao';
import { CampoSelecao } from '@/components/ui/CampoSelecao';
import { Modal } from '@/components/ui/Modal';
import { cores, espacamento, tipografia } from '@/theme';
import { ProfessorGestaoItem } from '@/types/gestao.types';

export interface ModalTransferirAlunosProps {
  visivel: boolean;
  origem: { id: number; nome: string; total_alunos: number } | null;
  /** Professores da academia; só os ativos e diferentes da origem entram como destino. */
  professores: ProfessorGestaoItem[];
  /** Quantidade de alunos selecionados (transferência parcial); sem ela, transfere todos. */
  quantidadeSelecionada?: number;
  enviando?: boolean;
  /** Texto de abertura (ex.: após desativar o professor). */
  introducao?: string;
  aoFechar: () => void;
  /** `destinoId` nulo = deixar os alunos sem professor. */
  aoConfirmar: (destinoId: number | null) => void;
}

const SEM_PROFESSOR = 0;

/** Escolhe o professor de destino (ou "sem professor") para os alunos de `origem`. */
export function ModalTransferirAlunos({
  visivel,
  origem,
  professores,
  quantidadeSelecionada,
  enviando,
  introducao,
  aoFechar,
  aoConfirmar,
}: ModalTransferirAlunosProps) {
  const [destino, setDestino] = useState<number | null>(null);

  useEffect(() => {
    if (visivel) setDestino(null);
  }, [visivel]);

  const opcoes = useMemo(
    () => [
      { valor: SEM_PROFESSOR, rotulo: 'Sem professor', descricao: 'Os alunos ficam sem professor responsável.' },
      ...professores
        .filter((p) => p.ativo && p.id !== origem?.id)
        .map((p) => ({ valor: p.id, rotulo: p.nome, descricao: `${p.total_alunos} aluno(s) hoje` })),
    ],
    [professores, origem]
  );

  const quantidade = quantidadeSelecionada ?? origem?.total_alunos ?? 0;

  return (
    <Modal
      visivel={visivel}
      titulo="Transferir alunos"
      aoFechar={aoFechar}
      testID="modal-transferir"
      rodape={
        <View style={estilos.rodape}>
          <Botao variante="secundario" onPress={aoFechar} disabled={enviando} testID="transferir-cancelar">
            Agora não
          </Botao>
          <Botao
            onPress={() => aoConfirmar(destino === SEM_PROFESSOR ? null : destino)}
            disabled={destino === null}
            carregando={enviando}
            testID="transferir-confirmar"
          >
            {`Transferir ${quantidade} aluno(s)`}
          </Botao>
        </View>
      }
    >
      <View style={estilos.corpo}>
        {introducao ? <Text style={estilos.texto}>{introducao}</Text> : null}
        <Text style={estilos.texto}>
          {origem ? `Alunos de ${origem.nome} que serão transferidos: ${quantidade}.` : ''}
        </Text>
        <CampoSelecao
          rotulo="Novo professor"
          opcoes={opcoes}
          valor={destino}
          aoMudar={setDestino}
          placeholder="Escolha o destino"
          testID="transferir-destino"
        />
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  corpo: { gap: espacamento.md },
  texto: { ...tipografia.corpo, color: cores.textoSecundario },
  rodape: { gap: espacamento.sm },
});
