import { Alert, Platform } from 'react-native';

export interface BotaoAlerta {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

export interface ItemAlerta {
  titulo: string;
  mensagem?: string;
  botoes?: BotaoAlerta[];
}

type Exibidor = (item: ItemAlerta) => void;

let exibidor: Exibidor | null = null;

/**
 * Registra quem desenha os alertas (o `ProvedorAlerta` do layout raiz). Devolve a função que
 * desfaz o registro. Sem exibidor (ex.: testes), `mostrarAlerta` usa o fallback do sistema.
 */
export function registrarExibidorAlerta(novo: Exibidor): () => void {
  exibidor = novo;

  return () => {
    if (exibidor === novo) {
      exibidor = null;
    }
  };
}

/**
 * Alerta multiplataforma (ADR-030 + adendo). Com o `ProvedorAlerta` montado, abre o modal escuro
 * do design system, igual no nativo e na web. Sem ele, cai no `Alert.alert` (nativo) ou em
 * `window.alert`/`window.confirm` (web), executando o `onPress` do botão escolhido.
 */
export function mostrarAlerta(
  titulo: string,
  mensagem?: string,
  botoes?: BotaoAlerta[]
): void {
  if (exibidor) {
    exibidor({ titulo, mensagem, botoes });

    return;
  }

  if (Platform.OS !== 'web') {
    Alert.alert(titulo, mensagem, botoes);

    return;
  }

  const texto = mensagem ? `${titulo}\n\n${mensagem}` : titulo;

  if (!botoes || botoes.length <= 1) {
    window.alert(texto);
    botoes?.[0]?.onPress?.();

    return;
  }

  if (window.confirm(texto)) {
    botoes.find((b) => b.style !== 'cancel')?.onPress?.();
  } else {
    botoes.find((b) => b.style === 'cancel')?.onPress?.();
  }
}
