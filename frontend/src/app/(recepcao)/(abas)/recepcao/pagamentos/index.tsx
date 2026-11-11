import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { DialogoPagamento } from '@/components/gestao/DialogoPagamento';
import { ListaPagamentosGestao } from '@/components/gestao/ListaPagamentosGestao';
import { Botao } from '@/components/ui/Botao';
import { CabecalhoGrande } from '@/components/ui/CabecalhoGrande';
import { Chip } from '@/components/ui/Chip';
import { CampoData } from '@/components/ui/CampoData';
import { ConteudoLargo, Grade } from '@/components/ui/ConteudoLargo';
import { Tela } from '@/components/ui/Tela';
import { useGestaoAcoesFinanceiras } from '@/hooks/useGestaoAcoesFinanceiras';
import { useRecarregarNoFoco } from '@/hooks/useRecarregarNoFoco';
import { FiltroPagamento, POR_PAGINA_PAGAMENTOS, useRecepcaoPagamentos } from '@/hooks/useRecepcaoPagamentos';
import { useRecepcaoPermissoes } from '@/hooks/useRecepcaoPermissoes';
import { cores } from '@/theme';
import type { PagamentoResposta } from '@/types/gestao.types';
import { useState } from 'react';

const CHIPS = [
  { valor: 'pendente', rotulo: 'Pendentes' },
  { valor: 'pago', rotulo: 'Pagos' },
  { valor: 'inadimplentes', rotulo: 'Inadimplentes' },
  { valor: 'estornado', rotulo: 'Estornados' },
];

export default function PagamentosRecepcao() {
  const lista = useRecepcaoPagamentos();
  const { pode } = useRecepcaoPermissoes();
  const acoes = useGestaoAcoesFinanceiras(lista.recarregar);
  const [receber, setReceber] = useState<PagamentoResposta | null>(null);

  useRecarregarNoFoco(lista.recarregar);

  const podeReceber = pode('registrar_pagamento');

  const renderAcoes = (p: PagamentoResposta) => (
    <View style={estilos.acoes}>
      {p.status === 'pendente' && podeReceber ? (
        <Botao tamanho="pequeno" larguraTotal={false} icone="cash-outline" onPress={() => setReceber(p)} testID={`pagamento-${p.id}-receber`}>
          Receber
        </Botao>
      ) : null}
      {p.status === 'pago' || p.status === 'estornado' ? (
        <Botao
          tamanho="pequeno"
          larguraTotal={false}
          variante="secundario"
          icone="receipt-outline"
          onPress={() => router.push(`/recepcao/pagamentos/${p.id}/comprovante` as never)}
          testID={`pagamento-${p.id}-comprovante`}
        >
          Comprovante
        </Botao>
      ) : null}
    </View>
  );

  return (
    <Tela abas aoAtualizar={lista.recarregar} testID="tela-pagamentos">
      <CabecalhoGrande rotulo="Financeiro" titulo="Pagamentos" />

      <ConteudoLargo>
        <View style={estilos.chips} testID="filtros-pagamentos">
          {CHIPS.map((c) => (
            <Chip
              key={c.valor}
              rotulo={c.rotulo}
              selecionado={lista.filtro === c.valor}
              onPress={() => lista.setFiltro(lista.filtro === c.valor ? null : (c.valor as FiltroPagamento))}
              testID={`filtro-chip-${c.valor}`}
            />
          ))}
        </View>

        <Grade colunas={2} espaco={12}>
          <CampoData rotulo="De" value={lista.inicio} onChangeData={(t) => lista.setInicio(t)} testID="filtro-inicio" />
          <CampoData
            rotulo="Até"
            value={lista.fim}
            onChangeData={(t) => lista.setFim(t)}
            erro={lista.periodoInvalido ? 'A data final deve ser depois da inicial.' : null}
            testID="filtro-fim"
          />
        </Grade>

        <ListaPagamentosGestao
          pagamentos={lista.pagamentos}
          carregando={lista.carregando}
          erro={lista.erro}
          aoTentarNovamente={lista.recarregar}
          renderAluno={(p) => (
            <View>
              <Text style={estilos.nome}>{p.aluno.nome}</Text>
              <Text style={estilos.sub}>{p.descricao}</Text>
            </View>
          )}
          renderAcoes={renderAcoes}
          vazio={{ titulo: 'Nenhum pagamento encontrado', descricao: 'Ajuste os filtros.' }}
          total={lista.total}
          tamanhoPagina={POR_PAGINA_PAGAMENTOS}
          pagina={lista.pagina}
          aoMudarPagina={lista.setPagina}
        />
      </ConteudoLargo>

      <DialogoPagamento
        visivel={receber !== null}
        modo="registrar"
        pagamento={receber}
        aoFechar={() => setReceber(null)}
        aoConfirmar={(resultado) => acoes.executarPagamento(resultado, receber?.id)}
      />
    </Tela>
  );
}

const estilos = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  nome: { color: cores.texto, fontSize: 15, fontWeight: '600' },
  sub: { color: cores.textoSecundario, fontSize: 12 },
  acoes: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
});
