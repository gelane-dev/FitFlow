import { StyleSheet, Text, View } from 'react-native';

import { cores } from '@/theme';
import { DiaDaSemana } from '@/utils/painelAluno';

type SemanaPontosProps = {
  dias: DiaDaSemana[];
  /** Dias ("AAAA-MM-DD") com sessão finalizada. */
  treinados: Set<string>;
};

/** "Sua semana": 7 bolinhas (S T Q Q S S D); treinado = amarelo cheio, hoje = anel amarelo. */
export function SemanaPontos({ dias, treinados }: SemanaPontosProps) {
  return (
    <View style={estilos.linha} testID="semana-pontos">
      {dias.map((dia) => {
        const treinou = treinados.has(dia.chave);

        return (
          <View
            key={dia.chave}
            style={estilos.coluna}
            accessible
            accessibilityLabel={`${dia.chave}${treinou ? ', treino feito' : ''}${dia.hoje ? ', hoje' : ''}`}
          >
            <Text style={[estilos.letra, dia.hoje && estilos.letraHoje]}>{dia.letra}</Text>
            <View
              style={[
                estilos.ponto,
                treinou && estilos.pontoTreinado,
                dia.hoje && estilos.pontoHoje,
              ]}
            >
              {treinou && <Text style={estilos.check}>✓</Text>}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  linha: { flexDirection: 'row', justifyContent: 'space-between' },
  coluna: { alignItems: 'center', gap: 8, flex: 1 },
  letra: { color: cores.textoTerciario, fontSize: 12, fontWeight: '700' },
  letraHoje: { color: cores.primaria },
  ponto: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: cores.superficieElevada,
    borderWidth: 1,
    borderColor: cores.borda,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pontoTreinado: { backgroundColor: cores.primaria, borderColor: cores.primaria },
  pontoHoje: { borderColor: cores.primaria, borderWidth: 2 },
  check: { color: cores.sobrePrimaria, fontSize: 15, fontWeight: '800' },
});
