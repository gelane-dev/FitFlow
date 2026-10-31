import { useCallback, useEffect, useState } from 'react';

import {
  ajustarHora,
  ajustarMinuto,
  ativarLembrete,
  carregarLembrete,
  desativarLembrete,
  LEMBRETE_PADRAO,
  lembretesSuportados,
  PreferenciaLembrete,
} from '@/utils/lembretes';

export function useLembrete() {
  const [preferencia, setPreferencia] =
    useState<PreferenciaLembrete>(LEMBRETE_PADRAO);
  const [suportado] = useState(() => lembretesSuportados());
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!suportado) {
      setCarregando(false);
      return;
    }

    carregarLembrete()
      .then(setPreferencia)
      .catch(() => setErro('Erro ao carregar o lembrete.'))
      .finally(() => setCarregando(false));
  }, [suportado]);

  const aplicar = useCallback(
    async (acao: () => Promise<PreferenciaLembrete>) => {
      try {
        setSalvando(true);
        setErro(null);
        setPreferencia(await acao());
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Erro ao salvar o lembrete.');
        // Mostra o estado real salvo (ex.: lembrete desligado após falha).
        try {
          setPreferencia(await carregarLembrete());
        } catch {
          // mantém o estado atual
        }
      } finally {
        setSalvando(false);
      }
    },
    []
  );

  const alternar = useCallback(
    (ligado: boolean) =>
      aplicar(() =>
        ligado
          ? ativarLembrete(preferencia.hora, preferencia.minuto, preferencia)
          : desativarLembrete(preferencia)
      ),
    [aplicar, preferencia]
  );

  /** Ajusta o horário; se o lembrete está ligado, reagenda. */
  const ajustar = useCallback(
    (deltaHora: number, deltaMinuto: number) => {
      const hora = ajustarHora(preferencia.hora, deltaHora);
      const minuto = ajustarMinuto(preferencia.minuto, deltaMinuto);

      if (preferencia.ativo) {
        return aplicar(() => ativarLembrete(hora, minuto, preferencia));
      }

      setPreferencia({ ...preferencia, hora, minuto });
      return Promise.resolve();
    },
    [aplicar, preferencia]
  );

  return {
    suportado,
    preferencia,
    carregando,
    salvando,
    erro,
    alternar,
    ajustar,
  };
}
