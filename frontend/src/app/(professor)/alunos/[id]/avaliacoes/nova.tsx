import { useState } from 'react';

import { router, useLocalSearchParams } from 'expo-router';

import { FormularioAvaliacao } from '@/components/FormularioAvaliacao';
import { Botao } from '@/components/ui/Botao';
import { CabecalhoDetalhe } from '@/components/ui/CabecalhoDetalhe';
import { Tela } from '@/components/ui/Tela';
import { useAlertaErro } from '@/hooks/useAlertaErro';
import { useAvaliacaoGerenciar } from '@/hooks/useAvaliacaoGerenciar';
import { useErrosAposTentativa } from '@/hooks/useErrosAposTentativa';
import {
  CamposAvaliacao,
  camposVazios,
  errosAvaliacao,
  montarAvaliacao,
} from '@/utils/avaliacaoForm';
import { paramTexto } from '@/utils/params';

/** Nova avaliação física (/alunos/[id]/avaliacoes/nova). */
export default function NovaAvaliacao() {
  const { id } = useLocalSearchParams();
  const alunoId = Number(paramTexto(id));

  const [campos, setCampos] = useState<CamposAvaliacao>(camposVazios());
  const { criar, carregando, erro } = useAvaliacaoGerenciar();

  const { erros, tentar } = useErrosAposTentativa(() => errosAvaliacao(campos));

  useAlertaErro(erro);

  function alterar(campo: keyof CamposAvaliacao, valor: string) {
    setCampos((atual) => ({ ...atual, [campo]: valor }));
  }

  async function salvar() {
    if (!tentar()) {
      return;
    }

    const resultado = montarAvaliacao(campos);

    if (resultado.erro !== undefined) {
      return;
    }

    const avaliacao = await criar(alunoId, resultado.dados);

    if (avaliacao) {
      router.back();
    }
  }

  return (
    <Tela
      teclado
      rodape={
        <Botao onPress={salvar} carregando={carregando}>
          SALVAR AVALIAÇÃO
        </Botao>
      }
    >
      <CabecalhoDetalhe titulo="Nova avaliação" />
      <FormularioAvaliacao campos={campos} onChange={alterar} erros={erros} />
    </Tela>
  );
}
