import { StyleSheet, Text, View } from 'react-native';

import { CamposVigencia } from '@/components/CamposVigencia';
import { Selo } from '@/components/ui/Selo';
import { CampoSelecao } from '@/components/ui/CampoSelecao';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { Cartao } from '@/components/ui/Cartao';
import { useLarguraTela } from '@/components/ui/useLarguraTela';
import { cores } from '@/theme';
import { AlunoLista, StatusFicha } from '@/types/ficha.types';
import { ErrosMontador, FichaMontador, LIMITE_OBJETIVO } from '@/utils/montadorFicha';

interface DadosFichaMontadorProps {
  ficha: FichaMontador;
  alunos: AlunoLista[];
  carregandoAlunos?: boolean;
  erros: ErrosMontador;
  desabilitado?: boolean;
  aoAlterar: (
    campos: Partial<Pick<FichaMontador, 'alunoId' | 'nome' | 'objetivo' | 'dataInicio' | 'dataFim'>>
  ) => void;
}

const SELO: Record<StatusFicha, { rotulo: string; tom: 'aviso' | 'sucesso' }> = {
  rascunho: { rotulo: 'Rascunho', tom: 'aviso' },
  publicada: { rotulo: 'Publicada', tom: 'sucesso' },
};

/** Dados da ficha no montador: aluno (só vinculados), nome, objetivo e vigência. */
export function DadosFichaMontador({
  ficha,
  alunos,
  carregandoAlunos = false,
  erros,
  desabilitado = false,
  aoAlterar,
}: DadosFichaMontadorProps) {
  const { ehMedio } = useLarguraTela();
  const existente = Boolean(ficha.id);
  const opcoes = alunos.map((a) => ({ valor: a.id, rotulo: a.nome }));

  // A ficha pertence a um aluno desde a criação (a API não troca o aluno depois).
  if (existente && ficha.alunoId && !opcoes.some((o) => o.valor === ficha.alunoId)) {
    opcoes.push({ valor: ficha.alunoId, rotulo: `Aluno #${ficha.alunoId}` });
  }

  const selo = SELO[ficha.status];

  return (
    <Cartao>
      <View style={estilos.topo}>
        <Text style={estilos.titulo}>Dados da ficha</Text>
        {existente ? <Selo rotulo={selo.rotulo} tom={selo.tom} /> : <Selo rotulo="Nova" tom="neutro" />}
      </View>

      <CampoSelecao
        rotulo="Aluno"
        opcoes={opcoes}
        valor={ficha.alunoId}
        aoMudar={(valor) => aoAlterar({ alunoId: valor })}
        placeholder={carregandoAlunos ? 'Carregando alunos...' : 'Selecione um aluno vinculado'}
        erro={erros.aluno}
        buscavel
        disabled={desabilitado || existente || carregandoAlunos}
        testID="montador-aluno"
      />
      {existente ? (
        <Text style={estilos.dica}>O aluno não pode ser trocado depois que a ficha é criada. Para outro aluno, duplique a ficha.</Text>
      ) : null}

      <CampoTexto
        rotulo="Nome da ficha"
        placeholder="Ex.: Hipertrofia - ciclo 1"
        value={ficha.nome}
        onChangeText={(nome) => aoAlterar({ nome })}
        erro={erros.nome}
        editable={!desabilitado}
        testID="montador-nome"
      />

      <CampoTexto
        rotulo="Objetivo (opcional)"
        placeholder="Ex.: ganho de massa, emagrecimento"
        value={ficha.objetivo}
        onChangeText={(objetivo) => aoAlterar({ objetivo })}
        maxLength={LIMITE_OBJETIVO}
        editable={!desabilitado}
        testID="montador-objetivo"
      />

      <CamposVigencia
        dataInicio={ficha.dataInicio}
        dataFim={ficha.dataFim}
        onChangeInicio={(dataInicio) => aoAlterar({ dataInicio })}
        onChangeFim={(dataFim) => aoAlterar({ dataFim })}
        erroInicio={erros.dataInicio}
        erroFim={erros.dataFim}
        emColunas={ehMedio}
      />
    </Cartao>
  );
}

const estilos = StyleSheet.create({
  topo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  titulo: { color: cores.texto, fontSize: 17, fontWeight: '700' },
  dica: { color: cores.textoTerciario, fontSize: 12, marginTop: -10, marginBottom: 16 },
});
