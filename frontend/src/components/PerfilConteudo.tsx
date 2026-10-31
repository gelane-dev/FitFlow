import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Botao } from '@/components/ui/Botao';
import { CabecalhoGrande } from '@/components/ui/CabecalhoGrande';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { Cartao } from '@/components/ui/Cartao';
import { LinhaLista } from '@/components/ui/LinhaLista';
import { Selo } from '@/components/ui/Selo';
import { Tela } from '@/components/ui/Tela';
import { TituloSecao } from '@/components/ui/TituloSecao';
import { useAlertaErro } from '@/hooks/useAlertaErro';
import { useAuth } from '@/hooks/useAuth';
import { useErrosAposTentativa } from '@/hooks/useErrosAposTentativa';
import { useGerenciarPerfil } from '@/hooks/useGerenciarPerfil';
import { usePerfil } from '@/hooks/usePerfil';
import { cores } from '@/theme';
import { mostrarAlerta } from '@/utils/alerta';
import { dataBrParaIso, mascararData } from '@/utils/datas';
import { CampoTrocaSenha, validarTrocaSenha } from '@/utils/validacaoFormularios';

const TAMANHO_MAXIMO_FOTO = 5 * 1024 * 1024;

const EXTENSOES_FOTO: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

const ROTULO_TIPO = {
  aluno: 'Aluno',
  professor: 'Professor',
  admin: 'Administrador',
} as const;

/**
 * Conteúdo da aba Perfil, compartilhado pelas áreas do professor e do aluno
 * (cada grupo de abas tem o seu arquivo perfil.tsx, que só renderiza este componente).
 */
export function PerfilConteudo() {
  const { usuario, sair } = useAuth();

  const {
    nome,
    telefone,
    dataNascimento,
    setNome,
    setTelefone,
    setDataNascimento,
    carregando: carregandoPerfil,
    erro: erroPerfil,
  } = usePerfil();

  const {
    salvarDados,
    trocarSenha,
    trocarFoto,
    removerFoto,
    carregando,
    erro,
  } = useGerenciarPerfil();

  useAlertaErro(erroPerfil);
  useAlertaErro(erro);

  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const refNovaSenha = useRef<TextInput>(null);
  const refConfirmacao = useRef<TextInput>(null);
  const [confirmacaoSenha, setConfirmacaoSenha] = useState('');
  const { erros: errosSenha, tentar: tentarSenha } = useErrosAposTentativa<CampoTrocaSenha>(() =>
    validarTrocaSenha({ senhaAtual, novaSenha, confirmacao: confirmacaoSenha })
  );

  const ehAluno = usuario?.tipo === 'aluno';
  const temDados = usuario?.tipo === 'aluno' || usuario?.tipo === 'professor';
  const ocupado = carregando || carregandoPerfil;

  async function aoSalvarDados() {
    const nascimentoIso = ehAluno ? dataBrParaIso(dataNascimento) : '';

    if (ehAluno && !nascimentoIso) {
      mostrarAlerta('Erro', 'Informe a data de nascimento no formato DD/MM/AAAA.');

      return;
    }

    const sucesso = await salvarDados({ nome, telefone, dataNascimento: nascimentoIso ?? '' });

    if (sucesso) {
      mostrarAlerta('Sucesso', 'Dados atualizados.');
    }
  }

  async function aoTrocarSenha() {
    if (!tentarSenha()) {
      return;
    }

    const sucesso = await trocarSenha(senhaAtual, novaSenha);

    if (sucesso) {
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmacaoSenha('');
      mostrarAlerta('Sucesso', 'Senha atualizada.');
    }
  }

  async function aoSelecionarFoto() {
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (resultado.canceled) {
      return;
    }

    const imagem = resultado.assets[0];

    if (imagem.fileSize && imagem.fileSize > TAMANHO_MAXIMO_FOTO) {
      mostrarAlerta('Erro', 'A foto deve ter no máximo 5MB.');
      return;
    }

    const extensao = EXTENSOES_FOTO[imagem.mimeType ?? ''];

    if (!extensao) {
      mostrarAlerta('Erro', 'Formato não suportado. Use uma imagem JPG ou PNG.');
      return;
    }

    await trocarFoto({
      uri: imagem.uri,
      name: `perfil.${extensao}`,
      type: imagem.mimeType as string,
    });
  }

  function confirmarRemocaoFoto() {
    mostrarAlerta('Remover foto', 'Deseja remover sua foto de perfil?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => removerFoto() },
    ]);
  }

  function confirmarSaida() {
    mostrarAlerta('Sair', 'Deseja sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => sair() },
    ]);
  }

  return (
    <Tela abas teclado>
      <CabecalhoGrande rotulo="Minha conta" titulo="Perfil" />

      <View style={estilos.identidade}>
        <Avatar uri={usuario?.foto} nome={nome || usuario?.email} tamanho={96} />
        <Text style={estilos.nome} numberOfLines={1}>
          {nome || usuario?.email}
        </Text>
        <Text style={estilos.email} numberOfLines={1}>
          {usuario?.email}
        </Text>
        {usuario && (
          <View>
            <Selo rotulo={ROTULO_TIPO[usuario.tipo]} />
          </View>
        )}

        <View style={estilos.acoesFoto}>
          <Botao
            variante="secundario"
            tamanho="pequeno"
            larguraTotal={false}
            icone="camera-outline"
            onPress={aoSelecionarFoto}
            disabled={ocupado}
          >
            Trocar foto
          </Botao>

          {usuario?.foto ? (
            <Botao
              variante="perigo"
              tamanho="pequeno"
              larguraTotal={false}
              onPress={confirmarRemocaoFoto}
              disabled={ocupado}
            >
              Remover
            </Botao>
          ) : null}
        </View>
      </View>

      {ehAluno && (
        <>
          <TituloSecao titulo="Acompanhamento" />
          <Cartao semPadding style={estilos.cartaoLista}>
            <LinhaLista
              icone="body-outline"
              titulo="Avaliações físicas"
              subtitulo="Peso, medidas e IMC"
              onPress={() => router.push('/aluno/avaliacoes')}
            />
            <LinhaLista
              icone="alarm-outline"
              titulo="Lembretes de treino"
              subtitulo="Avisos nos dias de treino"
              separador={false}
              onPress={() => router.push('/aluno/lembretes')}
            />
          </Cartao>
        </>
      )}

      {temDados && (
        <>
          <TituloSecao titulo="Dados pessoais" />

          <CampoTexto
            rotulo="Nome"
            value={nome}
            onChangeText={setNome}
            placeholder="Nome"
            autoCapitalize="words"
          />

          <CampoTexto
            rotulo="Telefone"
            value={telefone}
            onChangeText={setTelefone}
            keyboardType="phone-pad"
            placeholder="Telefone"
          />

          {ehAluno && (
            <CampoTexto
              rotulo="Data de nascimento"
              value={dataNascimento}
              onChangeText={(valor) => setDataNascimento(mascararData(valor))}
              keyboardType="number-pad"
              placeholder="DD/MM/AAAA"
            />
          )}

          <Botao onPress={aoSalvarDados} carregando={carregando}>
            SALVAR DADOS
          </Botao>
        </>
      )}

      <TituloSecao titulo="Trocar senha" />

      <CampoTexto
        value={senhaAtual}
        onChangeText={setSenhaAtual}
        secureTextEntry
        placeholder="Senha atual"
        icone="lock-closed-outline"
        erro={errosSenha.senhaAtual}
        returnKeyType="next"
        blurOnSubmit={false}
        onSubmitEditing={() => refNovaSenha.current?.focus()}
      />

      <CampoTexto
        value={novaSenha}
        ref={refNovaSenha}
        onChangeText={setNovaSenha}
        secureTextEntry
        placeholder="Nova senha"
        icone="key-outline"
        erro={errosSenha.novaSenha}
        returnKeyType="next"
        blurOnSubmit={false}
        onSubmitEditing={() => refConfirmacao.current?.focus()}
      />

      <CampoTexto
        value={confirmacaoSenha}
        ref={refConfirmacao}
        onChangeText={setConfirmacaoSenha}
        secureTextEntry
        placeholder="Confirmar nova senha"
        icone="key-outline"
        erro={errosSenha.confirmacao}
        returnKeyType="done"
        onSubmitEditing={aoTrocarSenha}
      />

      <Botao variante="secundario" onPress={aoTrocarSenha} disabled={carregando}>
        ALTERAR SENHA
      </Botao>

      <View style={estilos.sair}>
        <Botao variante="perigo" icone="log-out-outline" onPress={confirmarSaida} testID="botao-sair">
          SAIR
        </Botao>
      </View>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  identidade: { alignItems: 'center', gap: 8, marginBottom: 4 },
  nome: { color: cores.texto, fontSize: 22, fontWeight: '700', marginTop: 8 },
  email: { color: cores.textoSecundario, fontSize: 14 },
  acoesFoto: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cartaoLista: { paddingHorizontal: 16 },
  sair: { marginTop: 40 },
});
