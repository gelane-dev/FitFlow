import { useLocalSearchParams } from 'expo-router';

import { TelaMontador } from '@/components/professor/TelaMontador';
import { EstadoErro } from '@/components/ui/EstadoErro';
import { Tela } from '@/components/ui/Tela';
import { paramTexto } from '@/utils/params';

/** Montador de fichas, edição (/fichas/[id]/montar). Id que não é inteiro positivo = ficha não encontrada. */
export default function MontarFichaExistente() {
  const { id } = useLocalSearchParams();
  const fichaId = Number(paramTexto(id));

  if (!Number.isInteger(fichaId) || fichaId <= 0) {
    return (
      <Tela>
        <EstadoErro mensagem="Ficha não encontrada." />
      </Tela>
    );
  }

  return <TelaMontador fichaId={fichaId} />;
}
