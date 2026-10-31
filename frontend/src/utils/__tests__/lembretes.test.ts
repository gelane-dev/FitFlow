import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DAILY: 'daily' },
}));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { executionEnvironment: 'bare' },
  ExecutionEnvironment: {
    Bare: 'bare',
    Standalone: 'standalone',
    StoreClient: 'storeClient',
  },
}));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

type ModuloLembretes = typeof import('@/utils/lembretes');

/** O módulo guarda cache de carga: reimporta isolado a cada cenário. */
function carregar(
  os: 'android' | 'ios' | 'web',
  ambiente: string = ExecutionEnvironment.Bare
): ModuloLembretes {
  let modulo!: ModuloLembretes;

  (Constants as { executionEnvironment: string }).executionEnvironment = ambiente;

  // Leituras tardias (`Platform.OS` dentro das funções) usam esta cópia.
  Platform.OS = os;

  jest.isolateModules(() => {
    // Leitura na importação (`lembretesSuportados`) usa a cópia isolada.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('react-native').Platform.OS = os;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    modulo = require('@/utils/lembretes');
  });

  return modulo;
}

const n = Notifications as jest.Mocked<typeof Notifications>;
const s = SecureStore as jest.Mocked<typeof SecureStore>;

beforeEach(() => {
  jest.clearAllMocks();
  n.requestPermissionsAsync.mockResolvedValue({ status: 'granted' } as never);
  n.scheduleNotificationAsync.mockResolvedValue('notif-1');
});

describe('helpers de horário', () => {
  const { ajustarHora, ajustarMinuto, formatarHorario } = carregar('android');

  it('ajustarHora dá a volta em 24h nos dois sentidos', () => {
    expect(ajustarHora(23, 1)).toBe(0);
    expect(ajustarHora(0, -1)).toBe(23);
    expect(ajustarHora(10, 1)).toBe(11);
  });

  it('ajustarMinuto dá a volta em 60', () => {
    expect(ajustarMinuto(59, 5)).toBe(4);
    expect(ajustarMinuto(0, -5)).toBe(55);
  });

  it('formatarHorario usa dois dígitos', () => {
    expect(formatarHorario(7, 5)).toBe('07:05');
    expect(formatarHorario(18, 30)).toBe('18:30');
  });
});

describe('no celular', () => {
  it('registra o handler de notificações uma vez, ao primeiro uso', () => {
    const m = carregar('android');

    expect(n.setNotificationHandler).not.toHaveBeenCalled();
    expect(m.lembretesSuportados()).toBe(true);
    expect(m.lembretesSuportados()).toBe(true);

    expect(n.setNotificationHandler).toHaveBeenCalledTimes(1);
  });

  it('carregarLembrete: padrão sem nada salvo, JSON ruim ou mescla o salvo', async () => {
    const m = carregar('ios');

    s.getItemAsync.mockResolvedValueOnce(null);
    expect(await m.carregarLembrete()).toEqual(m.LEMBRETE_PADRAO);

    s.getItemAsync.mockResolvedValueOnce('{quebrado');
    expect(await m.carregarLembrete()).toEqual(m.LEMBRETE_PADRAO);

    s.getItemAsync.mockResolvedValueOnce(
      JSON.stringify({ ativo: true, hora: 7 })
    );
    expect(await m.carregarLembrete()).toEqual({
      ativo: true,
      hora: 7,
      minuto: 0,
    });
  });

  it('ativarLembrete no Android: cria canal, pede permissão, agenda e salva', async () => {
    const m = carregar('android');

    const resultado = await m.ativarLembrete(6, 30);

    expect(n.setNotificationChannelAsync).toHaveBeenCalled();
    expect(n.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
    expect(n.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: expect.objectContaining({
          type: 'daily',
          hour: 6,
          minute: 30,
        }),
      })
    );
    expect(resultado).toEqual({
      ativo: true,
      hora: 6,
      minuto: 30,
      notificacaoId: 'notif-1',
    });
    expect(s.setItemAsync).toHaveBeenCalledWith(
      'lembrete_treino',
      JSON.stringify(resultado)
    );
  });

  it('ativarLembrete no iOS não cria canal', async () => {
    const m = carregar('ios');

    await m.ativarLembrete(6, 30);

    expect(n.setNotificationChannelAsync).not.toHaveBeenCalled();
  });

  it('permissão negada lança e não agenda nem salva', async () => {
    const m = carregar('android');
    n.requestPermissionsAsync.mockResolvedValue({ status: 'denied' } as never);

    await expect(m.ativarLembrete(6, 30)).rejects.toThrow(
      'Permissão de notificações negada.'
    );
    expect(n.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(s.setItemAsync).not.toHaveBeenCalled();
  });

  it('desativarLembrete cancela tudo e salva como inativo', async () => {
    const m = carregar('ios');

    const resultado = await m.desativarLembrete({
      ativo: true,
      hora: 6,
      minuto: 30,
      notificacaoId: 'x',
    });

    expect(n.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
    expect(resultado).toEqual({
      ativo: false,
      hora: 6,
      minuto: 30,
      notificacaoId: undefined,
    });
    expect(s.setItemAsync).toHaveBeenCalled();
  });

  it('cancelarLembretes limpa notificações e preferência, e nunca lança', async () => {
    const m = carregar('android');

    await m.cancelarLembretes();
    expect(s.deleteItemAsync).toHaveBeenCalledWith('lembrete_treino');

    n.cancelAllScheduledNotificationsAsync.mockRejectedValueOnce(
      new Error('falha')
    );
    await expect(m.cancelarLembretes()).resolves.toBeUndefined();
  });
});

describe('na web', () => {
  it('não suporta e não registra handler', () => {
    const m = carregar('web');

    expect(m.lembretesSuportados()).toBe(false);
    expect(n.setNotificationHandler).not.toHaveBeenCalled();
  });

  it('carregar, desativar e cancelar não lançam nem tocam nos módulos nativos', async () => {
    const m = carregar('web');

    expect(await m.carregarLembrete()).toEqual(m.LEMBRETE_PADRAO);
    expect(
      await m.desativarLembrete({
        ativo: true,
        hora: 6,
        minuto: 0,
        notificacaoId: 'x',
      })
    ).toEqual({ ativo: false, hora: 6, minuto: 0, notificacaoId: undefined });
    await expect(m.cancelarLembretes()).resolves.toBeUndefined();

    expect(s.getItemAsync).not.toHaveBeenCalled();
    expect(s.setItemAsync).not.toHaveBeenCalled();
    expect(n.cancelAllScheduledNotificationsAsync).not.toHaveBeenCalled();
  });

  it('ativarLembrete lança erro explicativo (a UI esconde a opção)', async () => {
    const m = carregar('web');

    await expect(m.ativarLembrete(6, 0)).rejects.toThrow(
      'Lembretes indisponíveis neste ambiente'
    );
  });
});

describe('Expo Go para Android', () => {
  it('StoreClient + android: não suporta e não carrega o módulo', async () => {
    const m = carregar('android', ExecutionEnvironment.StoreClient);

    expect(m.lembretesSuportados()).toBe(false);
    expect(n.setNotificationHandler).not.toHaveBeenCalled();
    expect(await m.carregarLembrete()).toEqual(m.LEMBRETE_PADRAO);
    await expect(m.cancelarLembretes()).resolves.toBeUndefined();
    await expect(m.ativarLembrete(6, 0)).rejects.toThrow(
      'Lembretes indisponíveis neste ambiente'
    );
  });

  it('StoreClient no iOS continua suportado', () => {
    const m = carregar('ios', ExecutionEnvironment.StoreClient);

    expect(m.lembretesSuportados()).toBe(true);
  });
});

describe('módulo nativo indisponível', () => {
  it('require lança: suportado=false e nenhuma função lança', async () => {
    jest.resetModules();
    jest.doMock('expo-notifications', () => {
      throw new Error("Cannot find native module 'ExpoTopicSubscriptionModule'");
    });

    try {
      const m = carregar('android');

      expect(m.lembretesSuportados()).toBe(false);
      expect(await m.carregarLembrete()).toEqual(m.LEMBRETE_PADRAO);
      await expect(m.cancelarLembretes()).resolves.toBeUndefined();
      await expect(
        m.desativarLembrete({ ...m.LEMBRETE_PADRAO, ativo: true })
      ).resolves.toEqual({ ...m.LEMBRETE_PADRAO, ativo: false });
    } finally {
      jest.dontMock('expo-notifications');
    }
  });
});
