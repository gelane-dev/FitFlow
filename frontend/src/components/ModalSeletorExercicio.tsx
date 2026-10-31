import { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Input } from '@/components/input';
import { buscarExercicios } from '@/services/exercicio.service';
import { Exercicio } from '@/types/exercicio.types';

interface ModalSeletorExercicioProps {
  visivel: boolean;
  onFechar: () => void;
  onSelecionar: (exercicio: Exercicio) => void;
}

export function ModalSeletorExercicio({
  visivel,
  onFechar,
  onSelecionar,
}: ModalSeletorExercicioProps) {
  const [busca, setBusca] = useState('');
  const [exercicios, setExercicios] = useState<Exercicio[]>([]);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    async function carregarExercicios() {
      try {
        setCarregando(true);
        const dados = await buscarExercicios(1, {
          limite: 100,
          busca: busca.trim() || undefined,
        });
        setExercicios(dados.itens);
      } catch {
        setExercicios([]);
      } finally {
        setCarregando(false);
      }
    }

    if (visivel) {
      carregarExercicios();
    }
  }, [visivel, busca]);

  return (
    <Modal
      visible={visivel}
      animationType="slide"
      transparent
      onRequestClose={onFechar}
    >
      <View style={styles.modalFundo}>
        <View style={styles.modalCaixa}>
          <Text style={styles.tituloModal}>ESCOLHER EXERCÍCIO</Text>

          <Input
            placeholder="Buscar exercício"
            placeholderTextColor="#888"
            value={busca}
            onChangeText={setBusca}
          />

          {carregando ? (
            <ActivityIndicator color="#FECF2B" style={styles.loader} />
          ) : (
            <ScrollView style={styles.listaModal}>
              {exercicios.map((exercicio) => (
                <TouchableOpacity
                  key={exercicio.id}
                  style={styles.itemModal}
                  onPress={() => onSelecionar(exercicio)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.nomeExercicio}>{exercicio.nome}</Text>
                  <Text style={styles.grupoMuscular}>
                    {exercicio.grupo_muscular}
                  </Text>
                </TouchableOpacity>
              ))}

              {exercicios.length === 0 && (
                <Text style={styles.vazio}>Nenhum exercício encontrado.</Text>
              )}
            </ScrollView>
          )}

          <TouchableOpacity
            style={styles.botaoFechar}
            onPress={onFechar}
            activeOpacity={0.7}
          >
            <Text style={styles.textoFechar}>FECHAR</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalFundo: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },

  modalCaixa: {
    backgroundColor: '#111111',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },

  tituloModal: {
    color: '#FECF2B',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 16,
  },

  loader: {
    marginVertical: 20,
  },

  listaModal: {
    maxHeight: 360,
  },

  itemModal: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },

  nomeExercicio: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },

  grupoMuscular: {
    color: '#FECF2B',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },

  vazio: {
    color: '#777777',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 20,
  },

  botaoFechar: {
    paddingVertical: 16,
    alignItems: 'center',
  },

  textoFechar: {
    color: '#FECF2B',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.8,
  },
});
