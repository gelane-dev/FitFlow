import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { router, useLocalSearchParams } from 'expo-router';

import { CardTreino } from '@/components/CardTreino';
import { SeloVigente } from '@/components/SeloVigente';
import { Avatar } from '@/components/ui/Avatar';
import { BlocoEstatistica } from '@/components/ui/BlocoEstatistica';
import { Botao } from '@/components/ui/Botao';
import { CabecalhoDetalhe } from '@/components/ui/CabecalhoDetalhe';
import { Cartao } from '@/components/ui/Cartao';
import { EstadoErro } from '@/components/ui/EstadoErro';
import { EstadoVazio } from '@/components/ui/EstadoVazio';
import { Pressionavel } from '@/components/ui/Pressionavel';
import { Skeleton, SkeletonLista } from '@/components/ui/Skeleton';
import { Tela } from '@/components/ui/Tela';
import { TituloSecao } from '@/components/ui/TituloSecao';
import { useFicha } from '@/hooks/useFicha';
import { useGerenciarFicha } from '@/hooks/useGerenciarFicha';
import { useGerenciarTreino } from '@/hooks/useGerenciarTreino';
import { usePuxarParaAtualizar } from '@/hooks/usePuxarParaAtualizar';
import { useRecarregarNoFoco } from '@/hooks/useRecarregarNoFoco';
import { useTreinos } from '@/hooks/useTreinos';
import { cores, tipografia } from '@/theme';
import { mostrarAlerta } from '@/utils/alerta';
import { descreverVigencia } from '@/utils/vigencia';

/** Detalhe da ficha (/fichas/[id]): aluno, vigência e treinos por dia da semana. */
export default function DetalheFicha() {
  const { id } = useLocalSearchParams();
  const idFicha = Number(id);

  const {
    ficha,
    carregando: carregandoFicha,
    erro: erroFicha,
    recarregar: recarregarFicha,
  } = useFicha(idFicha);

  const {
    treinos,
    carregando: carregandoTreinos,
    erro: erroTreinos,
    recarregar: recarregarTreinos,
  } = useTreinos(idFicha);

  const { deletar: deletarTreino } = useGerenciarTreino();
  const { deletar: deletarFicha, carregando: excluindoFicha } = useGerenciarFicha();

  function recarregarTudo() {
    return Promise.all([recarregarTreinos(), recarregarFicha()]);
  }

  useRecarregarNoFoco(recarregarTudo);
  const { atualizando, aoAtualizar } = usePuxarParaAtualizar(recarregarTudo);

  const vigencia = ficha ? descreverVigencia(ficha.data_inicio, ficha.data_fim) : '';
  const proximaOrdem = treinos.length > 0 ? Math.max(...treinos.map((t) => t.ordem)) + 1 : 1;

  function confirmarExclusaoTreino(idTreino: number, nomeTreino: string) {
    mostrarAlerta('Excluir treino', `Deseja realmente excluir "${nomeTreino}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          const sucesso = await deletarTreino(idTreino);

          if (sucesso) {
            await recarregarTreinos();
          }
        },
      },
    ]);
  }

  function confirmarExclusaoFicha() {
    if (!ficha) return;

    mostrarAlerta(
      'Excluir ficha',
      `Deseja realmente excluir "${ficha.nome}" e todos os seus treinos?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            const sucesso = await deletarFicha(idFicha);

            if (sucesso) {
              router.replace('/fichas');
            }
          },
        },
      ]
    );
  }

  function editarFicha() {
    router.push({
      pathname: '/fichas/[id]/editar' as any,
      params: { id: idFicha.toString() },
    });
  }

  if (carregandoFicha && !ficha) {
    return (
      <Tela>
        <CabecalhoDetalhe titulo="Ficha" />
        <Skeleton altura={150} raio={18} />
        <View style={estilos.espaco} />
        <SkeletonLista linhas={3} />
      </Tela>
    );
  }

  if (erroFicha || !ficha) {
    return (
      <Tela>
        <CabecalhoDetalhe titulo="Ficha" />
        <EstadoErro mensagem={erroFicha || 'Ficha não encontrada.'} aoTentarNovamente={recarregarTudo} />
      </Tela>
    );
  }

  return (
    <Tela aoAtualizar={aoAtualizar} atualizando={atualizando}>
      <CabecalhoDetalhe
        titulo="Ficha"
        direita={
          <Pressionavel
            onPress={editarFicha}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Editar nome e vigência"
          >
            <Ionicons name="create-outline" size={22} color={cores.texto} />
          </Pressionavel>
        }
      />

      <Cartao elevado>
        <Text style={estilos.titulo}>{ficha.nome.toUpperCase()}</Text>

        <View style={estilos.aluno}>
          <Avatar nome={ficha.aluno_nome} tamanho={32} />
          <Text style={estilos.nomeAluno} numberOfLines={1}>
            {ficha.aluno_nome}
          </Text>
        </View>

        {ficha.vigente || vigencia !== '' ? (
          <View style={estilos.vigencia}>
            {ficha.vigente ? <SeloVigente /> : null}
            {vigencia !== '' ? (
              <Text style={estilos.textoVigencia}>{vigencia}</Text>
            ) : null}
          </View>
        ) : null}

        <View style={estilos.estatistica}>
          <BlocoEstatistica valor={treinos.length} rotulo="Treinos" destaque />
        </View>
      </Cartao>

      <TituloSecao titulo="Treinos" />
      <Botao
        variante="secundario"
        tamanho="medio"
        onPress={() =>
          router.push({
            pathname: '/fichas/[id]/treinos/novo' as any,
            params: { id: idFicha.toString(), ordem: String(proximaOrdem) },
          })
        }
      >
        + NOVO TREINO
      </Botao>
      <View style={estilos.espaco} />

      {erroTreinos ? (
        <EstadoErro mensagem={erroTreinos} aoTentarNovamente={recarregarTreinos} />
      ) : carregandoTreinos && treinos.length === 0 ? (
        <SkeletonLista linhas={2} />
      ) : treinos.length === 0 ? (
        <EstadoVazio
          icone="calendar-outline"
          titulo="Nenhum treino nesta ficha"
          descricao="Crie um treino para cada dia da semana."
        />
      ) : (
        treinos.map((treino) => (
          <CardTreino
            key={treino.id}
            treino={treino}
            onPress={() =>
              router.push({
                pathname: '/fichas/[id]/treinos/[treinoId]' as any,
                params: {
                  id: idFicha.toString(),
                  treinoId: treino.id.toString(),
                  nomeTreino: treino.nome,
                },
              })
            }
            onEditar={() =>
              router.push({
                pathname: '/fichas/[id]/treinos/editar' as any,
                params: {
                  id: idFicha.toString(),
                  treinoId: treino.id.toString(),
                  nome: treino.nome,
                  dia: treino.dia_semana,
                  ordem: treino.ordem.toString(),
                },
              })
            }
            onRemover={() => confirmarExclusaoTreino(treino.id, treino.nome)}
          />
        ))
      )}

      <TituloSecao titulo="Zona de risco" />
      <Botao
        variante="perigo"
        tamanho="medio"
        icone="trash-outline"
        onPress={confirmarExclusaoFicha}
        disabled={excluindoFicha}
      >
        EXCLUIR FICHA
      </Botao>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  espaco: { height: 16 },
  titulo: { ...tipografia.subtitulo, color: cores.texto, letterSpacing: 0.5 },
  aluno: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  nomeAluno: { flex: 1, color: cores.primaria, fontSize: 15, fontWeight: '600' },
  vigencia: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, flexWrap: 'wrap' },
  textoVigencia: { color: cores.textoSecundario, fontSize: 13 },
  estatistica: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: cores.borda,
  },
});
