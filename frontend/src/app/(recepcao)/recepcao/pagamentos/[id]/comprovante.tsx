import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { Botao } from '@/components/ui/Botao';
import { CabecalhoDetalhe } from '@/components/ui/CabecalhoDetalhe';
import { Cartao } from '@/components/ui/Cartao';
import { ConteudoLargo } from '@/components/ui/ConteudoLargo';
import { EstadoErro } from '@/components/ui/EstadoErro';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tela } from '@/components/ui/Tela';
import { useRecepcaoComprovante } from '@/hooks/useRecepcaoPagamentos';
import { cores } from '@/theme';
import { formatarData } from '@/utils/datas';
import { horaDaApi } from '@/utils/gestaoRecepcao';
import { formatarMoeda } from '@/utils/moeda';
import { paramTexto } from '@/utils/params';
import { formaPagamento } from '@/utils/situacao';

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View style={estilos.linha}>
      <Text style={estilos.rotulo}>{rotulo}</Text>
      <Text style={estilos.valor}>{valor}</Text>
    </View>
  );
}

/** Comprovante interno (não é documento fiscal). Na web, "Imprimir" abre a impressão do navegador. */
export default function ComprovantePagamento() {
  const { id: idParam } = useLocalSearchParams();
  const id = Number(paramTexto(idParam));
  const { dados, carregando, erro, recarregar } = useRecepcaoComprovante(id);

  // Na web, esconde a barra lateral e os botões na impressão (layout limpo).
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return undefined;

    const estilo = document.createElement('style');

    estilo.setAttribute('data-comprovante-impressao', 'true');
    estilo.textContent =
      '@media print { [data-testid="barra-lateral"], [data-testid="botao-voltar"], [data-testid="comprovante-imprimir"] { display: none !important; } }';
    document.head.appendChild(estilo);

    return () => {
      estilo.remove();
    };
  }, []);

  function imprimir() {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.print();
    }
  }

  return (
    <Tela testID="tela-comprovante">
      <CabecalhoDetalhe titulo="Comprovante" />

      <ConteudoLargo larguraMaxima={560}>
        {carregando && !dados ? (
          <Skeleton altura={320} raio={18} />
        ) : erro ? (
          <EstadoErro mensagem={erro} aoTentarNovamente={recarregar} />
        ) : dados ? (
          <>
            <Cartao testID="comprovante">
              <Text style={estilos.academia}>{dados.academia.nome}</Text>
              {dados.academia.endereco ? <Text style={estilos.sub}>{dados.academia.endereco}</Text> : null}
              {dados.academia.telefone ? <Text style={estilos.sub}>{dados.academia.telefone}</Text> : null}

              <Text style={estilos.titulo}>COMPROVANTE DE PAGAMENTO Nº {dados.numero}</Text>

              <Linha rotulo="Aluno" valor={dados.aluno.nome} />
              <Linha rotulo="Descrição" valor={dados.descricao} />
              <Linha rotulo="Valor" valor={formatarMoeda(dados.valor)} />
              <Linha rotulo="Valor recebido" valor={formatarMoeda(dados.valor_recebido)} />
              <Linha rotulo="Forma" valor={dados.forma ? formaPagamento(dados.forma).rotulo : '—'} />
              <Linha
                rotulo="Pago em"
                valor={dados.pago_em ? `${formatarData(dados.pago_em)} ${horaDaApi(dados.pago_em)}` : '—'}
              />
              <Linha rotulo="Registrado por" valor={dados.registrado_por ?? '—'} />

              <Text style={estilos.rodape}>Comprovante interno, sem valor fiscal.</Text>
            </Cartao>

            {Platform.OS === 'web' ? (
              <View style={estilos.imprimir}>
                <Botao icone="print-outline" onPress={imprimir} testID="comprovante-imprimir">
                  Imprimir
                </Botao>
              </View>
            ) : null}
          </>
        ) : null}
      </ConteudoLargo>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  academia: { color: cores.texto, fontSize: 22, fontWeight: '800', textAlign: 'center' },
  sub: { color: cores.textoSecundario, fontSize: 13, textAlign: 'center' },
  titulo: {
    color: cores.primaria,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
    textAlign: 'center',
    marginVertical: 20,
  },
  linha: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, paddingVertical: 8 },
  rotulo: { color: cores.textoSecundario, fontSize: 14 },
  valor: { color: cores.texto, fontSize: 14, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  rodape: { color: cores.textoTerciario, fontSize: 12, textAlign: 'center', marginTop: 20 },
  imprimir: { marginTop: 20 },
});
