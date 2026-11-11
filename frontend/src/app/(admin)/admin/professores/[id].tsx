import { Href, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FormularioPessoa } from '@/components/admin/FormularioPessoa';
import { ItemAuditoria } from '@/components/admin/ItemAuditoria';
import { ModalTransferirAlunos } from '@/components/admin/ModalTransferirAlunos';
import { SecaoAdmin } from '@/components/admin/SecaoAdmin';
import { SeloAtivo } from '@/components/admin/ListaEquipe';
import { Avatar } from '@/components/ui/Avatar';
import { Botao } from '@/components/ui/Botao';
import { CabecalhoDetalhe } from '@/components/ui/CabecalhoDetalhe';
import { ConteudoLargo, Grade } from '@/components/ui/ConteudoLargo';
import { EstadoErro } from '@/components/ui/EstadoErro';
import { LinhaLista } from '@/components/ui/LinhaLista';
import { Selo } from '@/components/ui/Selo';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tela } from '@/components/ui/Tela';
import { useLarguraTela } from '@/components/ui/useLarguraTela';
import { useAdminProfessorDetalhe, useAdminProfessores } from '@/hooks/useAdminEquipe';
import { usePuxarParaAtualizar } from '@/hooks/usePuxarParaAtualizar';
import { useRecarregarNoFoco } from '@/hooks/useRecarregarNoFoco';
import { cores, espacamento, tipografia } from '@/theme';
import { mostrarAlerta } from '@/utils/alerta';
import { formatarData } from '@/utils/datas';
import { paramTexto } from '@/utils/params';
import { statusFicha } from '@/utils/situacao';

/** Detalhe do professor: alunos, fichas, avaliações recentes e atividade; editar, ativar/desativar e transferir. */
export default function DetalheProfessorAdmin() {
  const id = Number(paramTexto(useLocalSearchParams().id));
  const { ehMedio } = useLarguraTela();
  const detalhe = useAdminProfessorDetalhe(id);
  const equipe = useAdminProfessores();
  const [editando, setEditando] = useState(false);
  const [transferindo, setTransferindo] = useState<{ aposDesativar: boolean } | null>(null);

  const recarregar = async () => {
    await Promise.all([detalhe.recarregar(), equipe.recarregar()]);
  };

  useRecarregarNoFoco(recarregar);
  const { atualizando, aoAtualizar } = usePuxarParaAtualizar(recarregar);

  const professor = detalhe.professor;

  if (!professor) {
    return (
      <Tela>
        <CabecalhoDetalhe titulo="Professor" />
        {detalhe.erro ? (
          <EstadoErro mensagem={detalhe.erro} aoTentarNovamente={detalhe.recarregar} />
        ) : (
          <Skeleton altura={120} raio={18} />
        )}
      </Tela>
    );
  }

  async function aplicarStatus(ativo: boolean) {
    const resultado = await detalhe.alternarStatus(ativo);

    if (!resultado.ok) {
      mostrarAlerta('Não foi possível alterar', resultado.erro);

      return;
    }

    if (!ativo && professor && professor.total_alunos > 0) {
      setTransferindo({ aposDesativar: true });
    }
  }

  function confirmarStatus() {
    if (!professor) return;

    if (professor.ativo) {
      mostrarAlerta(
        'Desativar professor',
        `${professor.nome} deixará de acessar o sistema. Os alunos continuam vinculados até você transferi-los.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Desativar', style: 'destructive', onPress: () => aplicarStatus(false) },
        ]
      );
    } else {
      aplicarStatus(true);
    }
  }

  async function salvarEdicao(dados: { nome: string; email: string; telefone: string }) {
    const resultado = await detalhe.atualizar(dados);

    if (!resultado.ok) {
      mostrarAlerta('Não foi possível salvar', resultado.erro);

      return;
    }

    setEditando(false);
  }

  async function transferir(destinoId: number | null) {
    const resultado = await detalhe.transferir({ destino_professor_id: destinoId });

    if (!resultado.ok) {
      mostrarAlerta('Não foi possível transferir', resultado.erro);

      return;
    }

    setTransferindo(null);
    mostrarAlerta('Alunos transferidos', `${resultado.valor.transferidos} aluno(s) transferido(s).`);
  }

  return (
    <Tela aoAtualizar={aoAtualizar} atualizando={atualizando} testID="detalhe-professor">
      <ConteudoLargo>
        <CabecalhoDetalhe titulo="Professor" />

        <View style={estilos.perfil}>
          <Avatar uri={professor.foto ?? undefined} nome={professor.nome} tamanho={72} />
          <View style={estilos.perfilTextos}>
            <Text style={estilos.nome} accessibilityRole="header">
              {professor.nome}
            </Text>
            <Text style={estilos.contato}>
              {professor.email} · {professor.telefone}
            </Text>
            <View style={estilos.selos}>
              <SeloAtivo ativo={professor.ativo} />
              <Selo rotulo={`${professor.total_alunos} alunos`} tom="neutro" />
              <Selo rotulo={`${professor.total_fichas} fichas`} tom="neutro" />
            </View>
          </View>
        </View>

        <View style={estilos.acoes}>
          <Botao variante="secundario" icone="create-outline" larguraTotal={false} onPress={() => setEditando(true)} testID="professor-editar">
            Editar
          </Botao>
          <Botao
            variante="secundario"
            icone="swap-horizontal"
            larguraTotal={false}
            disabled={professor.total_alunos === 0}
            onPress={() => setTransferindo({ aposDesativar: false })}
            testID="professor-transferir"
          >
            Transferir alunos
          </Botao>
          <Botao
            variante={professor.ativo ? 'perigo' : 'primario'}
            icone={professor.ativo ? 'ban' : 'checkmark-circle'}
            larguraTotal={false}
            carregando={detalhe.processando}
            onPress={confirmarStatus}
            testID="professor-status"
          >
            {professor.ativo ? 'Desativar' : 'Ativar'}
          </Botao>
        </View>

        <Grade colunas={ehMedio ? 2 : 1} espaco={16}>
          <SecaoAdmin
            titulo="Alunos"
            subtitulo="Vinculados a este professor"
            vazio={professor.alunos.length === 0 ? 'Nenhum aluno vinculado.' : null}
            testID="professor-alunos"
          >
            {professor.alunos.map((aluno) => (
              <LinhaLista
                key={aluno.id}
                titulo={aluno.nome}
                subtitulo={aluno.professor_vinculado_em ? `Desde ${formatarData(aluno.professor_vinculado_em)}` : aluno.telefone}
                icone="person-outline"
                onPress={() => router.push(`/admin/alunos/${aluno.id}` as Href)}
              />
            ))}
          </SecaoAdmin>

          <SecaoAdmin
            titulo="Fichas"
            subtitulo="Montadas por este professor"
            vazio={professor.fichas.length === 0 ? 'Nenhuma ficha montada.' : null}
            testID="professor-fichas"
          >
            {professor.fichas.map((ficha) => (
              <LinhaLista
                key={ficha.id}
                titulo={ficha.nome}
                subtitulo={`${ficha.aluno?.nome ?? 'Sem aluno'} · ${statusFicha(ficha.status).rotulo}${ficha.atualizado_em ? ` · ${formatarData(ficha.atualizado_em)}` : ''}`}
                icone="document-text-outline"
                semChevron
              />
            ))}
          </SecaoAdmin>

          <SecaoAdmin
            titulo="Avaliações recentes"
            vazio={professor.avaliacoes_recentes.length === 0 ? 'Nenhuma avaliação registrada.' : null}
            testID="professor-avaliacoes"
          >
            {professor.avaliacoes_recentes.map((avaliacao) => (
              <LinhaLista
                key={avaliacao.id}
                titulo={avaliacao.aluno?.nome ?? 'Aluno'}
                subtitulo={formatarData(avaliacao.data_avaliacao)}
                icone="body-outline"
                semChevron
              />
            ))}
          </SecaoAdmin>

          <SecaoAdmin
            titulo="Atividade"
            subtitulo="Últimas ações registradas na auditoria"
            vazio={professor.atividade.length === 0 ? 'Nenhuma atividade registrada.' : null}
            testID="professor-atividade"
          >
            {professor.atividade.map((evento) => (
              <ItemAuditoria key={evento.id} item={evento} mostrarUsuario={false} />
            ))}
          </SecaoAdmin>
        </Grade>
      </ConteudoLargo>

      <FormularioPessoa
        visivel={editando}
        titulo="Editar professor"
        inicial={{ nome: professor.nome, email: professor.email, telefone: professor.telefone }}
        enviando={detalhe.processando}
        aoFechar={() => setEditando(false)}
        aoSalvar={salvarEdicao}
        prefixo="professor"
      />

      <ModalTransferirAlunos
        visivel={transferindo !== null}
        origem={professor}
        professores={equipe.professores}
        enviando={detalhe.processando}
        introducao={transferindo?.aposDesativar ? `${professor.nome} foi desativado, mas ainda tem alunos vinculados. Quer transferi-los agora?` : undefined}
        aoFechar={() => setTransferindo(null)}
        aoConfirmar={transferir}
      />
    </Tela>
  );
}

const estilos = StyleSheet.create({
  perfil: { flexDirection: 'row', alignItems: 'center', gap: espacamento.lg, marginBottom: espacamento.lg },
  perfilTextos: { flex: 1, gap: 4 },
  nome: { ...tipografia.subtitulo, color: cores.texto },
  contato: { ...tipografia.legenda, color: cores.textoSecundario },
  selos: { flexDirection: 'row', flexWrap: 'wrap', gap: espacamento.sm, marginTop: 4 },
  acoes: { flexDirection: 'row', flexWrap: 'wrap', gap: espacamento.sm, marginBottom: espacamento.lg },
});
