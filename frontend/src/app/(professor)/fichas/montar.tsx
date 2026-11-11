import { useLocalSearchParams } from 'expo-router';

import { TelaMontador } from '@/components/professor/TelaMontador';
import { paramTexto } from '@/utils/params';

/** Montador de fichas, ficha nova (/fichas/montar). Aceita ?alunoId= para pré-selecionar o aluno. */
export default function MontarFichaNova() {
  const { alunoId } = useLocalSearchParams();
  const aluno = Number(paramTexto(alunoId));

  return <TelaMontador fichaId={null} alunoIdInicial={aluno > 0 ? aluno : null} />;
}
