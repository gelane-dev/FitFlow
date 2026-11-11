import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Botao } from '@/components/ui/Botao';
import { CampoData } from '@/components/ui/CampoData';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { Grade } from '@/components/ui/ConteudoLargo';
import type { GestaoAlunoAtualizar, GestaoAlunoCriar } from '@/types/gestao.types';
import { cores } from '@/theme';
import { dataBrParaIso, formatarData } from '@/utils/datas';
import {
  CampoAluno,
  DadosFormularioAluno,
  mascararCpf,
  validarFormularioAluno,
} from '@/utils/gestaoRecepcao';
import { temErros } from '@/utils/validacaoFormularios';

export interface ValoresIniciaisAluno {
  nome?: string;
  email?: string;
  telefone?: string;
  /** ISO (YYYY-MM-DD), como vem da API. */
  data_nascimento?: string;
  cpf?: string | null;
  endereco?: string | null;
  observacoes?: string | null;
}

export interface FormularioAlunoProps {
  /** `criar` pede e-mail e senha; `editar` não (o e-mail não muda aqui). */
  modo: 'criar' | 'editar';
  valoresIniciais?: ValoresIniciaisAluno;
  /** Chamado com o payload pronto (data em ISO) quando a validação passa. */
  aoCriar?: (dados: GestaoAlunoCriar) => void;
  aoAtualizar?: (dados: GestaoAlunoAtualizar) => void;
  enviando?: boolean;
  /** Erro do servidor (ex.: "E-mail já cadastrado"). */
  erroGeral?: string | null;
  rotuloEnviar?: string;
  testID?: string;
}

/** Formulário completo do aluno (cadastro e edição) com validação por campo. Compartilhado com o admin. */
export function FormularioAluno({
  modo,
  valoresIniciais,
  aoCriar,
  aoAtualizar,
  enviando = false,
  erroGeral,
  rotuloEnviar,
  testID = 'formulario-aluno',
}: FormularioAlunoProps) {
  const [dados, setDados] = useState<DadosFormularioAluno>({
    nome: valoresIniciais?.nome ?? '',
    email: valoresIniciais?.email ?? '',
    senha: '',
    telefone: valoresIniciais?.telefone ?? '',
    dataNascimento: valoresIniciais?.data_nascimento ? formatarData(valoresIniciais.data_nascimento) : '',
    cpf: valoresIniciais?.cpf ? mascararCpf(valoresIniciais.cpf) : '',
    endereco: valoresIniciais?.endereco ?? '',
    observacoes: valoresIniciais?.observacoes ?? '',
  });
  const [tentou, setTentou] = useState(false);

  const erros = validarFormularioAluno(dados, modo);
  const mostrar = (campo: CampoAluno) => (tentou ? erros[campo] ?? null : null);

  function alterar<K extends keyof DadosFormularioAluno>(campo: K, valor: DadosFormularioAluno[K]) {
    setDados((atual) => ({ ...atual, [campo]: valor }));
  }

  function enviar() {
    setTentou(true);

    if (temErros(erros)) return;

    const base = {
      nome: dados.nome.trim(),
      telefone: dados.telefone.trim(),
      data_nascimento: dataBrParaIso(dados.dataNascimento) as string,
      cpf: dados.cpf.trim() || null,
      endereco: dados.endereco.trim() || null,
      observacoes: dados.observacoes.trim() || null,
    };

    if (modo === 'criar') {
      aoCriar?.({ ...base, email: dados.email.trim(), senha: dados.senha });
    } else {
      aoAtualizar?.(base);
    }
  }

  return (
    <View testID={testID}>
      <Grade colunas={undefined} espaco={16}>
        <CampoTexto
          rotulo="Nome completo"
          value={dados.nome}
          onChangeText={(v) => alterar('nome', v)}
          autoCapitalize="words"
          erro={mostrar('nome')}
          testID="aluno-nome"
        />
        {modo === 'criar' ? (
          <CampoTexto
            rotulo="E-mail"
            value={dados.email}
            onChangeText={(v) => alterar('email', v)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            erro={mostrar('email')}
            testID="aluno-email"
          />
        ) : (
          <CampoTexto rotulo="E-mail" value={dados.email} editable={false} testID="aluno-email" />
        )}
        <CampoTexto
          rotulo="Telefone"
          value={dados.telefone}
          onChangeText={(v) => alterar('telefone', v)}
          keyboardType="phone-pad"
          placeholder="(11) 90000-0000"
          erro={mostrar('telefone')}
          testID="aluno-telefone"
        />
        <CampoData
          rotulo="Data de nascimento"
          value={dados.dataNascimento}
          onChangeData={(texto) => alterar('dataNascimento', texto)}
          erro={mostrar('dataNascimento')}
          testID="aluno-nascimento"
        />
        <CampoTexto
          rotulo="CPF (opcional)"
          value={dados.cpf}
          onChangeText={(v) => alterar('cpf', mascararCpf(v))}
          keyboardType="number-pad"
          placeholder="000.000.000-00"
          erro={mostrar('cpf')}
          testID="aluno-cpf"
        />
        {modo === 'criar' ? (
          <CampoTexto
            rotulo="Senha inicial"
            value={dados.senha}
            onChangeText={(v) => alterar('senha', v)}
            secureTextEntry
            autoCapitalize="none"
            erro={mostrar('senha')}
            testID="aluno-senha"
          />
        ) : (
          <View />
        )}
      </Grade>

      <CampoTexto
        rotulo="Endereço (opcional)"
        value={dados.endereco}
        onChangeText={(v) => alterar('endereco', v)}
        testID="aluno-endereco"
      />
      <CampoTexto
        rotulo="Observações (opcional)"
        value={dados.observacoes}
        onChangeText={(v) => alterar('observacoes', v)}
        multiline
        testID="aluno-observacoes"
      />

      {erroGeral ? (
        <Text style={estilos.erro} accessibilityRole="alert" testID="formulario-aluno-erro">
          {erroGeral}
        </Text>
      ) : null}

      <Botao onPress={enviar} carregando={enviando} testID="aluno-salvar">
        {rotuloEnviar ?? (modo === 'criar' ? 'CADASTRAR ALUNO' : 'SALVAR DADOS')}
      </Botao>
    </View>
  );
}

const estilos = StyleSheet.create({
  erro: { color: cores.perigo, fontSize: 14, marginBottom: 12 },
});
