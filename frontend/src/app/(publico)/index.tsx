import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Image, ImageBackground, StyleSheet, Text, TextInput, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Botao } from '@/components/ui/Botao';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { Pressionavel } from '@/components/ui/Pressionavel';
import { useAlertaErro } from '@/hooks/useAlertaErro';
import { useAuth } from '@/hooks/useAuth';
import { useErrosAposTentativa } from '@/hooks/useErrosAposTentativa';
import { cores, fonteDisplay, margemTela } from '@/theme';
import { CampoLogin, validarLogin } from '@/utils/validacaoFormularios';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const insets = useSafeAreaInsets();

  const { entrar, erro, carregando } = useAuth();

  useAlertaErro(erro);

  const refSenha = useRef<TextInput>(null);
  const { erros, tentar } = useErrosAposTentativa<CampoLogin>(() => validarLogin({ email, senha }));

  async function fazerLogin() {
    if (!tentar()) {
      return;
    }

    await entrar({ email, senha });

    // A guarda de rotas (_layout.tsx) decide o destino conforme o perfil:
    // professor -> /painel, aluno/admin -> /aluno.
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
            { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          enableOnAndroid
          extraScrollHeight={30}
        >
          <View style={estilos.marca}>
            <Image
              source={require('@/assets/images/branding/brasao.png')}
              style={estilos.brasao}
            />
            <Text style={estilos.titulo}>TEAM FITNESS</Text>
            <Text style={estilos.subtitulo}>Seu treino, sua evolução.</Text>
          </View>

          <View style={estilos.formulario}>
            <CampoTexto
              rotulo="E-mail"
              placeholder="Digite seu e-mail"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              icone="mail-outline"
              value={email}
              onChangeText={setEmail}
              erro={erros.email}
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => refSenha.current?.focus()}
              testID="campo-email"
            />

            <CampoTexto
              rotulo="Senha"
              placeholder="Digite sua senha"
              secureTextEntry
              icone="lock-closed-outline"
              ref={refSenha}
              value={senha}
              onChangeText={setSenha}
              erro={erros.senha}
              returnKeyType="done"
              onSubmitEditing={fazerLogin}
            />

            <Botao onPress={fazerLogin} carregando={carregando}>
              ENTRAR
            </Botao>

            <View style={estilos.cadastro}>
              <Text style={estilos.textoCadastro}>Não possui uma conta?</Text>

              <Pressionavel onPress={() => router.push('/cadastro')} hitSlop={8}>
                <Text style={estilos.linkCadastro}>Cadastre-se</Text>
              </Pressionavel>
            </View>
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
    justifyContent: 'center',
    paddingHorizontal: margemTela,
    gap: 36,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  marca: { alignItems: 'center', gap: 8 },
  brasao: { width: 96, height: 96 },
  titulo: {
    color: cores.primaria,
    fontFamily: fonteDisplay,
    fontSize: 30,
    letterSpacing: 2,
    textAlign: 'center',
  },
  subtitulo: { color: cores.textoSecundario, fontSize: 15 },
  formulario: { gap: 0 },
  cadastro: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    gap: 6,
  },
  textoCadastro: { color: cores.textoSecundario, fontSize: 14 },
  linkCadastro: { color: cores.primaria, fontSize: 14, fontWeight: '700' },
});
