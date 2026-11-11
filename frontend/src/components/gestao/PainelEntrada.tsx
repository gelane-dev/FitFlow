import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Botao } from '@/components/ui/Botao';
import { EstadoErroSecao } from '@/components/ui/EstadoErroSecao';
import { Skeleton } from '@/components/ui/Skeleton';
import { cores } from '@/theme';
import type { AcessoResposta, AcessoVerificacao, PermissaoRecepcao } from '@/types/gestao.types';
import { mostrarAlerta } from '@/utils/alerta';
import { formatarData } from '@/utils/datas';
import { horaDaApi, temPermissao } from '@/utils/gestaoRecepcao';
import { formatarMoeda } from '@/utils/moeda';
import { motivoBloqueio, situacaoMatricula } from '@/utils/situacao';

import { HistoricoEntradas } from './HistoricoEntradas';
import { SeloSituacao } from '@/components/ui/SeloSituacao';

export interface PainelEntradaProps {
  verificacao: AcessoVerificacao | null;
  carregando?: boolean;
  erro?: string | null;
  aoTentarNovamente?: () => void;
  permissoes: readonly PermissaoRecepcao[];
  /** Resultado do POST /acessos já feito para este aluno. */
  registro?: AcessoResposta | null;
  registrando?: boolean;
  erroRegistro?: string | null;
  /** `forcar=true` só chega aqui depois da confirmação. */
  aoRegistrar: (forcar: boolean) => void;
  aoProximo?: () => void;
  testID?: string;
}

/**
 * Resultado grande e inequívoco da verificação de entrada: LIBERADO ou BLOQUEADO (cor + ícone + texto),
 * foto, plano, vencimento, pendências e últimas entradas. Bloqueado lista os motivos; "Liberar mesmo
 * assim" só aparece com `liberar_acesso_manual` e pede confirmação. O servidor reavalia tudo.
 */
export function PainelEntrada({
  verificacao,
  carregando,
  erro,
  aoTentarNovamente,
  permissoes,
  registro,
  registrando,
  erroRegistro,
  aoRegistrar,
  aoProximo,
  testID = 'painel-entrada',
}: PainelEntradaProps) {
  if (carregando && !verificacao) {
    return (
      <View style={estilos.carregando} testID={`${testID}-carregando`}>
        <Skeleton altura={160} raio={18} />
      </View>
    );
  }

  if (erro) {
    return <EstadoErroSecao mensagem={erro} aoTentarNovamente={aoTentarNovamente} testID={`${testID}-erro`} />;
  }

  if (!verificacao) return null;

  const liberado = verificacao.autorizado;
  const cor = liberado ? cores.sucesso : cores.perigo;
  const podeRegistrar = temPermissao(permissoes, 'registrar_acesso');
  const podeForcar = temPermissao(permissoes, 'liberar_acesso_manual');
  const { aluno, matricula, pendencias } = verificacao;

  function confirmarLiberacao() {
    mostrarAlerta(
      'Liberar mesmo assim',
      `${aluno.nome} está bloqueado. A liberação manual fica registrada no histórico e na auditoria. Liberar a entrada?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Liberar entrada', style: 'destructive', onPress: () => aoRegistrar(true) },
      ]
    );
  }

  return (
    <View testID={testID}>
      <View
        style={[estilos.resultado, { borderColor: cor }]}
        accessibilityRole="alert"
        accessibilityLabel={liberado ? `Entrada liberada para ${aluno.nome}` : `Entrada bloqueada para ${aluno.nome}`}
        testID={liberado ? 'entrada-liberado' : 'entrada-bloqueado'}
      >
        <Ionicons name={liberado ? 'checkmark-circle' : 'close-circle'} size={72} color={cor} />
        <Text style={[estilos.veredito, { color: cor }]} testID="entrada-veredito">
          {liberado ? 'LIBERADO' : 'BLOQUEADO'}
        </Text>
        <Avatar uri={aluno.foto} nome={aluno.nome} tamanho={88} />
        <Text style={estilos.nome} testID="entrada-aluno-nome">
          {aluno.nome}
        </Text>

        {matricula ? (
          <View style={estilos.linhaInfo}>
            <Text style={estilos.info}>
              {matricula.plano} · vence em {formatarData(matricula.data_vencimento)}
            </Text>
            <SeloSituacao info={situacaoMatricula(matricula.situacao)} />
          </View>
        ) : (
          <Text style={estilos.info}>Sem matrícula ativa</Text>
        )}

        {pendencias.quantidade > 0 ? (
          <View style={estilos.pendencia} testID="entrada-pendencias">
            <Ionicons name="cash" size={18} color={cores.aviso} />
            <Text style={estilos.pendenciaTexto}>
              {pendencias.quantidade} pagamento(s) pendente(s) · {formatarMoeda(pendencias.valor_total)}
            </Text>
          </View>
        ) : null}

        {!liberado ? (
          <View style={estilos.motivos} testID="entrada-motivos">
            {verificacao.motivos.map((m) => (
              <View key={m.codigo} style={estilos.motivo}>
                <Ionicons name={motivoBloqueio(m.codigo).icone} size={18} color={cores.perigo} />
                <Text style={estilos.motivoTexto}>{m.mensagem}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      {registro ? (
        <View style={estilos.registro} testID="entrada-registro" accessibilityRole="alert">
          <Ionicons
            name={registro.resultado === 'liberado' ? 'checkmark-circle' : 'close-circle'}
            size={22}
            color={registro.resultado === 'liberado' ? cores.sucesso : cores.perigo}
          />
          <Text style={estilos.registroTexto}>
            {registro.resultado === 'liberado'
              ? `Entrada registrada às ${horaDaApi(registro.data_hora)}${registro.liberacao_manual ? ' (liberação manual)' : ''}.`
              : `Tentativa bloqueada registrada às ${horaDaApi(registro.data_hora)}.`}
          </Text>
        </View>
      ) : null}

      {erroRegistro ? (
        <Text style={estilos.erro} accessibilityRole="alert" testID="entrada-erro-registro">
          {erroRegistro}
        </Text>
      ) : null}

      <View style={estilos.acoes}>
        {!registro && podeRegistrar ? (
          <Botao
            tamanho="grande"
            variante={liberado ? 'primario' : 'secundario'}
            icone={liberado ? 'enter' : 'document-text-outline'}
            carregando={registrando}
            onPress={() => aoRegistrar(false)}
            testID="entrada-registrar"
          >
            {liberado ? 'REGISTRAR ENTRADA' : 'REGISTRAR TENTATIVA BLOQUEADA'}
          </Botao>
        ) : null}

        {!registro && !liberado && podeForcar ? (
          <Botao
            tamanho="grande"
            variante="perigo"
            icone="lock-open-outline"
            disabled={registrando}
            onPress={confirmarLiberacao}
            testID="entrada-liberar-mesmo-assim"
          >
            LIBERAR MESMO ASSIM
          </Botao>
        ) : null}

        {!registro && !podeRegistrar ? (
          <Text style={estilos.semPermissao} testID="entrada-sem-permissao">
            Seu perfil não tem permissão para registrar entradas.
          </Text>
        ) : null}

        {aoProximo ? (
          <Botao
            tamanho="medio"
            variante={registro ? 'primario' : 'fantasma'}
            onPress={aoProximo}
            testID="entrada-proximo"
          >
            {registro ? 'PRÓXIMO ALUNO' : 'Limpar'}
          </Botao>
        ) : null}
      </View>

      <Text style={estilos.titulo}>ÚLTIMAS ENTRADAS</Text>
      <HistoricoEntradas
        acessos={verificacao.ultimas_entradas}
        mostrarData
        textoVazio="Sem entradas anteriores"
        testID="entrada-ultimas"
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  carregando: { marginVertical: 16 },
  resultado: {
    alignItems: 'center',
    gap: 10,
    borderWidth: 3,
    borderRadius: 18,
    backgroundColor: cores.superficie,
    padding: 24,
  },
  veredito: { fontSize: 40, fontWeight: '900', letterSpacing: 2 },
  nome: { color: cores.texto, fontSize: 24, fontWeight: '700', textAlign: 'center' },
  linhaInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  info: { color: cores.textoSecundario, fontSize: 15, textAlign: 'center' },
  pendencia: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pendenciaTexto: { color: cores.aviso, fontSize: 14, fontWeight: '600' },
  motivos: { alignSelf: 'stretch', gap: 8, marginTop: 8 },
  motivo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: cores.superficieElevada,
    borderRadius: 10,
    padding: 12,
  },
  motivoTexto: { color: cores.texto, fontSize: 15, flex: 1 },
  registro: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  registroTexto: { color: cores.texto, fontSize: 15, flex: 1 },
  erro: { color: cores.perigo, fontSize: 14, marginTop: 12 },
  acoes: { gap: 12, marginTop: 16 },
  semPermissao: { color: cores.textoSecundario, fontSize: 14, textAlign: 'center' },
  titulo: { color: cores.textoSecundario, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginTop: 32 },
});
