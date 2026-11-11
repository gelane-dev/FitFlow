import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { FormularioPessoa } from '@/components/admin/FormularioPessoa';
import { ListaProfessores, ListaRecepcionistas } from '@/components/admin/ListaEquipe';
import { Segmentado } from '@/components/aluno/Segmentado';
import { CabecalhoGrande } from '@/components/ui/CabecalhoGrande';
import { ConteudoLargo } from '@/components/ui/ConteudoLargo';
import { Tela } from '@/components/ui/Tela';
import { useAdminProfessores, useAdminRecepcionistas } from '@/hooks/useAdminEquipe';
import { usePuxarParaAtualizar } from '@/hooks/usePuxarParaAtualizar';
import { useRecarregarNoFoco } from '@/hooks/useRecarregarNoFoco';
import { mostrarAlerta } from '@/utils/alerta';
import { paramTexto } from '@/utils/params';

type AbaEquipe = 'professores' | 'recepcao';

/** Equipe: professores e recepção (a recepção também abre por `?aba=recepcao`). */
export default function EquipeAdmin() {
  const params = useLocalSearchParams();
  const [aba, setAba] = useState<AbaEquipe>(paramTexto(params.aba) === 'recepcao' ? 'recepcao' : 'professores');
  const [criando, setCriando] = useState(false);

  const professores = useAdminProfessores();
  const recepcao = useAdminRecepcionistas();

  const recarregar = async () => {
    await Promise.all([professores.recarregar(), recepcao.recarregar()]);
  };

  useRecarregarNoFoco(recarregar);
  const { atualizando, aoAtualizar } = usePuxarParaAtualizar(recarregar);

  async function salvar(dados: { nome: string; email: string; telefone: string; senha: string }) {
    const resultado =
      aba === 'professores' ? await professores.criar(dados) : await recepcao.criar(dados);

    if (!resultado.ok) {
      mostrarAlerta('Não foi possível criar', resultado.erro);

      return;
    }

    setCriando(false);
    mostrarAlerta(aba === 'professores' ? 'Professor criado' : 'Recepcionista criado', `${dados.nome} já pode entrar no sistema.`);
  }

  return (
    <Tela abas aoAtualizar={aoAtualizar} atualizando={atualizando} testID="equipe-admin">
      <ConteudoLargo>
        <CabecalhoGrande rotulo="Administração" titulo="Equipe" />

        <Segmentado
          opcoes={[
            { valor: 'professores', rotulo: 'Professores' },
            { valor: 'recepcao', rotulo: 'Recepção' },
          ]}
          valor={aba}
          onChange={setAba}
        />

        {aba === 'professores' ? (
          <ListaProfessores
            itens={professores.professores}
            carregando={professores.carregando}
            erro={professores.erro}
            aoTentarNovamente={professores.recarregar}
            aoCriar={() => setCriando(true)}
          />
        ) : (
          <ListaRecepcionistas
            itens={recepcao.recepcionistas}
            carregando={recepcao.carregando}
            erro={recepcao.erro}
            aoTentarNovamente={recepcao.recarregar}
            aoCriar={() => setCriando(true)}
          />
        )}

        <FormularioPessoa
          visivel={criando}
          titulo={aba === 'professores' ? 'Novo professor' : 'Novo recepcionista'}
          enviando={aba === 'professores' ? professores.processando : recepcao.processando}
          aoFechar={() => setCriando(false)}
          aoSalvar={salvar}
          prefixo={aba === 'professores' ? 'professor' : 'recepcionista'}
        />
      </ConteudoLargo>
    </Tela>
  );
}
