import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Botao } from '@/components/ui/Botao';
import { CampoSelecao } from '@/components/ui/CampoSelecao';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { GraficoBarras } from '@/components/ui/GraficoBarras';
import { LinhaLista } from '@/components/ui/LinhaLista';
import { cores, espacamento, tipografia } from '@/theme';
import { GestaoAlunoDetalhe, ProfessorGestaoItem } from '@/types/gestao.types';
import { EvolucaoExercicioResumo } from '@/types/evolucao.types';
import { FichaLista } from '@/types/ficha.types';
import { FrequenciaAluno } from '@/types/professorWeb.types';
import { mostrarAlerta } from '@/utils/alerta';
import { formatarData } from '@/utils/datas';
import { formatarHora } from '@/utils/evolucao';
import { entradasPorMes } from '@/utils/painelAdmin';
import { statusFicha } from '@/utils/situacao';

import { SecaoAdmin } from './SecaoAdmin';

/** Dados cadastrais e de contato do aluno. */
export function SecaoDadosAluno({ aluno }: { aluno: GestaoAlunoDetalhe }) {
  const linhas: [string, string][] = [
    ['E-mail', aluno.email],
    ['Telefone', aluno.telefone],
    ['Nascimento', formatarData(aluno.data_nascimento)],
    ['CPF', aluno.cpf ?? '—'],
    ['Endereço', aluno.endereco ?? '—'],
    ['Observações', aluno.observacoes ?? '—'],
    ['Código de acesso', aluno.codigo_acesso],
    ['Cadastrado em', aluno.criado_em ? formatarData(aluno.criado_em) : 'Sem data'],
  ];

  return (
    <SecaoAdmin titulo="Dados e contato" testID="aluno-dados">
      {linhas.map(([rotulo, valor]) => (
        <View key={rotulo} style={estilos.dado}>
          <Text style={estilos.rotulo}>{rotulo}</Text>
          <Text style={estilos.valor} selectable>
            {valor}
          </Text>
        </View>
      ))}
    </SecaoAdmin>
  );
}

interface SecaoProfessorProps {
  aluno: GestaoAlunoDetalhe;
  professores: ProfessorGestaoItem[];
  processando: boolean;
  aoTrocar: (professorId: number | null) => Promise<{ ok: boolean; erro?: string }>;
}

/** Professor responsável: trocar (com confirmação) ou deixar sem professor. */
export function SecaoProfessorAluno({ aluno, professores, processando, aoTrocar }: SecaoProfessorProps) {
  const atual = aluno.professor?.id ?? null;
  const [escolhido, setEscolhido] = useState<number | null>(atual);

  useEffect(() => setEscolhido(atual), [atual]);

  const opcoes = useMemo(
    () => professores.filter((p) => p.ativo || p.id === atual).map((p) => ({ valor: p.id, rotulo: p.nome, descricao: p.ativo ? undefined : 'Inativo' })),
    [professores, atual]
  );

  function confirmar() {
    const nome = professores.find((p) => p.id === escolhido)?.nome;

    mostrarAlerta(
      'Trocar professor',
      escolhido === null ? `${aluno.nome} ficará sem professor responsável.` : `${aluno.nome} passará a ser acompanhado por ${nome}.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Trocar',
          onPress: async () => {
            const resultado = await aoTrocar(escolhido);

            if (!resultado.ok) mostrarAlerta('Não foi possível trocar', resultado.erro);
          },
        },
      ]
    );
  }

  return (
    <SecaoAdmin titulo="Professor responsável" testID="aluno-professor">
      <Text style={estilos.valor}>{aluno.professor ? aluno.professor.nome : 'Sem professor'}</Text>
      <CampoSelecao
        rotulo="Novo professor"
        opcoes={opcoes}
        valor={escolhido}
        aoMudar={setEscolhido}
        placeholder="Sem professor"
        limpavel
        testID="aluno-professor-selecao"
      />
      <Botao
        variante="secundario"
        tamanho="medio"
        icone="swap-horizontal"
        larguraTotal={false}
        disabled={escolhido === atual}
        carregando={processando}
        onPress={confirmar}
        testID="aluno-professor-trocar"
      >
        Trocar professor
      </Botao>
    </SecaoAdmin>
  );
}

interface SecaoRestricaoProps {
  aluno: GestaoAlunoDetalhe;
  processando: boolean;
  aoAlterar: (restricao: string | null) => Promise<{ ok: boolean; erro?: string }>;
}

/** Restrição de acesso: com texto, o aluno fica bloqueado na entrada. */
export function SecaoRestricaoAluno({ aluno, processando, aoAlterar }: SecaoRestricaoProps) {
  const [texto, setTexto] = useState(aluno.restricao_acesso ?? '');

  useEffect(() => setTexto(aluno.restricao_acesso ?? ''), [aluno.restricao_acesso]);

  async function salvar(valor: string | null) {
    const resultado = await aoAlterar(valor);

    if (!resultado.ok) mostrarAlerta('Não foi possível alterar', resultado.erro);
  }

  function aplicar() {
    mostrarAlerta('Restringir acesso', `${aluno.nome} ficará bloqueado na entrada até a restrição ser removida.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Restringir', style: 'destructive', onPress: () => salvar(texto.trim()) },
    ]);
  }

  return (
    <SecaoAdmin titulo="Restrição de acesso" subtitulo="Bloqueia a entrada na academia enquanto estiver preenchida." testID="aluno-restricao">
      {aluno.restricao_acesso ? <Text style={estilos.alerta}>Restrição ativa: {aluno.restricao_acesso}</Text> : <Text style={estilos.valor}>Sem restrição.</Text>}
      <CampoTexto rotulo="Motivo da restrição" value={texto} onChangeText={setTexto} maxLength={255} testID="aluno-restricao-texto" />
      <View style={estilos.linha}>
        <Botao
          variante="perigo"
          tamanho="medio"
          icone="lock-closed"
          larguraTotal={false}
          disabled={texto.trim() === '' || texto.trim() === (aluno.restricao_acesso ?? '')}
          carregando={processando}
          onPress={aplicar}
          testID="aluno-restricao-aplicar"
        >
          {aluno.restricao_acesso ? 'Atualizar restrição' : 'Restringir acesso'}
        </Botao>
        {aluno.restricao_acesso ? (
          <Botao variante="secundario" tamanho="medio" icone="lock-open" larguraTotal={false} disabled={processando} onPress={() => salvar(null)} testID="aluno-restricao-remover">
            Remover restrição
          </Botao>
        ) : null}
      </View>
    </SecaoAdmin>
  );
}

interface SecaoFrequenciaProps {
  frequencia: FrequenciaAluno | null;
  carregando: boolean;
  erro: string | null;
  aoTentarNovamente: () => void;
}

/** Frequência dos últimos 6 meses: entradas liberadas por mês, última entrada e sessões de treino. */
export function SecaoFrequenciaAluno({ frequencia, carregando, erro, aoTentarNovamente }: SecaoFrequenciaProps) {
  return (
    <SecaoAdmin
      titulo="Frequência"
      subtitulo="Entradas liberadas nos últimos 6 meses"
      carregando={carregando && !frequencia}
      erro={erro}
      aoTentarNovamente={aoTentarNovamente}
      testID="aluno-frequencia"
    >
      {frequencia ? (
        <View style={estilos.bloco}>
          <Text style={estilos.valor}>
            {frequencia.total_periodo} entradas · {frequencia.sessoes_treino_periodo} sessões de treino
            {frequencia.ultima_entrada ? ` · última em ${formatarData(frequencia.ultima_entrada)} às ${formatarHora(frequencia.ultima_entrada)}` : ' · sem entradas'}
          </Text>
          <GraficoBarras
            dados={entradasPorMes(frequencia.entradas_por_semana)}
            rotulo="Entradas por mês"
            altura={180}
            mensagemVazio="Nenhuma entrada no período."
            testID="aluno-frequencia-grafico"
          />
        </View>
      ) : null}
    </SecaoAdmin>
  );
}

interface SecaoAcompanhamentoProps {
  fichas: { dados: FichaLista[]; erro: string | null; recarregar: () => unknown };
  evolucao: { dados: EvolucaoExercicioResumo[]; erro: string | null; recarregar: () => unknown };
  avaliacoes: { dados: { id: number; data_avaliacao: string; peso: number | null }[]; erro: string | null; recarregar: () => unknown };
}

/** Atalhos de leitura: fichas, avaliações e evolução do aluno (somente consulta). */
export function SecoesAcompanhamentoAluno({ fichas, evolucao, avaliacoes }: SecaoAcompanhamentoProps) {
  return (
    <>
      <SecaoAdmin
        titulo="Fichas"
        subtitulo="Somente leitura"
        erro={fichas.erro}
        aoTentarNovamente={() => fichas.recarregar()}
        vazio={fichas.dados.length === 0 ? 'Nenhuma ficha para este aluno.' : null}
        testID="aluno-fichas"
      >
        {fichas.dados.map((ficha) => (
          <LinhaLista
            key={ficha.id}
            titulo={ficha.nome}
            subtitulo={`${statusFicha(ficha.status ?? 'publicada').rotulo} · ${ficha.total_treinos} treino(s)${ficha.vigente ? ' · vigente' : ''}`}
            icone="document-text-outline"
            semChevron
          />
        ))}
      </SecaoAdmin>

      <SecaoAdmin
        titulo="Avaliações físicas"
        subtitulo="Somente leitura"
        erro={avaliacoes.erro}
        aoTentarNovamente={() => avaliacoes.recarregar()}
        vazio={avaliacoes.dados.length === 0 ? 'Nenhuma avaliação registrada.' : null}
        testID="aluno-avaliacoes"
      >
        {avaliacoes.dados.map((avaliacao) => (
          <LinhaLista
            key={avaliacao.id}
            titulo={formatarData(avaliacao.data_avaliacao)}
            subtitulo={avaliacao.peso !== null ? `Peso ${avaliacao.peso} kg` : 'Sem peso informado'}
            icone="body-outline"
            semChevron
          />
        ))}
      </SecaoAdmin>

      <SecaoAdmin
        titulo="Evolução de carga"
        subtitulo="Somente leitura"
        erro={evolucao.erro}
        aoTentarNovamente={() => evolucao.recarregar()}
        vazio={evolucao.dados.length === 0 ? 'Nenhum exercício com histórico.' : null}
        testID="aluno-evolucao"
      >
        {evolucao.dados.map((exercicio) => (
          <LinhaLista
            key={exercicio.exercicio_id}
            titulo={exercicio.nome}
            subtitulo={`Última carga ${exercicio.ultima_carga} kg · máxima ${exercicio.carga_maxima} kg · ${exercicio.total_registros} registro(s)`}
            icone="trending-up-outline"
            semChevron
          />
        ))}
      </SecaoAdmin>
    </>
  );
}

const estilos = StyleSheet.create({
  dado: { gap: 2, paddingVertical: 4 },
  rotulo: { ...tipografia.rotulo, color: cores.textoTerciario },
  valor: { ...tipografia.corpo, color: cores.texto },
  alerta: { ...tipografia.corpoForte, color: cores.perigo },
  linha: { flexDirection: 'row', flexWrap: 'wrap', gap: espacamento.sm },
  bloco: { gap: espacamento.md },
});
