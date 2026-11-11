import { render, screen } from '@testing-library/react-native';

import { SeloSituacao } from '@/components/ui/SeloSituacao';
import { RESULTADOS_ACESSO, SITUACOES_ALUNO } from '@/utils/situacao';

// Ionicons vira um texto com o nome do glifo, para o teste enxergar qual ícone foi usado.
jest.mock('@expo/vector-icons', () => {
  const { Text } = jest.requireActual('react-native');
  const React = jest.requireActual('react');

  return {
    Ionicons: ({ name }: { name: string }) => React.createElement(Text, { testID: `icone-${name}` }, name),
  };
});

const TABELA: Record<string, { rotulo: string; icone: string }> = {
  ...SITUACOES_ALUNO,
  ...RESULTADOS_ACESSO,
};

describe('SeloSituacao usa a tabela única de utils/situacao (GB-05)', () => {
  it.each(Object.keys(TABELA))('%s mostra o rótulo e o ícone da tabela', async (codigo) => {
    await render(<SeloSituacao situacao={codigo} />);

    expect(screen.getByText(TABELA[codigo].rotulo)).toBeTruthy();
    expect(screen.getByTestId(`icone-${TABELA[codigo].icone}`)).toBeTruthy();
  });

  it('desativado usa "ban" e liberado "checkmark-circle" (antes divergiam da tabela)', async () => {
    await render(
      <>
        <SeloSituacao situacao="desativado" />
        <SeloSituacao situacao="liberado" />
      </>,
    );

    expect(screen.getByTestId('icone-ban')).toBeTruthy();
    expect(screen.getByTestId('icone-checkmark-circle')).toBeTruthy();
    expect(screen.queryByTestId('icone-remove-circle')).toBeNull();
    expect(screen.queryByTestId('icone-lock-open')).toBeNull();
  });

  it('código desconhecido aparece como veio, com ícone neutro', async () => {
    await render(<SeloSituacao situacao="outra" />);

    expect(screen.getByText('outra')).toBeTruthy();
    expect(screen.getByTestId('icone-help-circle-outline')).toBeTruthy();
  });
});
