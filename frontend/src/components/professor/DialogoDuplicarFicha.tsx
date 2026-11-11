import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Botao } from '@/components/ui/Botao';
import { CampoSelecao } from '@/components/ui/CampoSelecao';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { Modal } from '@/components/ui/Modal';
import { useAlunos } from '@/hooks/useAlunos';
import { cores } from '@/theme';
import { FichaLista } from '@/types/ficha.types';

export interface ResultadoDuplicar {
  aluno_id?: number;
  nome?: string;
}

interface DialogoDuplicarFichaProps {
  /** Ficha a duplicar; `null` = fechado. */
  ficha: Pick<FichaLista, 'id' | 'nome' | 'aluno_id' | 'aluno_nome'> | null;
  salvando?: boolean;
  erro?: string | null;
  aoFechar: () => void;
  aoConfirmar: (ficha: { id: number }, dados: ResultadoDuplicar) => void;
}

/** Duplicar ficha: nome e aluno (só os vinculados ao professor). A cópia nasce como rascunho. */
export function DialogoDuplicarFicha({
  ficha,
  salvando = false,
  erro,
  aoFechar,
  aoConfirmar,
}: DialogoDuplicarFichaProps) {
  const { alunos, carregando: carregandoAlunos } = useAlunos();
  const [nome, setNome] = useState('');
  const [alunoId, setAlunoId] = useState<number | null>(null);

  useEffect(() => {
    if (ficha) {
      setNome(`${ficha.nome} (cópia)`);
      setAlunoId(ficha.aluno_id);
    }
  }, [ficha]);

  const opcoes = alunos.map((a) => ({ valor: a.id, rotulo: a.nome }));

  if (ficha && !opcoes.some((o) => o.valor === ficha.aluno_id)) {
    opcoes.unshift({ valor: ficha.aluno_id, rotulo: ficha.aluno_nome });
  }

  function confirmar() {
    if (!ficha) {
      return;
    }

    aoConfirmar(ficha, {
      ...(alunoId && alunoId !== ficha.aluno_id ? { aluno_id: alunoId } : {}),
      ...(nome.trim() ? { nome: nome.trim() } : {}),
    });
  }

  return (
    <Modal
      visivel={Boolean(ficha)}
      titulo="Duplicar ficha"
      aoFechar={aoFechar}
      testID="dialogo-duplicar"
      rodape={
        <Botao
          icone="copy-outline"
          onPress={confirmar}
          carregando={salvando}
          disabled={salvando || !nome.trim() || !alunoId}
          testID="duplicar-confirmar"
        >
          Duplicar como rascunho
        </Botao>
      }
    >
      <Text style={estilos.texto}>
        Copia os treinos e exercícios ativos de “{ficha?.nome}” para uma nova ficha em rascunho. O aluno só a
        verá depois de publicada.
      </Text>

      <CampoTexto
        rotulo="Nome da nova ficha"
        value={nome}
        onChangeText={setNome}
        maxLength={150}
        testID="duplicar-nome"
      />

      <CampoSelecao
        rotulo="Aluno"
        opcoes={opcoes}
        valor={alunoId}
        aoMudar={setAlunoId}
        buscavel
        disabled={carregandoAlunos}
        testID="duplicar-aluno"
      />

      {erro ? (
        <Text style={estilos.erro} accessibilityRole="alert" testID="duplicar-erro">
          {erro}
        </Text>
      ) : null}
    </Modal>
  );
}

const estilos = StyleSheet.create({
  texto: { color: cores.textoSecundario, fontSize: 14, lineHeight: 20, marginBottom: 16 },
  erro: { color: cores.perigo, fontSize: 13, marginTop: 4 },
});
