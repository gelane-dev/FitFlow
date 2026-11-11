import { Href, router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { Pressionavel } from '@/components/ui/Pressionavel';
import { cores, tipografia } from '@/theme';

/**
 * Nome do aluno como link para `/admin/alunos/[id]`. Usado nas tabelas que já têm botões de ação
 * nas linhas (a linha inteira não pode ser clicável: botão dentro de botão).
 */
export function LinkAluno({ id, nome }: { id: number; nome: string }) {
  return (
    <Pressionavel
      onPress={() => router.push(`/admin/alunos/${id}` as Href)}
      haptico={false}
      accessibilityRole="link"
      accessibilityLabel={`Abrir aluno ${nome}`}
      hitSlop={{ top: 8, bottom: 8 }}
      testID={`link-aluno-${id}`}
    >
      <Text style={estilos.texto}>{nome}</Text>
    </Pressionavel>
  );
}

const estilos = StyleSheet.create({
  texto: { ...tipografia.corpoForte, color: cores.primaria },
});
