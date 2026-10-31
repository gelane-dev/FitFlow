import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { router, useLocalSearchParams } from 'expo-router';

import { FormularioAvaliacao } from '@/components/FormularioAvaliacao';
import { Botao } from '@/components/ui/Botao';
import { CabecalhoDetalhe } from '@/components/ui/CabecalhoDetalhe';
import { EstadoErro } from '@/components/ui/EstadoErro';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tela } from '@/components/ui/Tela';
import { TituloSecao } from '@/components/ui/TituloSecao';
import { useAlertaErro } from '@/hooks/useAlertaErro';
import { useAvaliacaoGerenciar } from '@/hooks/useAvaliacaoGerenciar';
import { useErrosAposTentativa } from '@/hooks/useErrosAposTentativa';
import { useAvaliacoesAluno } from '@/hooks/useAvaliacoesAluno';
import { mostrarAlerta } from '@/utils/alerta';
import {
  CamposAvaliacao,
  camposDaAvaliacao,
  camposVazios,
  errosAvaliacao,
  montarAvaliacao,
} from '@/utils/avaliacaoForm';
import { paramTexto } from '@/utils/params';

/** Edição de avaliação física (/alunos/[id]/avaliacoes/[avaliacaoId]). */
export default function EditarAvaliacao() {
  const params = useLocalSearchParams();
  const alunoId = Number(paramTexto(params.id));
  const avaliacaoId = Number(paramTexto(params.avaliacaoId));

  const {
    avaliacoes,
    carregando: carregandoLista,
    erro: erroLista,
  } = useAvaliacoesAluno(alunoId);
  const { atualizar, excluir, carregando, erro } = useAvaliacaoGerenciar();

  const [campos, setCampos] = useState<CamposAvaliacao>(camposVazios());
  const avaliacao = avaliacoes.find((a) => a.id === avaliacaoId);

  const { erros, tentar } = useErrosAposTentativa(() => errosAvaliacao(campos));

  useAlertaErro(erro);

  useEffect(() => {
    if (avaliacao) {
      setCampos(camposDaAvaliacao(avaliacao));
    }
  }, [avaliacao]);

  function alterar(campo: keyof CamposAvaliacao, valor: string) {
    setCampos((atual) => ({ ...atual, [campo]: valor }));
  }

  async function salvar() {
    if (!avaliacao) return;

    if (!tentar()) {
      return;
    }

    const hora = avaliacao.data_avaliacao.slice(11, 19) || '00:00:00';
    const resultado = montarAvaliacao(campos, hora);

    if (resultado.erro !== undefined) {
      return;
    }

    const atualizada = await atualizar(avaliacao.id, resultado.dados);

    if (atualizada) {
      router.back();
    }
  }

  function confirmarExclusao() {
    mostrarAlerta('Excluir avaliação', 'Deseja realmente excluir esta avaliação?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          if (await excluir(avaliacaoId)) {
            router.back();
          }
        },
      },
    ]);
  }

  if (carregandoLista) {
    return (
      <Tela>
        <CabecalhoDetalhe titulo="Editar avaliação" />
        <Skeleton altura={52} />
        <View style={estilos.espaco} />
        <Skeleton altura={52} />
        <View style={estilos.espaco} />
        <Skeleton altura={52} />
      </Tela>
    );
  }

  if (erroLista || !avaliacao) {
    return (
      <Tela>
        <CabecalhoDetalhe titulo="Editar avaliação" />
        <EstadoErro mensagem={erroLista || 'Avaliação não encontrada.'} />
      </Tela>
    );
  }

  return (
    <Tela
      teclado
      rodape={
        <Botao onPress={salvar} carregando={carregando}>
          SALVAR ALTERAÇÕES
        </Botao>
      }
    >
      <CabecalhoDetalhe titulo="Editar avaliação" />
      <FormularioAvaliacao campos={campos} onChange={alterar} erros={erros} />

      <TituloSecao titulo="Zona de risco" />
      <Botao
        variante="perigo"
        tamanho="medio"
        icone="trash-outline"
        onPress={confirmarExclusao}
        disabled={carregando}
      >
        EXCLUIR AVALIAÇÃO
      </Botao>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  espaco: { height: 18 },
});
