import { Modal, StyleSheet, Text, View } from 'react-native';

import { cores, raios } from '@/theme';
import { BotaoAlerta } from '@/utils/alerta';

import { Botao, VarianteBotao } from './Botao';

export type BotaoDialogo = BotaoAlerta;

export interface DialogoAlertaProps {
  visivel: boolean;
  titulo: string;
  mensagem?: string;
  /** Sem botões, mostra um "OK". */
  botoes?: BotaoDialogo[];
  /** Tocou num botão: quem usa fecha o diálogo e executa o `onPress`. */
  aoEscolher: (botao: BotaoDialogo) => void;
}

const OK: BotaoDialogo = { text: 'OK' };

export function varianteDoBotao(estilo: BotaoDialogo['style']): VarianteBotao {
  if (estilo === 'destructive') {
    return 'perigo';
  }

  return estilo === 'cancel' ? 'secundario' : 'primario';
}

/** Rótulo mais longo que isto não cabe lado a lado sem quebrar linha. */
export const LIMITE_ROTULO_EM_LINHA = 12;

/** Botões lado a lado só se forem até 2 e todos com rótulo curto; senão, empilhados (QA P-I). */
export function botoesEmLinha(botoes: BotaoDialogo[]): boolean {
  return botoes.length <= 2 && botoes.every((b) => b.text.length <= LIMITE_ROTULO_EM_LINHA);
}

/**
 * Modal escuro do design system que substitui `Alert.alert` (nativo e web, ADR-030).
 * Botões `default` (amarelo), `destructive` (vermelho) e `cancel` (secundário).
 */
export function DialogoAlerta({ visivel, titulo, mensagem, botoes, aoEscolher }: DialogoAlertaProps) {
  const lista = botoes && botoes.length > 0 ? botoes : [OK];
  const cancelar = lista.find((b) => b.style === 'cancel');
  const emLinha = botoesEmLinha(lista);

  return (
    <Modal
      visible={visivel}
      transparent
      animationType="fade"
      statusBarTranslucent
      // Voltar do Android: só dispensa o alerta se houver um botão "cancelar" (como o Alert nativo).
      onRequestClose={() => cancelar && aoEscolher(cancelar)}
    >
      <View style={estilos.fundo}>
        <View
          style={estilos.caixa}
          testID="dialogo-alerta"
          accessibilityViewIsModal
          accessibilityRole="alert"
        >
          <Text style={estilos.titulo} testID="alerta-titulo" accessibilityRole="header">
            {titulo}
          </Text>
          {mensagem ? (
            <Text style={estilos.mensagem} testID="alerta-mensagem">
              {mensagem}
            </Text>
          ) : null}

          <View style={[estilos.botoes, emLinha ? estilos.linha : estilos.coluna]}>
            {lista.map((botao, indice) => (
              <View key={`${indice}-${botao.text}`} style={emLinha ? estilos.botaoLinha : undefined}>
                <Botao
                  variante={varianteDoBotao(botao.style)}
                  tamanho="medio"
                  onPress={() => aoEscolher(botao)}
                  testID={`alerta-botao-${botao.style ?? 'default'}-${indice}`}
                >
                  {botao.text}
                </Botao>
              </View>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  fundo: {
    flex: 1,
    backgroundColor: cores.veu,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  caixa: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: cores.superficieElevada,
    borderRadius: raios.cartao,
    borderWidth: 1,
    borderColor: cores.bordaForte,
    padding: 22,
  },
  titulo: { color: cores.texto, fontSize: 19, fontWeight: '700', lineHeight: 25 },
  mensagem: { color: cores.textoSecundario, fontSize: 15, lineHeight: 22, marginTop: 8 },
  botoes: { marginTop: 22, gap: 10 },
  linha: { flexDirection: 'row' },
  coluna: { flexDirection: 'column' },
  botaoLinha: { flex: 1 },
});
