import { Href, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { SecaoAdmin } from '@/components/admin/SecaoAdmin';
import { CabecalhoGrande } from '@/components/ui/CabecalhoGrande';
import { ConteudoLargo, Grade } from '@/components/ui/ConteudoLargo';
import { EstadoErro } from '@/components/ui/EstadoErro';
import { GraficoBarras } from '@/components/ui/GraficoBarras';
import { GraficoLinha } from '@/components/ui/GraficoLinha';
import { Indicador } from '@/components/ui/Indicador';
import { LinhaLista } from '@/components/ui/LinhaLista';
import { Tela } from '@/components/ui/Tela';
import { TituloSecao } from '@/components/ui/TituloSecao';
import { useLarguraTela } from '@/components/ui/useLarguraTela';
import { useAdminPainel } from '@/hooks/useAdminPainel';
import { usePuxarParaAtualizar } from '@/hooks/usePuxarParaAtualizar';
import { useRecarregarNoFoco } from '@/hooks/useRecarregarNoFoco';
import { rotuloMesDaData } from '@/utils/painelAdmin';
import { cores, espacamento, tipografia } from '@/theme';
import { formatarData } from '@/utils/datas';
import { formatarNumeroBr } from '@/utils/numeros';
import { pluralizar } from '@/utils/pluralizacao';
import { rotuloData } from '@/utils/saudacao';

/** Em tela estreita, 12 rótulos "nov/26" se sobrepõem: fica só o mês ("nov"). */
const mesCurto = (dados: { rotulo: string; valor: number }[], estreito: boolean) =>
  estreito ? dados.map((d) => ({ ...d, rotulo: d.rotulo.slice(0, 3) })) : dados;

const abrirAluno = (id: number) => router.push(`/admin/alunos/${id}` as Href);

/** Painel do admin: KPIs e gráficos reais do `/admin/dashboard`. */
export default function PainelAdmin() {
  const { painel, graficos, carregando, erro, recarregar } = useAdminPainel();
  const { ehMedio, ehLargo } = useLarguraTela();
  const { atualizando, aoAtualizar } = usePuxarParaAtualizar(recarregar);

  useRecarregarNoFoco(recarregar);

  const semDados = !painel && carregando;
  const colunasGraficos = ehMedio ? 2 : 1;
  const colunasKpi = ehLargo ? 3 : 2;
  const totais = painel?.totais;
  const formatar = (n: number | undefined) => (n === undefined ? '—' : formatarNumeroBr(n, 0));

  if (erro && !painel) {
    return (
      <Tela abas aoAtualizar={aoAtualizar} atualizando={atualizando}>
        <CabecalhoGrande rotulo="Administração" titulo="Painel" />
        <EstadoErro mensagem={erro} aoTentarNovamente={recarregar} />
      </Tela>
    );
  }

  const kpis: { chave: string; rotulo: string; valor: number | undefined; icone: string; aoPressionar?: () => void }[] = [
    { chave: 'alunos', rotulo: 'Alunos', valor: totais?.alunos, icone: 'people-outline', aoPressionar: () => router.navigate('/admin/alunos' as Href) },
    { chave: 'ativos', rotulo: 'Ativos', valor: totais?.ativos, icone: 'checkmark-circle-outline' },
    { chave: 'inativos', rotulo: 'Inativos', valor: totais?.inativos, icone: 'remove-circle-outline' },
    { chave: 'pendentes', rotulo: 'Cadastros pendentes', valor: totais?.pendentes, icone: 'hourglass-outline' },
    { chave: 'vencidos', rotulo: 'Matrículas vencidas', valor: totais?.vencidos, icone: 'close-circle-outline' },
    { chave: 'vencendo', rotulo: 'Vencendo em breve', valor: totais?.vencendo, icone: 'time-outline' },
    { chave: 'inadimplentes', rotulo: 'Inadimplentes', valor: totais?.inadimplentes, icone: 'alert-circle-outline', aoPressionar: () => router.navigate('/admin/financeiro' as Href) },
    { chave: 'professores', rotulo: 'Professores', valor: totais?.professores, icone: 'barbell-outline', aoPressionar: () => router.navigate('/admin/professores' as Href) },
    { chave: 'recepcionistas', rotulo: 'Recepção', valor: totais?.recepcionistas, icone: 'desktop-outline', aoPressionar: () => router.navigate('/admin/professores?aba=recepcao' as Href) },
  ];

  return (
    <Tela abas aoAtualizar={aoAtualizar} atualizando={atualizando} testID="painel-admin">
      <ConteudoLargo>
        <CabecalhoGrande rotulo={rotuloData()} titulo="Painel" />

        {erro ? <Text style={estilos.aviso}>Não foi possível atualizar: {erro}</Text> : null}

        <Grade colunas={colunasKpi} espaco={12} testID="painel-kpis">
          {kpis.map((kpi) => (
            <Indicador
              key={kpi.chave}
              rotulo={kpi.rotulo}
              valor={formatar(kpi.valor)}
              icone={kpi.icone as never}
              carregando={semDados}
              aoPressionar={kpi.aoPressionar}
              testID={`kpi-${kpi.chave}`}
            />
          ))}
        </Grade>

        <TituloSecao titulo="Matrículas do mês" />
        <Grade colunas={ehMedio ? 3 : 1} espaco={12}>
          <Indicador rotulo="Novas" valor={formatar(painel?.matriculas.novas_mes)} carregando={semDados} testID="matriculas-novas" />
          <Indicador rotulo="Renovações" valor={formatar(painel?.matriculas.renovacoes_mes)} carregando={semDados} testID="matriculas-renovacoes" />
          <Indicador rotulo="Cancelamentos" valor={formatar(painel?.matriculas.cancelamentos_mes)} carregando={semDados} testID="matriculas-cancelamentos" />
        </Grade>

        <TituloSecao titulo="Crescimento e frequência" />
        <Grade colunas={colunasGraficos} espaco={16}>
          <SecaoAdmin
            titulo="Cadastros por mês"
            subtitulo="Alunos cadastrados em cada mês (últimos 12)"
            carregando={semDados}
            testID="grafico-cadastros"
          >
            {graficos ? (
              <View style={estilos.grafico}>
                <GraficoBarras
                  dados={mesCurto(graficos.cadastros.barras, !ehMedio)}
                  rotulo="Cadastros por mês"
                  mensagemVazio="Nenhum cadastro nos últimos 12 meses."
                  testID="barras-cadastros"
                />
                {graficos.cadastros.semData > 0 ? (
                  <Text style={estilos.nota} testID="cadastros-sem-data">
                    + {pluralizar(graficos.cadastros.semData, 'cadastro')} sem data de criação (não entram nos meses acima).
                  </Text>
                ) : null}
              </View>
            ) : null}
          </SecaoAdmin>

          <SecaoAdmin
            titulo="Entradas por mês"
            subtitulo={graficos ? `${formatarNumeroBr(graficos.frequencia.totalEntradas, 0)} entradas liberadas no período` : 'Entradas liberadas'}
            carregando={semDados}
            testID="grafico-entradas"
          >
            {graficos ? (
              <GraficoBarras
                dados={mesCurto(graficos.frequencia.entradas, !ehMedio)}
                rotulo="Entradas liberadas por mês"
                mensagemVazio="Nenhuma entrada registrada."
                testID="barras-entradas"
              />
            ) : null}
          </SecaoAdmin>

          <SecaoAdmin
            titulo="Alunos distintos por mês"
            subtitulo="Quantas pessoas diferentes frequentaram em cada mês"
            carregando={semDados}
            testID="grafico-distintos"
          >
            {graficos ? (
              <GraficoLinha
                pontos={graficos.frequencia.alunosDistintos}
                rotulo="Alunos distintos"
                unidade="alunos"
                mensagemVazio="Nenhuma entrada registrada."
                embutido
                formatarRotulo={rotuloMesDaData}
                testID="linha-distintos"
              />
            ) : null}
          </SecaoAdmin>

          <SecaoAdmin
            titulo="Ativos × inativos"
            subtitulo="Alunos aprovados com e sem matrícula vigente"
            carregando={semDados}
            testID="grafico-ativos-inativos"
          >
            {graficos ? (
              <GraficoBarras
                dados={graficos.ativosInativos}
                rotulo="Ativos e inativos"
                orientacao="horizontal"
                testID="barras-ativos-inativos"
              />
            ) : null}
          </SecaoAdmin>
        </Grade>

        <TituloSecao titulo="Distribuição dos alunos" />
        <Grade colunas={colunasGraficos} espaco={16}>
          <SecaoAdmin titulo="Alunos por plano" subtitulo="Matrículas ativas em cada plano" carregando={semDados} testID="grafico-por-plano">
            {graficos ? (
              <GraficoBarras
                dados={graficos.porPlano}
                rotulo="Alunos por plano"
                orientacao="horizontal"
                mensagemVazio="Nenhuma matrícula ativa."
                testID="barras-por-plano"
              />
            ) : null}
          </SecaoAdmin>
          <SecaoAdmin titulo="Alunos por professor" subtitulo="Professor responsável" carregando={semDados} testID="grafico-por-professor">
            {graficos ? (
              <GraficoBarras
                dados={graficos.porProfessor}
                rotulo="Alunos por professor"
                orientacao="horizontal"
                mensagemVazio="Nenhum aluno com professor."
                testID="barras-por-professor"
              />
            ) : null}
          </SecaoAdmin>
        </Grade>

        <TituloSecao titulo="Alunos recentes" acao={{ rotulo: 'VER TODOS', onPress: () => router.navigate('/admin/alunos' as Href) }} />
        <SecaoAdmin titulo="Últimos cadastros" carregando={semDados} vazio={painel && painel.alunos_recentes.length === 0 ? 'Nenhum aluno cadastrado ainda.' : null} testID="alunos-recentes">
          {painel?.alunos_recentes.map((aluno) => (
            <LinhaLista
              key={aluno.id}
              titulo={aluno.nome}
              subtitulo={aluno.criado_em ? `Cadastrado em ${formatarData(aluno.criado_em)}` : 'Cadastro sem data'}
              thumbUri={aluno.foto ?? undefined}
              icone={aluno.foto ? undefined : 'person-outline'}
              onPress={() => abrirAluno(aluno.id)}
              testID={`aluno-recente-${aluno.id}`}
            />
          ))}
        </SecaoAdmin>
        <View style={estilos.fim} />
      </ConteudoLargo>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  grafico: { gap: espacamento.sm },
  nota: { ...tipografia.legenda, color: cores.textoSecundario },
  aviso: { ...tipografia.legenda, color: cores.aviso, marginBottom: espacamento.sm },
  fim: { height: espacamento.xxl },
});
