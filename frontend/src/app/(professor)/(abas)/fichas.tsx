import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { router } from 'expo-router';

import { BotaoFlutuante, ESPACO_BOTAO_FLUTUANTE } from '@/components/BotaoFlutuante';
import { CardFicha } from '@/components/CardFicha';
import { DialogoDuplicarFicha } from '@/components/professor/DialogoDuplicarFicha';
import { Botao } from '@/components/ui/Botao';
import { CabecalhoGrande } from '@/components/ui/CabecalhoGrande';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { Chip } from '@/components/ui/Chip';
import { EstadoErro } from '@/components/ui/EstadoErro';
import { EstadoVazio } from '@/components/ui/EstadoVazio';
import { SkeletonLista } from '@/components/ui/Skeleton';
import { TelaLista } from '@/components/ui/TelaLista';
import { useFichas } from '@/hooks/useFichas';
import { useGerenciarFicha } from '@/hooks/useGerenciarFicha';
import { useProfessorFichaAcoes } from '@/hooks/useProfessorFichaAcoes';
import { FichaLista } from '@/types/ficha.types';
import { usePuxarParaAtualizar } from '@/hooks/usePuxarParaAtualizar';
import { useRecarregarNoFoco } from '@/hooks/useRecarregarNoFoco';
import { mostrarAlerta } from '@/utils/alerta';
import { filtrarPorCampos } from '@/utils/busca';

type Filtro = 'todas' | 'vigentes' | 'rascunho' | 'publicadas';

/** Aba Fichas do professor (/fichas): lista virtualizada, busca por ficha ou aluno e filtro de vigência. */
export default function Fichas() {
  const { fichas, carregando, erro, recarregar } = useFichas();
  const { deletar } = useGerenciarFicha();
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [duplicando, setDuplicando] = useState<FichaLista | null>(null);
  const acoes = useProfessorFichaAcoes();

  useRecarregarNoFoco(recarregar);
  const { atualizando, aoAtualizar } = usePuxarParaAtualizar(recarregar);

  function confirmarExclusao(id: number, nome: string) {
    mostrarAlerta(
      'Excluir ficha',
      `Deseja realmente excluir "${nome}" e todos os seus treinos?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            const sucesso = await deletar(id);

            if (sucesso) {
              await recarregar();
            }
          },
        },
      ]
    );
  }

  async function duplicar(ficha: { id: number }, dados: { aluno_id?: number; nome?: string }) {
    const nova = await acoes.duplicar(ficha.id, dados);

    if (nova) {
      setDuplicando(null);
      await recarregar();
      mostrarAlerta('Ficha duplicada', 'A cópia foi criada como rascunho. Abra o montador para ajustar e publicar.', [
        { text: 'Depois', style: 'cancel' },
        {
          text: 'Abrir no montador',
          onPress: () =>
            router.push({ pathname: '/fichas/[id]/montar' as any, params: { id: nova.id.toString() } }),
        },
      ]);
    }
  }

  const base = fichas.filter((f) => {
    if (filtro === 'vigentes') return f.vigente;
    if (filtro === 'rascunho') return f.status === 'rascunho';
    if (filtro === 'publicadas') return f.status !== 'rascunho';

    return true;
  });
  const filtradas = filtrarPorCampos(base, busca, (f) => [f.nome, f.aluno_nome]);
  const primeiraCarga = carregando && fichas.length === 0;

  const cabecalho = (
    <>
      <CabecalhoGrande
        rotulo={`${fichas.length} FICHA${fichas.length === 1 ? '' : 'S'}`}
        titulo="Fichas"
        direita={
          <Botao
            variante="secundario"
            tamanho="medio"
            icone="construct-outline"
            larguraTotal={false}
            onPress={() => router.push('/fichas/montar' as any)}
            testID="botao-montador"
            accessibilityLabel="Abrir o montador de fichas"
          >
            Montador
          </Botao>
        }
      />

      <CampoTexto
        icone="search-outline"
        placeholder="Buscar por ficha ou aluno"
        value={busca}
        onChangeText={setBusca}
        autoCorrect={false}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={estilos.chips}
        style={estilos.faixaChips}
        accessibilityLabel="Filtrar fichas"
      >
        <Chip rotulo="Todas" selecionado={filtro === 'todas'} onPress={() => setFiltro('todas')} />
        <Chip
          rotulo="Vigentes"
          selecionado={filtro === 'vigentes'}
          onPress={() => setFiltro('vigentes')}
        />
        <Chip
          rotulo="Rascunhos"
          selecionado={filtro === 'rascunho'}
          onPress={() => setFiltro('rascunho')}
          testID="filtro-rascunho"
        />
        <Chip
          rotulo="Publicadas"
          selecionado={filtro === 'publicadas'}
          onPress={() => setFiltro('publicadas')}
          testID="filtro-publicadas"
        />
      </ScrollView>
    </>
  );

  const vazio = erro ? (
    <EstadoErro mensagem={erro} aoTentarNovamente={recarregar} />
  ) : primeiraCarga ? (
    <SkeletonLista linhas={4} />
  ) : (
    <EstadoVazio
      icone="clipboard-outline"
      titulo={fichas.length === 0 ? 'Nenhuma ficha cadastrada' : 'Nenhuma ficha encontrada'}
      descricao={
        fichas.length === 0 ? 'Crie a primeira ficha para um aluno.' : 'Ajuste a busca ou o filtro.'
      }
    />
  );

  return (
    <View style={estilos.raiz}>
      <TelaLista
        abas
        dados={erro ? [] : filtradas}
        chave={(ficha) => ficha.id.toString()}
        cabecalho={cabecalho}
        vazio={vazio}
        aoAtualizar={aoAtualizar}
        atualizando={atualizando}
        espacoInferior={ESPACO_BOTAO_FLUTUANTE}
        renderItem={({ item: ficha }) => (
          <CardFicha
            ficha={ficha}
            onPress={() =>
              router.push({
                pathname: '/fichas/[id]' as any,
                params: { id: ficha.id.toString() },
              })
            }
            onDuplicar={() => {
              acoes.limparErro();
              setDuplicando(ficha);
            }}
            onRemover={() => confirmarExclusao(ficha.id, ficha.nome)}
          />
        )}
      />

      <BotaoFlutuante rotulo="+ NOVA FICHA" onPress={() => router.push('/fichas/nova')} />

      <DialogoDuplicarFicha
        ficha={duplicando}
        salvando={acoes.carregando}
        erro={acoes.erro}
        aoFechar={() => setDuplicando(null)}
        aoConfirmar={duplicar}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1 },
  faixaChips: { marginBottom: 20, marginTop: -4, flexGrow: 0 },
  chips: { gap: 8, paddingRight: 8 },
});
