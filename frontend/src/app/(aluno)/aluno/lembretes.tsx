import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { Cartao } from '@/components/ui/Cartao';
import { CabecalhoDetalhe } from '@/components/ui/CabecalhoDetalhe';
import { Pressionavel } from '@/components/ui/Pressionavel';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tela } from '@/components/ui/Tela';
import { TituloSecao } from '@/components/ui/TituloSecao';
import { useAlertaErro } from '@/hooks/useAlertaErro';
import { useLembrete } from '@/hooks/useLembrete';
import { cores, raios, tipografia } from '@/theme';
import { formatarHorario } from '@/utils/lembretes';

type SeletorProps = {
  rotulo: string;
  valor: string;
  onMais: () => void;
  onMenos: () => void;
  desabilitado: boolean;
};

function Seletor({ rotulo, valor, onMais, onMenos, desabilitado }: SeletorProps) {
  return (
    <View style={estilos.seletor}>
      <Text style={estilos.rotuloSeletor}>{rotulo}</Text>
      <Pressionavel
        onPress={onMais}
        disabled={desabilitado}
        haptico="leve"
        accessibilityRole="button"
        accessibilityLabel={`Aumentar ${rotulo.toLowerCase()}`}
        style={estilos.passo}
      >
        <Ionicons name="chevron-up" size={22} color={cores.primaria} />
      </Pressionavel>
      <Text style={estilos.valor}>{valor}</Text>
      <Pressionavel
        onPress={onMenos}
        disabled={desabilitado}
        haptico="leve"
        accessibilityRole="button"
        accessibilityLabel={`Diminuir ${rotulo.toLowerCase()}`}
        style={estilos.passo}
      >
        <Ionicons name="chevron-down" size={22} color={cores.primaria} />
      </Pressionavel>
    </View>
  );
}

export default function LembretesAluno() {
  const { suportado, preferencia, carregando, salvando, erro, alternar, ajustar } = useLembrete();

  useAlertaErro(erro);

  return (
    <Tela>
      <CabecalhoDetalhe titulo="Lembretes" />

      {carregando ? (
        <View style={estilos.skeleton}>
          <Skeleton altura={96} raio={18} />
          <Skeleton altura={200} raio={18} />
        </View>
      ) : !suportado ? (
        <Cartao style={estilos.aviso} testID="aviso-lembretes-indisponiveis">
          <View style={estilos.avisoIcone}>
            <Ionicons name="information-circle" size={26} color={cores.aviso} />
          </View>
          <Text style={estilos.avisoTitulo}>Lembretes indisponíveis aqui</Text>
          <Text style={estilos.avisoTexto}>
            Este ambiente não exibe notificações locais (web e Expo Go no Android). Instale o app
            (development build) para ativar o lembrete diário.
          </Text>
        </Cartao>
      ) : (
        <>
          <Cartao elevado style={estilos.linha}>
            <View style={estilos.linhaTexto}>
              <Text style={estilos.titulo}>Lembrete diário de treino</Text>
              <Text style={estilos.descricao}>
                Uma notificação neste aparelho, todos os dias, no horário escolhido.
              </Text>
            </View>
            <Switch
              value={preferencia.ativo}
              onValueChange={alternar}
              disabled={salvando}
              trackColor={{ true: cores.primaria, false: cores.bordaForte }}
              thumbColor={cores.texto}
              style={estilos.toggle}
              accessibilityLabel="Ativar lembrete diário"
            />
          </Cartao>

          <TituloSecao titulo="Horário" />
          <Cartao>
            <View style={estilos.horario}>
              <Seletor
                rotulo="Hora"
                valor={String(preferencia.hora).padStart(2, '0')}
                onMais={() => ajustar(1, 0)}
                onMenos={() => ajustar(-1, 0)}
                desabilitado={salvando}
              />
              <Text style={estilos.separador}>:</Text>
              <Seletor
                rotulo="Minuto"
                valor={String(preferencia.minuto).padStart(2, '0')}
                onMais={() => ajustar(0, 5)}
                onMenos={() => ajustar(0, -5)}
                desabilitado={salvando}
              />
            </View>
          </Cartao>

          <Text style={estilos.resumo}>
            {preferencia.ativo
              ? `Lembrete ativo às ${formatarHorario(preferencia.hora, preferencia.minuto)}.`
              : 'Lembrete desligado.'}
          </Text>
        </>
      )}
    </Tela>
  );
}

const estilos = StyleSheet.create({
  skeleton: { gap: 16 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  linhaTexto: { flex: 1 },
  titulo: { color: cores.texto, fontSize: 17, fontWeight: '700' },
  descricao: { color: cores.textoSecundario, fontSize: 13, marginTop: 4 },
  toggle: { transform: [{ scaleX: 1.2 }, { scaleY: 1.2 }] },
  horario: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 20 },
  seletor: { alignItems: 'center', gap: 6 },
  rotuloSeletor: {
    color: cores.textoSecundario,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  passo: {
    width: 72,
    height: 44,
    borderRadius: raios.botao,
    backgroundColor: cores.superficieElevada,
    borderWidth: 1,
    borderColor: cores.borda,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valor: { ...tipografia.numero, color: cores.texto, fontSize: 48, lineHeight: 56 },
  separador: { ...tipografia.numero, color: cores.primaria, fontSize: 48, marginTop: 24 },
  resumo: { color: cores.textoSecundario, fontSize: 14, textAlign: 'center', marginTop: 20 },
  aviso: { alignItems: 'center', gap: 8, paddingVertical: 28, borderColor: cores.aviso },
  avisoIcone: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: cores.superficieElevada,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avisoTitulo: { color: cores.texto, fontSize: 17, fontWeight: '700' },
  avisoTexto: { color: cores.textoSecundario, fontSize: 14, textAlign: 'center' },
});
