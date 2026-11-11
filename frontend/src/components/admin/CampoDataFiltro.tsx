import { useState } from 'react';

import { CampoData } from '@/components/ui/CampoData';

export interface CampoDataFiltroProps {
  rotulo: string;
  /** Data ISO atual do filtro (ou `null`). */
  valor: string | null;
  /** Chamado com a data ISO quando o texto está completo e válido, ou `null` quando o campo é esvaziado. */
  aoMudar: (iso: string | null) => void;
  testID?: string;
}

function isoParaCampo(iso: string | null): string {
  if (!iso) return '';

  const [ano, mes, dia] = iso.split('-');

  return `${dia}/${mes}/${ano}`;
}

/**
 * Campo de data para filtros: guarda o texto digitado localmente (a máscara precisa do texto
 * parcial) e só avisa o filtro quando a data fica válida ou o campo é limpo.
 */
export function CampoDataFiltro({ rotulo, valor, aoMudar, testID }: CampoDataFiltroProps) {
  const [texto, setTexto] = useState(isoParaCampo(valor));

  // Filtro limpo por fora (botão "Limpar filtros"): esvazia o texto também.
  if (valor === null && texto.length === 10) {
    setTexto('');
  }

  return (
    <CampoData
      rotulo={rotulo}
      value={texto}
      onChangeData={(novoTexto, iso) => {
        setTexto(novoTexto);

        if (iso) aoMudar(iso);
        else if (novoTexto === '') aoMudar(null);
      }}
      testID={testID}
    />
  );
}
