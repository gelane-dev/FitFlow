import { useWindowDimensions } from 'react-native';

import { classificarLargura, LarguraTela } from '@/utils/larguraTela';

/** `{largura, ehLargo (>= 1024), ehMedio (>= 768)}` da janela; reage a rotação e redimensionamento. */
export function useLarguraTela(): LarguraTela {
  const { width } = useWindowDimensions();

  return classificarLargura(width);
}
