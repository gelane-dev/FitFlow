import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { CartaoTreinoDia } from '@/components/aluno/CartaoTreinoDia';
import { CabecalhoGrande } from '@/components/ui/CabecalhoGrande';
import { Cartao } from '@/components/ui/Cartao';
import { EstadoErro } from '@/components/ui/EstadoErro';
import { EstadoVazio } from '@/components/ui/EstadoVazio';
import { Selo } from '@/components/ui/Selo';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tela } from '@/components/ui/Tela';
import { TituloSecao } from '@/components/ui/TituloSecao';
import { useMinhasFichaCompleta } from '@/hooks/useMinhasFichaCompleta';
import { useMinhasFichas } from '@/hooks/useMinhasFichas';
import { useMinhasSessoes } from '@/hooks/useMinhasSessoes';
import { useRecarregarNoFoco } from '@/hooks/useRecarregarNoFoco';
import { cores } from '@/theme';
import { nomeDiaSemana, sessaoAberta } from '@/utils/painelAluno';
import { rotaPreviaTreino } from '@/utils/rotas';
import { descreverVigencia } from '@/utils/vigencia';

/** Aba Treinos do aluno (/aluno/treinos): ficha vigente e os treinos como cards por dia. */
export default function TreinosAluno() {
  const fichas = useMinhasFichas();
  const fichaId = fichas.fichaVigente?.id;
  const completa = useMinhasFichaCompleta(fichaId);
  const sessoes = useMinhasSessoes();

  const carregando = fichas.carregando || completa.carregando;
  const erro = fichas.erro ?? completa.erro;
  const vigente = fichas.fichaVigente;
  const treinos = completa.ficha?.treinos ?? [];
  const diaHoje = nomeDiaSemana(new Date());

  function recarregarTudo() {
    fichas.recarregar();
    completa.recarregar();
    sessoes.recarregar();
  }

  useRecarregarNoFoco(recarregarTudo);

  return (
    <Tela abas aoAtualizar={recarregarTudo}>
      <CabecalhoGrande rotulo="Sua ficha" titulo="Treinos" />

      {carregando ? (
        <View style={estilos.skeleton}>
          <Skeleton altura={96} raio={18} />
          <Skeleton altura={78} raio={18} />
          <Skeleton altura={78} raio={18} />
        </View>
      ) : erro ? (
        <EstadoErro mensagem="Não foi possível carregar seus treinos." aoTentarNovamente={recarregarTudo} />
      ) : !vigente ? (
        <EstadoVazio
          icone="clipboard-outline"
          titulo="Nenhuma ficha vigente"
          descricao="Você ainda não tem uma ficha vigente. Fale com seu professor."
        />
      ) : (
        <>
          <Cartao onPress={() => router.push(`/aluno/fichas/${vigente.id}`)} elevado>
            <View style={estilos.linhaFicha}>
              <Selo rotulo="Vigente" tom="sucesso" />
            </View>
            <Text style={estilos.nomeFicha}>{vigente.nome}</Text>
            {vigente.professor_nome ? (
              <Text style={estilos.professor}>Professor: {vigente.professor_nome}</Text>
            ) : null}
            <Text style={estilos.vigencia}>
              {descreverVigencia(vigente.data_inicio, vigente.data_fim) || 'Toque para ver a ficha completa'}
            </Text>
          </Cartao>

          <TituloSecao titulo="Treinos da ficha" />

          {treinos.length === 0 ? (
            <EstadoVazio icone="barbell-outline" titulo="Esta ficha ainda não tem treinos" />
          ) : (
            treinos.map((treino) => (
              <CartaoTreinoDia
                key={treino.id}
                treino={treino}
                hoje={treino.dia_semana === diaHoje}
                emAndamento={!!sessaoAberta(sessoes.sessoes, treino.id)}
                onPress={() => router.push(rotaPreviaTreino(treino))}
              />
            ))
          )}
        </>
      )}
    </Tela>
  );
}

const estilos = StyleSheet.create({
  skeleton: { gap: 12 },
  linhaFicha: { marginBottom: 10, flexDirection: 'row' },
  professor: { color: cores.textoSecundario, fontSize: 13, marginTop: 2 },
  nomeFicha: { color: cores.texto, fontSize: 20, fontWeight: '700' },
  vigencia: { color: cores.textoSecundario, fontSize: 14, marginTop: 4 },
});
