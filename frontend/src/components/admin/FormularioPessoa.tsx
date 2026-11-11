import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Botao } from '@/components/ui/Botao';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { Modal } from '@/components/ui/Modal';
import { emailValido } from '@/utils/validacaoFormularios';
import { espacamento } from '@/theme';

export interface DadosPessoa {
  nome: string;
  email: string;
  telefone: string;
  senha: string;
}

export interface FormularioPessoaProps {
  visivel: boolean;
  /** Ex.: "Novo professor", "Editar recepcionista". */
  titulo: string;
  /** Com `inicial`, edita (sem senha); sem ele, cria (senha obrigatória). */
  inicial?: Omit<DadosPessoa, 'senha'> | null;
  enviando?: boolean;
  aoFechar: () => void;
  aoSalvar: (dados: DadosPessoa) => void;
  /** Prefixo dos testIDs dos campos. */
  prefixo: string;
}

type Erros = Partial<Record<keyof DadosPessoa, string>>;

export function validarPessoa(dados: DadosPessoa, criando: boolean): Erros {
  const erros: Erros = {};

  if (dados.nome.trim().length < 2) erros.nome = 'Informe o nome.';
  if (!emailValido(dados.email.trim())) erros.email = 'Informe um e-mail válido.';
  if (dados.telefone.replace(/\D/g, '').length < 10) erros.telefone = 'Informe o telefone com DDD.';
  if (criando && dados.senha.length < 6) erros.senha = 'A senha precisa ter ao menos 6 caracteres.';

  return erros;
}

/** Formulário em `Modal` de professor e de recepcionista (mesmos campos). */
export function FormularioPessoa({ visivel, titulo, inicial, enviando, aoFechar, aoSalvar, prefixo }: FormularioPessoaProps) {
  const criando = !inicial;
  const [dados, setDados] = useState<DadosPessoa>({ nome: '', email: '', telefone: '', senha: '' });
  const [erros, setErros] = useState<Erros>({});

  useEffect(() => {
    if (visivel) {
      setDados({ nome: inicial?.nome ?? '', email: inicial?.email ?? '', telefone: inicial?.telefone ?? '', senha: '' });
      setErros({});
    }
  }, [visivel, inicial]);

  function enviar() {
    const encontrados = validarPessoa(dados, criando);

    setErros(encontrados);

    if (Object.keys(encontrados).length === 0) {
      aoSalvar({ ...dados, nome: dados.nome.trim(), email: dados.email.trim(), telefone: dados.telefone.trim() });
    }
  }

  const campo = (chave: keyof DadosPessoa) => (texto: string) => setDados((atual) => ({ ...atual, [chave]: texto }));

  return (
    <Modal
      visivel={visivel}
      titulo={titulo}
      aoFechar={aoFechar}
      rodape={
        <View style={estilos.rodape}>
          <Botao variante="secundario" onPress={aoFechar} disabled={enviando} testID={`${prefixo}-cancelar`}>
            Cancelar
          </Botao>
          <Botao onPress={enviar} carregando={enviando} testID={`${prefixo}-salvar`}>
            Salvar
          </Botao>
        </View>
      }
    >
      <View style={estilos.campos}>
        <CampoTexto rotulo="Nome" value={dados.nome} onChangeText={campo('nome')} erro={erros.nome} autoCapitalize="words" testID={`${prefixo}-nome`} />
        <CampoTexto
          rotulo="E-mail"
          value={dados.email}
          onChangeText={campo('email')}
          erro={erros.email}
          keyboardType="email-address"
          autoCapitalize="none"
          testID={`${prefixo}-email`}
        />
        <CampoTexto
          rotulo="Telefone"
          value={dados.telefone}
          onChangeText={campo('telefone')}
          erro={erros.telefone}
          keyboardType="phone-pad"
          testID={`${prefixo}-telefone`}
        />
        {criando ? (
          <CampoTexto
            rotulo="Senha inicial"
            value={dados.senha}
            onChangeText={campo('senha')}
            erro={erros.senha}
            secureTextEntry
            autoCapitalize="none"
            testID={`${prefixo}-senha`}
          />
        ) : null}
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  campos: { gap: espacamento.md },
  rodape: { gap: espacamento.sm },
});
