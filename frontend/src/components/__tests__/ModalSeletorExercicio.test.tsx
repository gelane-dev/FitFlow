import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ModalSeletorExercicio } from '@/components/ModalSeletorExercicio';
import { buscarExercicios } from '@/services/exercicio.service';

jest.mock('@/services/exercicio.service', () => ({ buscarExercicios: jest.fn() }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
}));

const mock = buscarExercicios as jest.Mock;

async function montar() {
  return await render(<ModalSeletorExercicio visivel onFechar={jest.fn()} onSelecionar={jest.fn()} />);
}

describe('ModalSeletorExercicio (P-B)', () => {
  beforeEach(() => mock.mockReset());

  it('falha de rede mostra o erro com "Tentar novamente", não "Nenhum exercício"', async () => {
    mock.mockRejectedValueOnce(new Error('rede'));
    await montar();

    await waitFor(() => expect(screen.getByTestId('seletor-erro')).toBeTruthy());
    expect(screen.queryByText('Nenhum exercício encontrado.')).toBeNull();

    mock.mockResolvedValueOnce({
      itens: [{ id: 1, nome: 'Supino', grupo_muscular: 'Peito', imagem: null }],
    });
    await fireEvent.press(screen.getByText("Tentar novamente"));

    await waitFor(() => expect(screen.getByText('Supino')).toBeTruthy());
    expect(screen.queryByTestId('seletor-erro')).toBeNull();
  });

  it('lista vazia (sucesso) mostra o estado vazio', async () => {
    mock.mockResolvedValueOnce({ itens: [] });
    await montar();

    await waitFor(() => expect(screen.getByText('Nenhum exercício encontrado.')).toBeTruthy());
    expect(screen.queryByTestId('seletor-erro')).toBeNull();
  });
});
