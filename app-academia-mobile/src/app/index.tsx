import { useEffect, useState } from 'react';
import { router } from 'expo-router';

import {
  Alert,
  Image,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import { Input } from '@/components/input';
import { Button } from '@/components/button';
import { useAuth } from '@/hooks/useAuth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');

  const {
    entrar,
    erro,
    carregando,
  } = useAuth();

  useEffect(() => {
    if (erro) {
      Alert.alert(
        'Erro',
        erro
      );
    }
  }, [erro]);

  async function fazerLogin() {
    await entrar({
      email,
      senha,
    });

    router.replace('/exercicios');
  }

  return (
    <ImageBackground
      source={require('@/assets/images/backgrounds/fundo-login.png')}
      style={styles.container}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
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
              TEAM FITNESS
            </Text>

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
              Senha
            </Text>

            <Input
              placeholder="Digite sua senha"
              placeholderTextColor="#888"
              secureTextEntry
              value={senha}
              onChangeText={setSenha}
            />

            <Button
              onPress={fazerLogin}
              disabled={carregando}
            >
              {carregando ? 'ENTRANDO...' : 'ENTRAR'}
            </Button>

            <View style={styles.cadastro}>
              <Text style={styles.textoCadastro}>
                Não possui uma conta?
              </Text>

              <Pressable onPress={() => router.push('/cadastro')}>
                <Text style={styles.linkCadastro}>
                  Cadastre-se
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAwareScrollView>
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
    width: 90,
    height: 90,
    alignSelf: 'center',
    marginBottom: 20,
  },

  titulo: {
    color: '#FECF2B',
    fontSize: 30,
    fontFamily: 'OrbitronMedium',
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 35,
  },

  label: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },

  cadastro: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },

  textoCadastro: {
    color: '#AAAAAA',
    fontSize: 14,
  },

  linkCadastro: {
    color: '#FECF2B',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
});