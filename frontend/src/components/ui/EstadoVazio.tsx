import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { cores } from '@/theme';

import { Botao } from './Botao';

export interface EstadoVazioProps {
  icone?: keyof typeof Ionicons.glyphMap;
  titulo: string;
  descricao?: string;
  acaoRotulo?: string;
  aoAcionar?: () => void;
}

/** Estado vazio: ícone grande, frase curta e botão de ação opcional. */
export function EstadoVazio({
  icone = 'albums-outline',
  titulo,
  descricao,
  acaoRotulo,
  aoAcionar,
}: EstadoVazioProps) {
  return (
    <View style={estilos.caixa}>
      <View style={estilos.circulo}>
        <Ionicons name={icone} size={36} color={cores.textoTerciario} />
      </View>
      <Text style={estilos.titulo}>{titulo}</Text>
      {descricao ? <Text style={estilos.descricao}>{descricao}</Text> : null}
      {acaoRotulo && aoAcionar ? (
        <View style={estilos.acao}>
          <Botao onPress={aoAcionar} tamanho="medio" larguraTotal={false}>
            {acaoRotulo}
          </Botao>
        </View>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  caixa: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  circulo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: cores.superficie,
    borderWidth: 1,
    borderColor: cores.borda,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  titulo: { color: cores.texto, fontSize: 17, fontWeight: '600', textAlign: 'center' },
  descricao: { color: cores.textoSecundario, fontSize: 14, textAlign: 'center', marginTop: 6 },
  acao: { marginTop: 20 },
});
