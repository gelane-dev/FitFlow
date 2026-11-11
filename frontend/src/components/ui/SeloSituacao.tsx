import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { cores, raios, tamanhos } from '@/theme';
import type { ResultadoAcesso, SituacaoAluno } from '@/types/gestao.types';
import {
  corDoTom,
  resultadoAcesso,
  SITUACOES_ALUNO,
  situacaoAluno,
  type InfoSituacao,
} from '@/utils/situacao';

export type SituacaoSelo = SituacaoAluno | ResultadoAcesso;

/** Menor tamanho de texto aceito num selo (legibilidade), mesmo que o token `rotulo` seja menor. */
const TAMANHO_MINIMO_TEXTO = 12;
const TAMANHO_TEXTO = Math.max(tamanhos.rotulo, TAMANHO_MINIMO_TEXTO);

/** Uma tabela só: rótulo, tom e ícone vêm de `utils/situacao.ts`. Cor **e** texto **e** ícone. */
function consultarSituacao(situacao: string): InfoSituacao {
  return Object.prototype.hasOwnProperty.call(SITUACOES_ALUNO, situacao)
    ? situacaoAluno(situacao)
    : resultadoAcesso(situacao);
}

export interface SeloSituacaoProps {
  /** Situação conhecida; qualquer outro texto aparece como está, em tom neutro. Ignorada quando `info` é passado. */
  situacao?: SituacaoSelo | (string & {});
  /** Descrição pronta de `utils/situacao` (ex.: `statusPagamento(p.status)`); tem prioridade sobre `situacao`. */
  info?: InfoSituacao;
  /** Substitui o rótulo padrão (ex.: "Vence em 3 dias"). */
  rotulo?: string;
  testID?: string;
}

/** Selo de situação de matrícula, cadastro, pagamento ou acesso (cor + ícone + texto, texto mínimo 12). */
export function SeloSituacao({ situacao, info, rotulo, testID }: SeloSituacaoProps) {
  const config = info ?? consultarSituacao(situacao ?? '');
  const cor = cores[corDoTom(config.tom)];
  const texto = rotulo ?? config.rotulo;

  return (
    <View
      style={[estilos.selo, { borderColor: cor }]}
      accessible
      accessibilityLabel={`Situação: ${texto}`}
      testID={testID}
    >
      <Ionicons name={config.icone} size={TAMANHO_TEXTO} color={cor} />
      <Text style={[estilos.texto, { color: cor }]}>{texto}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  selo: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: raios.chip,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  texto: { fontSize: TAMANHO_TEXTO, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
});
