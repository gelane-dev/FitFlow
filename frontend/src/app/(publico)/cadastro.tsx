import { router } from 'expo-router';
import { useState } from 'react';
import { ImageBackground, StyleSheet, Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Botao } from '@/components/ui/Botao';
import { CabecalhoDetalhe } from '@/components/ui/CabecalhoDetalhe';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { Pressionavel } from '@/components/ui/Pressionavel';
import { useAlertaErro } from '@/hooks/useAlertaErro';
import { useCadastro } from '@/hooks/useCadastro';
import { cores, fonteDisplay, margemTela } from '@/theme';
import { mostrarAlerta } from '@/utils/alerta';
import { dataBrParaIso, mascararData } from '@/utils/datas';

export default function Cadastro() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const insets = useSafeAreaInsets();

  const { fazerCadastro: cadastrar, erro, carregando } = useCadastro();

  useAlertaErro(erro);

  async function fazerCadastro() {
    if (senha !== confirmarSenha) {
      mostrarAlerta('Erro', 'As senhas não coincidem.');

      return;
    }

    const nascimentoIso = dataBrParaIso(dataNascimento);

    if (!nascimentoIso) {
      mostrarAlerta('Erro', 'Informe a data de nascimento no formato DD/MM/AAAA.');

      return;
    }

    const sucesso = await cadastrar({
      nome,
      email,
      telefone,
      data_nascimento: nascimentoIso,
      senha,
    });

    if (sucesso) {
      // Navega sem depender do botão do alerta (na web ele pode não rodar).
      router.replace('/');
      mostrarAlerta('Cadastro realizado', 'Sua conta foi criada com sucesso.');
    }
  }

  return (
    <ImageBackground
      source={require('@/assets/images/backgrounds/fundo-login.png')}
      style={estilos.fundo}
      resizeMode="cover"
    >
      <View style={estilos.veu}>
        <KeyboardAwareScrollView
          contentContainerStyle={[
            estilos.conteudo,
            { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          enableOnAndroid
          extraScrollHeight={30}
        >
          <CabecalhoDetalhe aoVoltar={() => router.replace('/')} />

          <Text style={estilos.titulo}>CRIAR CONTA</Text>
          <Text style={estilos.subtitulo}>Cadastre-se para acompanhar seus treinos.</Text>

          <CampoTexto
            rotulo="Nome"
            placeholder="Digite seu nome"
            value={nome}
            onChangeText={setNome}
            autoCapitalize="words"
            icone="person-outline"
          />

          <CampoTexto
            rotulo="E-mail"
            placeholder="Digite seu e-mail"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
            icone="mail-outline"
          />

          <CampoTexto
            rotulo="Telefone"
            placeholder="Digite seu telefone"
            keyboardType="phone-pad"
            value={telefone}
            onChangeText={setTelefone}
            icone="call-outline"
          />

          <CampoTexto
            rotulo="Data de nascimento"
            placeholder="DD/MM/AAAA"
            value={dataNascimento}
            onChangeText={(valor) => setDataNascimento(mascararData(valor))}
            keyboardType="number-pad"
            maxLength={10}
            icone="calendar-outline"
          />

          <CampoTexto
            rotulo="Senha"
            placeholder="Digite sua senha"
            secureTextEntry
            value={senha}
            onChangeText={setSenha}
            icone="lock-closed-outline"
          />

          <CampoTexto
            rotulo="Confirmar senha"
            placeholder="Confirme sua senha"
            secureTextEntry
            value={confirmarSenha}
            onChangeText={setConfirmarSenha}
            icone="lock-closed-outline"
          />

          <Botao onPress={fazerCadastro} carregando={carregando}>
            CADASTRAR
          </Botao>

          <View style={estilos.login}>
            <Text style={estilos.textoLogin}>Já possui uma conta?</Text>

            <Pressionavel onPress={() => router.replace('/')} hitSlop={8}>
              <Text style={estilos.linkLogin}>Entrar</Text>
            </Pressionavel>
          </View>
        </KeyboardAwareScrollView>
      </View>
    </ImageBackground>
  );
}

const estilos = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: cores.fundo },
  veu: { flex: 1, backgroundColor: cores.veu },
  conteudo: {
    flexGrow: 1,
    paddingHorizontal: margemTela,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  titulo: {
    color: cores.primaria,
    fontFamily: fonteDisplay,
    fontSize: 28,
    letterSpacing: 1,
    marginTop: 12,
  },
  subtitulo: { color: cores.textoSecundario, fontSize: 15, marginTop: 6, marginBottom: 28 },
  login: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    gap: 6,
  },
  textoLogin: { color: cores.textoSecundario, fontSize: 14 },
  linkLogin: { color: cores.primaria, fontSize: 14, fontWeight: '700' },
});
