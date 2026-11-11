import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FormularioPessoa } from '@/components/admin/FormularioPessoa';
import { ItemAuditoria } from '@/components/admin/ItemAuditoria';
import { SeloAtivo } from '@/components/admin/ListaEquipe';
import { PermissoesRecepcao } from '@/components/admin/PermissoesRecepcao';
import { SecaoAdmin } from '@/components/admin/SecaoAdmin';
import { Avatar } from '@/components/ui/Avatar';
import { Botao } from '@/components/ui/Botao';
import { CabecalhoDetalhe } from '@/components/ui/CabecalhoDetalhe';
import { ConteudoLargo, Grade } from '@/components/ui/ConteudoLargo';
import { EstadoErro } from '@/components/ui/EstadoErro';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tela } from '@/components/ui/Tela';
import { useLarguraTela } from '@/components/ui/useLarguraTela';
import { useAdminRecepcionistaDetalhe } from '@/hooks/useAdminEquipe';
import { usePuxarParaAtualizar } from '@/hooks/usePuxarParaAtualizar';
import { useRecarregarNoFoco } from '@/hooks/useRecarregarNoFoco';
import { cores, espacamento, tipografia } from '@/theme';
import { PermissaoRecepcao } from '@/types/gestao.types';
import { mostrarAlerta } from '@/utils/alerta';
import { paramTexto } from '@/utils/params';

/** Detalhe do recepcionista: dados, permissões (interruptores) e atividade. */
export default function DetalheRecepcionistaAdmin() {
  const id = Number(paramTexto(useLocalSearchParams().id));
  const { ehMedio } = useLarguraTela();
  const router = useRouter();
  const detalhe = useAdminRecepcionistaDetalhe(id);
  const [editando, setEditando] = useState(false);
  const [permissoes, setPermissoes] = useState<PermissaoRecepcao[]>([]);

  const recepcionista = detalhe.recepcionista;

  useRecarregarNoFoco(detalhe.recarregar);
  const { atualizando, aoAtualizar } = usePuxarParaAtualizar(detalhe.recarregar);

  // O rascunho dos interruptores acompanha o que o servidor guardou.
  useEffect(() => {
    if (recepcionista) setPermissoes(recepcionista.permissoes);
  }, [recepcionista]);

  if (!recepcionista) {
    return (
      <Tela>
        <CabecalhoDetalhe titulo="Recepcionista" />
        {detalhe.erro ? (
          <EstadoErro mensagem={detalhe.erro} aoTentarNovamente={detalhe.recarregar} />
        ) : (
          <Skeleton altura={120} raio={18} />
        )}
      </Tela>
    );
  }

  const salvas = recepcionista.permissoes;
  const alterou = permissoes.length !== salvas.length || permissoes.some((p) => !salvas.includes(p));

  async function aplicarStatus(ativo: boolean) {
    const resultado = await detalhe.alternarStatus(ativo);

    if (!resultado.ok) mostrarAlerta('Não foi possível alterar', resultado.erro);
  }

  function confirmarStatus() {
    if (!recepcionista) return;

    if (recepcionista.ativo) {
      mostrarAlerta('Desativar recepcionista', `${recepcionista.nome} perderá o acesso ao sistema na próxima requisição.`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Desativar', style: 'destructive', onPress: () => aplicarStatus(false) },
      ]);
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

  async function salvarPermissoes() {
    const resultado = await detalhe.salvarPermissoes(permissoes);

    if (!resultado.ok) {
      mostrarAlerta('Não foi possível salvar', resultado.erro);

      return;
    }

    mostrarAlerta('Permissões salvas', `${permissoes.length} de 11 permissões liberadas para ${recepcionista?.nome}.`);
  }

  return (
    <Tela aoAtualizar={aoAtualizar} atualizando={atualizando} testID="detalhe-recepcionista">
      <ConteudoLargo>
        <CabecalhoDetalhe titulo="Recepcionista" />

        <View style={estilos.perfil}>
          <Avatar nome={recepcionista.nome} tamanho={72} />
          <View style={estilos.perfilTextos}>
            <Text style={estilos.nome} accessibilityRole="header">
              {recepcionista.nome}
            </Text>
            <Text style={estilos.contato}>
              {recepcionista.email} · {recepcionista.telefone}
            </Text>
            <SeloAtivo ativo={recepcionista.ativo} />
          </View>
        </View>

        <View style={estilos.acoes}>
          <Botao variante="secundario" icone="create-outline" larguraTotal={false} onPress={() => setEditando(true)} testID="recepcionista-editar">
            Editar
          </Botao>
          <Botao
            variante={recepcionista.ativo ? 'perigo' : 'primario'}
            icone={recepcionista.ativo ? 'ban' : 'checkmark-circle'}
            larguraTotal={false}
            carregando={detalhe.processando}
            onPress={confirmarStatus}
            testID="recepcionista-status"
          >
            {recepcionista.ativo ? 'Desativar' : 'Ativar'}
          </Botao>
        </View>

        <Grade colunas={ehMedio ? 2 : 1} espaco={16}>
          <SecaoAdmin titulo="Permissões" subtitulo="O que esta pessoa pode fazer na recepção" testID="recepcionista-permissoes">
            <PermissoesRecepcao permissoes={permissoes} aoMudar={setPermissoes} disabled={detalhe.processando} />
            <Botao onPress={salvarPermissoes} disabled={!alterou} carregando={detalhe.processando} testID="permissoes-salvar">
              {alterou ? 'Salvar permissões' : 'Permissões salvas'}
            </Botao>
          </SecaoAdmin>

          <SecaoAdmin
            titulo="Atividade"
            subtitulo="Últimas ações registradas na auditoria"
            vazio={recepcionista.atividade.length === 0 ? 'Nenhuma atividade registrada.' : null}
            testID="recepcionista-atividade"
          >
            {recepcionista.atividade.map((evento) => (
              <ItemAuditoria key={evento.id} item={evento} mostrarUsuario={false} />
            ))}
            <Botao
              variante="secundario"
              onPress={() => router.push({ pathname: '/admin/auditoria', params: { user_id: String(recepcionista.user_id) } })}
              testID="recepcionista-ver-auditoria"
            >
              Ver toda a atividade
            </Botao>
          </SecaoAdmin>
        </Grade>
      </ConteudoLargo>

      <FormularioPessoa
        visivel={editando}
        titulo="Editar recepcionista"
        inicial={{ nome: recepcionista.nome, email: recepcionista.email, telefone: recepcionista.telefone }}
        enviando={detalhe.processando}
        aoFechar={() => setEditando(false)}
        aoSalvar={salvarEdicao}
        prefixo="recepcionista"
      />
    </Tela>
  );
}

const estilos = StyleSheet.create({
  perfil: { flexDirection: 'row', alignItems: 'center', gap: espacamento.lg, marginBottom: espacamento.lg },
  perfilTextos: { flex: 1, gap: 4 },
  nome: { ...tipografia.subtitulo, color: cores.texto },
  contato: { ...tipografia.legenda, color: cores.textoSecundario },
  acoes: { flexDirection: 'row', flexWrap: 'wrap', gap: espacamento.sm, marginBottom: espacamento.lg },
});
