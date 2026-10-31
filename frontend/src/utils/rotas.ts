import type { Href } from 'expo-router';

/** Aba inicial de cada perfil (ADR-031): professor em `/painel`; aluno e admin em `/aluno`; sem login, `/`. */
export function rotaInicialDoPerfil(tipo?: string | null): '/painel' | '/aluno' | '/' {
  if (tipo === 'professor') {
    return '/painel';
  }

  return tipo === 'aluno' || tipo === 'admin' ? '/aluno' : '/';
}

/** Pré-visualização do treino (P-15): lista os exercícios antes de começar. `fichaId` evita criar sessão só para olhar. */
export function rotaPreviaTreino(treino: { id: number; ficha_id: number }): Href {
  return `/aluno/treino/${treino.id}/previa?fichaId=${treino.ficha_id}` as Href;
}

/** Execução do treino (cria ou retoma a sessão). O path é o que o E2E usa. */
export function rotaExecucaoTreino(treinoId: number): Href {
  return `/aluno/treino/${treinoId}` as Href;
}
