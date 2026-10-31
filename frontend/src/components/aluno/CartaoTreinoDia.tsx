import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Pressionavel } from '@/components/ui/Pressionavel';
import { Selo } from '@/components/ui/Selo';
import { cores, raios } from '@/theme';
import { TreinoAluno } from '@/types/fichaAluno.types';
import { estimarDuracaoMin } from '@/utils/painelAluno';
import { descreverTreino, inicialMaiuscula } from '@/utils/pluralizacao';

type CartaoTreinoDiaProps = {
  treino: TreinoAluno;
  /** Destaca o card (treino de hoje). */
  hoje?: boolean;
  /** Há sessão aberta deste treino: mostra "Continuar treino". */
  emAndamento?: boolean;
  onPress: () => void;
  testID?: string;
};

/** Card de um treino por dia da semana: dia, nome, nº de exercícios e duração estimada. */
export function CartaoTreinoDia({ treino, hoje = false, emAndamento = false, onPress, testID }: CartaoTreinoDiaProps) {
  const duracao = estimarDuracaoMin(treino.itens);

  return (
    <Pressionavel
      onPress={onPress}
      haptico="leve"
      testID={testID}
      accessibilityRole="button"
      style={[estilos.cartao, hoje && estilos.cartaoHoje]}
    >
      <View style={estilos.dia}>
        <Text style={[estilos.diaTexto, hoje && estilos.diaTextoHoje]}>
          {treino.dia_semana.slice(0, 3).toUpperCase()}
        </Text>
      </View>

      <View style={estilos.textos}>
        <View style={estilos.titulo}>
          <Text style={estilos.nome} numberOfLines={2}>
            {treino.nome}
          </Text>
          {emAndamento ? (
            <Selo rotulo="Em andamento" tom="aviso" />
          ) : hoje ? (
            <Selo rotulo="Hoje" tom="primario" />
          ) : null}
        </View>
        {emAndamento ? (
          <Text style={estilos.continuar} numberOfLines={1}>
            Continuar treino
          </Text>
        ) : null}
        <Text style={estilos.detalhe} numberOfLines={1}>
          {inicialMaiuscula(treino.dia_semana)} · {descreverTreino(treino.itens.length, duracao)}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color={cores.textoTerciario} />
    </Pressionavel>
  );
}

const estilos = StyleSheet.create({
  cartao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: cores.superficie,
    borderRadius: raios.cartao,
    borderWidth: 1,
    borderColor: cores.borda,
    padding: 14,
    marginBottom: 10,
  },
  cartaoHoje: { borderColor: cores.primaria, backgroundColor: cores.superficieElevada },
  dia: {
    width: 52,
    height: 52,
    borderRadius: raios.botao,
    backgroundColor: cores.superficieElevada,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diaTexto: { color: cores.textoSecundario, fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  diaTextoHoje: { color: cores.primaria },
  textos: { flex: 1, gap: 4 },
  titulo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nome: { flexShrink: 1, color: cores.texto, fontSize: 17, fontWeight: '700' },
  continuar: { color: cores.primaria, fontSize: 13, fontWeight: '700' },
  detalhe: { color: cores.textoSecundario, fontSize: 13 },
});
