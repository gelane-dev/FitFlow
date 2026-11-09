import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Cartao } from '@/components/ui/Cartao';

export interface CartaoEvolucaoProps {
  /** Valor atual e variação × anterior (`ComparacaoValores`) ou o esqueleto dele. */
  cabecalho?: ReactNode;
  /** Controles (métrica, período) e o gráfico, nesta ordem. */
  children: ReactNode;
}

/**
 * Um cartão só para o que o aluno acompanha: cabeçalho com valor atual e variação × anterior,
 * controles e gráfico. Usado nos dois lados (Treinos e Corpo) para manter o mesmo padrão.
 */
export function CartaoEvolucao({ cabecalho, children }: CartaoEvolucaoProps) {
  return (
    <Cartao>
      <View style={estilos.conteudo}>
        {cabecalho}
        {children}
      </View>
    </Cartao>
  );
}

const estilos = StyleSheet.create({
  conteudo: { gap: 16 },
});
