import { StyleSheet, Text, View } from 'react-native';

import { EstadoErroSecao } from '@/components/ui/EstadoErroSecao';
import { EstadoVazio } from '@/components/ui/EstadoVazio';
import { SkeletonLista } from '@/components/ui/Skeleton';
import { cores } from '@/theme';
import type { AcessoResposta, EntradaResumo } from '@/types/gestao.types';
import { formatarData } from '@/utils/datas';
import { horaDaApi } from '@/utils/gestaoRecepcao';
import { motivoBloqueio, resultadoAcesso } from '@/utils/situacao';

import { SeloSituacao } from '@/components/ui/SeloSituacao';

/**
 * Entrada exibida na lista: `AcessoResposta` (`GET /acessos`, com `aluno` e `motivos`) ou
 * `EntradaResumo` (`ultimas_entradas` de `GET /acessos/verificar`, sem eles).
 */
export type EntradaHistorico = EntradaResumo & Partial<Pick<AcessoResposta, 'aluno' | 'motivos'>>;

export interface HistoricoEntradasProps {
  acessos: EntradaHistorico[];
  carregando?: boolean;
  erro?: string | null;
  aoTentarNovamente?: () => void;
  /** Mostra o nome do aluno em cada linha (lista do dia). */
  mostrarAluno?: boolean;
  /** Mostra a data além da hora (histórico do aluno). */
  mostrarData?: boolean;
  textoVazio?: string;
  testID?: string;
}

/** Lista de entradas (liberadas e bloqueadas), com hora, resultado, motivos e marca de liberação manual. */
export function HistoricoEntradas({
  acessos,
  carregando,
  erro,
  aoTentarNovamente,
  mostrarAluno = false,
  mostrarData = false,
  textoVazio = 'Nenhuma entrada registrada',
  testID = 'historico-entradas',
}: HistoricoEntradasProps) {
  if (carregando && acessos.length === 0) return <SkeletonLista linhas={3} />;
  if (erro) return <EstadoErroSecao mensagem={erro} aoTentarNovamente={aoTentarNovamente} testID={`${testID}-erro`} />;
  if (acessos.length === 0) return <EstadoVazio icone="enter-outline" titulo={textoVazio} />;

  return (
    <View testID={testID}>
      {acessos.map((a) => (
        <View key={a.id} style={estilos.linha} testID={`${testID}-${a.id}`}>
          <Text style={estilos.hora}>
            {mostrarData ? `${formatarData(a.data_hora)} ` : ''}
            {horaDaApi(a.data_hora)}
          </Text>
          <View style={estilos.texto}>
            {mostrarAluno && a.aluno ? <Text style={estilos.nome}>{a.aluno.nome}</Text> : null}
            {a.motivos && a.motivos.length > 0 ? (
              <Text style={estilos.detalhe}>{a.motivos.map((m) => motivoBloqueio(m).rotulo).join(', ')}</Text>
            ) : null}
            {a.liberacao_manual ? <Text style={estilos.manual}>Liberação manual</Text> : null}
          </View>
          <SeloSituacao info={resultadoAcesso(a.resultado)} />
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
  hora: { color: cores.texto, fontSize: 15, fontWeight: '700', minWidth: 54 },
  texto: { flex: 1, gap: 2 },
  nome: { color: cores.texto, fontSize: 15 },
  detalhe: { color: cores.textoSecundario, fontSize: 13 },
  manual: { color: cores.aviso, fontSize: 12, fontWeight: '600' },
});
