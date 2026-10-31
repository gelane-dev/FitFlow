import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Pressionavel } from '@/components/ui/Pressionavel';
import { Selo } from '@/components/ui/Selo';
import { cores, raios, tipografia } from '@/theme';
import { SessaoResumo } from '@/types/sessao.types';
import { formatarData, formatarHora } from '@/utils/evolucao';
import { formatarDuracao, segundosParaMinutos } from '@/utils/historicoAluno';
import { formatarVolume } from '@/utils/painelAluno';

type CartaoSessaoProps = {
  sessao: SessaoResumo;
  onPress: () => void;
};

/** Sessão no histórico, estilo feed do Strava: data, treino e as métricas lado a lado. */
export function CartaoSessao({ sessao, onPress }: CartaoSessaoProps) {
  const finalizada = !!sessao.finalizada_em;

  return (
    <Pressionavel
      onPress={onPress}
      haptico="leve"
      accessibilityRole="button"
      style={estilos.cartao}
      testID={`sessao-${sessao.id}`}
      accessibilityLabel={`${sessao.treino_nome}, ${sessao.total_series} séries, ${finalizada ? "finalizado" : "em andamento"}`}
    >
      <View style={estilos.topo}>
        <View style={estilos.icone}>
          <Ionicons name="barbell" size={20} color={cores.primaria} />
        </View>
        <View style={estilos.titulos}>
          <Text style={estilos.nome} numberOfLines={1}>
            {sessao.treino_nome}
          </Text>
          <Text style={estilos.data}>
            {formatarData(sessao.iniciada_em)} às {formatarHora(sessao.iniciada_em)}
          </Text>
        </View>
        {!finalizada && <Selo rotulo="Em andamento" tom="aviso" />}
      </View>

      <View style={estilos.metricas}>
        <Metrica rotulo="Duração" valor={formatarDuracao(segundosParaMinutos(sessao.duracao_segundos))} />
        <Metrica rotulo="Séries" valor={String(sessao.total_series)} />
        <Metrica rotulo="Volume" valor={formatarVolume(sessao.volume_total)} />
        <Metrica rotulo="Esforço" valor={sessao.esforco ? `${sessao.esforco}/10` : '—'} />
      </View>
    </Pressionavel>
  );
}

function Metrica({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View style={estilos.metrica}>
      <Text style={estilos.valor}>{valor}</Text>
      <Text style={estilos.rotulo}>{rotulo}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  cartao: {
    backgroundColor: cores.superficie,
    borderRadius: raios.cartao,
    borderWidth: 1,
    borderColor: cores.borda,
    padding: 16,
    marginBottom: 12,
    gap: 16,
  },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icone: {
    width: 40,
    height: 40,
    borderRadius: raios.botao,
    backgroundColor: cores.superficieElevada,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulos: { flex: 1 },
  nome: { color: cores.texto, fontSize: 17, fontWeight: '700' },
  data: { color: cores.textoSecundario, fontSize: 13, marginTop: 2 },
  metricas: { flexDirection: 'row' },
  metrica: { flex: 1 },
  valor: { ...tipografia.numero, color: cores.texto, fontSize: 18 },
  rotulo: {
    color: cores.textoTerciario,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 2,
  },
});
