import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { useNavigation } from 'expo-router';

import { mostrarAlerta } from '@/utils/alerta';

/**
 * Avisa antes de sair da tela com alterações não salvas: voltar/navegar dentro do app abre uma
 * confirmação ("Continuar editando" / "Sair sem salvar") e, na web, fechar ou recarregar a aba
 * dispara o aviso nativo do navegador. `ativo` = há alterações.
 */
export function useAvisoSaidaSemSalvar(ativo: boolean) {
  const navigation = useNavigation();
  const ativoRef = useRef(ativo);
  const liberado = useRef(false);

  useEffect(() => {
    ativoRef.current = ativo;
  }, [ativo]);

  useEffect(() => {
    const remover = navigation.addListener('beforeRemove', (evento) => {
      if (!ativoRef.current || liberado.current) {
        return;
      }

      evento.preventDefault();
      mostrarAlerta(
        'Sair sem salvar?',
        'Você tem alterações que ainda não foram salvas. Se sair agora, elas serão perdidas.',
        [
          { text: 'Continuar editando', style: 'cancel' },
          {
            text: 'Sair sem salvar',
            style: 'destructive',
            onPress: () => {
              liberado.current = true;
              navigation.dispatch(evento.data.action);
            },
          },
        ]
      );
    });

    return remover;
  }, [navigation]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return undefined;
    }

    function aoFechar(evento: BeforeUnloadEvent) {
      if (!ativoRef.current) {
        return;
      }

      evento.preventDefault();
      // Navegadores exigem returnValue para exibir o aviso nativo.
      evento.returnValue = '';
    }

    window.addEventListener('beforeunload', aoFechar);

    return () => window.removeEventListener('beforeunload', aoFechar);
  }, []);

  /** Libera a saída (use logo antes de navegar depois de salvar). */
  return {
    liberarSaida: () => {
      liberado.current = true;
    },
  };
}
