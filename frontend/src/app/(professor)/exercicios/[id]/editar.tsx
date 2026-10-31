import { StyleSheet, View } from 'react-native';

import { router, useLocalSearchParams } from 'expo-router';

import { PreviaMidiaExercicio } from '@/components/exercicios/PreviaMidiaExercicio';
import { SeletorMidiaExercicio } from '@/components/exercicios/SeletorMidiaExercicio';
import { VideoPlayerExercicio } from '@/components/exercicios/VideoPlayerExercicio';
import { FormularioExercicio } from '@/components/FormularioExercicio';
import { CabecalhoDetalhe } from '@/components/ui/CabecalhoDetalhe';
import { EstadoErro } from '@/components/ui/EstadoErro';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tela } from '@/components/ui/Tela';
import { TituloSecao } from '@/components/ui/TituloSecao';
import { useAlertaErro } from '@/hooks/useAlertaErro';
import { useExercicio } from '@/hooks/useExercicio';
import { useGerenciarExercicio } from '@/hooks/useGerenciarExercicio';
import { useImagemExercicio } from '@/hooks/useImagemExercicio';
import { useVideoExercicio } from '@/hooks/useVideoExercicio';
import { ExercicioAtualizar } from '@/types/exercicio.types';
import { mostrarAlerta } from '@/utils/alerta';

/** Edição de exercício (/exercicios/[id]/editar). */
export default function EditarExercicio() {
  const { id } = useLocalSearchParams();
  const idExercicio = Number(id);

  const {
    exercicio,
    carregando: carregandoExercicio,
    erro: erroExercicio,
    recarregar,
  } = useExercicio(idExercicio);

  const { atualizar, carregando: salvando, erro: erroAtualizacao } = useGerenciarExercicio();

  const { enviarImagem, carregando: enviandoImagem, erro: erroImagem } = useImagemExercicio();
  const { enviarVideo, carregando: enviandoVideo, erro: erroVideo } = useVideoExercicio();

  useAlertaErro(erroExercicio);
  useAlertaErro(erroAtualizacao);

  async function salvarAlteracoes(dados: ExercicioAtualizar) {
    const exercicioAtualizado = await atualizar(idExercicio, dados);

    if (!exercicioAtualizado) {
      return;
    }

    mostrarAlerta('Exercício atualizado', 'As alterações foram salvas com sucesso.', [
      {
        text: 'OK',
        onPress: () => router.replace('/exercicios'),
      },
    ]);
  }

  // O skeleton só aparece na primeira carga. Em recarregamentos (ex.: após
  // trocar a imagem) o formulário continua montado e preserva o que foi digitado.
  if (carregandoExercicio && !exercicio) {
    return (
      <Tela>
        <CabecalhoDetalhe titulo="Editar exercício" />
        <Skeleton altura={180} raio={18} />
        <View style={estilos.espaco} />
        <Skeleton altura={52} />
        <View style={estilos.espaco} />
        <Skeleton altura={52} />
      </Tela>
    );
  }

  if (erroExercicio || !exercicio) {
    return (
      <Tela>
        <CabecalhoDetalhe titulo="Editar exercício" />
        <EstadoErro mensagem={erroExercicio || 'Exercício não encontrado.'} />
      </Tela>
    );
  }

  return (
    <FormularioExercicio
      titulo="Editar exercício"
      rotuloBotao="SALVAR ALTERAÇÕES"
      exercicio={exercicio}
      salvando={salvando}
      desabilitado={enviandoImagem || enviandoVideo}
      onSalvar={salvarAlteracoes}
      topo={
        <>
          <TituloSecao titulo="Imagem" />
          <PreviaMidiaExercicio uri={exercicio.imagem} />
          <View style={estilos.espaco} />
          <SeletorMidiaExercicio
            idExercicio={idExercicio}
            tipo="imagem"
            existeMidia={Boolean(exercicio.imagem)}
            carregando={enviandoImagem}
            bloqueado={salvando || enviandoVideo}
            erro={erroImagem}
            enviar={enviarImagem}
            aoEnviarComSucesso={recarregar}
          />

          <TituloSecao titulo="Vídeo" />
          {exercicio.video ? (
            <>
              <VideoPlayerExercicio uri={exercicio.video} />
              <View style={estilos.espaco} />
            </>
          ) : null}
          <SeletorMidiaExercicio
            idExercicio={idExercicio}
            tipo="video"
            existeMidia={Boolean(exercicio.video)}
            carregando={enviandoVideo}
            bloqueado={salvando || enviandoImagem}
            erro={erroVideo}
            enviar={enviarVideo}
            aoEnviarComSucesso={recarregar}
          />
        </>
      }
    />
  );
}

const estilos = StyleSheet.create({
  espaco: { height: 12 },
});
