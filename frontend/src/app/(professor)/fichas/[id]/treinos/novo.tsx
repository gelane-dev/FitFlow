import { router, useLocalSearchParams } from 'expo-router';

import { FormularioTreino } from '@/components/FormularioTreino';
import { useAlertaErro } from '@/hooks/useAlertaErro';
import { useGerenciarTreino } from '@/hooks/useGerenciarTreino';
import { paramTexto } from '@/utils/params';
import { mostrarAlerta } from '@/utils/alerta';

/** Novo treino da ficha (/fichas/[id]/treinos/novo). */
export default function NovoTreino() {
  const { id, ordem } = useLocalSearchParams();
  const idFicha = Number(paramTexto(id));

  const { criar, carregando, erro } = useGerenciarTreino();

  useAlertaErro(erro);

  return (
    <FormularioTreino
      titulo="Novo treino"
      rotuloBotao="CRIAR TREINO"
      salvando={carregando}
      ordemInicial={paramTexto(ordem) || '1'}
      onSalvar={async (dados) => {
        const treino = await criar({ ficha_id: idFicha, ...dados });

        if (!treino) {
          return;
        }

        mostrarAlerta('Treino criado', 'Agora monte os exercícios desta sessão.', [
          {
            text: 'OK',
            onPress: () =>
              router.replace({
                pathname: '/fichas/[id]/treinos/[treinoId]' as any,
                params: {
                  id: idFicha.toString(),
                  treinoId: treino.id.toString(),
                  nomeTreino: treino.nome,
                },
              }),
          },
        ]);
      }}
    />
  );
}
