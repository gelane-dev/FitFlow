import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Pressionavel } from '@/components/ui/Pressionavel';
import { cores, espacamento, tipografia } from '@/theme';
import { AtividadeAuditoria, AuditoriaItem } from '@/types/gestao.types';
import { formatarDetalhe, rotuloAcao, rotuloTipoUsuario } from '@/utils/auditoria';
import { formatarData } from '@/utils/datas';
import { formatarHora } from '@/utils/evolucao';

export interface ItemAuditoriaProps {
  item: AuditoriaItem | (AtividadeAuditoria & { detalhes?: null; usuario?: null });
  /** Mostra o nome do usuário (na atividade de uma pessoa só, é redundante). */
  mostrarUsuario?: boolean;
  testID?: string;
}

/** Linha de auditoria: ação, descrição e quem fez; tocar expande os detalhes. */
export function ItemAuditoria({ item, mostrarUsuario = true, testID }: ItemAuditoriaProps) {
  const [aberto, setAberto] = useState(false);
  const detalhes = Object.entries((item.detalhes ?? {}) as Record<string, unknown>);
  const usuario = item.usuario;

  return (
    <View style={estilos.raiz} testID={testID}>
      <Pressionavel
        onPress={() => setAberto((a) => !a)}
        haptico={false}
        escala={1}
        accessibilityRole="button"
        accessibilityState={{ expanded: aberto }}
        accessibilityLabel={`${rotuloAcao(item.acao)}. ${item.descricao}. Toque para ${aberto ? 'recolher' : 'ver'} os detalhes`}
        style={estilos.linha}
      >
        <View style={estilos.textos}>
          <Text style={estilos.acao}>{rotuloAcao(item.acao)}</Text>
          <Text style={estilos.descricao}>{item.descricao}</Text>
          <Text style={estilos.meta}>
            {formatarData(item.data_hora)} às {formatarHora(item.data_hora)}
            {mostrarUsuario ? ` · ${usuario ? `${usuario.nome} (${rotuloTipoUsuario(usuario.tipo)})` : 'Sistema'}` : ''}
          </Text>
        </View>
        <Ionicons name={aberto ? 'chevron-up' : 'chevron-down'} size={18} color={cores.textoSecundario} />
      </Pressionavel>

      {aberto ? (
        <View style={estilos.detalhes} testID={testID ? `${testID}-detalhes` : undefined}>
          <Text style={estilos.meta}>
            Código: {item.acao} · {item.entidade}
            {item.entidade_id !== null ? ` #${item.entidade_id}` : ''}
          </Text>
          {detalhes.length === 0 ? (
            <Text style={estilos.meta}>Sem detalhes adicionais.</Text>
          ) : (
            detalhes.map(([chave, valor]) => (
              <Text key={chave} style={estilos.detalhe}>
                <Text style={estilos.chave}>{chave.replace(/_/g, ' ')}: </Text>
                {formatarDetalhe(valor)}
              </Text>
            ))
          )}
        </View>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: cores.borda },
  linha: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: espacamento.md, paddingVertical: espacamento.md },
  textos: { flex: 1, gap: 2 },
  acao: { ...tipografia.corpoForte, color: cores.texto },
  descricao: { ...tipografia.corpo, color: cores.textoSecundario },
  meta: { ...tipografia.legenda, color: cores.textoTerciario },
  detalhes: { gap: 4, paddingBottom: espacamento.md, paddingLeft: espacamento.sm },
  detalhe: { ...tipografia.legenda, color: cores.textoSecundario },
  chave: { color: cores.texto, fontWeight: '700' },
});
