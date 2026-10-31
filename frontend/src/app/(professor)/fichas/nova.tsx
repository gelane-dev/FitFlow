import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { router, useLocalSearchParams } from 'expo-router';

import { CamposVigencia } from '@/components/CamposVigencia';
import { Avatar } from '@/components/ui/Avatar';
import { Botao } from '@/components/ui/Botao';
import { CabecalhoDetalhe } from '@/components/ui/CabecalhoDetalhe';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { EstadoVazio } from '@/components/ui/EstadoVazio';
import { Pressionavel } from '@/components/ui/Pressionavel';
import { SkeletonLista } from '@/components/ui/Skeleton';
import { Tela } from '@/components/ui/Tela';
import { TituloSecao } from '@/components/ui/TituloSecao';
import { useAlertaErro } from '@/hooks/useAlertaErro';
import { useAlunos } from '@/hooks/useAlunos';
import { useErrosAposTentativa } from '@/hooks/useErrosAposTentativa';
import { useGerenciarFicha } from '@/hooks/useGerenciarFicha';
import { cores, raios } from '@/theme';
import { mostrarAlerta } from '@/utils/alerta';
import { filtrarPorNome } from '@/utils/busca';
import { dataBrParaIso } from '@/utils/datas';
import { CampoFicha, validarFicha } from '@/utils/validacaoFormularios';

const LIMITE_SEM_BUSCA = 6;

/** Nova ficha (/fichas/nova): dados, vigência e aluno em seções, botão no rodapé. */
export default function NovaFicha() {
  const [nome, setNome] = useState('');
  const { alunoId: alunoIdParam } = useLocalSearchParams();
  const alunoInicial = Number(Array.isArray(alunoIdParam) ? alunoIdParam[0] : alunoIdParam);
  const [alunoId, setAlunoId] = useState<number | null>(alunoInicial > 0 ? alunoInicial : null);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [buscaAluno, setBuscaAluno] = useState('');

  const { alunos, carregando: carregandoAlunos, erro: erroAlunos } = useAlunos();
  const { criar, carregando, erro } = useGerenciarFicha();

  useAlertaErro(erro);
  useAlertaErro(erroAlunos);

  const { erros, tentar } = useErrosAposTentativa<CampoFicha>(() =>
    validarFicha({ nome, alunoId, exigirAluno: true, dataInicio, dataFim })
  );

  async function salvarFicha() {
    if (!tentar() || !alunoId) {
      return;
    }

    const inicioIso = dataBrParaIso(dataInicio);
    const fimIso = dataBrParaIso(dataFim);

    const ficha = await criar({
      nome: nome.trim(),
      aluno_id: alunoId,
      ...(inicioIso ? { data_inicio: inicioIso } : {}),
      ...(fimIso ? { data_fim: fimIso } : {}),
    });

    if (!ficha) {
      return;
    }

    mostrarAlerta('Ficha criada', 'Agora você pode adicionar os treinos.', [
      {
        text: 'OK',
        onPress: () =>
          router.replace({
            pathname: '/fichas/[id]' as any,
            params: { id: ficha.id.toString() },
          }),
      },
    ]);
  }

  const filtrados = filtrarPorNome(alunos, buscaAluno);

  return (
    <Tela
      teclado
      rodape={
        <Botao onPress={salvarFicha} carregando={carregando}>
          CRIAR FICHA
        </Botao>
      }
    >
      <CabecalhoDetalhe titulo="Nova ficha" />

      <TituloSecao titulo="Dados da ficha" />
      <CampoTexto
        rotulo="Nome"
        placeholder="Ex.: Hipertrofia - ciclo 1"
        value={nome}
        onChangeText={setNome}
        erro={erros.nome}
      />

      <TituloSecao titulo="Vigência" />
      <CamposVigencia
        dataInicio={dataInicio}
        dataFim={dataFim}
        onChangeInicio={setDataInicio}
        onChangeFim={setDataFim}
        erroInicio={erros.dataInicio}
        erroFim={erros.dataFim}
      />

      <TituloSecao titulo="Aluno" />
      {carregandoAlunos ? (
        <SkeletonLista linhas={3} />
      ) : alunos.length === 0 ? (
        <EstadoVazio icone="people-outline" titulo="Nenhum aluno cadastrado" />
      ) : (
        <>
          {alunos.length > LIMITE_SEM_BUSCA ? (
            <CampoTexto
              icone="search-outline"
              placeholder="Buscar aluno"
              value={buscaAluno}
              onChangeText={setBuscaAluno}
              autoCorrect={false}
            />
          ) : null}

          {filtrados.map((aluno) => {
            const selecionado = aluno.id === alunoId;

            return (
              <Pressionavel
                key={aluno.id}
                haptico="leve"
                escala={0.99}
                onPress={() => setAlunoId(aluno.id)}
                style={[estilos.aluno, selecionado && estilos.alunoSelecionado]}
                accessibilityRole="radio"
                accessibilityState={{ selected: selecionado }}
              >
                <Avatar nome={aluno.nome} tamanho={40} />
                <Text style={estilos.nomeAluno} numberOfLines={1}>
                  {aluno.nome}
                </Text>
                <Ionicons
                  name={selecionado ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={selecionado ? cores.primaria : cores.textoTerciario}
                />
              </Pressionavel>
            );
          })}
        </>
      )}
      {erros.aluno ? <Text style={estilos.erro}>{erros.aluno}</Text> : null}
      <View style={estilos.fim} />
    </Tela>
  );
}

const estilos = StyleSheet.create({
  aluno: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    marginBottom: 8,
    borderRadius: raios.botao,
    backgroundColor: cores.superficie,
    borderWidth: 1,
    borderColor: cores.borda,
  },
  alunoSelecionado: { borderColor: cores.primaria, backgroundColor: cores.superficieElevada },
  nomeAluno: { flex: 1, color: cores.texto, fontSize: 15, fontWeight: '600' },
  erro: { color: cores.perigo, fontSize: 12, marginTop: 4 },
  fim: { height: 8 },
});
