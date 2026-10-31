import { useEffect } from 'react';
import { Alert } from 'react-native';

/** Exibe um Alert sempre que `erro` receber uma mensagem. */
export function useAlertaErro(erro: string | null | undefined) {
  useEffect(() => {
    if (erro) {
      Alert.alert('Erro', erro);
    }
  }, [erro]);
}
