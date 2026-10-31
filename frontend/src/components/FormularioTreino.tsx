import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Botao } from '@/components/ui/Botao';
import { CabecalhoDetalhe } from '@/components/ui/CabecalhoDetalhe';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { Chip } from '@/components/ui/Chip';
import { Tela } from '@/components/ui/Tela';
import { TituloSecao } from '@/components/ui/TituloSecao';
import { useErrosAposTentativa } from '@/hooks/useErrosAposTentativa';
import { DIAS_SEMANA, DiaSemana } from '@/types/ficha.types';
import { rotuloDiaCurto } from '@/utils/diasSemana';
import { CampoTreino, validarTreino } from '@/utils/validacaoFormularios';

interface DadosTreino {
  nome: string;
  dia_semana: DiaSemana;
  ordem: number;
}

interface FormularioTreinoProps {
  titulo: string;
  rotuloBotao: string;
  salvando: boolean;
  nomeInicial?: string;
  diaInicial?: DiaSemana;
  ordemInicial?: string;
  onSalvar: (dados: DadosTreino) => void;
}

/** Formulário de treino (novo e edição): nome, dia da semana em chips e ordem. */
export function FormularioTreino({
  titulo,
  rotuloBotao,
  salvando,
  nomeInicial = '',
  diaInicial = 'segunda',
  ordemInicial = '1',
  onSalvar,
}: FormularioTreinoProps) {
  const [nome, setNome] = useState(nomeInicial);
  const [diaSemana, setDiaSemana] = useState<DiaSemana>(diaInicial);
  const [ordem, setOrdem] = useState(ordemInicial);
  const { erros, tentar } = useErrosAposTentativa<CampoTreino>(() =>
    validarTreino({ nome, ordem })
  );

  function enviar() {
    if (!tentar()) {
      return;
    }

    onSalvar({ nome: nome.trim(), dia_semana: diaSemana, ordem: Number(ordem) });
  }

  return (
    <Tela
      teclado
      rodape={
        <Botao onPress={enviar} carregando={salvando}>
          {rotuloBotao}
        </Botao>
      }
    >
      <CabecalhoDetalhe titulo={titulo} />

      <TituloSecao titulo="Treino" />
      <CampoTexto
        rotulo="Nome"
        placeholder="Ex.: Treino A"
        value={nome}
        onChangeText={setNome}
        erro={erros.nome}
      />

      <TituloSecao titulo="Dia da semana" />
      <View style={estilos.dias}>
        {DIAS_SEMANA.map((dia) => (
          <Chip
            key={dia}
            rotulo={rotuloDiaCurto(dia)}
            selecionado={dia === diaSemana}
            igual
            onPress={() => setDiaSemana(dia)}
          />
        ))}
      </View>

      <TituloSecao titulo="Posição na ficha" />
      <CampoTexto
        rotulo="Ordem"
        placeholder="1"
        keyboardType="number-pad"
        value={ordem}
        onChangeText={setOrdem}
        erro={erros.ordem}
      />
    </Tela>
  );
}

const estilos = StyleSheet.create({
  dias: { flexDirection: 'row', gap: 6, marginBottom: 4 },
});
