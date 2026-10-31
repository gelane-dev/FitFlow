import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { cores, raios } from '@/theme';

import { Botao } from './Botao';

export interface EstadoErroSecaoProps {
  mensagem: string;
  aoTentarNovamente?: () => void;
  rede?: boolean;
  testID?: string;
}

/** Erro compacto de uma seção (a tela continua útil): mensagem e "Tentar novamente". */
export function EstadoErroSecao({
  mensagem,
  aoTentarNovamente,
  rede = false,
  testID,
}: EstadoErroSecaoProps) {
  return (
    <View style={estilos.secao} testID={testID ?? 'estado-erro-secao'}>
      <View style={estilos.secaoLinha}>
        <Ionicons
          name={rede ? 'cloud-offline-outline' : 'alert-circle-outline'}
          size={20}
          color={cores.perigo}
        />
        <Text style={estilos.secaoMensagem}>{mensagem}</Text>
      </View>
      {aoTentarNovamente ? (
        <Botao
          variante="secundario"
          tamanho="pequeno"
          larguraTotal={false}
          icone="refresh"
          onPress={aoTentarNovamente}
          style={estilos.secaoBotao}
        >
          Tentar novamente
        </Botao>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  secao: {
    backgroundColor: cores.superficie,
    borderRadius: raios.cartao,
    borderWidth: 1,
    borderColor: cores.borda,
    padding: 14,
    gap: 10,
  },
  secaoLinha: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  secaoMensagem: { flex: 1, color: cores.textoSecundario, fontSize: 14 },
  secaoBotao: { alignSelf: 'flex-start' },
});
