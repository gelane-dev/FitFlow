import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Botao } from '@/components/ui/Botao';
import { CampoData } from '@/components/ui/CampoData';
import { CampoSelecao } from '@/components/ui/CampoSelecao';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { Modal } from '@/components/ui/Modal';
import { cores } from '@/theme';
import type {
  MatriculaAlterarPlano,
  MatriculaCancelar,
  MatriculaCriar,
  MatriculaRenovar,
  MatriculaResposta,
  PlanoResposta,
} from '@/types/gestao.types';
import { mostrarAlerta } from '@/utils/alerta';
import { dataBrValida, dataBrParaIso, formatarData } from '@/utils/datas';
import { validarMotivo } from '@/utils/gestaoRecepcao';
import { formatarMoeda } from '@/utils/moeda';

export type ModoDialogoMatricula = 'nova' | 'renovar' | 'alterar' | 'cancelar';

/** O que o diálogo devolve a `aoConfirmar`; o hook `useGestaoAcoesFinanceiras` sabe executar cada um. */
export type ResultadoDialogoMatricula =
  | { modo: 'nova'; dados: MatriculaCriar }
  | { modo: 'renovar'; dados: MatriculaRenovar }
  | { modo: 'alterar'; dados: MatriculaAlterarPlano }
  | { modo: 'cancelar'; dados: MatriculaCancelar };

export interface DialogoMatriculaProps {
  visivel: boolean;
  modo: ModoDialogoMatricula;
  aluno: { id: number; nome: string };
  /** Matrícula ativa (renovar, alterar, cancelar). */
  matricula?: MatriculaResposta | null;
  planos: PlanoResposta[];
  carregandoPlanos?: boolean;
  erroPlanos?: string | null;
  aoFechar: () => void;
  /** Devolve null no sucesso (o diálogo fecha) ou a mensagem de erro (fica aberto e mostra). */
  aoConfirmar: (resultado: ResultadoDialogoMatricula) => Promise<string | null>;
}

const TITULOS: Record<ModoDialogoMatricula, string> = {
  nova: 'Matricular aluno',
  renovar: 'Renovar matrícula',
  alterar: 'Alterar plano',
  cancelar: 'Cancelar matrícula',
};

const ROTULOS: Record<ModoDialogoMatricula, string> = {
  nova: 'MATRICULAR',
  renovar: 'RENOVAR',
  alterar: 'ALTERAR PLANO',
  cancelar: 'CANCELAR MATRÍCULA',
};

/** Matricular, renovar, alterar plano ou cancelar. Quem decide se o botão aparece é a permissão; o backend decide de verdade. */
export function DialogoMatricula({
  visivel,
  modo,
  aluno,
  matricula,
  planos,
  carregandoPlanos,
  erroPlanos,
  aoFechar,
  aoConfirmar,
}: DialogoMatriculaProps) {
  const [planoId, setPlanoId] = useState<number | null>(null);
  const [inicio, setInicio] = useState('');
  const [motivo, setMotivo] = useState('');
  const [tentou, setTentou] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (visivel) {
      setPlanoId(modo === 'renovar' ? matricula?.plano.id ?? null : null);
      setInicio('');
      setMotivo('');
      setTentou(false);
      setErro(null);
    }
  }, [visivel, modo, matricula?.id, matricula?.plano.id]);

  const exigePlano = modo === 'nova' || modo === 'alterar';
  const erroPlano = tentou && exigePlano && !planoId ? 'Selecione o plano.' : null;
  const erroInicio = tentou && !dataBrValida(inicio) ? 'Use uma data válida (DD/MM/AAAA).' : null;
  const erroMotivo = tentou && modo === 'cancelar' ? validarMotivo(motivo).motivo ?? null : null;

  async function executar(resultado: ResultadoDialogoMatricula) {
    setEnviando(true);
    setErro(null);

    const falha = await aoConfirmar(resultado);

    setEnviando(false);

    if (falha) {
      setErro(falha);

      return;
    }

    aoFechar();
  }

  function confirmar() {
    setTentou(true);

    if (exigePlano && !planoId) return;
    if (modo !== 'cancelar' && modo !== 'renovar' && !dataBrValida(inicio)) return;

    if (modo === 'nova') {
      executar({
        modo,
        dados: { aluno_id: aluno.id, plano_id: planoId as number, data_inicio: dataBrParaIso(inicio) ?? undefined },
      });
    } else if (modo === 'renovar') {
      executar({ modo, dados: planoId ? { plano_id: planoId } : {} });
    } else if (modo === 'alterar') {
      executar({ modo, dados: { plano_id: planoId as number } });
    } else {
      if (validarMotivo(motivo).motivo) return;

      mostrarAlerta('Cancelar matrícula', `Cancelar a matrícula de ${aluno.nome}? Os pagamentos pendentes serão cancelados.`, [
        { text: 'Voltar', style: 'cancel' },
        {
          text: 'Cancelar matrícula',
          style: 'destructive',
          onPress: () => executar({ modo, dados: { motivo: motivo.trim() } }),
        },
      ]);
    }
  }

  // Alterar plano: o plano atual não é uma escolha válida (o backend recusa com 422, QA-GA-07).
  const planosOferecidos = modo === 'alterar' && matricula ? planos.filter((p) => p.id !== matricula.plano.id) : planos;
  const opcoes = planosOferecidos.map((p) => ({
    valor: p.id,
    rotulo: p.nome,
    descricao: `${formatarMoeda(p.valor)} · ${p.duracao_dias} dias`,
  }));

  return (
    <Modal
      visivel={visivel}
      titulo={TITULOS[modo]}
      aoFechar={aoFechar}
      testID="dialogo-matricula"
      rodape={
        <>
          <Botao variante="secundario" larguraTotal={false} onPress={aoFechar} testID="matricula-voltar">
            Voltar
          </Botao>
          <Botao
            variante={modo === 'cancelar' ? 'perigo' : 'primario'}
            larguraTotal={false}
            carregando={enviando}
            onPress={confirmar}
            testID="matricula-confirmar"
          >
            {ROTULOS[modo]}
          </Botao>
        </>
      }
    >
      <Text style={estilos.aluno}>Aluno: {aluno.nome}</Text>

      {matricula && modo !== 'nova' ? (
        <Text style={estilos.info}>
          Matrícula atual: {matricula.plano.nome} · vence em {formatarData(matricula.data_vencimento)}
        </Text>
      ) : null}

      {modo !== 'cancelar' ? (
        <View>
          <CampoSelecao
            rotulo={modo === 'renovar' ? 'Plano (padrão: o mesmo)' : 'Plano'}
            opcoes={opcoes}
            valor={planoId}
            aoMudar={setPlanoId}
            placeholder={carregandoPlanos ? 'Carregando planos...' : 'Selecione o plano'}
            erro={erroPlano ?? erroPlanos}
            testID="matricula-plano"
          />
          {modo === 'nova' ? (
            <CampoData
              rotulo="Início (vazio = hoje)"
              value={inicio}
              onChangeData={(texto) => setInicio(texto)}
              erro={erroInicio}
              testID="matricula-inicio"
            />
          ) : null}
        </View>
      ) : (
        <CampoTexto
          rotulo="Motivo do cancelamento"
          value={motivo}
          onChangeText={setMotivo}
          multiline
          erro={erroMotivo}
          testID="matricula-motivo"
        />
      )}

      {erro ? (
        <Text style={estilos.erro} accessibilityRole="alert" testID="matricula-erro">
          {erro}
        </Text>
      ) : null}
    </Modal>
  );
}

const estilos = StyleSheet.create({
  aluno: { color: cores.texto, fontSize: 15, fontWeight: '600', marginBottom: 4 },
  info: { color: cores.textoSecundario, fontSize: 13, marginBottom: 16 },
  erro: { color: cores.perigo, fontSize: 14, marginTop: 4 },
});
