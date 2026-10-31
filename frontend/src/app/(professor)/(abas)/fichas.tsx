import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { router } from 'expo-router';

import { BotaoFlutuante, ESPACO_BOTAO_FLUTUANTE } from '@/components/BotaoFlutuante';
import { CardFicha } from '@/components/CardFicha';
import { CabecalhoGrande } from '@/components/ui/CabecalhoGrande';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { Chip } from '@/components/ui/Chip';
import { EstadoErro } from '@/components/ui/EstadoErro';
import { EstadoVazio } from '@/components/ui/EstadoVazio';
import { SkeletonLista } from '@/components/ui/Skeleton';
import { TelaLista } from '@/components/ui/TelaLista';
import { useFichas } from '@/hooks/useFichas';
import { useGerenciarFicha } from '@/hooks/useGerenciarFicha';
import { usePuxarParaAtualizar } from '@/hooks/usePuxarParaAtualizar';
import { useRecarregarNoFoco } from '@/hooks/useRecarregarNoFoco';
import { mostrarAlerta } from '@/utils/alerta';
import { filtrarPorCampos } from '@/utils/busca';

type Filtro = 'todas' | 'vigentes';

/** Aba Fichas do professor (/fichas): lista virtualizada, busca por ficha ou aluno e filtro de vigência. */
export default function Fichas() {
  const { fichas, carregando, erro, recarregar } = useFichas();
  const { deletar } = useGerenciarFicha();
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todas');

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

  const base = filtro === 'vigentes' ? fichas.filter((f) => f.vigente) : fichas;
  const filtradas = filtrarPorCampos(base, busca, (f) => [f.nome, f.aluno_nome]);
  const primeiraCarga = carregando && fichas.length === 0;

  const cabecalho = (
    <>
      <CabecalhoGrande
        rotulo={`${fichas.length} FICHA${fichas.length === 1 ? '' : 'S'}`}
        titulo="Fichas"
      />

      <CampoTexto
        icone="search-outline"
        placeholder="Buscar por ficha ou aluno"
        value={busca}
        onChangeText={setBusca}
        autoCorrect={false}
      />

      <View style={estilos.chips}>
        <Chip rotulo="Todas" selecionado={filtro === 'todas'} onPress={() => setFiltro('todas')} />
        <Chip
          rotulo="Vigentes"
          selecionado={filtro === 'vigentes'}
          onPress={() => setFiltro('vigentes')}
        />
      </View>
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
            onRemover={() => confirmarExclusao(ficha.id, ficha.nome)}
          />
        )}
      />

      <BotaoFlutuante rotulo="+ NOVA FICHA" onPress={() => router.push('/fichas/nova')} />
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1 },
  chips: { flexDirection: 'row', gap: 8, marginBottom: 20, marginTop: -4 },
});
