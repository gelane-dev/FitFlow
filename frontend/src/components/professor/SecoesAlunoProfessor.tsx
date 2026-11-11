import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BlocoEstatistica } from '@/components/ui/BlocoEstatistica';
import { Cartao } from '@/components/ui/Cartao';
import { Chip } from '@/components/ui/Chip';
import { EstadoErroSecao } from '@/components/ui/EstadoErroSecao';
import { GraficoBarras } from '@/components/ui/GraficoBarras';
import { GraficoLinha } from '@/components/ui/GraficoLinha';
import { Skeleton } from '@/components/ui/Skeleton';
import { TituloSecao } from '@/components/ui/TituloSecao';
import { useProfessorFrequencia } from '@/hooks/useProfessorFrequencia';
import { cores } from '@/theme';
import { AvaliacaoResposta } from '@/types/avaliacao.types';
import { formatarNumeroBr } from '@/utils/numeros';
import {
  ChaveMedida,
  dadosFrequencia,
  formatarDataHora,
  MEDIDAS_CORPORAIS,
  medidasComDados,
  mediaSemanal,
  PERIODOS_FREQUENCIA,
  pontosDaMedida,
} from '@/utils/professorWeb';

/** Frequência do aluno: entradas por semana (barras), total, média e última entrada. */
export function SecaoFrequenciaProfessor({ alunoId }: { alunoId: number }) {
  const [meses, setMeses] = useState<number>(3);
  const { frequencia, carregando, erro, recarregar } = useProfessorFrequencia(alunoId, meses);

  return (
    <View testID="secao-frequencia">
      <TituloSecao titulo="Frequência" />

      <View style={estilos.chips} accessibilityRole="radiogroup" accessibilityLabel="Período da frequência">
        {PERIODOS_FREQUENCIA.map((p) => (
          <Chip
            key={p.meses}
            rotulo={p.rotulo}
            papel="radio"
            selecionado={meses === p.meses}
            onPress={() => setMeses(p.meses)}
            testID={`frequencia-periodo-${p.meses}`}
          />
        ))}
      </View>

      {erro ? (
        <EstadoErroSecao mensagem={erro} aoTentarNovamente={recarregar} testID="erro-frequencia" />
      ) : carregando && !frequencia ? (
        <Skeleton altura={160} raio={18} />
      ) : frequencia ? (
        <Cartao>
          <View style={estilos.estatisticas}>
            <BlocoEstatistica valor={frequencia.total_periodo} rotulo="Entradas" destaque />
            <BlocoEstatistica valor={frequencia.sessoes_treino_periodo} rotulo="Treinos feitos" />
            <BlocoEstatistica valor={formatarNumeroBr(mediaSemanal(frequencia), 1)} rotulo="Por semana" />
          </View>
          <Text style={estilos.ultima} testID="frequencia-ultima">
            Última entrada: {formatarDataHora(frequencia.ultima_entrada)}
          </Text>
          <GraficoBarras
            dados={dadosFrequencia(frequencia)}
            rotulo="Entradas por semana"
            altura={160}
            mensagemVazio="Nenhuma entrada registrada neste período."
            testID="grafico-frequencia"
          />
        </Cartao>
      ) : null}
    </View>
  );
}

interface SecaoMedidasProps {
  avaliacoes: AvaliacaoResposta[];
}

/** Evolução das circunferências: um gráfico de linha por medida (escolhida nos chips). */
export function SecaoMedidasProfessor({ avaliacoes }: SecaoMedidasProps) {
  const comDados = useMemo(() => medidasComDados(avaliacoes), [avaliacoes]);
  const [medida, setMedida] = useState<ChaveMedida>('cintura');

  // Abre numa medida que tenha dados, se a escolhida não tiver.
  useEffect(() => {
    if (comDados.length > 0 && !comDados.includes(medida)) {
      setMedida(comDados[0]);
    }
  }, [comDados, medida]);

  if (comDados.length === 0) {
    return null;
  }

  const definicao = MEDIDAS_CORPORAIS.find((m) => m.chave === medida) ?? MEDIDAS_CORPORAIS[0];

  return (
    <View testID="secao-medidas">
      <TituloSecao titulo="Medidas corporais" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={estilos.chipsMedidas}
        accessibilityLabel="Escolher medida"
      >
        {MEDIDAS_CORPORAIS.filter((m) => comDados.includes(m.chave)).map((m) => (
          <Chip
            key={m.chave}
            rotulo={m.rotulo}
            papel="radio"
            selecionado={m.chave === medida}
            onPress={() => setMedida(m.chave)}
            testID={`medida-${m.chave}`}
          />
        ))}
      </ScrollView>
      <GraficoLinha
        pontos={pontosDaMedida(avaliacoes, medida)}
        rotulo={definicao.rotulo}
        unidade="cm"
        mensagemVazio={`Nenhuma avaliação com ${definicao.rotulo.toLowerCase()} registrado.`}
        testID="grafico-medida"
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  chips: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  chipsMedidas: { gap: 8, paddingBottom: 12, paddingRight: 8 },
  estatisticas: { flexDirection: 'row', gap: 16 },
  ultima: { color: cores.textoSecundario, fontSize: 13, marginVertical: 12 },
});
