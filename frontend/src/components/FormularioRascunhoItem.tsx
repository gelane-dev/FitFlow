import { Ionicons } from '@expo/vector-icons';
import { useRef } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Botao } from '@/components/ui/Botao';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { Pressionavel } from '@/components/ui/Pressionavel';
import { cores, raios } from '@/theme';
import { useErrosAposTentativa } from '@/hooks/useErrosAposTentativa';
import { RascunhoItem } from '@/types/ficha.types';
import { CampoItem, validarItem } from '@/utils/validacaoFormularios';

interface FormularioRascunhoItemProps {
  rascunho: RascunhoItem;
  onAtualizar: (campo: keyof RascunhoItem, valor: string) => void;
  onAbrirSeletor: () => void;
  /** Chamado só quando o rascunho está válido. */
  onSalvar: () => void;
  onCancelar: () => void;
  salvando: boolean;
}

/** Cartão de um exercício novo ainda não salvo no treino. */
export function FormularioRascunhoItem({
  rascunho,
  onAtualizar,
  onAbrirSeletor,
  onSalvar,
  onCancelar,
  salvando,
}: FormularioRascunhoItemProps) {
  const { erros, tentar } = useErrosAposTentativa<CampoItem>(() =>
    validarItem({
      series: rascunho.series,
      repeticoes: rascunho.repeticoes,
      carga: rascunho.carga,
      descanso: rascunho.descanso,
      exercicioId: rascunho.exercicioId,
      exigirExercicio: true,
    })
  );

  // Foco na ordem visual: Séries → Reps → Carga → Descanso.
  const refRepeticoes = useRef<TextInput>(null);
  const refCarga = useRef<TextInput>(null);
  const refDescanso = useRef<TextInput>(null);

  function confirmar() {
    if (tentar()) {
      onSalvar();
    }
  }

  return (
    <View style={estilos.card}>
      <Text style={estilos.rotuloCard}>Novo exercício</Text>

      <Text style={estilos.rotulo}>Exercício</Text>
      <Pressionavel
        onPress={onAbrirSeletor}
        style={[estilos.seletor, erros.exercicio ? estilos.seletorErro : null]}
        accessibilityRole="button"
      >
        <View style={estilos.seletorTextos}>
          <Text
            style={rascunho.exercicioNome ? estilos.nomeExercicio : estilos.placeholder}
            numberOfLines={1}
          >
            {rascunho.exercicioNome || 'Selecionar exercício'}
          </Text>
          {rascunho.grupoMuscular ? (
            <Text style={estilos.grupo}>{rascunho.grupoMuscular}</Text>
          ) : null}
        </View>
        <Ionicons name="chevron-down" size={18} color={cores.textoTerciario} />
      </Pressionavel>
      {erros.exercicio ? <Text style={estilos.erro}>{erros.exercicio}</Text> : null}

      <View style={estilos.grade}>
        <View style={estilos.coluna}>
          <CampoTexto
            rotulo="Séries"
            placeholder="3"
            keyboardType="number-pad"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => refRepeticoes.current?.focus()}
            value={rascunho.series}
            onChangeText={(valor) => onAtualizar('series', valor)}
            erro={erros.series}
          />
        </View>
        <View style={estilos.coluna}>
          <CampoTexto
            rotulo="Reps"
            ref={refRepeticoes}
            placeholder="12"
            keyboardType="number-pad"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => refCarga.current?.focus()}
            value={rascunho.repeticoes}
            onChangeText={(valor) => onAtualizar('repeticoes', valor)}
            erro={erros.repeticoes}
          />
        </View>
      </View>

      <View style={estilos.grade}>
        <View style={estilos.coluna}>
          <CampoTexto
            rotulo="Carga (kg)"
            ref={refCarga}
            placeholder="opcional"
            keyboardType="decimal-pad"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => refDescanso.current?.focus()}
            value={rascunho.carga}
            onChangeText={(valor) => onAtualizar('carga', valor)}
            erro={erros.carga}
          />
        </View>
        <View style={estilos.coluna}>
          <CampoTexto
            rotulo="Descanso (s)"
            ref={refDescanso}
            placeholder="60"
            keyboardType="number-pad"
            returnKeyType="done"
            value={rascunho.descanso}
            onChangeText={(valor) => onAtualizar('descanso', valor)}
            erro={erros.descanso}
          />
        </View>
      </View>

      <Botao onPress={confirmar} carregando={salvando}>
        SALVAR EXERCÍCIO
      </Botao>
      <Botao variante="fantasma" tamanho="medio" onPress={onCancelar} haptico={false}>
        CANCELAR
      </Botao>
    </View>
  );
}

const estilos = StyleSheet.create({
  card: {
    backgroundColor: cores.superficie,
    borderWidth: 1,
    borderColor: cores.primaria,
    borderStyle: 'dashed',
    borderRadius: raios.cartao,
    padding: 16,
    marginBottom: 12,
    gap: 4,
  },
  rotuloCard: {
    color: cores.primaria,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  rotulo: { color: cores.textoSecundario, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  seletor: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: cores.superficieElevada,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raios.input,
    marginBottom: 18,
  },
  seletorErro: { borderColor: cores.perigo, marginBottom: 6 },
  seletorTextos: { flex: 1 },
  nomeExercicio: { color: cores.texto, fontSize: 15, fontWeight: '600' },
  placeholder: { color: cores.textoTerciario, fontSize: 15 },
  grupo: { color: cores.primaria, fontSize: 12, fontWeight: '600', marginTop: 2 },
  erro: { color: cores.perigo, fontSize: 12, marginBottom: 14 },
  grade: { flexDirection: 'row', gap: 12 },
  coluna: { flex: 1 },
});
