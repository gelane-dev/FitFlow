import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { BlocoEstatistica } from '@/components/ui/BlocoEstatistica';
import { Botao } from '@/components/ui/Botao';
import { Cartao } from '@/components/ui/Cartao';
import { HeroGradiente } from '@/components/ui/HeroGradiente';
import { Pressionavel } from '@/components/ui/Pressionavel';
import { cores, fonteDisplay, raios } from '@/theme';

const NIVEIS_ESFORCO = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

type ResumoTreinoProps = {
  treinoNome: string;
  duracao: string;
  series: string;
  volume: string;
  incompleto: boolean;
  esforco: number | undefined;
  onEsforco: (nivel: number) => void;
  comentario: string;
  onComentario: (texto: string) => void;
  finalizando: boolean;
  onFinalizar: () => void;
  onVoltar: () => void;
};

/** Tela de resumo celebratória: duração, séries, volume, esforço de 1 a 10 e comentário. */
export function ResumoTreino({
  treinoNome,
  duracao,
  series,
  volume,
  incompleto,
  esforco,
  onEsforco,
  comentario,
  onComentario,
  finalizando,
  onFinalizar,
  onVoltar,
}: ResumoTreinoProps) {
  return (
    <View testID="resumo-treino">
      <HeroGradiente style={estilos.hero}>
        <View style={estilos.trofeu}>
          <Ionicons name="trophy" size={32} color={cores.primaria} />
        </View>
        <Text style={estilos.titulo}>{incompleto ? 'Bom trabalho!' : 'Treino concluído!'}</Text>
        <Text style={estilos.subtitulo}>{treinoNome}</Text>
      </HeroGradiente>

      <Cartao style={estilos.estatisticas}>
        <BlocoEstatistica valor={duracao} rotulo="Duração" destaque />
        <BlocoEstatistica valor={series} rotulo="Séries" />
        <BlocoEstatistica valor={volume} unidade="kg" rotulo="Volume" />
      </Cartao>

      <Text style={estilos.secao}>Esforço percebido (1 a 10)</Text>
      <View style={estilos.escala}>
        {NIVEIS_ESFORCO.map((nivel) => {
          const ativo = esforco === nivel;

          return (
            <Pressionavel
              key={nivel}
              onPress={() => onEsforco(nivel)}
              haptico="leve"
              escala={0.92}
              accessibilityRole="button"
              accessibilityState={{ selected: ativo }}
              accessibilityLabel={`Esforço ${nivel}`}
              testID={`esforco-${nivel}`}
              style={[estilos.nivel, ativo && estilos.nivelAtivo]}
            >
              <Text style={[estilos.nivelTexto, ativo && estilos.nivelTextoAtivo]}>{nivel}</Text>
            </Pressionavel>
          );
        })}
      </View>
      <View style={estilos.legenda}>
        <Text style={estilos.legendaTexto}>Leve</Text>
        <Text style={estilos.legendaTexto}>Máximo</Text>
      </View>

      <Text style={estilos.secao}>Comentário (opcional)</Text>
      <TextInput
        style={estilos.comentario}
        value={comentario}
        onChangeText={onComentario}
        placeholder="Como foi o treino?"
        placeholderTextColor={cores.textoTerciario}
        multiline
        maxLength={500}
      />

      <View style={estilos.acoes}>
        <Botao
          icone="checkmark-circle"
          carregando={finalizando}
          onPress={onFinalizar}
          haptico
          testID="botao-finalizar"
        >
          Finalizar
        </Botao>
        <Botao variante="fantasma" tamanho="medio" onPress={onVoltar} disabled={finalizando}>
          Continuar treinando
        </Botao>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  hero: { alignItems: 'center', paddingVertical: 32 },
  trofeu: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: cores.sobrePrimaria,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  titulo: { color: cores.sobrePrimaria, fontFamily: fonteDisplay, fontSize: 26, textAlign: 'center' },
  subtitulo: { color: cores.sobrePrimaria, fontSize: 15, fontWeight: '600', marginTop: 6, opacity: 0.8 },
  estatisticas: { flexDirection: 'row', gap: 12, marginTop: 16 },
  secao: {
    color: cores.textoSecundario,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 28,
    marginBottom: 12,
  },
  escala: { flexDirection: 'row', gap: 6 },
  nivel: {
    flex: 1,
    height: 48,
    borderRadius: raios.chip,
    backgroundColor: cores.superficieElevada,
    borderWidth: 1,
    borderColor: cores.borda,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nivelAtivo: { backgroundColor: cores.primaria, borderColor: cores.primaria },
  nivelTexto: { color: cores.textoSecundario, fontSize: 15, fontWeight: '700' },
  nivelTextoAtivo: { color: cores.sobrePrimaria },
  legenda: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  legendaTexto: { color: cores.textoTerciario, fontSize: 11 },
  comentario: {
    minHeight: 88,
    backgroundColor: cores.superficieElevada,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raios.input,
    padding: 14,
    color: cores.texto,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  acoes: { marginTop: 28, gap: 8 },
});
