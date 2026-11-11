import type { Href } from 'expo-router';

/** Aba inicial de cada perfil (ADR-031, GA-03): admin `/admin`, recepção `/recepcao`, professor `/painel`, aluno `/aluno`; sem login, `/`. */
export function rotaInicialDoPerfil(tipo?: string | null): Href {
  // Cast: os tipos de rota do Expo Router só incluem /admin e /recepcao depois de regerados (expo start).
  switch (tipo) {
    case 'admin':
      return '/admin' as Href;
    case 'recepcao':
      return '/recepcao' as Href;
    case 'professor':
      return '/painel';
    case 'aluno':
      return '/aluno';
    default:
      return '/';
  }
}

/** Pré-visualização do treino (P-15): lista os exercícios antes de começar. `fichaId` evita criar sessão só para olhar. */
export function rotaPreviaTreino(treino: { id: number; ficha_id: number }): Href {
  return `/aluno/treino/${treino.id}/previa?fichaId=${treino.ficha_id}` as Href;
}

/** Execução do treino (cria ou retoma a sessão). O path é o que o E2E usa. */
export function rotaExecucaoTreino(treinoId: number): Href {
  return `/aluno/treino/${treinoId}` as Href;
}
