import { useState } from 'react';

import { Erros, temErros } from '@/utils/validacaoFormularios';

/**
 * Erros de formulário que só aparecem depois da primeira tentativa de envio e
 * passam a acompanhar o que o usuário digita: a mensagem de um campo some assim
 * que ele fica válido (e volta se deixar de ser). `validar` deve ler o estado
 * atual do formulário a cada render.
 */
export function useErrosAposTentativa<K extends string>(validar: () => Erros<K>) {
  const [tentou, setTentou] = useState(false);

  const erros: Erros<K> = tentou ? validar() : {};

  /** Marca a tentativa e diz se o formulário está válido. */
  function tentar(): boolean {
    setTentou(true);

    return !temErros(validar());
  }

  return { erros, tentar };
}
