import { StyleSheet, Text, View } from 'react-native';

import { BlocoEstatistica } from '@/components/ui/BlocoEstatistica';
import { CabecalhoDetalhe } from '@/components/ui/CabecalhoDetalhe';
import { Cartao } from '@/components/ui/Cartao';
import { EstadoErro } from '@/components/ui/EstadoErro';
import { EstadoVazio } from '@/components/ui/EstadoVazio';
import { Selo } from '@/components/ui/Selo';
import { SkeletonLista } from '@/components/ui/Skeleton';
import { Tela } from '@/components/ui/Tela';
import { useMinhasAvaliacoes } from '@/hooks/useMinhasAvaliacoes';
import { useRecarregarNoFoco } from '@/hooks/useRecarregarNoFoco';
import { cores } from '@/theme';
import { formatarVariacao, montarLinhasAvaliacao, setaVariacao } from '@/utils/avaliacoes';
import { formatarData } from '@/utils/evolucao';
import { formatarAltura, formatarNumeroBr } from '@/utils/numeros';
import { formatarImc } from '@/utils/vigencia';

const COR_TOM = {
  melhora: cores.sucesso,
  piora: cores.aviso,
  neutro: cores.textoSecundario,
} as const;

export default function AvaliacoesAluno() {
  const { avaliacoes, carregando, erro, recarregar } = useMinhasAvaliacoes();

  useRecarregarNoFoco(recarregar);

  const linhas = montarLinhasAvaliacao(avaliacoes);

  return (
    <Tela aoAtualizar={recarregar}>
      <CabecalhoDetalhe titulo="Avaliações" />

      {carregando ? (
        <SkeletonLista linhas={3} />
      ) : erro ? (
        <EstadoErro mensagem={erro} aoTentarNovamente={recarregar} />
      ) : linhas.length === 0 ? (
        <EstadoVazio
          icone="body-outline"
          titulo="Nenhuma avaliação"
          descricao="Você ainda não tem avaliações físicas."
        />
      ) : (
        linhas.map(({ avaliacao, imc, variacao }, indice) => {
          const { seta, tom } = setaVariacao(variacao);

          return (
            <Cartao key={avaliacao.id} style={estilos.cartao} elevado={indice === 0}>
              <View style={estilos.topo}>
                <Text style={estilos.data}>{formatarData(avaliacao.data_avaliacao)}</Text>
                {indice === 0 && <Selo rotulo="Mais recente" tom="primario" />}
              </View>
              <Text style={estilos.medidas}>
                {formatarNumeroBr(avaliacao.peso)} kg · {formatarAltura(avaliacao.altura)}
              </Text>

              <View style={estilos.metricas}>
                <BlocoEstatistica valor={formatarNumeroBr(avaliacao.peso)} unidade="kg" rotulo="Peso" destaque />
                <BlocoEstatistica valor={formatarImc(imc)} rotulo="IMC" />
                <BlocoEstatistica
                  valor={avaliacao.percentual_gordura != null ? formatarNumeroBr(avaliacao.percentual_gordura) : '—'}
                  unidade={avaliacao.percentual_gordura != null ? '%' : undefined}
                  rotulo="Gordura"
                />
              </View>

              <View style={estilos.variacao}>
                {!!seta && <Text style={[estilos.seta, { color: COR_TOM[tom] }]}>{seta}</Text>}
                <Text style={[estilos.variacaoTexto, { color: COR_TOM[tom] }]}>
                  {formatarVariacao(variacao)}
                  {variacao !== null ? ' desde a avaliação anterior' : ''}
                </Text>
              </View>

              {avaliacao.massa_muscular != null && (
                <Text style={estilos.texto}>Massa muscular: {avaliacao.massa_muscular} kg</Text>
              )}
              {!!avaliacao.observacao && <Text style={estilos.texto}>{avaliacao.observacao}</Text>}
            </Cartao>
          );
        })
      )}
    </Tela>
  );
}

const estilos = StyleSheet.create({
  cartao: { marginBottom: 12 },
  topo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  data: {
    color: cores.primaria,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  medidas: { color: cores.textoSecundario, fontSize: 14, marginTop: 4, marginBottom: 16 },
  metricas: { flexDirection: 'row', gap: 12 },
  variacao: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 },
  seta: { fontSize: 18, fontWeight: '800' },
  variacaoTexto: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  texto: { color: cores.textoSecundario, fontSize: 14, marginTop: 8 },
});
