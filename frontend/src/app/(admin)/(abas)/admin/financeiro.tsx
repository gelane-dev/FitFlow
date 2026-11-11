import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { LinkAluno } from '@/components/admin/LinkAluno';
import { SecaoAdmin } from '@/components/admin/SecaoAdmin';
import { DialogoPagamento } from '@/components/gestao/DialogoPagamento';
import { ListaPagamentosGestao } from '@/components/gestao/ListaPagamentosGestao';
import { Botao } from '@/components/ui/Botao';
import { CabecalhoGrande } from '@/components/ui/CabecalhoGrande';
import { Chip } from '@/components/ui/Chip';
import { ConteudoLargo, Grade } from '@/components/ui/ConteudoLargo';
import { EstadoErro } from '@/components/ui/EstadoErro';
import { GraficoBarras } from '@/components/ui/GraficoBarras';
import { Indicador } from '@/components/ui/Indicador';
import { Tela } from '@/components/ui/Tela';
import { TituloSecao } from '@/components/ui/TituloSecao';
import { useLarguraTela } from '@/components/ui/useLarguraTela';
import { POR_PAGINA_PAGAMENTOS, useAdminFinanceiro, useAdminPagamentos } from '@/hooks/useAdminFinanceiro';
import { useGestaoAcoesFinanceiras } from '@/hooks/useGestaoAcoesFinanceiras';
import { usePuxarParaAtualizar } from '@/hooks/usePuxarParaAtualizar';
import { useRecarregarNoFoco } from '@/hooks/useRecarregarNoFoco';
import { cores, espacamento, tipografia } from '@/theme';
import { PagamentoResposta, StatusPagamento } from '@/types/gestao.types';
import { formatarMoeda } from '@/utils/moeda';
import { formatarMoedaCompacta, periodoDoMes, rotuloPeriodo } from '@/utils/painelAdmin';

const FILTROS_STATUS: { valor: StatusPagamento; rotulo: string }[] = [
  { valor: 'pendente', rotulo: 'Pendentes' },
  { valor: 'pago', rotulo: 'Pagos' },
  { valor: 'estornado', rotulo: 'Estornados' },
  { valor: 'cancelado', rotulo: 'Cancelados' },
];

const moedaGrafico = (valor: number) => formatarMoeda(valor.toFixed(2));

/** Financeiro: período, totais, gráficos e lista de pagamentos com estorno. */
export default function FinanceiroAdmin() {
  const { ehMedio } = useLarguraTela();
  const fin = useAdminFinanceiro();
  const pagamentos = useAdminPagamentos(fin.periodo);
  const [estornando, setEstornando] = useState<PagamentoResposta | null>(null);

  const recarregar = async () => {
    await Promise.all([fin.recarregar(), pagamentos.recarregar()]);
  };

  const acoes = useGestaoAcoesFinanceiras(recarregar);

  useRecarregarNoFoco(recarregar);
  const { atualizando, aoAtualizar } = usePuxarParaAtualizar(recarregar);

  const semDados = !fin.financeiro && fin.carregando;
  const ehMesAtual = fin.periodo.inicio === periodoDoMes().inicio;
  const dados = fin.financeiro;

  return (
    <Tela abas aoAtualizar={aoAtualizar} atualizando={atualizando} testID="financeiro-admin">
      <ConteudoLargo>
        <CabecalhoGrande rotulo="Administração" titulo="Financeiro" />

        <View style={estilos.periodo} accessibilityRole="toolbar" accessibilityLabel="Período">
          <Botao variante="secundario" tamanho="medio" icone="chevron-back" larguraTotal={false} onPress={() => fin.mudarMes(-1)} accessibilityLabel="Mês anterior" testID="periodo-anterior">
            {''}
          </Botao>
          <Text style={estilos.periodoTexto} testID="periodo-rotulo" accessibilityLiveRegion="polite">
            {rotuloPeriodo(fin.periodo)}
          </Text>
          <Botao variante="secundario" tamanho="medio" icone="chevron-forward" larguraTotal={false} onPress={() => fin.mudarMes(1)} accessibilityLabel="Próximo mês" testID="periodo-proximo">
            {''}
          </Botao>
          {!ehMesAtual ? (
            <Botao variante="fantasma" tamanho="medio" larguraTotal={false} onPress={fin.voltarAoMesAtual} testID="periodo-atual">
              Mês atual
            </Botao>
          ) : null}
        </View>

        {fin.erro && !dados ? (
          <EstadoErro mensagem={fin.erro} aoTentarNovamente={fin.recarregar} />
        ) : (
          <>
            <Grade colunas={ehMedio ? 4 : 2} espaco={12}>
              <Indicador rotulo="Recebido no período" valor={formatarMoeda(dados?.recebido_periodo)} icone="cash-outline" carregando={semDados} testID="fin-recebido" />
              <Indicador rotulo="Pendente (total)" valor={formatarMoeda(dados?.pendente_total)} icone="time-outline" carregando={semDados} testID="fin-pendente" />
              <Indicador rotulo="Vencido (total)" valor={formatarMoeda(dados?.vencido_total)} icone="alert-circle-outline" carregando={semDados} testID="fin-vencido" />
              <Indicador
                rotulo="Inadimplentes"
                valor={dados ? String(dados.inadimplentes) : '—'}
                icone="people-outline"
                carregando={semDados}
                aoPressionar={() => pagamentos.definirFiltros({ somenteInadimplentes: true, status: null })}
                testID="fin-inadimplentes"
              />
            </Grade>

            <Grade colunas={ehMedio ? 2 : 1} espaco={16}>
              <SecaoAdmin titulo="Recebido por mês" subtitulo="Valores recebidos nos últimos 12 meses (R$)" carregando={semDados} testID="grafico-recebido-mes">
                {fin.graficos ? (
                  <GraficoBarras
                    dados={fin.graficos.porMes}
                    rotulo="Recebido por mês"
                    orientacao={ehMedio ? 'vertical' : 'horizontal'}
                    formatarValor={ehMedio ? formatarMoedaCompacta : moedaGrafico}
                    mensagemVazio="Nenhum recebimento no período." testID="barras-recebido-mes" />
                ) : null}
              </SecaoAdmin>
              <SecaoAdmin titulo="Recebido por forma" subtitulo="No período selecionado (R$)" carregando={semDados} testID="grafico-recebido-forma">
                {fin.graficos ? (
                  <GraficoBarras
                    dados={fin.graficos.porForma}
                    rotulo="Recebido por forma de pagamento"
                    orientacao="horizontal"
                    formatarValor={moedaGrafico}
                    mensagemVazio="Nenhum recebimento no período."
                    testID="barras-recebido-forma"
                  />
                ) : null}
              </SecaoAdmin>
            </Grade>
          </>
        )}

        <TituloSecao titulo="Pagamentos do período" />
        <View style={estilos.filtros}>
          {FILTROS_STATUS.map((f) => (
            <Chip
              key={f.valor}
              rotulo={f.rotulo}
              selecionado={pagamentos.filtros.status === f.valor}
              onPress={() =>
                pagamentos.definirFiltros({
                  status: pagamentos.filtros.status === f.valor ? null : f.valor,
                  somenteInadimplentes: false,
                })
              }
            />
          ))}
          <Chip
            rotulo="Inadimplentes"
            icone="alert-circle-outline"
            selecionado={pagamentos.filtros.somenteInadimplentes}
            onPress={() => pagamentos.definirFiltros({ somenteInadimplentes: !pagamentos.filtros.somenteInadimplentes, status: null })}
          />
        </View>

        <ListaPagamentosGestao
          pagamentos={pagamentos.pagamentos}
          carregando={pagamentos.carregando && pagamentos.pagamentos.length === 0}
          erro={pagamentos.erro}
          aoTentarNovamente={pagamentos.recarregar}
          renderAluno={(p) => <LinkAluno id={p.aluno.id} nome={p.aluno.nome} />}
          colunaDescricao
          tituloStatus="Situação"
          mostrarMotivoEstorno
          alinhamentoAcoes="direita"
          renderAcoes={(p) =>
            p.status === 'pago' ? (
              <Botao
                variante="perigo"
                tamanho="medio"
                icone="return-up-back"
                larguraTotal={false}
                onPress={() => setEstornando(p)}
                accessibilityLabel={`Estornar pagamento de ${p.aluno.nome}`}
                testID={`estornar-${p.id}`}
              >
                Estornar
              </Botao>
            ) : null
          }
          vazio={{ titulo: 'Nenhum pagamento encontrado', descricao: 'Não há pagamentos neste período com os filtros escolhidos.' }}
          total={pagamentos.total}
          tamanhoPagina={POR_PAGINA_PAGAMENTOS}
          pagina={pagamentos.filtros.pagina}
          aoMudarPagina={pagamentos.mudarPagina}
        />
      </ConteudoLargo>

      <DialogoPagamento
        visivel={estornando !== null}
        modo="estornar"
        pagamento={estornando}
        aoFechar={() => setEstornando(null)}
        aoConfirmar={async (resultado) => {
          const erro = await acoes.executarPagamento(resultado, estornando?.id);

          if (!erro) setEstornando(null);

          return erro;
        }}
      />
    </Tela>
  );
}

const estilos = StyleSheet.create({
  periodo: { flexDirection: 'row', alignItems: 'center', gap: espacamento.sm, marginBottom: espacamento.lg },
  periodoTexto: { ...tipografia.subtitulo, color: cores.texto, minWidth: 96, textAlign: 'center', textTransform: 'capitalize' },
  filtros: { flexDirection: 'row', flexWrap: 'wrap', gap: espacamento.sm, marginBottom: espacamento.md },
  situacao: { gap: 4 },
  motivo: { ...tipografia.legenda, color: cores.textoSecundario },
});
