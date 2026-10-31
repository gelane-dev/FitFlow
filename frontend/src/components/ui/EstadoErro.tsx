import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { cores } from '@/theme';

import { Botao } from './Botao';

export interface EstadoErroProps {
  mensagem?: string;
  aoTentarNovamente?: () => void;
  /** Erro de conexão: usa o ícone de nuvem sem rede. Nos demais, o ícone de alerta. */
  rede?: boolean;
}

/** Erro de carregamento da tela inteira, centralizado, com botão "Tentar novamente". */
export function EstadoErro({
  mensagem = 'Algo deu errado. Tente novamente.',
  aoTentarNovamente,
  rede = false,
}: EstadoErroProps) {
  return (
    <View style={estilos.caixa} testID="estado-erro">
      <Ionicons
        name={rede ? 'cloud-offline-outline' : 'alert-circle-outline'}
        size={40}
        color={cores.perigo}
      />
      <Text style={estilos.mensagem}>{mensagem}</Text>
      {aoTentarNovamente ? (
        <Botao
          variante="secundario"
          tamanho="medio"
          larguraTotal={false}
          icone="refresh"
          onPress={aoTentarNovamente}
          style={estilos.botao}
        >
          Tentar novamente
        </Botao>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  caixa: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  mensagem: { color: cores.textoSecundario, fontSize: 15, textAlign: 'center' },
  botao: { alignSelf: 'center' },
});
