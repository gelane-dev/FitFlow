import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { CartaoTreinoDia } from '@/components/aluno/CartaoTreinoDia';
import { HeroTreinoDia } from '@/components/aluno/HeroTreinoDia';
import { SemanaPontos } from '@/components/aluno/SemanaPontos';
import { Avatar } from '@/components/ui/Avatar';
import { BlocoEstatistica } from '@/components/ui/BlocoEstatistica';
import { Botao } from '@/components/ui/Botao';
import { CabecalhoGrande } from '@/components/ui/CabecalhoGrande';
import { Cartao } from '@/components/ui/Cartao';
import { EstadoErro } from '@/components/ui/EstadoErro';
import { EstadoVazio } from '@/components/ui/EstadoVazio';
import { Pressionavel } from '@/components/ui/Pressionavel';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tela } from '@/components/ui/Tela';
import { TituloSecao } from '@/components/ui/TituloSecao';
import { useAuth } from '@/hooks/useAuth';
import { useMinhasFichaCompleta } from '@/hooks/useMinhasFichaCompleta';
import { useMinhasFichas } from '@/hooks/useMinhasFichas';
import { useMinhasSessoes } from '@/hooks/useMinhasSessoes';
import { usePerfil } from '@/hooks/usePerfil';
import { useRecarregarNoFoco } from '@/hooks/useRecarregarNoFoco';
import { useTreinoDoDia } from '@/hooks/useTreinoDoDia';
import { cores } from '@/theme';
import { descreverVigencia } from '@/utils/vigencia';
import { plural } from '@/utils/pluralizacao';
import { rotaExecucaoTreino, rotaPreviaTreino } from '@/utils/rotas';
import { primeiroNome, rotuloData, saudacao } from '@/utils/saudacao';
import {
  descreverEmDias,
  diasComTreino,
  diasDaSemana,
  estimarDuracaoMin,
  formatarVolume,
  proximoTreino,
  sequenciaDias,
  sessaoAberta as buscarSessaoAberta,
  sessaoConcluidaHoje,
  sessoesDoMes,
  volumeDasSessoes,
} from '@/utils/painelAluno';

function PainelAdmin() {
  const { usuario, sair } = useAuth();

  return (
    <Tela abas>
      <CabecalhoGrande rotulo="Administração" titulo="Painel" />
      <EstadoVazio
        icone="shield-checkmark-outline"
        titulo={`Olá, ${usuario?.email ?? ''}`}
        descricao="O painel de administração não existe no app."
        acaoRotulo="Abrir perfil"
        aoAcionar={() => router.navigate('/perfil')}
      />
      <Botao variante="secundario" onPress={sair} testID="botao-sair-admin">
        Sair
      </Botao>
    </Tela>
  );
}

function SkeletonInicio() {
  return (
    <View style={estilos.skeleton}>
      <Skeleton altura={210} raio={28} />
      <Skeleton altura={80} raio={18} />
      <Skeleton altura={110} raio={18} />
    </View>
  );
}

function PainelAluno() {
  const { usuario } = useAuth();
  const { nome } = usePerfil();
  const fichas = useMinhasFichas();
  const fichaVigente = fichas.fichaVigente;
  const fichaId = fichaVigente?.id;
  const hojeHook = useTreinoDoDia(fichaId);
  const completa = useMinhasFichaCompleta(fichaId);
  const sessoes = useMinhasSessoes();

  const hoje = new Date();
  const finalizadasMes = sessoesDoMes(sessoes.sessoes, hoje);
  const volume = volumeDasSessoes(finalizadasMes);
  const sequencia = sequenciaDias(sessoes.sessoes, hoje);

  const carregando =
    fichas.carregando || hojeHook.carregando || completa.carregando || sessoes.carregando;
  const erro = fichas.erro ?? hojeHook.erro ?? completa.erro ?? sessoes.erro;

  function recarregarTudo() {
    fichas.recarregar();
    hojeHook.recarregar();
    completa.recarregar();
    sessoes.recarregar();
  }

  // Ao voltar de um treino, mostra o treino de hoje e a semana atualizados.
  useRecarregarNoFoco(recarregarTudo);

  const treinosHoje = hojeHook.treinos;
  const treinoHoje = treinosHoje[0];
  const todos = completa.ficha?.treinos ?? [];
  const proximo = proximoTreino(
    todos.filter((t) => !treinosHoje.some((h) => h.id === t.id)),
    hoje
  );
  // Sessão aberta de QUALQUER treino da ficha tem prioridade sobre o treino de hoje (P-D).
  const sessaoAberta = buscarSessaoAberta(sessoes.sessoes);
  const treinoEmAndamento = sessaoAberta
    ? [...treinosHoje, ...todos].find((t) => t.id === sessaoAberta.treino_id)
    : undefined;
  const treinoHero = treinoEmAndamento ?? treinoHoje;
  const outrosHoje = treinosHoje.filter((t) => t.id !== treinoHero?.id);
  const concluidaHoje =
    treinoHero && !treinoEmAndamento
      ? sessaoConcluidaHoje(sessoes.sessoes, treinoHero.id, hoje)
      : undefined;
  const duracao = treinoHero ? estimarDuracaoMin(treinoHero.itens) : 0;
  const nomeExibido = primeiroNome(nome || usuario?.email);

  return (
    <Tela abas aoAtualizar={recarregarTudo}>
      <CabecalhoGrande
        rotulo={rotuloData(hoje)}
        titulo={`${saudacao(hoje.getHours())}, ${nomeExibido}`}
        direita={
          <Pressionavel onPress={() => router.navigate('/perfil')} accessibilityLabel="Abrir perfil">
            <Avatar nome={nome || usuario?.email} tamanho={44} />
          </Pressionavel>
        }
      />

      {carregando ? (
        <SkeletonInicio />
      ) : erro ? (
        <EstadoErro mensagem="Não foi possível carregar seus treinos." aoTentarNovamente={recarregarTudo} />
      ) : !fichaVigente ? (
        <EstadoVazio
          icone="clipboard-outline"
          titulo="Nenhuma ficha por aqui"
          descricao="Você ainda não tem uma ficha vigente. Fale com seu professor."
        />
      ) : (
        <>
          {treinoHero ? (
            <HeroTreinoDia
              nome={treinoHero.nome}
              exercicios={treinoHero.itens.length}
              duracaoEstimadaMin={duracao}
              emAndamento={!!treinoEmAndamento}
              concluida={concluidaHoje}
              onComecar={() => router.push(rotaPreviaTreino(treinoHero))}
              onContinuar={() => router.push(rotaExecucaoTreino(treinoHero.id))}
              onTreinarDeNovo={() => router.push(rotaPreviaTreino(treinoHero))}
            />
          ) : (
            <Cartao style={estilos.descanso}>
              <Ionicons name="moon-outline" size={28} color={cores.primaria} />
              <Text style={estilos.descansoTitulo}>Hoje é dia de descanso</Text>
              <Text style={estilos.descansoTexto}>
                Nenhum treino previsto. Recuperar também faz parte do resultado.
              </Text>
            </Cartao>
          )}

          {outrosHoje.map((treino) => (
            <View key={treino.id} style={estilos.espacoCima}>
              <CartaoTreinoDia
                treino={treino}
                hoje
                emAndamento={sessaoAberta?.treino_id === treino.id}
                onPress={() => router.push(rotaPreviaTreino(treino))}
              />
            </View>
          ))}

          <TituloSecao titulo="Sua semana" />
          <Cartao>
            <SemanaPontos dias={diasDaSemana(hoje)} treinados={diasComTreino(sessoes.sessoes)} />
          </Cartao>

          <TituloSecao titulo="Seu mês" />
          <Cartao style={estilos.estatisticas}>
            <BlocoEstatistica valor={finalizadasMes.length} rotulo="Treinos" destaque />
            <BlocoEstatistica
              valor={formatarVolume(volume)}
              unidade="kg"
              rotulo="Volume"
            />
            <BlocoEstatistica
              valor={sequencia}
              unidade={plural(sequencia, 'dia')}
              rotulo="Sequência"
            />
          </Cartao>

          {proximo && (
            <>
              <TituloSecao titulo={`Próximo treino · ${descreverEmDias(proximo.emDias)}`} />
              <CartaoTreinoDia
                treino={proximo.treino}
                emAndamento={sessaoAberta?.treino_id === proximo.treino.id}
                onPress={() => router.push(rotaPreviaTreino(proximo.treino))}
              />
            </>
          )}

          <TituloSecao titulo="Ficha vigente" />
          <Cartao onPress={() => router.push(`/aluno/fichas/${fichaVigente.id}`)}>
            <Text style={estilos.fichaNome}>{fichaVigente.nome}</Text>
            <Text style={estilos.fichaVigencia}>
              {descreverVigencia(fichaVigente.data_inicio, fichaVigente.data_fim) ||
                'Toque para ver a ficha completa'}
            </Text>
          </Cartao>
        </>
      )}
    </Tela>
  );
}

export default function HomeAluno() {
  const { usuario } = useAuth();

  return usuario?.tipo === 'admin' ? <PainelAdmin /> : <PainelAluno />;
}

const estilos = StyleSheet.create({
  skeleton: { gap: 16 },
  descanso: { alignItems: 'center', gap: 8, paddingVertical: 28 },
  descansoTitulo: { color: cores.texto, fontSize: 20, fontWeight: '700' },
  descansoTexto: { color: cores.textoSecundario, fontSize: 14, textAlign: 'center' },
  espacoCima: { marginTop: 12 },
  estatisticas: { flexDirection: 'row', gap: 12 },
  fichaNome: { color: cores.texto, fontSize: 17, fontWeight: '700' },
  fichaVigencia: { color: cores.textoSecundario, fontSize: 14, marginTop: 4 },
});
