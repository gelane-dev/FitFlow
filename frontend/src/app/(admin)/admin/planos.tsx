import { Href, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SeloAtivo } from '@/components/admin/ListaEquipe';
import { FormularioPlano, PERIODICIDADES } from '@/components/admin/FormularioPlano';
import { SecaoAdmin } from '@/components/admin/SecaoAdmin';
import { Botao } from '@/components/ui/Botao';
import { CabecalhoDetalhe } from '@/components/ui/CabecalhoDetalhe';
import { Chip } from '@/components/ui/Chip';
import { ConteudoLargo } from '@/components/ui/ConteudoLargo';
import { LinhaLista } from '@/components/ui/LinhaLista';
import { Modal } from '@/components/ui/Modal';
import { SeloSituacao } from '@/components/ui/SeloSituacao';
import { ColunaTabela, TabelaDados } from '@/components/ui/TabelaDados';
import { Tela } from '@/components/ui/Tela';
import { FiltroSituacaoPlano, useAdminPlanoAlunos, useAdminPlanos } from '@/hooks/useAdminPlanos';
import { usePuxarParaAtualizar } from '@/hooks/usePuxarParaAtualizar';
import { useRecarregarNoFoco } from '@/hooks/useRecarregarNoFoco';
import { cores, espacamento, tipografia } from '@/theme';
import { PlanoCriar, PlanoResposta } from '@/types/gestao.types';
import { mostrarAlerta } from '@/utils/alerta';
import { formatarData } from '@/utils/datas';
import { formatarMoeda } from '@/utils/moeda';
import { pluralizar } from '@/utils/pluralizacao';

const FILTROS: { valor: FiltroSituacaoPlano; rotulo: string }[] = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'ativos', rotulo: 'Ativos' },
  { valor: 'inativos', rotulo: 'Inativos' },
];

const rotuloPeriodicidade = (valor: string) => PERIODICIDADES.find((p) => p.valor === valor)?.rotulo ?? valor;

function AlunosDoPlano({ planoId }: { planoId: number }) {
  const { alunos, carregando, erro, recarregar } = useAdminPlanoAlunos(planoId);

  return (
    <SecaoAdmin
      titulo="Alunos do plano"
      subtitulo="Com matrícula ativa"
      carregando={carregando && alunos.length === 0}
      erro={erro}
      aoTentarNovamente={recarregar}
      vazio={!carregando && alunos.length === 0 ? 'Nenhum aluno com matrícula ativa neste plano.' : null}
      testID="plano-alunos"
    >
      {alunos.map((aluno) => (
        <LinhaLista
          key={aluno.id}
          titulo={aluno.nome}
          subtitulo={`Vence em ${formatarData(aluno.data_vencimento)}`}
          direita={<SeloSituacao situacao={aluno.situacao} />}
          onPress={() => router.push(`/admin/alunos/${aluno.id}` as Href)}
        />
      ))}
    </SecaoAdmin>
  );
}

/** Planos: lista, criar, editar, ativar/desativar e ver os alunos de cada plano. */
export default function PlanosAdmin() {
  const lista = useAdminPlanos();
  const [formulario, setFormulario] = useState<{ plano: PlanoResposta | null } | null>(null);
  const [detalheId, setDetalheId] = useState<number | null>(null);

  useRecarregarNoFoco(lista.recarregar);
  const { atualizando, aoAtualizar } = usePuxarParaAtualizar(lista.recarregar);

  // O detalhe sempre lê o plano da lista atual, então reflete a edição sem outra busca.
  const detalhe = lista.planos.find((p) => p.id === detalheId) ?? null;

  async function salvar(dados: PlanoCriar) {
    const editando = formulario?.plano ?? null;
    const resultado = editando ? await lista.editar(editando.id, dados) : await lista.criar(dados);

    if (!resultado.ok) {
      mostrarAlerta('Não foi possível salvar', resultado.erro);

      return;
    }

    setFormulario(null);
  }

  async function aplicarStatus(plano: PlanoResposta, ativo: boolean) {
    const resultado = await lista.alternarStatus(plano.id, ativo);

    if (!resultado.ok) mostrarAlerta('Não foi possível alterar', resultado.erro);
  }

  function confirmarStatus(plano: PlanoResposta) {
    if (!plano.ativo) {
      aplicarStatus(plano, true);

      return;
    }

    mostrarAlerta(
      'Desativar plano',
      `${plano.nome} não poderá mais ser escolhido em novas matrículas. As matrículas ativas continuam valendo.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Desativar', style: 'destructive', onPress: () => aplicarStatus(plano, false) },
      ]
    );
  }

  const colunas: ColunaTabela<PlanoResposta>[] = [
    { chave: 'nome', titulo: 'Plano', peso: 2, principal: true, ordenavel: true, valorOrdenacao: (p) => p.nome, render: (p) => p.nome },
    { chave: 'periodicidade', titulo: 'Periodicidade', render: (p) => rotuloPeriodicidade(p.periodicidade) },
    { chave: 'duracao', titulo: 'Duração', alinhamento: 'direita', ordenavel: true, valorOrdenacao: (p) => p.duracao_dias, render: (p) => pluralizar(p.duracao_dias, 'dia') },
    { chave: 'valor', titulo: 'Valor', alinhamento: 'direita', ordenavel: true, valorOrdenacao: (p) => Number(p.valor), render: (p) => formatarMoeda(p.valor) },
    { chave: 'alunos', titulo: 'Alunos', alinhamento: 'direita', ordenavel: true, valorOrdenacao: (p) => p.total_alunos, render: (p) => pluralizar(p.total_alunos, 'aluno') },
    { chave: 'situacao', titulo: 'Situação', render: (p) => <SeloAtivo ativo={p.ativo} /> },
  ];

  return (
    <Tela aoAtualizar={aoAtualizar} atualizando={atualizando} testID="planos-admin">
      <ConteudoLargo>
        <CabecalhoDetalhe titulo="Planos" />

        <View style={estilos.filtros}>
          {FILTROS.map((f) => (
            <Chip
              key={f.valor}
              rotulo={f.rotulo}
              selecionado={lista.filtro === f.valor}
              onPress={() => lista.definirFiltro(f.valor)}
            />
          ))}
        </View>

        <Botao icone="add" larguraTotal={false} onPress={() => setFormulario({ plano: null })} testID="botao-novo-plano">
          Novo plano
        </Botao>

        <View style={estilos.tabela}>
          <TabelaDados
            colunas={colunas}
            dados={lista.planos}
            chaveItem={(p) => p.id}
            aoPressionar={(p) => setDetalheId(p.id)}
            carregando={lista.carregando && !lista.carregado}
            erro={lista.erro && !lista.carregado ? lista.erro : null}
            aoTentarNovamente={lista.recarregar}
            vazio={{
              titulo: lista.totalGeral === 0 ? 'Nenhum plano cadastrado' : 'Nenhum plano neste filtro',
              descricao: lista.totalGeral === 0 ? 'Crie o primeiro plano para poder matricular alunos.' : undefined,
              icone: 'pricetags-outline',
            }}
            ordenacaoInicial={{ chave: 'nome', direcao: 'asc' }}
            rotulo="Lista de planos"
            testID="tabela-planos"
          />
        </View>
      </ConteudoLargo>

      <Modal visivel={detalhe !== null} titulo={detalhe?.nome ?? 'Plano'} aoFechar={() => setDetalheId(null)} testID="modal-plano">
        {detalhe ? (
          <View style={estilos.detalhe}>
            <View style={estilos.linhaSelos}>
              <SeloAtivo ativo={detalhe.ativo} />
              <Text style={estilos.valor}>{formatarMoeda(detalhe.valor)}</Text>
            </View>
            <Text style={estilos.texto}>
              {rotuloPeriodicidade(detalhe.periodicidade)} · {pluralizar(detalhe.duracao_dias, 'dia')}
              {detalhe.renovacao_automatica ? ' · renovação automática' : ''}
            </Text>
            {detalhe.descricao ? <Text style={estilos.texto}>{detalhe.descricao}</Text> : null}
            {detalhe.condicoes ? <Text style={estilos.texto}>Condições: {detalhe.condicoes}</Text> : null}

            <View style={estilos.acoes}>
              <Botao
                variante="secundario"
                icone="create-outline"
                larguraTotal={false}
                onPress={() => {
                  setDetalheId(null);
                  setFormulario({ plano: detalhe });
                }}
                testID="plano-editar"
              >
                Editar
              </Botao>
              <Botao
                variante={detalhe.ativo ? 'perigo' : 'primario'}
                icone={detalhe.ativo ? 'ban' : 'checkmark-circle'}
                larguraTotal={false}
                carregando={lista.processando}
                onPress={() => confirmarStatus(detalhe)}
                testID="plano-status"
              >
                {detalhe.ativo ? 'Desativar' : 'Ativar'}
              </Botao>
            </View>

            <AlunosDoPlano planoId={detalhe.id} />
          </View>
        ) : null}
      </Modal>

      <FormularioPlano
        visivel={formulario !== null}
        plano={formulario?.plano}
        enviando={lista.processando}
        aoFechar={() => setFormulario(null)}
        aoSalvar={salvar}
      />
    </Tela>
  );
}

const estilos = StyleSheet.create({
  filtros: { flexDirection: 'row', gap: espacamento.sm, marginBottom: espacamento.md },
  tabela: { marginTop: espacamento.md },
  detalhe: { gap: espacamento.md },
  linhaSelos: { flexDirection: 'row', alignItems: 'center', gap: espacamento.md },
  valor: { ...tipografia.numero, fontSize: 22, color: cores.texto },
  texto: { ...tipografia.corpo, color: cores.textoSecundario },
  acoes: { flexDirection: 'row', flexWrap: 'wrap', gap: espacamento.sm },
});
