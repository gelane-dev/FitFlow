import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Botao } from '@/components/ui/Botao';
import { CampoMoeda } from '@/components/ui/CampoMoeda';
import { CampoSelecao } from '@/components/ui/CampoSelecao';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { Modal } from '@/components/ui/Modal';
import { espacamento } from '@/theme';
import { PlanoCriar, PlanoResposta, Periodicidade } from '@/types/gestao.types';
import { decimalParaCampo } from '@/utils/campoMoeda';

import { CampoInterruptor } from './CampoInterruptor';

export const PERIODICIDADES: { valor: Periodicidade; rotulo: string; dias: number | null }[] = [
  { valor: 'mensal', rotulo: 'Mensal', dias: 30 },
  { valor: 'trimestral', rotulo: 'Trimestral', dias: 90 },
  { valor: 'semestral', rotulo: 'Semestral', dias: 180 },
  { valor: 'anual', rotulo: 'Anual', dias: 365 },
  { valor: 'avulso', rotulo: 'Avulso', dias: null },
];

interface Estado {
  nome: string;
  descricao: string;
  duracao: string;
  valorCampo: string;
  valor: string | null;
  periodicidade: Periodicidade | null;
  renovacao: boolean;
  condicoes: string;
}

type Erros = Partial<Record<'nome' | 'duracao' | 'valor' | 'periodicidade', string>>;

const VAZIO: Estado = {
  nome: '',
  descricao: '',
  duracao: '30',
  valorCampo: '',
  valor: null,
  periodicidade: 'mensal',
  renovacao: false,
  condicoes: '',
};

export function validarPlano(e: Estado): Erros {
  const erros: Erros = {};
  const dias = Number(e.duracao);

  if (e.nome.trim().length < 2) erros.nome = 'Informe o nome do plano.';
  if (!Number.isInteger(dias) || dias <= 0) erros.duracao = 'A duração precisa ser um número de dias maior que zero.';
  if (e.valor === null) erros.valor = 'Informe o valor (pode ser 0,00).';
  if (!e.periodicidade) erros.periodicidade = 'Escolha a periodicidade.';

  return erros;
}

export function planoParaEstado(plano: PlanoResposta | null | undefined): Estado {
  if (!plano) return VAZIO;

  return {
    nome: plano.nome,
    descricao: plano.descricao ?? '',
    duracao: String(plano.duracao_dias),
    valorCampo: decimalParaCampo(plano.valor),
    valor: plano.valor,
    periodicidade: plano.periodicidade,
    renovacao: plano.renovacao_automatica,
    condicoes: plano.condicoes ?? '',
  };
}

export interface FormularioPlanoProps {
  visivel: boolean;
  /** Com plano, edita; sem, cria. */
  plano?: PlanoResposta | null;
  enviando?: boolean;
  aoFechar: () => void;
  aoSalvar: (dados: PlanoCriar) => void;
}

export function FormularioPlano({ visivel, plano, enviando, aoFechar, aoSalvar }: FormularioPlanoProps) {
  const [estado, setEstado] = useState<Estado>(VAZIO);
  const [erros, setErros] = useState<Erros>({});

  useEffect(() => {
    if (visivel) {
      setEstado(planoParaEstado(plano));
      setErros({});
    }
  }, [visivel, plano]);

  function enviar() {
    const encontrados = validarPlano(estado);

    setErros(encontrados);

    if (Object.keys(encontrados).length > 0) return;

    aoSalvar({
      nome: estado.nome.trim(),
      descricao: estado.descricao.trim() || null,
      duracao_dias: Number(estado.duracao),
      valor: estado.valor as string,
      periodicidade: estado.periodicidade as Periodicidade,
      renovacao_automatica: estado.renovacao,
      condicoes: estado.condicoes.trim() || null,
    });
  }

  function escolherPeriodicidade(valor: Periodicidade | null) {
    const opcao = PERIODICIDADES.find((p) => p.valor === valor);

    setEstado((atual) => ({
      ...atual,
      periodicidade: valor,
      // Sugere a duração típica, mas só se o usuário ainda não a editou para outro valor.
      duracao: opcao?.dias && !plano ? String(opcao.dias) : atual.duracao,
    }));
  }

  return (
    <Modal
      visivel={visivel}
      titulo={plano ? 'Editar plano' : 'Novo plano'}
      aoFechar={aoFechar}
      rodape={
        <View style={estilos.rodape}>
          <Botao variante="secundario" onPress={aoFechar} disabled={enviando} testID="plano-cancelar">
            Cancelar
          </Botao>
          <Botao onPress={enviar} carregando={enviando} testID="plano-salvar">
            Salvar
          </Botao>
        </View>
      }
    >
      <View style={estilos.campos}>
        <CampoTexto
          rotulo="Nome"
          value={estado.nome}
          onChangeText={(nome) => setEstado((a) => ({ ...a, nome }))}
          erro={erros.nome}
          testID="plano-nome"
        />
        <CampoSelecao
          rotulo="Periodicidade"
          opcoes={PERIODICIDADES.map((p) => ({ valor: p.valor, rotulo: p.rotulo }))}
          valor={estado.periodicidade}
          aoMudar={escolherPeriodicidade}
          erro={erros.periodicidade}
          testID="plano-periodicidade"
        />
        <CampoTexto
          rotulo="Duração (dias)"
          value={estado.duracao}
          onChangeText={(duracao) => setEstado((a) => ({ ...a, duracao: duracao.replace(/\D/g, '') }))}
          keyboardType="number-pad"
          erro={erros.duracao}
          testID="plano-duracao"
        />
        <CampoMoeda
          rotulo="Valor"
          value={estado.valorCampo}
          onChangeValor={(valorCampo, valor) => setEstado((a) => ({ ...a, valorCampo, valor }))}
          erro={erros.valor}
          testID="plano-valor"
        />
        <CampoTexto
          rotulo="Descrição (opcional)"
          value={estado.descricao}
          onChangeText={(descricao) => setEstado((a) => ({ ...a, descricao }))}
          multiline
          maxLength={500}
          testID="plano-descricao"
        />
        <CampoTexto
          rotulo="Condições (opcional)"
          value={estado.condicoes}
          onChangeText={(condicoes) => setEstado((a) => ({ ...a, condicoes }))}
          multiline
          maxLength={500}
          testID="plano-condicoes"
        />
        <CampoInterruptor
          rotulo="Renovação automática"
          descricao="Marca o plano como de renovação automática. Mudar o valor não altera matrículas já feitas."
          valor={estado.renovacao}
          aoMudar={(renovacao) => setEstado((a) => ({ ...a, renovacao }))}
          testID="plano-renovacao"
        />
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  campos: { gap: espacamento.md },
  rodape: { gap: espacamento.sm },
});
