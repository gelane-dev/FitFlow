import { StyleSheet, Text, View } from 'react-native';

import { EstadoErroSecao } from '@/components/ui/EstadoErroSecao';
import { EstadoVazio } from '@/components/ui/EstadoVazio';
import { SkeletonLista } from '@/components/ui/Skeleton';
import { cores } from '@/theme';
import type { MatriculaResposta } from '@/types/gestao.types';
import { formatarData } from '@/utils/datas';
import { formatarMoeda } from '@/utils/moeda';
import { statusMatricula } from '@/utils/situacao';

import { SeloSituacao } from '@/components/ui/SeloSituacao';

export interface ListaMatriculasProps {
  matriculas: MatriculaResposta[];
  carregando?: boolean;
  erro?: string | null;
  aoTentarNovamente?: () => void;
  testID?: string;
}

/** Histórico de matrículas do aluno (ativa, encerrada, substituída, cancelada). */
export function ListaMatriculas({ matriculas, carregando, erro, aoTentarNovamente, testID = 'lista-matriculas' }: ListaMatriculasProps) {
  if (carregando && matriculas.length === 0) return <SkeletonLista linhas={2} />;
  if (erro) return <EstadoErroSecao mensagem={erro} aoTentarNovamente={aoTentarNovamente} testID={`${testID}-erro`} />;
  if (matriculas.length === 0) {
    return <EstadoVazio icone="document-text-outline" titulo="Nenhuma matrícula registrada" />;
  }

  return (
    <View testID={testID}>
      {matriculas.map((m) => (
        <View key={m.id} style={estilos.linha} testID={`${testID}-${m.id}`}>
          <View style={estilos.texto}>
            <Text style={estilos.plano}>{m.plano.nome}</Text>
            <Text style={estilos.detalhe}>
              {formatarData(m.data_inicio)} a {formatarData(m.data_vencimento)} · {formatarMoeda(m.valor)}
            </Text>
            {m.motivo_cancelamento ? <Text style={estilos.detalhe}>Motivo: {m.motivo_cancelamento}</Text> : null}
          </View>
          <SeloSituacao info={statusMatricula(m.status)} />
        </View>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: cores.borda,
  },
  texto: { flex: 1, gap: 2 },
  plano: { color: cores.texto, fontSize: 15, fontWeight: '600' },
  detalhe: { color: cores.textoSecundario, fontSize: 13 },
});
