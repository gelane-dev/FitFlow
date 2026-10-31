import * as Haptics from 'expo-haptics';

export type IntensidadeHaptica = 'leve' | 'media' | 'sucesso';

/** Feedback tátil seguro: nunca lança (na web e em aparelhos sem suporte é um no-op). */
export function tocarHaptico(intensidade: IntensidadeHaptica = 'leve'): void {
  try {
    if (intensidade === 'sucesso') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

      return;
    }

    const estilo =
      intensidade === 'media'
        ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Light;

    void Haptics.impactAsync(estilo).catch(() => {});
  } catch {
    // sem suporte: ignora
  }
}
