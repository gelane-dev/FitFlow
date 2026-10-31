import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type * as NotificationsTipo from 'expo-notifications';

type ModuloNotificacoes = typeof NotificationsTipo;

const CHAVE = 'lembrete_treino';
const CANAL_ANDROID = 'lembrete-treino';

let modulo: ModuloNotificacoes | null = null;
let tentou = false;

/** Web e Expo Go para Android (SDK 53+) não têm o módulo nativo completo. */
function ambienteSuportado(): boolean {
  if (Platform.OS === 'web') {
    return false;
  }

  return !(
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient &&
    Platform.OS === 'android'
  );
}

/**
 * Carrega `expo-notifications` sob demanda (ADR-024): o import estático lança
 * "Cannot find native module" no Expo Go para Android e derruba o app.
 */
function obterNotificacoes(): ModuloNotificacoes | null {
  if (!ambienteSuportado()) {
    return null;
  }

  if (tentou) {
    return modulo;
  }

  tentou = true;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const carregado = require('expo-notifications') as ModuloNotificacoes;

    // Exibe a notificação também com o app em primeiro plano (registrado uma vez).
    carregado.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });

    modulo = carregado;
  } catch {
    modulo = null;
  }

  return modulo;
}

/** Falso na web, no Expo Go para Android ou se o módulo nativo não carregar. */
export function lembretesSuportados(): boolean {
  return obterNotificacoes() !== null;
}

export interface PreferenciaLembrete {
  ativo: boolean;
  hora: number;
  minuto: number;
  /** id da notificação agendada, para poder cancelar. */
  notificacaoId?: string;
}

export const LEMBRETE_PADRAO: PreferenciaLembrete = {
  ativo: false,
  hora: 18,
  minuto: 0,
};

export function ajustarHora(hora: number, delta: number): number {
  return (((hora + delta) % 24) + 24) % 24;
}

export function ajustarMinuto(minuto: number, delta: number): number {
  return (((minuto + delta) % 60) + 60) % 60;
}

export function formatarHorario(hora: number, minuto: number): string {
  return `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`;
}

export async function carregarLembrete(): Promise<PreferenciaLembrete> {
  if (!lembretesSuportados()) {
    return LEMBRETE_PADRAO;
  }

  const bruto = await SecureStore.getItemAsync(CHAVE);

  if (!bruto) {
    return LEMBRETE_PADRAO;
  }

  try {
    return { ...LEMBRETE_PADRAO, ...JSON.parse(bruto) };
  } catch {
    return LEMBRETE_PADRAO;
  }
}

async function salvarLembrete(preferencia: PreferenciaLembrete) {
  await SecureStore.setItemAsync(CHAVE, JSON.stringify(preferencia));
}

/** Cancela o lembrete anterior (se houver) e agenda um diário no horário. */
export async function ativarLembrete(
  hora: number,
  minuto: number,
  _anterior?: PreferenciaLembrete
): Promise<PreferenciaLembrete> {
  const Notifications = obterNotificacoes();

  if (!Notifications) {
    throw new Error('Lembretes indisponíveis neste ambiente');
  }

  if (Platform.OS === 'android') {
    // No Android 13+ a permissão só é pedida se o canal já existir.
    await Notifications.setNotificationChannelAsync(CANAL_ANDROID, {
      name: 'Lembrete de treino',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const { status } = await Notifications.requestPermissionsAsync();

  if (status !== 'granted') {
    throw new Error('Permissão de notificações negada.');
  }

  // O app só usa este lembrete: cancela tudo para não deixar órfãs.
  await Notifications.cancelAllScheduledNotificationsAsync();

  try {
    const notificacaoId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Hora do treino',
        body: 'Abra o FitFlow e registre o treino de hoje.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        channelId: CANAL_ANDROID,
        hour: hora,
        minute: minuto,
      },
    });

    const preferencia = { ativo: true, hora, minuto, notificacaoId };
    await salvarLembrete(preferencia);

    return preferencia;
  } catch (erro) {
    // O cancelAll já removeu o agendamento anterior: reflete o estado real.
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await salvarLembrete({ ativo: false, hora, minuto });
    } catch {
      // Melhor esforço; o erro original é o que importa para a tela.
    }

    throw erro;
  }
}

export async function desativarLembrete(
  atual: PreferenciaLembrete
): Promise<PreferenciaLembrete> {
  const Notifications = obterNotificacoes();

  if (!Notifications) {
    return { ...atual, ativo: false, notificacaoId: undefined };
  }

  await Notifications.cancelAllScheduledNotificationsAsync();

  const preferencia = { ...atual, ativo: false, notificacaoId: undefined };
  await salvarLembrete(preferencia);

  return preferencia;
}

/** Usado no logout: cancela as notificações e apaga a preferência. Nunca lança. */
export async function cancelarLembretes(): Promise<void> {
  try {
    const Notifications = obterNotificacoes();

    if (!Notifications) {
      return;
    }

    await Notifications.cancelAllScheduledNotificationsAsync();
    await SecureStore.deleteItemAsync(CHAVE);
  } catch {
    // Falha ao limpar lembretes não deve impedir o logout.
  }
}
