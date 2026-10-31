import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { router, useLocalSearchParams } from 'expo-router';

import { CardFicha } from '@/components/CardFicha';
import { Avatar } from '@/components/ui/Avatar';
import { BlocoEstatistica } from '@/components/ui/BlocoEstatistica';
import { CabecalhoDetalhe } from '@/components/ui/CabecalhoDetalhe';
import { Cartao } from '@/components/ui/Cartao';
import { Chip } from '@/components/ui/Chip';
import { EstadoErro } from '@/components/ui/EstadoErro';
import { EstadoErroSecao } from '@/components/ui/EstadoErroSecao';
import { Pressionavel } from '@/components/ui/Pressionavel';
import { Skeleton, SkeletonLista } from '@/components/ui/Skeleton';
import { Tela } from '@/components/ui/Tela';
import { TituloSecao } from '@/components/ui/TituloSecao';
import { SecaoDetalhe, useAlunoDetalhe } from '@/hooks/useAlunoDetalhe';
import { usePuxarParaAtualizar } from '@/hooks/usePuxarParaAtualizar';
import { useRecarregarNoFoco } from '@/hooks/useRecarregarNoFoco';
import { cores, fonteDisplay } from '@/theme';
import { formatarData } from '@/utils/datas';
import { formatarHora } from '@/utils/evolucao';
import { formatarAltura, formatarNumeroBr } from '@/utils/numeros';
import { paramTexto } from '@/utils/params';
import { formatarImc } from '@/utils/vigencia';

const LIMITE_SESSOES = 5;

/** Seção vazia ou com erro; o erro oferece "Tentar novamente" só para aquela seção. */
function MensagemSecao({ secao, vazio }: { secao: SecaoDetalhe<unknown>; vazio: string }) {
  if (secao.erro) {
    return <EstadoErroSecao mensagem={secao.erro} aoTentarNovamente={secao.recarregar} />;
  }

  return <Text style={estilos.vazio}>{vazio}</Text>;
}

/** "2026-10-30T08:00" -> "30/10". */
function dataCurta(data: string): string {
  return formatarData(data).slice(0, 5);
}

/** Detalhe do aluno (/alunos/[id]): perfil, estatísticas e seções de fichas, sessões, evolução e avaliações. */
export default function DetalheAluno() {
  const params = useLocalSearchParams();
  const alunoId = Number(paramTexto(params.id));

  const { aluno, fichas, sessoes, evolucao, avaliacoes, carregando, erro, recarregar } =
    useAlunoDetalhe(alunoId);

  useRecarregarNoFoco(recarregar);
  const { atualizando, aoAtualizar } = usePuxarParaAtualizar(recarregar);

  if (carregando && !aluno) {
    return (
      <Tela>
        <CabecalhoDetalhe titulo="Aluno" />
        <View style={estilos.perfil}>
          <Skeleton largura={88} altura={88} raio={44} />
          <Skeleton largura="60%" altura={28} />
        </View>
        <Skeleton altura={80} raio={18} />
        <View style={estilos.espaco} />
        <SkeletonLista linhas={3} />
      </Tela>
    );
  }

  if (erro || !aluno) {
    return (
      <Tela>
        <CabecalhoDetalhe titulo="Aluno" />
        <EstadoErro mensagem={erro || 'Aluno não encontrado.'} aoTentarNovamente={recarregar} />
      </Tela>
    );
  }

  const ultimaSessao = sessoes.dados.reduce<string | null>(
    (mais, s) => (mais === null || s.iniciada_em > mais ? s.iniciada_em : mais),
    null
  );

  return (
    <Tela aoAtualizar={aoAtualizar} atualizando={atualizando}>
      <CabecalhoDetalhe titulo="Aluno" />

      <View style={estilos.perfil}>
        <Avatar nome={aluno.nome} tamanho={88} />
        <Text style={estilos.nome}>{aluno.nome.toUpperCase()}</Text>
        <Text style={estilos.contato}>
          {aluno.telefone} · Nascimento {formatarData(aluno.data_nascimento)}
        </Text>
      </View>

      <Cartao>
        <View style={estilos.estatisticas}>
          <BlocoEstatistica valor={sessoes.dados.length} rotulo="Sessões" destaque />
          <BlocoEstatistica
            valor={ultimaSessao ? dataCurta(ultimaSessao) : '—'}
            rotulo="Última sessão"
          />
          <BlocoEstatistica valor={fichas.dados.length} rotulo="Fichas" />
        </View>
      </Cartao>

      <TituloSecao
        titulo="Fichas"
        acao={{
          rotulo: '+ NOVA FICHA',
          onPress: () =>
            router.push({
              pathname: '/fichas/nova' as any,
              params: { alunoId: alunoId.toString() },
            }),
        }}
      />
      {fichas.dados.length === 0 ? (
        <MensagemSecao secao={fichas} vazio="Nenhuma ficha para este aluno." />
      ) : (
        fichas.dados.map((ficha) => (
          <CardFicha
            key={ficha.id}
            ficha={ficha}
            mostrarAluno={false}
            onPress={() =>
              router.push({
                pathname: '/fichas/[id]' as any,
                params: { id: ficha.id.toString() },
              })
            }
          />
        ))
      )}

      <TituloSecao titulo="Sessões recentes" />
      {sessoes.dados.length === 0 ? (
        <MensagemSecao secao={sessoes} vazio="Nenhuma sessão registrada." />
      ) : (
        sessoes.dados.slice(0, LIMITE_SESSOES).map((sessao) => (
          <Cartao key={sessao.id} style={estilos.cartaoLinha}>
            <Text style={estilos.tituloCartao}>{sessao.treino_nome}</Text>
            <Text style={estilos.detalhe}>
              {formatarData(sessao.iniciada_em)} às {formatarHora(sessao.iniciada_em)} ·{' '}
              {sessao.total_execucoes} série{sessao.total_execucoes === 1 ? '' : 's'}
            </Text>
            <Text style={estilos.detalhe}>
              {`Esforço: ${sessao.esforco !== null ? `${sessao.esforco}/10` : 'não informado'}`}
            </Text>
            {sessao.comentario ? (
              <Text style={estilos.comentario}>“{sessao.comentario}”</Text>
            ) : null}
          </Cartao>
        ))
      )}

      <TituloSecao titulo="Evolução por exercício" />
      {evolucao.dados.length === 0 ? (
        <MensagemSecao secao={evolucao} vazio="Sem registros de execução." />
      ) : (
        evolucao.dados.map((exercicio) => (
          <Pressionavel
            key={exercicio.exercicio_id}
            escala={0.99}
            style={estilos.linhaEvolucao}
            accessibilityRole="button"
            onPress={() =>
              router.push({
                pathname: '/alunos/[id]/evolucao/[exercicioId]' as any,
                params: {
                  id: alunoId.toString(),
                  exercicioId: exercicio.exercicio_id.toString(),
                },
              })
            }
          >
            <View style={estilos.textosEvolucao}>
              <Text style={estilos.tituloCartao}>{exercicio.nome}</Text>
              <View style={estilos.chip}>
                <Chip rotulo={exercicio.grupo_muscular} />
              </View>
              <Text style={estilos.detalhe}>
                {`Última carga ${exercicio.ultima_carga} kg · máxima ${exercicio.carga_maxima} kg · ${exercicio.total_registros} registros`}
              </Text>
            </View>
            <Ionicons name="trending-up" size={22} color={cores.primaria} />
          </Pressionavel>
        ))
      )}

      <TituloSecao
        titulo="Avaliações físicas"
        acao={{
          rotulo: '+ NOVA AVALIAÇÃO',
          onPress: () =>
            router.push({
              pathname: '/alunos/[id]/avaliacoes/nova' as any,
              params: { id: alunoId.toString() },
            }),
        }}
      />
      {avaliacoes.dados.length === 0 ? (
        <MensagemSecao secao={avaliacoes} vazio="Nenhuma avaliação cadastrada." />
      ) : (
        avaliacoes.dados.map((avaliacao) => (
          <Cartao
            key={avaliacao.id}
            style={estilos.cartaoLinha}
            onPress={() =>
              router.push({
                pathname: '/alunos/[id]/avaliacoes/[avaliacaoId]' as any,
                params: {
                  id: alunoId.toString(),
                  avaliacaoId: avaliacao.id.toString(),
                },
              })
            }
          >
            <Text style={estilos.tituloCartao}>{formatarData(avaliacao.data_avaliacao)}</Text>
            <Text style={estilos.detalhe}>
              {`${formatarNumeroBr(avaliacao.peso)} kg · ${formatarAltura(avaliacao.altura)} · IMC ${formatarImc(avaliacao.imc)}`}
            </Text>
          </Cartao>
        ))
      )}
    </Tela>
  );
}

const estilos = StyleSheet.create({
  espaco: { height: 16 },
  perfil: { alignItems: 'center', gap: 10, marginVertical: 20 },
  nome: { color: cores.texto, fontFamily: fonteDisplay, fontSize: 22, textAlign: 'center' },
  contato: { color: cores.textoSecundario, fontSize: 13, textAlign: 'center' },
  estatisticas: { flexDirection: 'row', gap: 16 },
  vazio: { color: cores.textoTerciario, fontSize: 14 },
  cartaoLinha: { marginBottom: 10, gap: 4 },
  tituloCartao: { color: cores.texto, fontSize: 16, fontWeight: '700' },
  detalhe: { color: cores.textoSecundario, fontSize: 13, lineHeight: 18 },
  comentario: { color: cores.textoSecundario, fontSize: 13, fontStyle: 'italic', marginTop: 4 },
  linhaEvolucao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: cores.borda,
  },
  textosEvolucao: { flex: 1, gap: 6 },
  chip: { flexDirection: 'row' },
});
