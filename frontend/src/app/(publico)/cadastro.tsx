import { useEffect, useState } from 'react';
import { router } from 'expo-router';

import {
  Alert,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import { Input } from '@/components/input';
import { Button } from '@/components/button';
import { useCadastro } from '@/hooks/useCadastro';

export default function Cadastro() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');

  const {
    fazerCadastro: cadastrar,
    erro,
    carregando,
  } = useCadastro();

  useEffect(() => {
    if (erro) {
      Alert.alert(
        'Erro',
        erro
      );
    }
  }, [erro]);

  async function fazerCadastro() {
    if (senha !== confirmarSenha) {
      Alert.alert(
        'Erro',
        'As senhas não coincidem.'
      );

      return;
    }

    const sucesso = await cadastrar({
      nome,
      email,
      telefone,
      data_nascimento: dataNascimento,
      senha,
    });

    if (sucesso) {
      Alert.alert(
        'Cadastro realizado',
        'Sua conta foi criada com sucesso.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/'),
          },
        ]
      );
    }
  }

  return (
    <ImageBackground
      source={require('@/assets/images/backgrounds/fundo-login.png')}
      style={styles.container}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          style={styles.teclado}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <KeyboardAwareScrollView
            contentContainerStyle={styles.conteudo}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            enableOnAndroid
            extraScrollHeight={30}
          >
            <View style={styles.formulario}>
              <Image
                source={require('@/assets/images/branding/brasao.png')}
                style={styles.brasao}
              />

              <Text style={styles.titulo}>
                CRIAR CONTA
              </Text>

              <Text style={styles.label}>
                Nome
              </Text>

              <Input
                placeholder="Digite seu nome"
                placeholderTextColor="#888"
                value={nome}
                onChangeText={setNome}
                autoCapitalize="words"
              />

              <Text style={styles.label}>
                E-mail
              </Text>

              <Input
                placeholder="Digite seu e-mail"
                placeholderTextColor="#888"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />

              <Text style={styles.label}>
                Telefone
              </Text>

              <Input
                placeholder="Digite seu telefone"
                placeholderTextColor="#888"
                keyboardType="phone-pad"
                value={telefone}
                onChangeText={setTelefone}
              />

              <Text style={styles.label}>
                Data de nascimento
              </Text>

              <Input
                placeholder="AAAA-MM-DD"
                placeholderTextColor="#888"
                value={dataNascimento}
                onChangeText={setDataNascimento}
                keyboardType="numbers-and-punctuation"
              />

              <Text style={styles.label}>
                Senha
              </Text>

              <Input
                placeholder="Digite sua senha"
                placeholderTextColor="#888"
                secureTextEntry
                value={senha}
                onChangeText={setSenha}
              />

              <Text style={styles.label}>
                Confirmar senha
              </Text>

              <Input
                placeholder="Confirme sua senha"
                placeholderTextColor="#888"
                secureTextEntry
                value={confirmarSenha}
                onChangeText={setConfirmarSenha}
              />

              <Button
                onPress={fazerCadastro}
                disabled={carregando}
              >
                {carregando ? 'CADASTRANDO...' : 'CADASTRAR'}
              </Button>

              <View style={styles.login}>
                <Text style={styles.textoLogin}>
                  Já possui uma conta?
                </Text>

                <Pressable onPress={() => router.push('/')}>
                  <Text style={styles.linkLogin}>
                    Entrar
                  </Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAwareScrollView>
        </KeyboardAvoidingView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },

  teclado: {
    flex: 1,
  },

  conteudo: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },

  formulario: {
    width: '85%',
    maxWidth: 400,
  },

  brasao: {
    width: 75,
    height: 75,
    alignSelf: 'center',
    marginBottom: 15,
  },

  titulo: {
    color: '#FECF2B',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 1,
    marginBottom: 30,
  },

  label: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },

  login: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },

  textoLogin: {
    color: '#AAAAAA',
    fontSize: 14,
  },

  linkLogin: {
    color: '#FECF2B',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
});