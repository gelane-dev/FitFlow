import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { router, useLocalSearchParams } from "expo-router";

import { Button } from "@/components/button";
import { SeletorMidiaExercicio } from "@/components/exercicios/SeletorMidiaExercicio";
import { FormularioExercicio } from "@/components/FormularioExercicio";
import { useAlertaErro } from "@/hooks/useAlertaErro";
import { useExercicio } from "@/hooks/useExercicio";
import { useGerenciarExercicio } from "@/hooks/useGerenciarExercicio";
import { useImagemExercicio } from "@/hooks/useImagemExercicio";
import { ExercicioAtualizar } from "@/types/exercicio.types";

export default function EditarExercicio() {
  const { id } = useLocalSearchParams();

  const idExercicio = Number(id);

  const {
    exercicio,
    carregando: carregandoExercicio,
    erro: erroExercicio,
    recarregar,
  } = useExercicio(idExercicio);

  const {
    atualizar,
    carregando: salvando,
    erro: erroAtualizacao,
  } = useGerenciarExercicio();

  const {
    enviarImagem,
    carregando: enviandoImagem,
    erro: erroImagem,
  } = useImagemExercicio();

  useAlertaErro(erroExercicio);
  useAlertaErro(erroAtualizacao);

  async function salvarAlteracoes(dados: ExercicioAtualizar) {
    const exercicioAtualizado = await atualizar(idExercicio, dados);

    if (!exercicioAtualizado) {
      return;
    }

    Alert.alert(
      "Exercício atualizado",
      "As alterações foram salvas com sucesso.",
      [
        {
          text: "OK",
          onPress: () => router.replace("/exercicios"),
        },
      ],
    );
  }

  // O spinner só aparece na primeira carga. Em recarregamentos (ex.: após
  // trocar a imagem) o formulário continua montado e preserva o que foi digitado.
  if (carregandoExercicio && !exercicio) {
    return (
      <View style={styles.carregando}>
        <ActivityIndicator size="large" color="#FECF2B" />

        <Text style={styles.textoCarregando}>Carregando exercício...</Text>
      </View>
    );
  }

  if (erroExercicio || !exercicio) {
    return (
      <View style={styles.mensagem}>
        <Text style={styles.tituloErro}>Erro ao carregar exercício</Text>

        <Text style={styles.textoErro}>
          {erroExercicio || "Exercício não encontrado."}
        </Text>

        <View style={styles.botaoVoltar}>
          <Button onPress={() => router.back()}>VOLTAR</Button>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.conteudo}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.voltar} onPress={() => router.back()}>
        ‹ Voltar
      </Text>

      <Text style={styles.titulo}>EDITAR EXERCÍCIO</Text>

      <Text style={styles.label}>Imagem</Text>

      {exercicio.imagem ? (
        <Image
          source={{ uri: exercicio.imagem }}
          style={styles.imagem}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.semImagem}>
          <Text style={styles.textoSemImagem}>Nenhuma imagem cadastrada</Text>
        </View>
      )}

      <SeletorMidiaExercicio
        idExercicio={idExercicio}
        tipo="imagem"
        existeMidia={Boolean(exercicio.imagem)}
        carregando={enviandoImagem}
        bloqueado={salvando}
        erro={erroImagem}
        enviar={enviarImagem}
        aoEnviarComSucesso={recarregar}
      />

      <FormularioExercicio
        exercicio={exercicio}
        salvando={salvando}
        desabilitado={enviandoImagem}
        onSalvar={salvarAlteracoes}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111111",
  },

  conteudo: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 80,
  },

  voltar: {
    color: "#FECF2B",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 25,
  },

  titulo: {
    color: "#FECF2B",
    fontSize: 28,
    fontWeight: "bold",
    letterSpacing: 1,
    marginBottom: 30,
  },

  label: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },

  imagem: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    backgroundColor: "#1A1A1A",
    marginBottom: 12,
  },

  semImagem: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    backgroundColor: "#1A1A1A",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },

  textoSemImagem: {
    color: "#777777",
    fontSize: 14,
  },

  carregando: {
    flex: 1,
    backgroundColor: "#111111",
    justifyContent: "center",
    alignItems: "center",
  },

  textoCarregando: {
    color: "#AAAAAA",
    fontSize: 14,
    marginTop: 12,
  },

  mensagem: {
    flex: 1,
    backgroundColor: "#111111",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },

  tituloErro: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },

  textoErro: {
    color: "#AAAAAA",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 25,
  },

  botaoVoltar: {
    width: "100%",
    maxWidth: 300,
  },
});
