import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CampoTexto } from '@/components/ui/CampoTexto';
import { EstadoErroSecao } from '@/components/ui/EstadoErroSecao';
import { EstadoVazio } from '@/components/ui/EstadoVazio';
import { LinhaLista } from '@/components/ui/LinhaLista';
import { Pressionavel } from '@/components/ui/Pressionavel';
import { SkeletonLista } from '@/components/ui/Skeleton';
import { buscarExercicios } from '@/services/exercicio.service';
import { cores, margemTela, raios } from '@/theme';
import { Exercicio } from '@/types/exercicio.types';

interface ModalSeletorExercicioProps {
  visivel: boolean;
  onFechar: () => void;
  onSelecionar: (exercicio: Exercicio) => void;
}

/** Folha inferior para escolher um exercício da biblioteca (com busca). */
export function ModalSeletorExercicio({
  visivel,
  onFechar,
  onSelecionar,
}: ModalSeletorExercicioProps) {
  const [busca, setBusca] = useState('');
  const [exercicios, setExercicios] = useState<Exercicio[]>([]);
  const [carregando, setCarregando] = useState(false);

  const [erro, setErro] = useState(false);

  const carregarExercicios = useCallback(async () => {
    try {
      setCarregando(true);
      setErro(false);

      const dados = await buscarExercicios(1, {
        limite: 100,
        busca: busca.trim() || undefined,
      });

      setExercicios(dados.itens);
    } catch {
      setExercicios([]);
      setErro(true);
    } finally {
      setCarregando(false);
    }
  }, [busca]);

  useEffect(() => {
    if (visivel) {
      carregarExercicios();
    }
  }, [visivel, carregarExercicios]);

  return (
    <Modal visible={visivel} animationType="slide" transparent onRequestClose={onFechar}>
      <View style={estilos.fundo}>
        <View style={estilos.folha}>
          <View style={estilos.cabecalho}>
            <Text style={estilos.titulo}>ESCOLHER EXERCÍCIO</Text>
            <Pressionavel
              onPress={onFechar}
              hitSlop={10}
              style={estilos.fechar}
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
          />

          {carregando ? (
            <SkeletonLista linhas={5} />
          ) : erro ? (
            <EstadoErroSecao
              mensagem="Não foi possível carregar os exercícios."
              aoTentarNovamente={carregarExercicios}
              rede
              testID="seletor-erro"
            />
          ) : (
            <ScrollView
              style={estilos.lista}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {exercicios.map((exercicio, indice) => (
                <LinhaLista
                  key={exercicio.id}
                  titulo={exercicio.nome}
                  subtitulo={exercicio.grupo_muscular}
                  icone="barbell-outline"
                  thumbUri={exercicio.imagem}
                  separador={indice < exercicios.length - 1}
                  onPress={() => onSelecionar(exercicio)}
                />
              ))}
              {exercicios.length === 0 ? (
                <EstadoVazio icone="search-outline" titulo="Nenhum exercício encontrado." />
              ) : null}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
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
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  titulo: {
    color: cores.primaria,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  fechar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: cores.superficieElevada,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lista: { flexGrow: 0 },
});
