import { StyleSheet, View } from 'react-native';

import { Segmentado } from '@/components/aluno/Segmentado';
import { EstadoErroSecao } from '@/components/ui/EstadoErroSecao';
import { EstadoVazio } from '@/components/ui/EstadoVazio';
import { SkeletonLista } from '@/components/ui/Skeleton';
import { TituloSecao } from '@/components/ui/TituloSecao';
import { AvaliacaoResposta } from '@/types/avaliacao.types';
import {
  ChaveIndicador,
  indicadorPorChave,
  INDICADORES_FISICOS,
  pontosDoIndicador,
  ultimasDuasMedicoes,
} from '@/utils/indicadoresFisicos';

import { CartaoEvolucao } from './CartaoEvolucao';
import { ComparacaoValores } from './ComparacaoValores';
import { GraficoLinha } from './GraficoLinha';
import { ListaAvaliacoes } from './ListaAvaliacoes';

export interface SecaoCorpoProps {
  avaliacoes: AvaliacaoResposta[];
  carregando: boolean;
  erro: string | null;
  aoTentarNovamente: () => void;
  /** Estado na tela, para sobreviver à troca Treinos/Corpo. */
  indicador: ChaveIndicador;
  aoMudarIndicador: (chave: ChaveIndicador) => void;
  avaliacaoAberta: number | null;
  aoAlternarAvaliacao: (id: number | null) => void;
}

const OPCOES = INDICADORES_FISICOS.map((i) => ({ valor: i.chave, rotulo: i.rotuloCurto }));

/**
 * Lado "Corpo": um indicador por vez (valor atual, variação × anterior e gráfico no mesmo padrão
 * dos treinos) e o histórico das avaliações em lista compacta.
 */
export function SecaoCorpo({
  avaliacoes,
  carregando,
  erro,
  aoTentarNovamente,
  indicador: chave,
  aoMudarIndicador,
  avaliacaoAberta,
  aoAlternarAvaliacao,
}: SecaoCorpoProps) {
  const indicador = indicadorPorChave(chave);
  const pontos = pontosDoIndicador(avaliacoes, chave);
  const medicoes = ultimasDuasMedicoes(pontos);
  const unidade = indicador.unidade || undefined;

  return (
    <View testID="secao-fisica" style={estilos.secao}>
      {carregando ? (
        <SkeletonLista linhas={3} />
      ) : erro ? (
        <EstadoErroSecao mensagem={erro} aoTentarNovamente={aoTentarNovamente} testID="erro-fisica" />
      ) : avaliacoes.length === 0 ? (
        <EstadoVazio
          icone="body-outline"
          titulo="Nenhuma avaliação"
          descricao="Você ainda não tem avaliações físicas."
        />
      ) : (
        <>
          <Segmentado opcoes={OPCOES} valor={chave} onChange={aoMudarIndicador} compacto />

          <CartaoEvolucao
            cabecalho={
              medicoes ? (
                <ComparacaoValores
                  rotulo={indicador.rotulo}
                  atual={{ valor: medicoes.atual.valor, data: medicoes.atual.data }}
                  anterior={medicoes.anterior ? { valor: medicoes.anterior.valor, data: medicoes.anterior.data } : null}
                  unidade={unidade}
                  direcao={indicador.direcao}
                  semAnterior="Primeira avaliação"
                  legendaVariacao="vs. avaliação anterior"
                  mostrarAnterior="Avaliação anterior"
                  testID="comparacao-fisica"
                />
              ) : null
            }
          >
            <GraficoLinha
              pontos={pontos}
              rotulo={indicador.rotulo}
              unidade={indicador.unidade}
              mensagemVazio={`Nenhuma avaliação com ${indicador.rotulo.toLowerCase()} registrado.`}
              embutido
              testID="grafico-fisico"
            />
          </CartaoEvolucao>

          <View testID="secao-avaliacoes">
            <TituloSecao titulo="Histórico das avaliações" />
            <ListaAvaliacoes avaliacoes={avaliacoes} aberta={avaliacaoAberta} aoAlternar={aoAlternarAvaliacao} />
          </View>
        </>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  secao: { gap: 12 },
});
