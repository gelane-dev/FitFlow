import { router } from 'expo-router';

import { FormularioExercicio } from '@/components/FormularioExercicio';
import { useAlertaErro } from '@/hooks/useAlertaErro';
import { useGerenciarExercicio } from '@/hooks/useGerenciarExercicio';
import { ExercicioAtualizar } from '@/types/exercicio.types';
import { mostrarAlerta } from '@/utils/alerta';

/** Novo exercício (/exercicios/novo). */
export default function NovoExercicio() {
  const { criar, carregando, erro } = useGerenciarExercicio();

  useAlertaErro(erro);

  async function salvarExercicio(dados: ExercicioAtualizar) {
    const exercicio = await criar(dados);

    if (!exercicio) {
      return;
    }

    mostrarAlerta('Exercício criado', 'O exercício foi criado com sucesso.', [
      {
        text: 'OK',
        onPress: () => router.replace('/exercicios'),
      },
    ]);
  }

  return (
    <FormularioExercicio
      titulo="Novo exercício"
      rotuloBotao="SALVAR EXERCÍCIO"
      salvando={carregando}
      onSalvar={salvarExercicio}
    />
  );
}
