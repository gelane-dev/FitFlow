import { StyleSheet, Text, View } from 'react-native';

import { BotaoIcone } from '@/components/professor/BotaoIcone';
import { LinhaItemMontador } from '@/components/professor/LinhaItemMontador';
import { Botao } from '@/components/ui/Botao';
import { Cartao } from '@/components/ui/Cartao';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { Chip } from '@/components/ui/Chip';
import { EstadoVazio } from '@/components/ui/EstadoVazio';
import { cores } from '@/theme';
import { DIAS_SEMANA, DiaSemana } from '@/types/ficha.types';
import { ROTULO_SEM_DIA_FIXO, rotuloDiaCompleto } from '@/utils/diasSemana';
import { DivisaoMontador, ErrosItemMontador, ItemMontador } from '@/utils/montadorFicha';

type MudancasItem = Partial<
  Pick<ItemMontador, 'series' | 'repeticoes' | 'carga' | 'descanso' | 'observacao'>
>;

interface EditorDivisaoProps {
  divisao: DivisaoMontador;
  indice: number;
  totalDivisoes: number;
  erroNome?: string;
  errosItens: ErrosItemMontador[];
  desabilitado?: boolean;
  /** Mostra o botão que abre a biblioteca em modal (celular); no painel lateral fica escondido. */
  mostrarBotaoBiblioteca: boolean;
  aoAbrirBiblioteca: () => void;
  aoAlterarDivisao: (mudancas: { nome?: string; dia?: DiaSemana | null }) => void;
  aoMoverDivisao: (direcao: -1 | 1) => void;
  aoDuplicarDivisao: () => void;
  aoRemoverDivisao: () => void;
  aoAlterarItem: (indiceItem: number, mudancas: MudancasItem) => void;
  aoMoverItem: (indiceItem: number, direcao: -1 | 1) => void;
  aoDuplicarItem: (indiceItem: number) => void;
  aoRemoverItem: (indiceItem: number) => void;
}

/** Uma divisão (treino A/B/C): nome, dia opcional ("Sem dia fixo") e a lista de exercícios. */
export function EditorDivisao({
  divisao,
  indice,
  totalDivisoes,
  erroNome,
  errosItens,
  desabilitado = false,
  mostrarBotaoBiblioteca,
  aoAbrirBiblioteca,
  aoAlterarDivisao,
  aoMoverDivisao,
  aoDuplicarDivisao,
  aoRemoverDivisao,
  aoAlterarItem,
  aoMoverItem,
  aoDuplicarItem,
  aoRemoverItem,
}: EditorDivisaoProps) {
  return (
    <Cartao>
      <View style={estilos.topo}>
        <View style={estilos.nome}>
          <CampoTexto
            rotulo={`Divisão ${indice + 1}`}
            placeholder="Ex.: Treino A - Peito e tríceps"
            value={divisao.nome}
            onChangeText={(nome) => aoAlterarDivisao({ nome })}
            erro={erroNome}
            editable={!desabilitado}
            testID="divisao-nome"
          />
        </View>
      </View>

      <Text style={estilos.rotulo}>Dia da semana</Text>
      <View style={estilos.dias} accessibilityRole="radiogroup">
        <Chip
          rotulo={ROTULO_SEM_DIA_FIXO}
          papel="radio"
          selecionado={divisao.dia === null}
          onPress={() => aoAlterarDivisao({ dia: null })}
          testID="divisao-dia-sem"
        />
        {DIAS_SEMANA.map((dia) => (
          <Chip
            key={dia}
            rotulo={rotuloDiaCompleto(dia)}
            papel="radio"
            selecionado={divisao.dia === dia}
            onPress={() => aoAlterarDivisao({ dia })}
            testID={`divisao-dia-${dia}`}
          />
        ))}
      </View>

      <View style={estilos.acoesDivisao}>
        <BotaoIcone
          icone="arrow-back"
          rotulo={`Mover divisão ${divisao.nome} para antes`}
          onPress={() => aoMoverDivisao(-1)}
          desabilitado={desabilitado || indice === 0}
          testID="divisao-mover-antes"
        />
        <BotaoIcone
          icone="arrow-forward"
          rotulo={`Mover divisão ${divisao.nome} para depois`}
          onPress={() => aoMoverDivisao(1)}
          desabilitado={desabilitado || indice === totalDivisoes - 1}
          testID="divisao-mover-depois"
        />
        <BotaoIcone
          icone="copy-outline"
          rotulo={`Duplicar divisão ${divisao.nome}`}
          onPress={aoDuplicarDivisao}
          desabilitado={desabilitado}
          testID="divisao-duplicar"
        />
        <BotaoIcone
          icone="trash-outline"
          rotulo={`Remover divisão ${divisao.nome}`}
          onPress={aoRemoverDivisao}
          desabilitado={desabilitado || totalDivisoes <= 1}
          perigo
          testID="divisao-remover"
        />
      </View>

      <Text style={estilos.secao}>EXERCÍCIOS ({divisao.itens.length})</Text>

      {divisao.itens.length === 0 ? (
        <EstadoVazio
          icone="barbell-outline"
          titulo="Nenhum exercício nesta divisão"
          descricao={
            mostrarBotaoBiblioteca
              ? 'Toque em "Adicionar exercício" para escolher na biblioteca.'
              : 'Escolha um exercício na biblioteca ao lado.'
          }
        />
      ) : (
        divisao.itens.map((item, posicao) => (
          <LinhaItemMontador
            key={item.chave}
            item={item}
            posicao={posicao}
            total={divisao.itens.length}
            erros={errosItens[posicao]}
            desabilitado={desabilitado}
            aoAlterar={(mudancas) => aoAlterarItem(posicao, mudancas)}
            aoSubir={() => aoMoverItem(posicao, -1)}
            aoDescer={() => aoMoverItem(posicao, 1)}
            aoDuplicar={() => aoDuplicarItem(posicao)}
            aoRemover={() => aoRemoverItem(posicao)}
            testID={`item-${posicao}`}
          />
        ))
      )}

      {mostrarBotaoBiblioteca ? (
        <Botao
          icone="add"
          variante="secundario"
          onPress={aoAbrirBiblioteca}
          disabled={desabilitado}
          testID="abrir-biblioteca"
        >
          Adicionar exercício
        </Botao>
      ) : null}
    </Cartao>
  );
}

const estilos = StyleSheet.create({
  topo: { flexDirection: 'row' },
  nome: { flex: 1 },
  rotulo: { color: cores.textoSecundario, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  dias: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  acoesDivisao: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginBottom: 8 },
  secao: {
    color: cores.textoTerciario,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginTop: 8,
    marginBottom: 12,
  },
});
