import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Botao } from '@/components/ui/Botao';
import { espacamento } from '@/theme';
import type { GestaoAlunoDetalhe } from '@/types/gestao.types';

export interface AcoesAlunoGestaoProps {
  aluno: Pick<GestaoAlunoDetalhe, 'id' | 'status_cadastro'>;
  /** Mostra "Editar" (admin: sempre; recepção: permissão `editar_aluno`). */
  podeEditar: boolean;
  /** Mostra "Aprovar/Recusar" quando o cadastro está pendente (recepção: permissão `aprovar_aluno`). */
  podeAprovar: boolean;
  aoEditar: () => void;
  /** Id do aluno em aprovação/recusa (desabilita os botões). */
  processando: number | null;
  aoAprovar: () => void;
  aoRecusar: () => void;
  /** Ações exclusivas do papel (ex.: Ativar/Desativar do admin). */
  children?: ReactNode;
}

/** Botões do cabeçalho do detalhe do aluno: editar, aprovar/recusar e as ações extras do papel. */
export function AcoesAlunoGestao({ aluno, podeEditar, podeAprovar, aoEditar, processando, aoAprovar, aoRecusar, children }: AcoesAlunoGestaoProps) {
  return (
    <View style={estilos.acoes}>
      {podeEditar ? (
        <Botao variante="secundario" tamanho="medio" icone="create-outline" larguraTotal={false} onPress={aoEditar} testID="aluno-editar">
          Editar
        </Botao>
      ) : null}
      {podeAprovar && aluno.status_cadastro === 'pendente' ? (
        <>
          <Botao tamanho="medio" icone="checkmark" larguraTotal={false} disabled={processando === aluno.id} onPress={aoAprovar} testID="aluno-aprovar">
            Aprovar
          </Botao>
          <Botao variante="perigo" tamanho="medio" larguraTotal={false} disabled={processando === aluno.id} onPress={aoRecusar} testID="aluno-recusar">
            Recusar
          </Botao>
        </>
      ) : null}
      {children}
    </View>
  );
}

const estilos = StyleSheet.create({
  acoes: { flexDirection: 'row', flexWrap: 'wrap', gap: espacamento.sm },
});
