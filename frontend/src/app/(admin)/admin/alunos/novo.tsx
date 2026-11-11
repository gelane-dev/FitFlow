import { Href, router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { FormularioAluno } from '@/components/gestao/FormularioAluno';
import { CabecalhoDetalhe } from '@/components/ui/CabecalhoDetalhe';
import { CampoSelecao } from '@/components/ui/CampoSelecao';
import { ConteudoLargo } from '@/components/ui/ConteudoLargo';
import { Tela } from '@/components/ui/Tela';
import { useAdminProfessoresAtivos } from '@/hooks/useAdminAlunos';
import { useGestaoCriarAluno } from '@/hooks/useGestaoCriarAluno';
import { espacamento } from '@/theme';
import { GestaoAlunoCriar } from '@/types/gestao.types';
import { mostrarAlerta } from '@/utils/alerta';

/** Cadastro de aluno pelo admin (nasce aprovado; o professor é opcional). */
export default function NovoAlunoAdmin() {
  const { criar, processando } = useGestaoCriarAluno();
  const { professores } = useAdminProfessoresAtivos();
  const [professorId, setProfessorId] = useState<number | null>(null);
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  async function aoCriar(dados: GestaoAlunoCriar) {
    setErroGeral(null);

    const resultado = await criar({ ...dados, professor_id: professorId });

    if (!resultado.ok) {
      setErroGeral(resultado.erro);

      return;
    }

    mostrarAlerta('Aluno cadastrado', `${resultado.valor.nome} já pode entrar no app.`);
    router.replace(`/admin/alunos/${resultado.valor.id}` as Href);
  }

  return (
    <Tela teclado testID="novo-aluno-admin">
      <ConteudoLargo larguraMaxima={760}>
        <CabecalhoDetalhe titulo="Novo aluno" />

        <View style={{ marginBottom: espacamento.lg }}>
          <CampoSelecao
            rotulo="Professor responsável (opcional)"
            opcoes={professores.map((p) => ({ valor: p.id, rotulo: p.nome }))}
            valor={professorId}
            aoMudar={setProfessorId}
            placeholder="Sem professor"
            limpavel
            testID="novo-aluno-professor"
          />
        </View>

        <FormularioAluno modo="criar" aoCriar={aoCriar} enviando={processando} erroGeral={erroGeral} rotuloEnviar="Cadastrar aluno" />
      </ConteudoLargo>
    </Tela>
  );
}
