import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CampoInterruptor } from '@/components/admin/CampoInterruptor';
import { SecaoAdmin } from '@/components/admin/SecaoAdmin';
import { Botao } from '@/components/ui/Botao';
import { CabecalhoDetalhe } from '@/components/ui/CabecalhoDetalhe';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { ConteudoLargo } from '@/components/ui/ConteudoLargo';
import { EstadoErro } from '@/components/ui/EstadoErro';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tela } from '@/components/ui/Tela';
import { useAdminConfiguracao } from '@/hooks/useAdminConfiguracao';
import { usePuxarParaAtualizar } from '@/hooks/usePuxarParaAtualizar';
import { cores, espacamento, tipografia } from '@/theme';
import { mostrarAlerta } from '@/utils/alerta';
import {
  configuracaoAlterada,
  configuracaoParaEstado,
  ErrosConfiguracao,
  estadoParaPayload,
  EstadoConfiguracao,
  haErros,
  validarConfiguracao,
} from '@/utils/configuracaoAdmin';
import { formatarData } from '@/utils/datas';
import { DIAS_HORARIO, mascararHora } from '@/utils/horarios';

/** Configurações da academia: dados, horários, regras de acesso e parâmetros. */
export default function ConfiguracoesAdmin() {
  const { configuracao, carregando, erro, recarregar, processando, salvar } = useAdminConfiguracao();
  const { atualizando, aoAtualizar } = usePuxarParaAtualizar(recarregar);
  const [estado, setEstado] = useState<EstadoConfiguracao | null>(null);
  const [erros, setErros] = useState<ErrosConfiguracao>({});

  // Só preenche o formulário quando o servidor devolve dados novos (carga inicial e após salvar).
  useEffect(() => {
    if (configuracao) {
      setEstado(configuracaoParaEstado(configuracao));
      setErros({});
    }
  }, [configuracao]);

  if (!estado || !configuracao) {
    return (
      <Tela>
        <CabecalhoDetalhe titulo="Configurações" />
        {erro ? <EstadoErro mensagem={erro} aoTentarNovamente={recarregar} /> : <Skeleton altura={200} raio={18} />}
        {carregando ? null : null}
      </Tela>
    );
  }

  const alterada = configuracaoAlterada(estado, configuracao);
  const atualizar = (parcial: Partial<EstadoConfiguracao>) => setEstado((atual) => (atual ? { ...atual, ...parcial } : atual));

  function atualizarHorario(dia: string, parcial: Partial<EstadoConfiguracao['horarios'][number]>) {
    setEstado((atual) =>
      atual ? { ...atual, horarios: atual.horarios.map((h) => ((h.dia as string) === dia ? { ...h, ...parcial } : h)) } : atual
    );
  }

  async function aoSalvar() {
    if (!estado) return;

    const encontrados = validarConfiguracao(estado);

    setErros(encontrados);

    if (haErros(encontrados)) {
      mostrarAlerta('Revise os campos', 'Há campos com problema. Corrija os destacados e salve de novo.');

      return;
    }

    const resultado = await salvar(estadoParaPayload(estado));

    mostrarAlerta(resultado.ok ? 'Configurações salvas' : 'Não foi possível salvar', resultado.ok ? 'As alterações já valem para o sistema.' : resultado.erro);
  }

  return (
    <Tela
      aoAtualizar={aoAtualizar}
      atualizando={atualizando}
      teclado
      rodape={
        <Botao onPress={aoSalvar} disabled={!alterada} carregando={processando} testID="configuracao-salvar">
          {alterada ? 'Salvar alterações' : 'Nenhuma alteração'}
        </Botao>
      }
      testID="configuracoes-admin"
    >
      <ConteudoLargo larguraMaxima={760}>
        <CabecalhoDetalhe titulo="Configurações" />
        {erro ? <Text style={estilos.aviso}>Não foi possível atualizar: {erro}</Text> : null}
        {configuracao.atualizado_em ? (
          <Text style={estilos.nota}>Última alteração em {formatarData(configuracao.atualizado_em)}</Text>
        ) : null}

        <View style={estilos.secoes}>
          <SecaoAdmin titulo="Dados da academia">
            <CampoTexto rotulo="Nome" value={estado.nome} onChangeText={(nome) => atualizar({ nome })} erro={erros.nome} testID="config-nome" />
            <CampoTexto rotulo="Endereço" value={estado.endereco} onChangeText={(endereco) => atualizar({ endereco })} testID="config-endereco" />
            <CampoTexto rotulo="Telefone" value={estado.telefone} onChangeText={(telefone) => atualizar({ telefone })} keyboardType="phone-pad" testID="config-telefone" />
            <CampoTexto
              rotulo="E-mail de contato"
              value={estado.email}
              onChangeText={(email) => atualizar({ email })}
              erro={erros.email}
              keyboardType="email-address"
              autoCapitalize="none"
              testID="config-email"
            />
          </SecaoAdmin>

          <SecaoAdmin titulo="Horários de funcionamento" subtitulo="Marque os dias em que a academia abre e informe abertura e fechamento (HH:MM).">
            {estado.horarios.map((horario) => {
              const dia = horario.dia as string;
              const rotulo = DIAS_HORARIO.find((d) => d.valor === dia)?.rotulo ?? dia;

              return (
                <View key={dia} style={estilos.dia} testID={`horario-${dia}`}>
                  <CampoInterruptor
                    rotulo={rotulo}
                    descricao={horario.fechado ? 'Fechado' : 'Aberto'}
                    valor={!horario.fechado}
                    aoMudar={(aberto) => atualizarHorario(dia, { fechado: !aberto })}
                    testID={`horario-${dia}-aberto`}
                  />
                  {!horario.fechado ? (
                    <View style={estilos.horas}>
                      <View style={estilos.hora}>
                        <CampoTexto
                          rotulo="Abre"
                          value={horario.abre}
                          onChangeText={(texto) => atualizarHorario(dia, { abre: mascararHora(texto) })}
                          keyboardType="number-pad"
                          placeholder="06:00"
                          maxLength={5}
                          testID={`horario-${dia}-abre`}
                        />
                      </View>
                      <View style={estilos.hora}>
                        <CampoTexto
                          rotulo="Fecha"
                          value={horario.fecha}
                          onChangeText={(texto) => atualizarHorario(dia, { fecha: mascararHora(texto) })}
                          keyboardType="number-pad"
                          placeholder="22:00"
                          maxLength={5}
                          testID={`horario-${dia}-fecha`}
                        />
                      </View>
                    </View>
                  ) : null}
                  {erros.horarios?.[dia] ? <Text style={estilos.erro}>{erros.horarios[dia]}</Text> : null}
                </View>
              );
            })}
          </SecaoAdmin>

          <SecaoAdmin titulo="Regras de acesso" subtitulo="Como o controle de entrada decide bloquear um aluno.">
            <CampoTexto
              rotulo="Tolerância após o vencimento (dias)"
              value={estado.tolerancia}
              onChangeText={(tolerancia) => atualizar({ tolerancia: tolerancia.replace(/\D/g, '') })}
              erro={erros.tolerancia}
              keyboardType="number-pad"
              testID="config-tolerancia"
            />
            <CampoInterruptor
              rotulo="Bloquear entrada com pagamento pendente"
              descricao="Alunos com cobrança vencida e não paga não entram."
              valor={estado.bloquearPendencia}
              aoMudar={(bloquearPendencia) => atualizar({ bloquearPendencia })}
              testID="config-bloquear-pendencia"
            />
          </SecaoAdmin>

          <SecaoAdmin titulo="Parâmetros" subtitulo="Prazos usados nos alertas e nos painéis.">
            <CampoTexto
              rotulo="Avisar vencimento com antecedência (dias)"
              value={estado.diasAlerta}
              onChangeText={(diasAlerta) => atualizar({ diasAlerta: diasAlerta.replace(/\D/g, '') })}
              erro={erros.diasAlerta}
              keyboardType="number-pad"
              testID="config-dias-alerta"
            />
            <CampoTexto
              rotulo="Reavaliação física a cada (dias)"
              value={estado.diasReavaliacao}
              onChangeText={(diasReavaliacao) => atualizar({ diasReavaliacao: diasReavaliacao.replace(/\D/g, '') })}
              erro={erros.diasReavaliacao}
              keyboardType="number-pad"
              testID="config-dias-reavaliacao"
            />
            <CampoTexto
              rotulo="Atualizar o treino a cada (dias)"
              value={estado.diasAtualizarTreino}
              onChangeText={(diasAtualizarTreino) => atualizar({ diasAtualizarTreino: diasAtualizarTreino.replace(/\D/g, '') })}
              erro={erros.diasAtualizarTreino}
              keyboardType="number-pad"
              testID="config-dias-treino"
            />
          </SecaoAdmin>
        </View>
      </ConteudoLargo>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  secoes: { gap: espacamento.lg, paddingBottom: espacamento.xxl },
  aviso: { ...tipografia.legenda, color: cores.aviso, marginBottom: espacamento.sm },
  nota: { ...tipografia.legenda, color: cores.textoTerciario, marginBottom: espacamento.md },
  dia: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: cores.borda, paddingBottom: espacamento.sm },
  horas: { flexDirection: 'row', gap: espacamento.md },
  hora: { flex: 1 },
  erro: { ...tipografia.legenda, color: cores.perigo, marginTop: 4 },
});
