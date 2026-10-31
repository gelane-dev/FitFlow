import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { router, useLocalSearchParams } from 'expo-router';

import { PreviaMidiaExercicio } from '@/components/exercicios/PreviaMidiaExercicio';
import { SeletorMidiaExercicio } from '@/components/exercicios/SeletorMidiaExercicio';
import { VideoPlayerExercicio } from '@/components/exercicios/VideoPlayerExercicio';
import { Botao } from '@/components/ui/Botao';
import { CabecalhoDetalhe } from '@/components/ui/CabecalhoDetalhe';
import { Chip } from '@/components/ui/Chip';
import { EstadoErro } from '@/components/ui/EstadoErro';
import { Pressionavel } from '@/components/ui/Pressionavel';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tela } from '@/components/ui/Tela';
import { TituloSecao } from '@/components/ui/TituloSecao';
import { useExercicio } from '@/hooks/useExercicio';
import { useGerenciarExercicio } from '@/hooks/useGerenciarExercicio';
import { useImagemExercicio } from '@/hooks/useImagemExercicio';
import { useRecarregarNoFoco } from '@/hooks/useRecarregarNoFoco';
import { useVideoExercicio } from '@/hooks/useVideoExercicio';
import { cores, tipografia } from '@/theme';
import { mostrarAlerta } from '@/utils/alerta';

/** Detalhe do exercício (/exercicios/[id]): mídia grande no topo, grupo, descrição e ações. */
export default function DetalhesExercicio() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const idExercicio = Number(id);

  const { exercicio, carregando, erro, recarregar } = useExercicio(idExercicio);
  const { deletar, carregando: excluindo, erro: erroExclusao } = useGerenciarExercicio();
  const { enviarImagem, carregando: enviandoImagem, erro: erroImagem } = useImagemExercicio();
  const { enviarVideo, carregando: enviandoVideo, erro: erroVideo } = useVideoExercicio();

  useRecarregarNoFoco(recarregar);

  function confirmarExclusao() {
    mostrarAlerta('Excluir exercício', 'Tem certeza que deseja excluir este exercício?', [
      { text: 'CANCELAR', style: 'cancel' },
      { text: 'EXCLUIR', style: 'destructive', onPress: excluirExercicio },
    ]);
  }

  async function excluirExercicio() {
    const sucesso = await deletar(idExercicio);

    if (!sucesso) {
      mostrarAlerta('Erro', erroExclusao || 'Não foi possível excluir o exercício.');
      return;
    }

    mostrarAlerta('Exercício excluído', 'O exercício foi excluído com sucesso.', [
      { text: 'OK', onPress: () => router.replace('/exercicios') },
    ]);
  }

  function editar() {
    router.push({
      pathname: '/exercicios/[id]/editar',
      params: { id: idExercicio.toString() },
    });
  }

  if (!Number.isFinite(idExercicio) || idExercicio <= 0) {
    return (
      <Tela>
        <CabecalhoDetalhe titulo="Exercício" />
        <EstadoErro mensagem="Não foi possível identificar o exercício solicitado." />
      </Tela>
    );
  }

  if (carregando && !exercicio) {
    return (
      <Tela>
        <CabecalhoDetalhe titulo="Exercício" />
        <Skeleton altura={200} raio={18} />
        <View style={estilos.espaco} />
        <Skeleton altura={28} largura="70%" />
        <View style={estilos.espaco} />
        <Skeleton altura={80} />
      </Tela>
    );
  }

  if (erro || !exercicio) {
    return (
      <Tela>
        <CabecalhoDetalhe titulo="Exercício" />
        <EstadoErro
          mensagem={erro || 'Exercício não encontrado.'}
          aoTentarNovamente={recarregar}
        />
      </Tela>
    );
  }

  const bloqueado = excluindo || enviandoImagem || enviandoVideo;
  const videoNoTopo = !exercicio.imagem && Boolean(exercicio.video);

  return (
    <Tela
      rodape={
        <Botao icone="create-outline" onPress={editar} disabled={bloqueado}>
          EDITAR EXERCÍCIO
        </Botao>
      }
    >
      <CabecalhoDetalhe
        titulo="Exercício"
        direita={
          <Pressionavel
            onPress={editar}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Editar exercício"
          >
            <Ionicons name="create-outline" size={22} color={cores.texto} />
          </Pressionavel>
        }
      />

      {videoNoTopo && exercicio.video ? (
        <VideoPlayerExercicio uri={exercicio.video} />
      ) : (
        <PreviaMidiaExercicio uri={exercicio.imagem} nome={exercicio.nome} />
      )}

      <Text style={estilos.nome}>{exercicio.nome}</Text>
      <View style={estilos.chip}>
        <Chip rotulo={exercicio.grupo_muscular} icone="body-outline" />
      </View>

      {exercicio.video && !videoNoTopo ? (
        <>
          <TituloSecao titulo="Vídeo" />
          <VideoPlayerExercicio uri={exercicio.video} />
        </>
      ) : null}

      <TituloSecao titulo="Descrição" />
      <Text style={estilos.descricao}>{exercicio.descricao}</Text>

      <TituloSecao titulo="Mídia" />
      <View style={estilos.midia}>
        <SeletorMidiaExercicio
          idExercicio={idExercicio}
          tipo="imagem"
          existeMidia={Boolean(exercicio.imagem)}
          carregando={enviandoImagem}
          bloqueado={excluindo || enviandoVideo}
          erro={erroImagem}
          enviar={enviarImagem}
          aoEnviarComSucesso={recarregar}
        />
        <SeletorMidiaExercicio
          idExercicio={idExercicio}
          tipo="video"
          existeMidia={Boolean(exercicio.video)}
          carregando={enviandoVideo}
          bloqueado={excluindo || enviandoImagem}
          erro={erroVideo}
          enviar={enviarVideo}
          aoEnviarComSucesso={recarregar}
        />
      </View>

      <TituloSecao titulo="Zona de risco" />
      <Botao variante="perigo" icone="trash-outline" onPress={confirmarExclusao} carregando={excluindo} disabled={bloqueado}>
        EXCLUIR EXERCÍCIO
      </Botao>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  espaco: { height: 16 },
  nome: { ...tipografia.subtitulo, color: cores.texto, marginTop: 20 },
  chip: { flexDirection: 'row', marginTop: 10 },
  descricao: { ...tipografia.corpo, color: cores.textoSecundario },
  midia: { gap: 10 },
});
