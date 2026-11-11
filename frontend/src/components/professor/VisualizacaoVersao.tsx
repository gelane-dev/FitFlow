import { StyleSheet, Text, View } from 'react-native';

import { Cartao } from '@/components/ui/Cartao';
import { cores } from '@/theme';
import { FichaCompleta, ItemFicha } from '@/types/ficha.types';
import { rotuloDiaCompleto } from '@/utils/diasSemana';
import { formatarNumeroBr } from '@/utils/numeros';
import { descreverVigencia } from '@/utils/vigencia';

/** "3 × 12 · 20 kg · descanso 60 s". */
export function resumoItem(item: Pick<ItemFicha, 'series' | 'repeticoes' | 'carga' | 'descanso'>): string {
  const carga = item.carga > 0 ? `${formatarNumeroBr(item.carga)} kg` : 'sem carga';

  return `${item.series} × ${item.repeticoes} · ${carga} · descanso ${item.descanso} s`;
}

/** Conteúdo de uma versão publicada, somente leitura (treinos e exercícios no momento da publicação). */
export function VisualizacaoVersao({ ficha }: { ficha: FichaCompleta }) {
  const vigencia = descreverVigencia(ficha.data_inicio, ficha.data_fim);
  const treinos = [...ficha.treinos].sort((a, b) => a.ordem - b.ordem);

  return (
    <View testID="versao-conteudo">
      <Cartao elevado>
        <Text style={estilos.titulo}>{ficha.nome}</Text>
        {ficha.objetivo ? <Text style={estilos.meta}>Objetivo: {ficha.objetivo}</Text> : null}
        {vigencia !== '' ? <Text style={estilos.meta}>{vigencia}</Text> : null}
      </Cartao>

      {treinos.length === 0 ? (
        <Text style={estilos.vazio}>Esta versão não tinha treinos.</Text>
      ) : (
        treinos.map((treino) => (
          <Cartao key={treino.id} style={estilos.treino}>
            <Text style={estilos.nomeTreino}>{treino.nome}</Text>
            <Text style={estilos.meta}>{rotuloDiaCompleto(treino.dia_semana)}</Text>

            {[...treino.itens]
              .sort((a, b) => a.ordem - b.ordem)
              .map((item, posicao) => (
                <View key={item.id} style={estilos.item}>
                  <Text style={estilos.nomeItem}>
                    {posicao + 1}. {item.nome}
                  </Text>
                  <Text style={estilos.meta}>{resumoItem(item)}</Text>
                  {item.observacao ? <Text style={estilos.obs}>Obs.: {item.observacao}</Text> : null}
                </View>
              ))}

            {treino.itens.length === 0 ? <Text style={estilos.vazio}>Sem exercícios.</Text> : null}
          </Cartao>
        ))
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  titulo: { color: cores.texto, fontSize: 18, fontWeight: '700' },
  meta: { color: cores.textoSecundario, fontSize: 13, marginTop: 4 },
  treino: { marginTop: 12 },
  nomeTreino: { color: cores.primaria, fontSize: 16, fontWeight: '700' },
  item: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: cores.borda,
  },
  nomeItem: { color: cores.texto, fontSize: 15, fontWeight: '600' },
  obs: { color: cores.textoSecundario, fontSize: 13, fontStyle: 'italic', marginTop: 4 },
  vazio: { color: cores.textoTerciario, fontSize: 14, marginTop: 12 },
});
