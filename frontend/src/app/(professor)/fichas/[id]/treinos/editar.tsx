import { router, useLocalSearchParams } from 'expo-router';

import { FormularioTreino } from '@/components/FormularioTreino';
import { CabecalhoDetalhe } from '@/components/ui/CabecalhoDetalhe';
import { EstadoErro } from '@/components/ui/EstadoErro';
import { Tela } from '@/components/ui/Tela';
import { useAlertaErro } from '@/hooks/useAlertaErro';
import { useTreinoEdicao } from '@/hooks/useTreinoEdicao';
import { DIAS_SEMANA, DiaSemana } from '@/types/ficha.types';
import { paramTexto } from '@/utils/params';

/** Edição de treino (/fichas/[id]/treinos/editar). Parâmetros: treinoId, nome, dia, ordem. */
export default function EditarTreino() {
  const params = useLocalSearchParams();
  const idTreino = Number(paramTexto(params.treinoId));
  const diaInicial = paramTexto(params.dia) as DiaSemana;

  const { atualizar, carregando, erro } = useTreinoEdicao();

  useAlertaErro(erro);

  if (!idTreino) {
    return (
      <Tela>
        <CabecalhoDetalhe titulo="Editar treino" />
        <EstadoErro mensagem="Treino inválido." />
      </Tela>
    );
  }

  return (
    <FormularioTreino
      titulo="Editar treino"
      rotuloBotao="SALVAR"
      salvando={carregando}
      nomeInicial={paramTexto(params.nome)}
      diaInicial={DIAS_SEMANA.includes(diaInicial) ? diaInicial : 'segunda'}
      ordemInicial={paramTexto(params.ordem) || '1'}
      onSalvar={async (dados) => {
        const treino = await atualizar(idTreino, dados);

        if (treino) {
          router.back();
        }
      }}
    />
  );
}
