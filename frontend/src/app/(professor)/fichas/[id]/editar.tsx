import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { router, useLocalSearchParams } from 'expo-router';

import { CamposVigencia } from '@/components/CamposVigencia';
import { Botao } from '@/components/ui/Botao';
import { CabecalhoDetalhe } from '@/components/ui/CabecalhoDetalhe';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { EstadoErro } from '@/components/ui/EstadoErro';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tela } from '@/components/ui/Tela';
import { TituloSecao } from '@/components/ui/TituloSecao';
import { useAlertaErro } from '@/hooks/useAlertaErro';
import { useErrosAposTentativa } from '@/hooks/useErrosAposTentativa';
import { useFicha } from '@/hooks/useFicha';
import { useFichaEdicao } from '@/hooks/useFichaEdicao';
import { dataBrParaIso, formatarData } from '@/utils/datas';
import { CampoFicha, validarFicha } from '@/utils/validacaoFormularios';

/** Edição do nome e da vigência da ficha (/fichas/[id]/editar). */
export default function EditarFicha() {
  const { id } = useLocalSearchParams();
  const idFicha = Number(id);

  const { ficha, carregando, erro: erroCarga, recarregar } = useFicha(idFicha);
  const { atualizar, carregando: salvando, erro } = useFichaEdicao();

  const [nome, setNome] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const { erros, tentar } = useErrosAposTentativa<CampoFicha>(() =>
    validarFicha({ nome, dataInicio, dataFim })
  );

  useAlertaErro(erro);

  useEffect(() => {
    if (ficha) {
      setNome(ficha.nome);
      setDataInicio(ficha.data_inicio ? formatarData(ficha.data_inicio) : '');
      setDataFim(ficha.data_fim ? formatarData(ficha.data_fim) : '');
    }
  }, [ficha]);

  async function salvar() {
    if (!tentar()) {
      return;
    }

    const inicioIso = dataBrParaIso(dataInicio);

    const atualizada = await atualizar(idFicha, {
      nome: nome.trim(),
      ...(inicioIso ? { data_inicio: inicioIso } : {}),
      data_fim: dataBrParaIso(dataFim),
    });

    if (atualizada) {
      router.back();
    }
  }

  if (carregando) {
    return (
      <Tela>
        <CabecalhoDetalhe titulo="Editar ficha" />
        <Skeleton altura={52} />
        <View style={estilos.espaco} />
        <Skeleton altura={52} />
        <View style={estilos.espaco} />
        <Skeleton altura={52} />
      </Tela>
    );
  }

  if (erroCarga || !ficha) {
    return (
      <Tela>
        <CabecalhoDetalhe titulo="Editar ficha" />
        <EstadoErro mensagem={erroCarga || 'Ficha não encontrada.'} aoTentarNovamente={recarregar} />
      </Tela>
    );
  }

  return (
    <Tela
      teclado
      rodape={
        <Botao onPress={salvar} carregando={salvando}>
          SALVAR
        </Botao>
      }
    >
      <CabecalhoDetalhe titulo="Editar ficha" />

      <TituloSecao titulo="Dados da ficha" />
      <CampoTexto
        rotulo="Nome"
        placeholder="Nome da ficha"
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
    </Tela>
  );
}

const estilos = StyleSheet.create({
  espaco: { height: 18 },
});
