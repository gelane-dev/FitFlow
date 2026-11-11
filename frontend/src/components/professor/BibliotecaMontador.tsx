import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BarraFiltros } from '@/components/ui/BarraFiltros';
import { Botao } from '@/components/ui/Botao';
import { Chip } from '@/components/ui/Chip';
import { EstadoErroSecao } from '@/components/ui/EstadoErroSecao';
import { EstadoVazio } from '@/components/ui/EstadoVazio';
import { SkeletonLista } from '@/components/ui/Skeleton';
import { useProfessorBiblioteca } from '@/hooks/useProfessorBiblioteca';
import { cores, raios } from '@/theme';
import { Exercicio, OrigemExercicio } from '@/types/exercicio.types';
import { agruparGruposMusculares, pertenceAoGrupo } from '@/utils/gruposMusculares';

interface BibliotecaMontadorProps {
  /** Chamado ao tocar em "Adicionar" (a biblioteca continua aberta para adicionar mais). */
  aoAdicionar: (exercicio: Exercicio) => void;
  /** Quantas vezes cada exercício já está na divisão atual. */
  usados?: Record<number, number>;
  /** Altura máxima da lista (painel lateral na web). */
  alturaMaxima?: number;
}

const ORIGENS: { valor: OrigemExercicio; rotulo: string }[] = [
  { valor: 'biblioteca', rotulo: 'Biblioteca' },
  { valor: 'meus', rotulo: 'Meus exercícios' },
];

/** Biblioteca de exercícios com busca, filtro por grupo muscular e por origem (biblioteca/meus). */
export function BibliotecaMontador({ aoAdicionar, usados = {}, alturaMaxima }: BibliotecaMontadorProps) {
  const [busca, setBusca] = useState('');
  const [origem, setOrigem] = useState<OrigemExercicio | null>(null);
  const [grupo, setGrupo] = useState<string | null>(null);

  const { exercicios, total, carregando, carregandoMais, temMais, erro, recarregar, carregarMais } =
    useProfessorBiblioteca({ busca, origem });

  const grupos = useMemo(
    () => agruparGruposMusculares(exercicios.map((e) => e.grupo_muscular)),
    [exercicios]
  );
  const visiveis = useMemo(
    () => (grupo ? exercicios.filter((e) => pertenceAoGrupo(e.grupo_muscular, grupo)) : exercicios),
    [exercicios, grupo]
  );

  return (
    <View style={estilos.raiz} testID="biblioteca-montador">
      <BarraFiltros
        aoBuscar={setBusca}
        placeholder="Buscar exercício"
        chips={ORIGENS}
        chipAtivo={origem}
        aoMudarChip={(valor) => setOrigem(valor as OrigemExercicio | null)}
        testID="biblioteca-filtros"
      />

      {grupos.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={estilos.grupos}
          accessibilityLabel="Filtrar por grupo muscular"
        >
          {grupos.map((g) => (
            <Chip
              key={g.chave}
              rotulo={g.rotulo}
              selecionado={grupo === g.chave}
              onPress={() => setGrupo(grupo === g.chave ? null : g.chave)}
              testID={`biblioteca-grupo-${g.chave}`}
            />
          ))}
        </ScrollView>
      ) : null}

      {erro ? (
        <EstadoErroSecao mensagem={erro} aoTentarNovamente={recarregar} />
      ) : carregando ? (
        <SkeletonLista linhas={4} />
      ) : visiveis.length === 0 ? (
        <EstadoVazio
          icone="barbell-outline"
          titulo="Nenhum exercício encontrado"
          descricao="Ajuste a busca ou os filtros."
        />
      ) : (
        <ScrollView
          style={alturaMaxima ? { maxHeight: alturaMaxima } : undefined}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
        >
          <Text style={estilos.contagem}>
            {visiveis.length} de {total} exercício{total === 1 ? '' : 's'}
          </Text>
          {visiveis.map((exercicio) => (
            <View key={exercicio.id} style={estilos.linha}>
              <View style={estilos.textos}>
                <Text style={estilos.nome} numberOfLines={2}>
                  {exercicio.nome}
                </Text>
                <Text style={estilos.grupo} numberOfLines={1}>
                  {exercicio.grupo_muscular}
                  {exercicio.criado_por_professor_id ? ' · meu' : ''}
                  {usados[exercicio.id] ? ` · na divisão: ${usados[exercicio.id]}` : ''}
                </Text>
              </View>
              <View style={estilos.botao}>
                <Botao
                  tamanho="medio"
                  variante="secundario"
                  icone="add"
                  larguraTotal={false}
                  onPress={() => aoAdicionar(exercicio)}
                  testID={`biblioteca-adicionar-${exercicio.id}`}
                  accessibilityLabel={`Adicionar ${exercicio.nome}`}
                >
                  Adicionar
                </Botao>
              </View>
            </View>
          ))}
          {temMais && !grupo ? (
            <Botao
              variante="fantasma"
              tamanho="medio"
              carregando={carregandoMais}
              onPress={carregarMais}
              testID="biblioteca-mais"
            >
              Carregar mais exercícios
            </Botao>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: { gap: 4 },
  grupos: { gap: 8, paddingBottom: 12, paddingRight: 8 },
  contagem: { color: cores.textoTerciario, fontSize: 12, marginBottom: 8 },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    marginBottom: 8,
    borderRadius: raios.botao,
    backgroundColor: cores.superficie,
    borderWidth: 1,
    borderColor: cores.borda,
  },
  textos: { flex: 1 },
  nome: { color: cores.texto, fontSize: 15, fontWeight: '600' },
  grupo: { color: cores.textoSecundario, fontSize: 12, marginTop: 2 },
  botao: { flexShrink: 0 },
});
