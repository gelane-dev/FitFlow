import { StyleSheet, Text, View } from 'react-native';

import { Botao } from '@/components/ui/Botao';
import { Cartao } from '@/components/ui/Cartao';
import { cores } from '@/theme';
import type { MatriculaResposta, PermissaoRecepcao } from '@/types/gestao.types';
import { formatarData } from '@/utils/datas';
import { temPermissao } from '@/utils/gestaoRecepcao';
import { formatarMoeda } from '@/utils/moeda';
import { situacaoMatricula } from '@/utils/situacao';

import { SeloSituacao } from '@/components/ui/SeloSituacao';

export interface CartaoMatriculaProps {
  /** Matrícula ativa do aluno; `null` = sem matrícula. */
  matricula: MatriculaResposta | null;
  permissoes: readonly PermissaoRecepcao[];
  /** O aluno pode ser matriculado (aprovado e conta ativa). Padrão: sim. */
  podeMatricular?: boolean;
  aoMatricular?: () => void;
  aoRenovar?: () => void;
  aoAlterarPlano?: () => void;
  aoCancelar?: () => void;
  testID?: string;
}

/** Matrícula atual do aluno e as ações disponíveis para as permissões informadas. Admin passa todas as permissões. */
export function CartaoMatricula({
  matricula,
  permissoes,
  podeMatricular = true,
  aoMatricular,
  aoRenovar,
  aoAlterarPlano,
  aoCancelar,
  testID = 'cartao-matricula',
}: CartaoMatriculaProps) {
  const pode = (p: PermissaoRecepcao) => temPermissao(permissoes, p);

  return (
    <Cartao testID={testID}>
      {matricula ? (
        <View style={estilos.corpo}>
          <View style={estilos.linha}>
            <Text style={estilos.plano}>{matricula.plano.nome}</Text>
            <SeloSituacao info={situacaoMatricula(matricula.situacao)} testID={`${testID}-situacao`} />
          </View>
          <Text style={estilos.detalhe}>
            {formatarData(matricula.data_inicio)} a {formatarData(matricula.data_vencimento)} ·{' '}
            {formatarMoeda(matricula.valor)}
          </Text>

          <View style={estilos.acoes}>
            {pode('renovar_matricula') && aoRenovar ? (
              <Botao tamanho="medio" larguraTotal={false} icone="refresh" onPress={aoRenovar} testID="matricula-renovar">
                Renovar
              </Botao>
            ) : null}
            {pode('alterar_plano') && aoAlterarPlano ? (
              <Botao
                tamanho="medio"
                larguraTotal={false}
                variante="secundario"
                icone="swap-horizontal"
                onPress={aoAlterarPlano}
                testID="matricula-alterar"
              >
                Alterar plano
              </Botao>
            ) : null}
            {pode('cancelar_matricula') && aoCancelar ? (
              <Botao tamanho="medio" larguraTotal={false} variante="perigo" onPress={aoCancelar} testID="matricula-cancelar">
                Cancelar matrícula
              </Botao>
            ) : null}
          </View>
        </View>
      ) : (
        <View style={estilos.corpo}>
          <Text style={estilos.vazio}>Sem matrícula ativa.</Text>
          {pode('matricular') && podeMatricular && aoMatricular ? (
            <Botao tamanho="medio" larguraTotal={false} icone="add" onPress={aoMatricular} testID="matricula-nova">
              Matricular
            </Botao>
          ) : null}
          {!podeMatricular ? (
            <Text style={estilos.detalhe}>O aluno precisa estar com cadastro aprovado e conta ativa para ser matriculado.</Text>
          ) : null}
        </View>
      )}
    </Cartao>
  );
}

const estilos = StyleSheet.create({
  corpo: { gap: 10 },
  linha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  plano: { color: cores.texto, fontSize: 18, fontWeight: '700' },
  detalhe: { color: cores.textoSecundario, fontSize: 14 },
  vazio: { color: cores.textoSecundario, fontSize: 15 },
  acoes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
});
