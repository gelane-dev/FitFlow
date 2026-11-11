import { StyleSheet, Text, View } from 'react-native';

import { Botao } from '@/components/ui/Botao';
import { EstadoErroSecao } from '@/components/ui/EstadoErroSecao';
import { EstadoVazio } from '@/components/ui/EstadoVazio';
import { SkeletonLista } from '@/components/ui/Skeleton';
import { cores } from '@/theme';
import type { PagamentoResposta, PermissaoRecepcao } from '@/types/gestao.types';
import { formatarData } from '@/utils/datas';
import { temPermissao } from '@/utils/gestaoRecepcao';
import { formatarMoeda } from '@/utils/moeda';
import { formaPagamento, statusPagamento } from '@/utils/situacao';

import { SeloSituacao } from '@/components/ui/SeloSituacao';

export interface ListaPagamentosProps {
  pagamentos: PagamentoResposta[];
  permissoes: readonly PermissaoRecepcao[];
  carregando?: boolean;
  erro?: string | null;
  aoTentarNovamente?: () => void;
  aoRegistrar?: (pagamento: PagamentoResposta) => void;
  aoEstornar?: (pagamento: PagamentoResposta) => void;
  aoVerComprovante?: (pagamento: PagamentoResposta) => void;
  testID?: string;
}

/** Pagamentos do aluno com as ações permitidas (receber, estornar, comprovante). */
export function ListaPagamentos({
  pagamentos,
  permissoes,
  carregando,
  erro,
  aoTentarNovamente,
  aoRegistrar,
  aoEstornar,
  aoVerComprovante,
  testID = 'lista-pagamentos',
}: ListaPagamentosProps) {
  if (carregando && pagamentos.length === 0) return <SkeletonLista linhas={2} />;
  if (erro) return <EstadoErroSecao mensagem={erro} aoTentarNovamente={aoTentarNovamente} testID={`${testID}-erro`} />;
  if (pagamentos.length === 0) {
    return <EstadoVazio icone="card-outline" titulo="Nenhum pagamento registrado" />;
  }

  return (
    <View testID={testID}>
      {pagamentos.map((p) => {
        const comprovavel = p.status === 'pago' || p.status === 'estornado';

        return (
          <View key={p.id} style={estilos.linha} testID={`${testID}-${p.id}`}>
            <View style={estilos.topo}>
              <View style={estilos.texto}>
                <Text style={estilos.descricao}>{p.descricao}</Text>
                <Text style={estilos.detalhe}>
                  {formatarMoeda(p.valor)} · vence {formatarData(p.vencimento)}
                  {p.forma ? ` · ${formaPagamento(p.forma).rotulo}` : ''}
                </Text>
                {p.motivo_estorno ? <Text style={estilos.detalhe}>Estorno: {p.motivo_estorno}</Text> : null}
              </View>
              <SeloSituacao info={statusPagamento(p.status)} />
            </View>

            <View style={estilos.acoes}>
              {p.status === 'pendente' && temPermissao(permissoes, 'registrar_pagamento') && aoRegistrar ? (
                <Botao
                  tamanho="medio"
                  larguraTotal={false}
                  icone="cash-outline"
                  onPress={() => aoRegistrar(p)}
                  testID={`pagamento-${p.id}-receber`}
                >
                  Registrar recebimento
                </Botao>
              ) : null}
              {p.status === 'pago' && temPermissao(permissoes, 'estornar_pagamento') && aoEstornar ? (
                <Botao
                  tamanho="medio"
                  larguraTotal={false}
                  variante="perigo"
                  onPress={() => aoEstornar(p)}
                  testID={`pagamento-${p.id}-estornar`}
                >
                  Estornar
                </Botao>
              ) : null}
              {comprovavel && aoVerComprovante ? (
                <Botao
                  tamanho="medio"
                  larguraTotal={false}
                  variante="secundario"
                  icone="receipt-outline"
                  onPress={() => aoVerComprovante(p)}
                  testID={`pagamento-${p.id}-comprovante`}
                >
                  Comprovante
                </Botao>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  linha: { paddingVertical: 12, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: cores.borda },
  topo: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  texto: { flex: 1, gap: 2 },
  descricao: { color: cores.texto, fontSize: 15, fontWeight: '600' },
  detalhe: { color: cores.textoSecundario, fontSize: 13 },
  acoes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
