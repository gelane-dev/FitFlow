import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, View } from 'react-native';

import { CampoTexto } from '@/components/ui/CampoTexto';
import { EstadoVazio } from '@/components/ui/EstadoVazio';
import { LinhaLista } from '@/components/ui/LinhaLista';
import { Pressionavel } from '@/components/ui/Pressionavel';
import { cores, margemTela, raios } from '@/theme';
import { EvolucaoExercicioResumo } from '@/types/evolucao.types';
import { filtrarPorCampos } from '@/utils/busca';

export interface SeletorExercicioProps {
  exercicios: EvolucaoExercicioResumo[];
  selecionadoId: number | null;
  onSelecionar: (exercicio: EvolucaoExercicioResumo) => void;
}

/**
 * Campo que mostra o exercício escolhido e abre uma folha com busca para trocar: o aluno pode
 * ter dezenas de exercícios, então a lista fica num modal e não em chips.
 */
export function SeletorExercicio({ exercicios, selecionadoId, onSelecionar }: SeletorExercicioProps) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');

  const selecionado = exercicios.find((e) => e.exercicio_id === selecionadoId) ?? null;

  const filtrados = filtrarPorCampos(exercicios, busca, (e) => [e.nome, e.grupo_muscular]);

  function fechar() {
    setAberto(false);
    setBusca('');
  }

  return (
    <>
      <Pressionavel
        onPress={() => setAberto(true)}
        haptico="leve"
        testID="seletor-exercicio"
        accessibilityRole="button"
        accessibilityLabel={`Exercício: ${selecionado?.nome ?? 'nenhum'}. Toque para trocar.`}
        style={estilos.campo}
      >
        <View style={estilos.textos}>
          <Text style={estilos.rotulo}>Exercício</Text>
          <Text style={estilos.nome} numberOfLines={1}>
            {selecionado?.nome ?? 'Escolher exercício'}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={20} color={cores.textoSecundario} />
      </Pressionavel>

      <Modal visible={aberto} animationType="slide" transparent onRequestClose={fechar}>
        <View style={estilos.fundo} testID="seletor-exercicio-modal">
          <View style={estilos.folha}>
            <View style={estilos.cabecalho}>
              <Text style={estilos.titulo} accessibilityRole="header">
                ESCOLHER EXERCÍCIO
              </Text>
              <Pressionavel
                onPress={fechar}
                hitSlop={10}
                style={estilos.fechar}
                testID="seletor-exercicio-fechar"
                accessibilityRole="button"
                accessibilityLabel="Fechar"
              >
                <Ionicons name="close" size={20} color={cores.texto} />
              </Pressionavel>
            </View>

            <CampoTexto
              icone="search-outline"
              placeholder="Buscar exercício"
              value={busca}
              onChangeText={setBusca}
              autoCorrect={false}
              testID="seletor-exercicio-busca"
            />

            <FlatList
              data={filtrados}
              keyExtractor={(e) => String(e.exercicio_id)}
              style={estilos.lista}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={<EstadoVazio icone="search-outline" titulo="Nenhum exercício encontrado." />}
              renderItem={({ item, index }) => (
                <LinhaLista
                  titulo={item.nome}
                  subtitulo={item.grupo_muscular}
                  icone={item.exercicio_id === selecionadoId ? 'checkmark-circle' : 'barbell-outline'}
                  separador={index < filtrados.length - 1}
                  testID={`seletor-exercicio-opcao-${item.exercicio_id}`}
                  onPress={() => {
                    onSelecionar(item);
                    fechar();
                  }}
                />
              )}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const estilos = StyleSheet.create({
  campo: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    backgroundColor: cores.superficieElevada,
    borderRadius: raios.input,
    borderWidth: 1,
    borderColor: cores.borda,
  },
  textos: { flex: 1 },
  rotulo: { color: cores.textoSecundario, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  nome: { color: cores.texto, fontSize: 17, fontWeight: '600' },
  fundo: { flex: 1, backgroundColor: cores.veu, justifyContent: 'flex-end' },
  folha: {
    maxHeight: '85%',
    backgroundColor: cores.superficie,
    borderTopLeftRadius: raios.hero,
    borderTopRightRadius: raios.hero,
    borderWidth: 1,
    borderColor: cores.borda,
    paddingHorizontal: margemTela,
    paddingTop: 20,
    paddingBottom: 24,
  },
  cabecalho: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  titulo: { color: cores.primaria, fontSize: 13, fontWeight: '700', letterSpacing: 1.2 },
  fechar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: cores.superficieElevada,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lista: { flexGrow: 0, marginTop: 8 },
});
