import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { router } from 'expo-router';

import { BotaoFlutuante, ESPACO_BOTAO_FLUTUANTE } from '@/components/BotaoFlutuante';
import { CardExercicio } from '@/components/CardExercicio';
import { Botao } from '@/components/ui/Botao';
import { CabecalhoGrande } from '@/components/ui/CabecalhoGrande';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { Chip } from '@/components/ui/Chip';
import { EstadoErro } from '@/components/ui/EstadoErro';
import { EstadoVazio } from '@/components/ui/EstadoVazio';
import { SkeletonLista } from '@/components/ui/Skeleton';
import { TelaLista } from '@/components/ui/TelaLista';
import { useExercicios } from '@/hooks/useExercicios';
import { usePuxarParaAtualizar } from '@/hooks/usePuxarParaAtualizar';
import { useRecarregarNoFoco } from '@/hooks/useRecarregarNoFoco';
import { cores } from '@/theme';
import { filtrarPorCampos } from '@/utils/busca';
import { agruparGruposMusculares, pertenceAoGrupo } from '@/utils/gruposMusculares';

/** Aba Exercícios do professor (/exercicios): biblioteca virtualizada com busca, filtro por grupo e paginação. */
export default function Exercicios() {
  const [paginaSolicitada, setPaginaSolicitada] = useState(1);
  const [busca, setBusca] = useState('');
  // Chave normalizada do grupo (sem caixa nem acento), não o texto exibido.
  const [grupo, setGrupo] = useState<string | null>(null);

  const { exercicios, pagina, total, totalPaginas, carregando, erro, recarregar } =
    useExercicios(paginaSolicitada);

  useRecarregarNoFoco(recarregar);
  const { atualizando, aoAtualizar } = usePuxarParaAtualizar(recarregar);

  // "peito" e "Peito" (ou "biceps" e "Bíceps") viram um chip só; os dados não mudam.
  const grupos = agruparGruposMusculares(exercicios.map((e) => e.grupo_muscular));
  const porGrupo = grupo
    ? exercicios.filter((e) => pertenceAoGrupo(e.grupo_muscular, grupo))
    : exercicios;
  const filtrados = filtrarPorCampos(porGrupo, busca, (e) => [e.nome, e.grupo_muscular]);
  const primeiraCarga = carregando && exercicios.length === 0;

  const cabecalho = (
    <>
      <CabecalhoGrande
        rotulo={`${total} EXERCÍCIO${total === 1 ? '' : 'S'}`}
        titulo="Exercícios"
      />

      <CampoTexto
        icone="search-outline"
        placeholder="Buscar exercício ou grupo"
        value={busca}
        onChangeText={setBusca}
        autoCorrect={false}
      />

      {grupos.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={estilos.faixaChips}
          contentContainerStyle={estilos.chips}
        >
          <Chip rotulo="Todos" selecionado={grupo === null} onPress={() => setGrupo(null)} />
          {grupos.map((g) => (
            <Chip
              key={g.chave}
              rotulo={g.rotulo}
              selecionado={grupo === g.chave}
              onPress={() => setGrupo(grupo === g.chave ? null : g.chave)}
            />
          ))}
        </ScrollView>
      ) : null}
    </>
  );

  const vazio = erro ? (
    <EstadoErro mensagem={erro} aoTentarNovamente={recarregar} />
  ) : primeiraCarga ? (
    <SkeletonLista linhas={5} />
  ) : (
    <EstadoVazio
      icone="barbell-outline"
      titulo={exercicios.length === 0 ? 'Nenhum exercício cadastrado' : 'Nenhum exercício encontrado'}
      descricao={
        exercicios.length === 0
          ? 'Cadastre o primeiro exercício da biblioteca.'
          : 'Ajuste a busca ou o filtro.'
      }
    />
  );

  const rodape =
    totalPaginas > 1 ? (
      <View style={estilos.paginacao}>
        <View style={estilos.botaoPagina}>
          <Botao
            variante="secundario"
            tamanho="pequeno"
            icone="chevron-back"
            disabled={pagina <= 1}
            onPress={() => setPaginaSolicitada(pagina - 1)}
          >
            Anterior
          </Botao>
        </View>

        <Text style={estilos.numeroPagina}>
          Página {pagina} de {totalPaginas}
        </Text>

        <View style={estilos.botaoPagina}>
          <Botao
            variante="secundario"
            tamanho="pequeno"
            disabled={pagina >= totalPaginas}
            onPress={() => setPaginaSolicitada(pagina + 1)}
          >
            Próxima
          </Botao>
        </View>
      </View>
    ) : null;

  return (
    <View style={estilos.raiz}>
      <TelaLista
        abas
        dados={erro ? [] : filtrados}
        chave={(exercicio) => exercicio.id.toString()}
        cabecalho={cabecalho}
        vazio={vazio}
        rodape={rodape}
        aoAtualizar={aoAtualizar}
        atualizando={atualizando}
        espacoInferior={ESPACO_BOTAO_FLUTUANTE}
        renderItem={({ item: exercicio }) => (
          <CardExercicio
            exercicio={exercicio}
            onPress={() =>
              router.push({
                pathname: '/exercicios/[id]',
                params: { id: exercicio.id.toString() },
              })
            }
            onEditar={() =>
              router.push({
                pathname: '/exercicios/[id]/editar',
                params: { id: exercicio.id.toString() },
              })
            }
          />
        )}
      />

      <BotaoFlutuante rotulo="+ NOVO EXERCÍCIO" onPress={() => router.push('/exercicios/novo')} />
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1 },
  faixaChips: { flexGrow: 0, marginBottom: 20, marginTop: -4 },
  chips: { gap: 8 },
  paginacao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  botaoPagina: { flex: 1 },
  numeroPagina: { color: cores.textoSecundario, fontSize: 13, fontWeight: '600' },
});
