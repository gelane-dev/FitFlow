import { router } from 'expo-router';
import { useState } from 'react';

import { FormularioAluno } from '@/components/gestao/FormularioAluno';
import { CabecalhoDetalhe } from '@/components/ui/CabecalhoDetalhe';
import { ConteudoLargo } from '@/components/ui/ConteudoLargo';
import { EstadoVazio } from '@/components/ui/EstadoVazio';
import { Tela } from '@/components/ui/Tela';
import { useGestaoCriarAluno } from '@/hooks/useGestaoCriarAluno';
import { useRecepcaoPermissoes } from '@/hooks/useRecepcaoPermissoes';
import type { GestaoAlunoCriar } from '@/types/gestao.types';
import { mostrarAlerta } from '@/utils/alerta';

export default function NovoAlunoRecepcao() {
  const { pode, carregando } = useRecepcaoPermissoes();
  const { criar, processando } = useGestaoCriarAluno();
  const [erro, setErro] = useState<string | null>(null);

  async function cadastrar(dados: GestaoAlunoCriar) {
    setErro(null);

    const resultado = await criar(dados);

    if (!resultado.ok) {
      setErro(resultado.erro);

      return;
    }

    mostrarAlerta('Aluno cadastrado', `${resultado.valor.nome} foi cadastrado e já está aprovado.`);
    router.replace(`/recepcao/alunos/${resultado.valor.id}` as never);
  }

  return (
    <Tela teclado testID="tela-novo-aluno">
      <CabecalhoDetalhe titulo="Novo aluno" />
      <ConteudoLargo larguraMaxima={820}>
        {!carregando && !pode('cadastrar_aluno') ? (
          <EstadoVazio
            icone="lock-closed-outline"
            titulo="Sem permissão"
            descricao="Seu perfil não pode cadastrar alunos. Procure o administrador."
          />
        ) : (
          <FormularioAluno modo="criar" aoCriar={cadastrar} enviando={processando} erroGeral={erro} />
        )}
      </ConteudoLargo>
    </Tela>
  );
}
