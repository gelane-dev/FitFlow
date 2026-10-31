import { act, renderHook } from '@testing-library/react-native';
import { useState } from 'react';

import { useErrosAposTentativa } from '@/hooks/useErrosAposTentativa';

function useFormularioDeTeste() {
  const [nome, setNome] = useState('');
  const { erros, tentar } = useErrosAposTentativa<'nome'>(() =>
    nome.trim() ? {} : { nome: 'Informe o nome.' }
  );

  return { nome, setNome, erros, tentar };
}

describe('useErrosAposTentativa', () => {
  it('não mostra erro antes da primeira tentativa', async () => {
    const { result } = await renderHook(useFormularioDeTeste);

    expect(result.current.erros).toEqual({});
  });

  it('mostra o erro na tentativa e o remove quando o campo fica válido', async () => {
    const { result } = await renderHook(useFormularioDeTeste);
    let valido = true;

    await act(async () => {
      valido = result.current.tentar();
    });
    expect(valido).toBe(false);
    expect(result.current.erros).toEqual({ nome: 'Informe o nome.' });

    await act(async () => result.current.setNome('Ana'));
    expect(result.current.erros).toEqual({});

    await act(async () => {
      valido = result.current.tentar();
    });
    expect(valido).toBe(true);
  });

  it('o erro volta se o campo deixar de ser válido depois da tentativa', async () => {
    const { result } = await renderHook(useFormularioDeTeste);

    await act(async () => {
      result.current.tentar();
    });
    await act(async () => result.current.setNome('Ana'));
    await act(async () => result.current.setNome(''));

    expect(result.current.erros).toEqual({ nome: 'Informe o nome.' });
  });
});
