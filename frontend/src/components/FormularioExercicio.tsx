import { ReactNode, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Botao } from '@/components/ui/Botao';
import { CabecalhoDetalhe } from '@/components/ui/CabecalhoDetalhe';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { Chip } from '@/components/ui/Chip';
import { Tela } from '@/components/ui/Tela';
import { TituloSecao } from '@/components/ui/TituloSecao';
import { useErrosAposTentativa } from '@/hooks/useErrosAposTentativa';
import { ExercicioAtualizar } from '@/types/exercicio.types';
import { CampoExercicio, validarExercicio } from '@/utils/validacaoFormularios';

/** Grupos musculares mais comuns, como atalho de preenchimento. */
export const GRUPOS_SUGERIDOS = [
  'Peito',
  'Costas',
  'Pernas',
  'Ombros',
  'Bíceps',
  'Tríceps',
  'Abdômen',
  'Glúteos',
];

interface FormularioExercicioProps {
  titulo: string;
  exercicio?: {
    nome: string;
    descricao: string;
    grupo_muscular: string;
  };
  salvando: boolean;
  desabilitado?: boolean;
  rotuloBotao: string;
  onSalvar: (dados: ExercicioAtualizar) => void;
  /** Conteúdo exibido entre o cabeçalho e os campos (ex.: mídia do exercício). */
  topo?: ReactNode;
}

/** Tela de formulário de exercício (novo e edição): campos em seções e botão no rodapé. */
export function FormularioExercicio({
  titulo,
  exercicio,
  salvando,
  desabilitado = false,
  rotuloBotao,
  onSalvar,
  topo,
}: FormularioExercicioProps) {
  const [nome, setNome] = useState(exercicio?.nome ?? '');
  const [descricao, setDescricao] = useState(exercicio?.descricao ?? '');
  const [grupoMuscular, setGrupoMuscular] = useState(exercicio?.grupo_muscular ?? '');
  const { erros, tentar } = useErrosAposTentativa<CampoExercicio>(() =>
    validarExercicio({ nome, descricao, grupo: grupoMuscular })
  );

  function enviar() {
    if (!tentar()) {
      return;
    }

    onSalvar({
      nome: nome.trim(),
      descricao: descricao.trim(),
      grupo_muscular: grupoMuscular.trim(),
    });
  }

  return (
    <Tela
      teclado
      rodape={
        <Botao onPress={enviar} carregando={salvando} disabled={desabilitado}>
          {rotuloBotao}
        </Botao>
      }
    >
      <CabecalhoDetalhe titulo={titulo} />

      {topo}

      <TituloSecao titulo="Informações" />
      <CampoTexto
        rotulo="Nome"
        placeholder="Digite o nome do exercício"
        value={nome}
        onChangeText={setNome}
        erro={erros.nome}
      />
      <CampoTexto
        rotulo="Descrição"
        placeholder="Digite a descrição do exercício"
        value={descricao}
        onChangeText={setDescricao}
        multiline
        erro={erros.descricao}
      />

      <TituloSecao titulo="Grupo muscular" />
      <CampoTexto
        placeholder="Ex.: Peito, Costas, Pernas"
        value={grupoMuscular}
        onChangeText={setGrupoMuscular}
        erro={erros.grupo}
      />
      <View style={estilos.chips}>
        {GRUPOS_SUGERIDOS.map((grupo) => (
          <Chip
            key={grupo}
            rotulo={grupo}
            selecionado={grupoMuscular.trim().toLowerCase() === grupo.toLowerCase()}
            onPress={() => setGrupoMuscular(grupo)}
          />
        ))}
      </View>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
